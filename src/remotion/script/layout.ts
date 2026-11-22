/**
 * Pure layout + timing engine for "drawn" boards (Whiteboard & Stickman templates).
 * A scene becomes a list of timed items in board coordinates. The renderer draws
 * them and the pen/hand position is derived from the same data, so the marker
 * always sits exactly where ink is appearing.
 */
import {FONT_HAND} from '../fonts';
import {toFa} from '../theme';
import {parseFingers, parseNotes} from '../components/music';
import {ScriptScene} from './types';

export interface TextLine {
  text: string;
  xr: number; // right edge (RTL start)
  y: number; // top
  w: number; // measured width
}
export type Item =
  | {type: 'text'; lines: TextLine[]; size: number; weight: number; color: 'title' | 'body' | 'accent' | 'good'; t0: number; t1: number}
  | {type: 'underline'; x: number; y: number; w: number; t0: number; t1: number}
  | {type: 'keyboard'; x: number; y: number; w: number; h: number; notes: number[]; fingers: string[]; t0: number; t1: number}
  | {type: 'staff'; x: number; y: number; w: number; h: number; notes: {pos: number; label: string}[]; t0: number; t1: number}
  | {type: 'hand'; x: number; y: number; w: number; h: number; side: 'right' | 'left'; fingers: number[]; t0: number; t1: number}
  | {type: 'bullet'; x: number; y: number; s: number; t0: number; t1: number}
  | {type: 'box'; x: number; y: number; w: number; h: number; t0: number; t1: number}
  | {type: 'circle'; x: number; y: number; w: number; h: number; t0: number; t1: number}
  | {type: 'check'; x: number; y: number; s: number; t0: number; t1: number}
  | {type: 'clock'; x: number; y: number; s: number; t0: number; t1: number};

/* ------------------------------------------------------------ text measuring */
let ctx: CanvasRenderingContext2D | null = null;
const cache = new Map<string, number>();
export const measure = (text: string, size: number, weight = 500, family = FONT_HAND) => {
  const font = `${weight} ${size}px ${family}`;
  let ready = false;
  try {
    ready = typeof document !== 'undefined' && document.fonts ? document.fonts.check(font, text) : false;
  } catch {
    ready = false;
  }
  const key = `${font}|${ready}|${text}`;
  const hit = cache.get(key);
  if (hit !== undefined) return hit;
  let w = text.length * size * 0.5;
  try {
    if (typeof document !== 'undefined') {
      if (!ctx) ctx = document.createElement('canvas').getContext('2d');
      if (ctx) {
        ctx.font = font;
        w = ctx.measureText(text).width;
      }
    }
  } catch {
    /* keep estimate */
  }
  cache.set(key, w);
  return w;
};

export const wrap = (text: string, size: number, maxW: number, weight = 500): {text: string; w: number}[] => {
  const words = (text || '').replace(/\*/g, '').split(/\s+/).filter(Boolean);
  const out: {text: string; w: number}[] = [];
  let cur = '';
  for (const word of words) {
    const next = cur ? `${cur} ${word}` : word;
    if (cur && measure(next, size, weight) > maxW) {
      out.push({text: cur, w: measure(cur, size, weight)});
      cur = word;
    } else cur = next;
  }
  if (cur) out.push({text: cur, w: measure(cur, size, weight)});
  return out;
};

/* ------------------------------------------------------------ helpers */
const chars = (lines: {text: string}[]) => lines.reduce((a, l) => a + l.text.length, 0);
const noteToStaffPos = (n: number) => {
  // diatonic position relative to C4 (0 = C4, 1 = D4 ... 7 = C5)
  const pcs = [0, 0, 1, 1, 2, 3, 3, 4, 4, 5, 5, 6];
  const oct = Math.floor(n / 12) - 5; // C4 = 60
  return oct * 7 + pcs[((n % 12) + 12) % 12];
};
const NOTE_FA: Record<string, string> = {C: 'دو', D: 'ر', E: 'می', F: 'فا', G: 'سل', A: 'لا', B: 'سی'};
const parseStaff = (s: string, fallbackNotes: string) => {
  const src = (s || '').trim() || fallbackNotes || '';
  return src
    .split(/[\s,،]+/)
    .filter(Boolean)
    .map((tok) => {
      const [n, label] = tok.split(':');
      const midi = parseNotes(n)[0];
      if (midi === undefined) return null;
      return {pos: noteToStaffPos(midi), label: label || NOTE_FA[n[0].toUpperCase()] || n};
    })
    .filter((x): x is {pos: number; label: string} => !!x)
    .slice(0, 10);
};

export interface BoardLayout {
  items: Item[];
  end: number; // frame where the last ink is finished
}

/**
 * Lay out a scene on a board of size bw×bh (px). `dur` is the scene length in frames.
 * Writing is paced to finish by ~62% of the scene so the viewer can read while the voice continues.
 */
export const layoutScene = (sc: ScriptScene, bw: number, bh: number, u: number, dur: number, extra: {episode?: string; courseTitle?: string; handle?: string; cta?: string; brandName?: string} = {}): BoardLayout => {
  const pad = 56 * u;
  const xr = bw - pad;
  const maxW = bw - pad * 2;
  const items: Item[] = [];
  let y = pad * 0.8;
  let t = 6;
  const GAP = 5;

  const addText = (text: string, size: number, weight: number, color: 'title' | 'body' | 'accent' | 'good', opts: {maxW?: number; xr?: number; lineH?: number; speed?: number} = {}) => {
    if (!text?.trim()) return null;
    const lines = wrap(text, size, opts.maxW ?? maxW, weight);
    const lh = size * (opts.lineH ?? 1.55);
    const tl: TextLine[] = lines.map((l, i) => ({text: l.text, w: l.w, xr: opts.xr ?? xr, y: y + i * lh}));
    const d = Math.max(10, Math.min(110, chars(lines) * (opts.speed ?? 0.85)));
    const it: Item = {type: 'text', lines: tl, size, weight, color, t0: t, t1: t + d};
    items.push(it);
    t += d + GAP;
    y += lines.length * lh;
    return it;
  };
  const titleSize = 66 * u;
  const bodySize = 42 * u;

  if (sc.kind === 'title') {
    y = bh * 0.16;
    if (extra.courseTitle) addText(extra.courseTitle, 34 * u, 500, 'accent');
    y += 18 * u;
    addText(sc.title, 92 * u, 700, 'title', {speed: 1.1});
    const last = items[items.length - 1];
    if (last && last.type === 'text') {
      const l = last.lines[last.lines.length - 1];
      items.push({type: 'underline', x: l.xr - l.w, y: l.y + 92 * u * 1.32, w: l.w, t0: t, t1: t + 14});
      t += 18;
    }
    y += 34 * u;
    addText(sc.text || '', bodySize, 500, 'body');
    if (extra.episode) {
      y += 26 * u;
      const s = 120 * u;
      items.push({type: 'circle', x: xr - s * 1.6, y, w: s * 1.6, h: s * 0.8, t0: t, t1: t + 18});
      t += 20;
      const save = y;
      y = y + s * 0.18;
      addText(extra.episode, 34 * u, 700, 'title', {xr: xr - s * 0.2, maxW: s * 1.3});
      y = save + s;
    }
  } else {
    addText(sc.title, titleSize, 700, 'title');
    const last = items[items.length - 1];
    if (last && last.type === 'text') {
      const l = last.lines[last.lines.length - 1];
      items.push({type: 'underline', x: l.xr - l.w, y: l.y + titleSize * 1.3, w: l.w, t0: t, t1: t + 12});
      t += 14;
    }
    y += 30 * u;
  }

  const restH = bh - y - pad * 0.6;

  switch (sc.kind) {
    case 'explain':
      addText(sc.text || '', bodySize * 1.08, 500, 'body');
      break;
    case 'list':
    case 'outro': {
      const list = (sc.items && sc.items.length ? sc.items : (sc.text || '').split(/\n|•/)).map((s) => s.trim()).filter(Boolean).slice(0, 6);
      const s = bodySize * 0.62;
      for (const it of list) {
        items.push({type: sc.kind === 'outro' ? 'check' : 'bullet', x: xr - s, y: y + bodySize * 0.42, s, t0: t, t1: t + 8});
        t += 9;
        addText(it, bodySize, 500, 'body', {xr: xr - s * 1.9, maxW: maxW - s * 2});
        y += 8 * u;
      }
      if (sc.kind === 'outro') {
        y += 16 * u;
        if (extra.cta) addText(extra.cta, bodySize * 0.95, 700, 'good');
        if (extra.handle) addText(`${extra.brandName ? extra.brandName + ' · ' : ''}${extra.handle}`, 34 * u, 500, 'accent');
      }
      break;
    }
    case 'keyboard': {
      const notes = parseNotes(sc.notes || 'C4 D4 E4 F4 G4');
      const textH = sc.text ? bodySize * 1.6 * 2 : 0;
      const ratio = bh > bw ? 0.44 : 0.3;
      const h = Math.min(restH - textH - 20 * u, maxW * ratio);
      const w = Math.min(maxW, h / ratio);
      items.push({type: 'keyboard', x: (bw - w) / 2, y, w, h, notes, fingers: parseFingers(sc.fingers || ''), t0: t, t1: t + 40 + notes.length * 14});
      t += 44 + notes.length * 14;
      y += h + 26 * u;
      addText(sc.text || '', bodySize, 500, 'body');
      break;
    }
    case 'staff': {
      const notes = parseStaff(sc.staff || '', sc.notes || 'C4 D4 E4 F4 G4');
      const textH = sc.text ? bodySize * 1.6 * 2 : 0;
      const h = Math.min(restH - textH - 20 * u, 300 * u);
      const w = maxW;
      items.push({type: 'staff', x: pad, y, w, h, notes, t0: t, t1: t + 34 + notes.length * 14});
      t += 38 + notes.length * 14;
      y += h + 22 * u;
      addText(sc.text || '', bodySize, 500, 'body');
      break;
    }
    case 'hand': {
      const fingers = (sc.fingers || '1 2 3 4 5').split(/[\s,،]+/).map(Number).filter((n) => n >= 1 && n <= 5);
      const h = Math.min(restH, 430 * u);
      const w = h * 0.95;
      const textW = maxW - w - 40 * u;
      const top = y;
      items.push({type: 'hand', x: pad, y: top + 6 * u, w, h, side: sc.hand === 'left' ? 'left' : 'right', fingers, t0: t, t1: t + 36 + fingers.length * 12});
      t += 40 + fingers.length * 12;
      addText(sc.text || '', bodySize, 500, 'body', {maxW: textW});
      break;
    }
    case 'exercise': {
      const s = 64 * u;
      items.push({type: 'clock', x: pad, y, s, t0: t, t1: t + 18});
      t += 20;
      addText(sc.text || '', bodySize, 500, 'body', {maxW: maxW - s * 1.6});
      const list = (sc.items || []).filter(Boolean).slice(0, 4);
      const bs = bodySize * 0.58;
      y += 10 * u;
      for (const it of list) {
        items.push({type: 'box', x: xr - bs, y: y + bodySize * 0.4, w: bs, h: bs, t0: t, t1: t + 8});
        t += 9;
        addText(it, bodySize * 0.92, 500, 'body', {xr: xr - bs * 1.9, maxW: maxW - bs * 2});
      }
      break;
    }
    case 'quiz': {
      addText(sc.text || '', bodySize, 600, 'body');
      y += 18 * u;
      const opts = (sc.items || []).filter(Boolean).slice(0, 4);
      const cols = 2;
      const gw = (maxW - 30 * u) / cols;
      const gh = Math.min(bodySize * 2.3, (bh - y - pad * 0.6) / 2 - 18 * u);
      const top = y;
      opts.forEach((o, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const bx = xr - (col + 1) * gw - col * 30 * u;
        const by = top + row * (gh + 22 * u);
        items.push({type: 'box', x: bx, y: by, w: gw, h: gh, t0: t, t1: t + 10});
        t += 10;
        y = by + (gh - bodySize * 1.4) / 2;
        addText(`${toFa(i + 1)}. ${o}`, bodySize * 0.9, 500, 'body', {xr: bx + gw - 24 * u, maxW: gw - 48 * u});
      });
      y = top + 2 * (gh + 22 * u);
      // the answer is revealed later (at 72% of the scene) — circled in green
      const a = Math.max(0, Math.min(opts.length - 1, sc.answer ?? 0));
      if (opts.length) {
        const col = a % cols;
        const row = Math.floor(a / cols);
        const bx = xr - (col + 1) * gw - col * 30 * u;
        const by = top + row * (gh + 22 * u);
        const ta = Math.max(t + 20, Math.round(dur * 0.72));
        items.push({type: 'circle', x: bx - 12 * u, y: by - 12 * u, w: gw + 24 * u, h: gh + 24 * u, t0: ta, t1: ta + 18});
        items.push({type: 'check', x: bx + 20 * u, y: by + gh * 0.2, s: gh * 0.6, t0: ta + 18, t1: ta + 28});
      }
      break;
    }
    default:
      if (sc.kind !== 'title') addText(sc.text || '', bodySize, 500, 'body');
  }

  // Pace: all writing finishes by 62% of the scene (quiz answer excluded).
  const limit = Math.max(30, dur * 0.62);
  const writeEnd = Math.max(...items.filter((i) => !(sc.kind === 'quiz' && i.t0 >= dur * 0.7)).map((i) => i.t1), 1);
  if (writeEnd > limit) {
    const k = limit / writeEnd;
    for (const it of items) {
      if (sc.kind === 'quiz' && it.t0 >= dur * 0.7) continue;
      it.t0 = Math.round(it.t0 * k);
      it.t1 = Math.max(it.t0 + 4, Math.round(it.t1 * k));
    }
  }
  return {items, end: Math.max(...items.map((i) => i.t1), 0)};
};

/** Progress of a text item: which line and how far (0..1). */
export const textProgress = (it: Extract<Item, {type: 'text'}>, f: number) => {
  const total = Math.max(1, it.lines.reduce((a, l) => a + l.text.length, 0));
  const p = Math.max(0, Math.min(1, (f - it.t0) / Math.max(1, it.t1 - it.t0)));
  let done = p * total;
  return it.lines.map((l) => {
    const n = l.text.length;
    const lp = Math.max(0, Math.min(1, done / Math.max(1, n)));
    done -= n;
    return lp;
  });
};

/** Where the pen tip is (board coords) and whether it is touching the board. */
export const penAt = (items: Item[], f: number, rest: {x: number; y: number}): {x: number; y: number; down: boolean} => {
  const pos = (it: Item, ff: number): {x: number; y: number} => {
    const p = Math.max(0, Math.min(1, (ff - it.t0) / Math.max(1, it.t1 - it.t0)));
    switch (it.type) {
      case 'text': {
        const lp = textProgress(it, ff);
        let idx = lp.findIndex((v) => v < 1);
        if (idx < 0) idx = lp.length - 1;
        const l = it.lines[idx];
        return {x: l.xr - l.w * lp[idx], y: l.y + it.size * 1.05};
      }
      case 'underline':
        return {x: it.x + it.w * (1 - p), y: it.y};
      case 'keyboard':
      case 'staff':
      case 'hand':
      case 'box':
      case 'circle':
        return {x: it.x + it.w * (1 - p), y: it.y + (it as any).h * (0.5 + 0.35 * Math.sin(p * Math.PI * 6))};
      default:
        return {x: (it as any).x + (it as any).s * p, y: (it as any).y + (it as any).s * 0.5};
    }
  };
  const sorted = [...items].sort((a, b) => a.t0 - b.t0);
  const active = sorted.find((i) => f >= i.t0 && f <= i.t1);
  if (active) return {...pos(active, f), down: true};
  const prev = [...sorted].reverse().find((i) => i.t1 < f);
  const next = sorted.find((i) => i.t0 > f);
  const lerp = (a: {x: number; y: number}, b: {x: number; y: number}, k: number) => ({x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k});
  const ease = (k: number) => (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);
  if (prev && next && next.t0 - prev.t1 <= 24) {
    const k = (f - prev.t1) / Math.max(1, next.t0 - prev.t1);
    return {...lerp(pos(prev, prev.t1), pos(next, next.t0), ease(k)), down: false};
  }
  if (next && next.t0 - f <= 14) {
    const k = 1 - (next.t0 - f) / 14;
    return {...lerp(rest, pos(next, next.t0), ease(k)), down: false};
  }
  if (prev && f - prev.t1 <= 16) {
    const k = (f - prev.t1) / 16;
    return {...lerp(pos(prev, prev.t1), rest, ease(k)), down: false};
  }
  return {...rest, down: false};
};
