"""Vectorises the ALi Piano.IR logo into animatable layers -> src/v3/mascot/paths.ts
Usage: python3 scripts/logo/trace-logo.py <logo.jpg>"""
import sys, json, numpy as np, cv2, potrace
from PIL import Image, ImageDraw

SRC = sys.argv[1]
img = Image.open(SRC).convert('L')
K = img.width / 1080

def crop(box):
    x0, y0, x1, y1 = [int(v * K) for v in box]
    return img.crop((x0, y0, x1, y1)), (x0, y0)

def fill_holes(mask):
    m = mask.astype(np.uint8) * 255
    h, w = m.shape
    ff = m.copy(); pad = np.zeros((h + 2, w + 2), np.uint8)
    cv2.floodFill(ff, pad, (0, 0), 255)
    return (m | cv2.bitwise_not(ff)) > 0

def opened(mask, k=3):
    ker = np.ones((k, k), np.uint8)
    return cv2.morphologyEx(mask.astype(np.uint8), cv2.MORPH_OPEN, ker) > 0

def to_path(mask, off, scale=1.0):
    bm = potrace.Bitmap(~mask)
    plist = bm.trace(turdsize=12, alphamax=1.0, opticurve=True, opttolerance=0.3)
    ox, oy = off
    f = lambda p: f"{(p.x + ox) / K:.1f},{(p.y + oy) / K:.1f}"
    d = []
    for c in plist:
        d.append('M' + f(c.start_point))
        for s in c.segments:
            if s.is_corner: d.append('L' + f(s.c) + 'L' + f(s.end_point))
            else: d.append('C' + f(s.c1) + ' ' + f(s.c2) + ' ' + f(s.end_point))
        d.append('Z')
    return ''.join(d)

out = {}
# ---------- body (arms erased, black keys erased below the outline so they can move)
body, off = crop((390, 330, 680, 630))
dr = ImageDraw.Draw(body)
dr.polygon([(0, 340), (27, 340), (29, 445), (50, 478), (55, 510), (30, 510), (0, 460)], fill=255)
dr.polygon([(362, 400), (537, 410), (537, 520), (372, 470), (360, 440)], fill=255)
a = np.array(body)
P = 60
padded = np.pad((a < 128).astype(np.uint8), P)
closed = cv2.morphologyEx(padded, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (61, 61)))
sil = fill_holes(closed > 0)[P:-P, P:-P]
hull = cv2.convexHull(cv2.findNonZero((a < 128).astype(np.uint8)))
hm = np.zeros(a.shape, np.uint8); cv2.fillPoly(hm, [hull], 1)
near = cv2.dilate((a < 128).astype(np.uint8), cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (41, 41)))
sil = sil | ((hm & near) > 0)
ink = a < 128
shadow = opened((a > 175) & (a < 246), 5) & sil
# black keys (crop coords): measured bounding boxes
keys = [(150, 48, 249, 300), (306, 120, 404, 300)]
inkNoKeys = ink.copy()
for (x0, y0, x1, y1) in keys:
    inkNoKeys[y0:y1 + 2, x0 - 1:x1 + 2] = False
out['bodyFill'] = to_path(sil, off)
out['bodyShadow'] = to_path(shadow, off)
out['bodyInk'] = to_path(inkNoKeys, off)
out['keys'] = [[round((x0 + off[0]) / K, 1), round((y0 + off[1]) / K, 1), round((x1 + off[0]) / K, 1), round((y1 + off[1]) / K, 1)] for (x0, y0, x1, y1) in keys]
# key tops hidden under outline: extend upwards
# ---------- gloves
def glove(box, cut_rows):
    im, off = crop(box)
    a = np.array(im)
    s = fill_holes(a < 200)
    i = a < 128
    if cut_rows: s[-cut_rows:, :] = False; i[-cut_rows:, :] = False  # remove arm stub
    return to_path(s, off), to_path(i, off), off, a.shape
gl = glove((285, 260, 375, 420), 17)
gr = glove((690, 360, 860, 495), 13)
out['gloveLFill'], out['gloveLInk'] = gl[0], gl[1]
out['gloveRFill'], out['gloveRInk'] = gr[0], gr[1]
with open(sys.argv[2] if len(sys.argv) > 2 else '/tmp/paths.json', 'w') as fh: json.dump(out, fh)
print({k: (len(v) if isinstance(v, str) else v) for k, v in out.items()})
