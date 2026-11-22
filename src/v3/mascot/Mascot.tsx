/**
 * The ALi Piano.IR logo as an animated teacher ("rubber-hose" style, like the logo itself).
 * Body/gloves are the traced logo vectors (paths.ts); arms are live quadratic curves so the
 * gloves can move to any pose. The two black keys bob with the narration = "talking".
 */
import React from 'react';
import {interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {ANCHOR, bodyFill, bodyInk, bodyShadow, gloveLFill, gloveLInk, gloveRFill, gloveRInk, keys} from './paths';

export type Pose = 'idle' | 'talk' | 'point' | 'present' | 'wave' | 'celebrate' | 'think' | 'shrug';
type Hand = {x: number; y: number; r: number; bend: number};
type PoseDef = {L: Hand; R: Hand; lean: number; hop?: number};

const P = (lx: number, ly: number, lr: number, lb: number, rx: number, ry: number, rr: number, rb: number, lean = 0): PoseDef => ({
  L: {x: lx, y: ly, r: lr, bend: lb},
  R: {x: rx, y: ry, r: rr, bend: rb},
  lean,
});

export const POSES: Record<Pose, PoseDef> = {
  idle: P(339, 408, 0, -36, 764, 485, 0, 113),
  talk: P(345, 420, 4, -34, 772, 470, -6, 105),
  point: P(326, 372, -6, -44, 770, 500, 6, 110, -2),
  present: P(322, 452, -4, -40, 812, 424, -18, 78, 3),
  wave: P(300, 318, -10, -70, 764, 492, 4, 112, -3),
  celebrate: P(318, 312, -14, -64, 808, 352, -34, 52),
  think: P(392, 352, 34, -70, 768, 492, 4, 112, -4),
  shrug: P(318, 452, -38, -30, 806, 450, 26, 70),
};

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const mixHand = (a: Hand, b: Hand, t: number): Hand => ({x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t), r: lerp(a.r, b.r, t), bend: lerp(a.bend, b.bend, t)});

const armPath = (sx: number, sy: number, h: Hand) => {
  const dx = h.x - sx, dy = h.y - sy;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len, ny = dx / len;
  const cx = (sx + h.x) / 2 + nx * h.bend;
  const cy = (sy + h.y) / 2 + ny * h.bend;
  return `M${sx},${sy} Q${cx.toFixed(1)},${cy.toFixed(1)} ${h.x.toFixed(1)},${h.y.toFixed(1)}`;
};

// viewBox that fits every pose
export const MASCOT_VB = {x: 250, y: 250, w: 640, h: 420};

export const Mascot: React.FC<{
  pose?: Pose;
  prevPose?: Pose;
  poseAt?: number; // local frame when `pose` starts
  talk?: (frame: number) => number; // 0..1 speaking amplitude
  width: number;
  enterAt?: number; // frame for pop-in (undefined = already in)
  flip?: boolean;
  sticker?: string; // outline colour around the mascot (for dark backgrounds)
  ink?: string;
  fill?: string;
  shadow?: boolean;
  style?: React.CSSProperties;
}> = ({pose = 'idle', prevPose, poseAt = 0, talk, width, enterAt, flip, sticker = '#F3EEE4', ink = '#0B0B0C', fill = '#FFFFFF', shadow = true, style}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = f / fps;
  const k = spring({frame: f - poseAt, fps, config: {damping: 13, stiffness: 120, mass: 0.8}});
  const A = POSES[prevPose ?? pose];
  const B = POSES[pose];
  let L = mixHand(A.L, B.L, k);
  let R = mixHand(A.R, B.R, k);
  const amp = talk ? talk(f) : 0;

  // secondary motion
  const breathe = Math.sin(t * 2.2);
  L = {...L, y: L.y + breathe * 3, r: L.r + Math.sin(t * 1.7) * 3};
  R = {...R, y: R.y - breathe * 3, r: R.r + Math.sin(t * 1.9 + 1) * 3};
  if (pose === 'wave') L = {...L, r: L.r + Math.sin(t * 9) * 16, x: L.x + Math.sin(t * 9) * 6};
  if (pose === 'talk' || amp > 0.05) R = {...R, y: R.y - amp * 14, r: R.r - amp * 10};
  if (pose === 'point') L = {...L, y: L.y + Math.abs(Math.sin(t * 5)) * -6};

  // entrance: drop + squash/stretch
  let ty = 0, sx = 1, sy = 1, op = 1;
  if (enterAt !== undefined) {
    const e = spring({frame: f - enterAt, fps, config: {damping: 9, stiffness: 110, mass: 0.9}});
    ty = (1 - e) * 260;
    const v = Math.max(0, 1 - Math.abs(e - 1) * 4);
    sy = 1 + (e < 1 ? (1 - e) * 0.25 : 0) - v * 0.04;
    sx = 2 - sy;
    op = Math.min(1, e * 3);
  }
  const celebrateHop = pose === 'celebrate' ? -Math.abs(Math.sin(t * 6)) * 18 : 0;
  const bodySquash = 1 + breathe * 0.012 - amp * 0.03;
  const lean = lerp(A.lean, B.lean, k);
  const [cx, cy] = ANCHOR.center;
  const keyDrop = (i: number) => amp * (i === 0 ? 7 : 5) * (0.6 + 0.4 * Math.sin(f * 0.9 + i * 2.1));

  const H = (width * MASCOT_VB.h) / MASCOT_VB.w;
  const glove = (h: Hand, w0: readonly [number, number], fillD: string, inkD: string, outline: boolean) => (
    <g transform={`translate(${h.x} ${h.y}) rotate(${h.r}) translate(${-w0[0]} ${-w0[1]})`}>
      {outline ? <path d={fillD} fill={sticker} stroke={sticker} strokeWidth={14} strokeLinejoin="round" /> : (
        <>
          <path d={fillD} fill={fill} />
          <path d={inkD} fill={ink} fillRule="evenodd" />
        </>
      )}
    </g>
  );
  const arms = (outline: boolean) => (
    <>
      <path d={armPath(ANCHOR.shoulderL[0], ANCHOR.shoulderL[1], L)} stroke={outline ? sticker : ink} strokeWidth={outline ? 26 : 12.5} fill="none" strokeLinecap="round" />
      <path d={armPath(ANCHOR.shoulderR[0], ANCHOR.shoulderR[1], R)} stroke={outline ? sticker : ink} strokeWidth={outline ? 26 : 12.5} fill="none" strokeLinecap="round" />
    </>
  );
  const body = (outline: boolean) => (
    <g transform={`translate(${cx} ${ANCHOR.box[3]}) scale(${2 - bodySquash} ${bodySquash}) translate(${-cx} ${-ANCHOR.box[3]})`}>
      {outline ? (
        <path d={bodyFill} fill={sticker} stroke={sticker} strokeWidth={16} strokeLinejoin="round" />
      ) : (
        <>
          <path d={bodyFill} fill={fill} />
          <path d={bodyShadow} fill="#000" opacity={0.12} fillRule="evenodd" />
          <clipPath id="mascotClip"><path d={bodyFill} /></clipPath>
          <g clipPath="url(#mascotClip)">
            {keys.map(([x0, y0, x1, y1], i) => (
              <g key={i} transform={`translate(0 ${keyDrop(i)})`}>
                <rect x={x0} y={y0 - 60} width={x1 - x0} height={y1 - y0 + 60} rx={6} fill={ink} />
                <path d={`M${x0 + (x1 - x0) * 0.34},${y0 + 4} L${x0 + (x1 - x0) * 0.46},${y0 + 4} L${x0 + (x1 - x0) * 0.4},${y0 + (y1 - y0) * 0.62} Z`} fill="#fff" opacity={0.28} />
              </g>
            ))}
          </g>
          <path d={bodyInk} fill={ink} fillRule="evenodd" />
        </>
      )}
    </g>
  );
  return (
    <div style={{width, height: H, position: 'relative', opacity: op, ...style}}>
      {shadow ? (
        <div style={{position: 'absolute', left: '28%', right: '22%', bottom: -H * 0.02, height: H * 0.08, borderRadius: '50%', background: 'rgba(0,0,0,0.45)', filter: `blur(${H * 0.03}px)`, transform: `scaleX(${1 - (ty + -celebrateHop) / 900})`}} />
      ) : null}
      <svg
        width={width}
        height={H}
        viewBox={`${MASCOT_VB.x} ${MASCOT_VB.y} ${MASCOT_VB.w} ${MASCOT_VB.h}`}
        style={{position: 'absolute', inset: 0, overflow: 'visible', transform: `translateY(${((ty + celebrateHop) * width) / MASCOT_VB.w}px) scale(${flip ? -sx : sx}, ${sy}) rotate(${flip ? -lean : lean}deg)`, transformOrigin: '50% 100%'}}
      >
        {sticker !== 'none' ? (
          <g>
            {arms(true)}
            {body(true)}
            {glove(L, ANCHOR.wristL, gloveLFill, gloveLInk, true)}
            {glove(R, ANCHOR.wristR, gloveRFill, gloveRInk, true)}
          </g>
        ) : null}
        {arms(false)}
        {body(false)}
        {glove(L, ANCHOR.wristL, gloveLFill, gloveLInk, false)}
        {glove(R, ANCHOR.wristR, gloveRFill, gloveRInk, false)}
      </svg>
    </div>
  );
};

/** Speaking amplitude from word timings (seconds relative to `voiceFrom`). */
export const talkFrom = (words: {t: number; d: number}[], voiceFrom: number, fps: number) => (frame: number) => {
  const s = (frame - voiceFrom) / fps;
  for (const w of words) {
    if (s >= w.t && s <= w.t + w.d) return Math.sin(Math.PI * ((s - w.t) / w.d)) ** 0.7;
    if (w.t > s) break;
  }
  return 0;
};

/** Static logo lockup (mascot + wordmark) used by intro/outro. */
export const Wordmark: React.FC<{size: number; color: string; sub?: string; subColor?: string; progress?: number}> = ({size, color, sub = 'ONE HAND, ONE DREAM', subColor, progress = 1}) => {
  const f = useCurrentFrame();
  const sp = interpolate(progress, [0, 1], [0.35, 0.02]);
  return (
    <div dir="ltr" style={{textAlign: 'center', fontFamily: "'Outfit', sans-serif"}}>
      <div style={{fontWeight: 700, fontSize: size, color, letterSpacing: `${sp}em`, opacity: progress, lineHeight: 1}}>ALi Piano.IR</div>
      <div style={{fontWeight: 400, fontSize: size * 0.3, color: subColor ?? color, letterSpacing: '0.32em', marginTop: size * 0.22, opacity: interpolate(progress, [0.5, 1], [0, 1], {extrapolateLeft: 'clamp'}) * (0.85 + 0.15 * Math.sin(f / 20))}}>{sub}</div>
    </div>
  );
};
