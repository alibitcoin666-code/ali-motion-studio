import React from 'react';
import {AbsoluteFill, interpolate, Sequence, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {Brand, hexA, resolveBrand, toFa} from '../theme';
import {Stage} from '../components/core';
import {FONT_HAND, FONT_LATIN_SERIF} from '../fonts';
import {buildCaptions, buildScenes, Scene} from '../../narration/narration';
import {BoardInk, Inks} from './Board';
import {layoutScene, penAt} from './layout';
import {INK, ScriptProps} from './types';

/* ------------------------------------------------------------------ geometry */
const useGeom = () => {
  const {width, height} = useVideoConfig();
  if (width > height) {
    const k = width / 1920;
    return {k, mode: 'land' as const, board: {x: 640 * k, y: 70 * k, w: 1200 * k, h: 740 * k}, ub: 1.08 * k, man: {x: 330 * k, y: 1000 * k, s: 1.25 * k}, bubble: {x: 40 * k, y: 60 * k, w: 560 * k}, floor: 900 * k};
  }
  const k = width / 1080;
  if (width === height) return {k, mode: 'square' as const, board: {x: 360 * k, y: 60 * k, w: 690 * k, h: 640 * k}, ub: 0.66 * k, man: {x: 180 * k, y: 1040 * k, s: 0.95 * k}, bubble: {x: 360 * k, y: 760 * k, w: 680 * k}, floor: 860 * k};
  return {k, mode: 'port' as const, board: {x: 40 * k, y: 130 * k, w: 1000 * k, h: 900 * k}, ub: 1.02 * k, man: {x: 250 * k, y: 1880 * k, s: 1.45 * k}, bubble: {x: 480 * k, y: 1110 * k, w: 560 * k}, floor: 1560 * k};
};

/* ------------------------------------------------------------------ room */
const Room: React.FC<{brand: Brand; floor: number}> = ({brand, floor}) => {
  const {width, height} = useVideoConfig();
  const k = Math.min(width, height) / 1080;
  const f = useCurrentFrame();
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{background: 'linear-gradient(180deg, #F6EBDD 0%, #EEDCC6 100%)'}} />
      {/* soft wallpaper stripes */}
      <AbsoluteFill style={{opacity: 0.35, background: `repeating-linear-gradient(90deg, transparent 0px, transparent ${38 * k}px, rgba(160,120,80,0.10) ${38 * k}px, rgba(160,120,80,0.10) ${40 * k}px)`}} />
      {/* window light */}
      <AbsoluteFill style={{background: `linear-gradient(115deg, transparent 20%, rgba(255,246,220,${0.45 + 0.05 * Math.sin(f / 60)}) 32%, transparent 46%, rgba(255,246,220,0.3) 54%, transparent 64%)`}} />
      {/* wainscot + floor */}
      <div style={{position: 'absolute', left: 0, right: 0, top: floor - 120 * k, height: 120 * k, background: 'linear-gradient(180deg,#E2CBB0,#D6BC9C)', borderTop: `${4 * k}px solid ${hexA(brand.accent, 0.8)}`}} />
      <div style={{position: 'absolute', left: 0, right: 0, top: floor, bottom: 0, background: 'linear-gradient(180deg,#B9895C,#8E6440)', backgroundImage: `repeating-linear-gradient(90deg, rgba(0,0,0,0.0) 0px, rgba(0,0,0,0.0) ${170 * k}px, rgba(60,30,10,0.25) ${170 * k}px, rgba(60,30,10,0.25) ${173 * k}px), linear-gradient(180deg,#B9895C,#8E6440)`}} />
      {/* plant */}
      <svg width={220 * k} height={360 * k} viewBox="0 0 220 360" style={{position: 'absolute', right: 20 * k, top: floor - 330 * k}}>
        {[-40, -20, 0, 20, 40, -60, 60].map((a, i) => (
          <path key={i} d="M110 250 C100 180 90 120 110 40" transform={`rotate(${a + Math.sin(f / 50 + i) * 2} 110 250)`} fill="none" stroke={i % 2 ? '#4E8A55' : '#3E7447'} strokeWidth={22} strokeLinecap="round" />
        ))}
        <path d="M60 240 L160 240 L148 350 L72 350 Z" fill="#E9E1D6" stroke="#BFB3A3" strokeWidth={3} />
        <rect x="56" y="232" width="108" height="16" rx="6" fill={brand.accent} />
      </svg>
      <AbsoluteFill style={{background: 'radial-gradient(90% 70% at 50% 40%, transparent 60%, rgba(70,40,20,0.22) 100%)'}} />
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ easel board */
const Easel: React.FC<{x: number; y: number; w: number; h: number; k: number; floor: number; brand: Brand}> = ({x, y, w, h, k, floor, brand}) => (
  <>
    {/* legs */}
    <div style={{position: 'absolute', left: x + w * 0.18, top: y + h - 10 * k, width: 16 * k, height: floor - (y + h) + 60 * k, background: 'linear-gradient(90deg,#8B5A2B,#6E4320)', transform: 'rotate(8deg)', transformOrigin: 'top', borderRadius: 6 * k}} />
    <div style={{position: 'absolute', left: x + w * 0.82 - 16 * k, top: y + h - 10 * k, width: 16 * k, height: floor - (y + h) + 60 * k, background: 'linear-gradient(90deg,#8B5A2B,#6E4320)', transform: 'rotate(-8deg)', transformOrigin: 'top', borderRadius: 6 * k}} />
    <div style={{position: 'absolute', left: x - 14 * k, top: y - 14 * k, width: w + 28 * k, height: h + 28 * k, borderRadius: 14 * k, background: `linear-gradient(135deg, #FFF3D0, ${brand.accent} 40%, #8A6A2A 100%)`, boxShadow: `0 ${30 * k}px ${50 * k}px rgba(60,35,15,0.35)`}} />
    <div style={{position: 'absolute', left: x, top: y, width: w, height: h, borderRadius: 6 * k, background: 'linear-gradient(160deg,#FFFFFF,#F3F4F2)', boxShadow: `inset 0 0 ${14 * k}px rgba(0,0,0,0.12)`}} />
    {/* tray */}
    <div style={{position: 'absolute', left: x - 20 * k, top: y + h + 10 * k, width: w + 40 * k, height: 18 * k, borderRadius: 6 * k, background: 'linear-gradient(180deg,#B07A45,#7B4D25)'}} />
  </>
);

/* ------------------------------------------------------------------ the teacher */
type ArmPose = {sh: number; el: number}; // degrees; 0 = straight down, positive = towards screen-right
const lerpPose = (a: ArmPose, b: ArmPose, t: number): ArmPose => ({sh: a.sh + (b.sh - a.sh) * t, el: a.el + (b.el - a.el) * t});

export const Teacher: React.FC<{
  x: number;
  y: number;
  s: number;
  brand: Brand;
  talking: boolean;
  target?: {x: number; y: number}; // global point the pointer stick aims at
  leftPose: 'relax' | 'wave' | 'think' | 'thumb' | 'hip';
  enter?: number; // 0..1 walk-in progress
}> = ({x, y, s, brand, talking, target, leftPose, enter = 1}) => {
  const f = useCurrentFrame();
  const bob = Math.sin(f / 9) * (talking ? 3 : 1.5);
  const walk = enter < 1 ? Math.sin(f / 3) * 22 : 0;
  // blink every ~3.7s
  const bl = f % 110;
  const blink = bl > 104 ? 0.12 : 1;
  const mouthOpen = talking ? 0.25 + 0.75 * Math.abs(Math.sin(f / 2.6) * Math.cos(f / 4.1)) : 0;

  const shR = {x: 62, y: -372};
  const shL = {x: -62, y: -372};
  const up = 118;
  const lo = 110;
  const arm = (sh: {x: number; y: number}, pose: ArmPose) => {
    const a1 = (pose.sh * Math.PI) / 180;
    const ex = sh.x + Math.sin(a1) * up;
    const ey = sh.y + Math.cos(a1) * up;
    const a2 = ((pose.sh + pose.el) * Math.PI) / 180;
    const hx = ex + Math.sin(a2) * lo;
    const hy = ey + Math.cos(a2) * lo;
    return {ex, ey, hx, hy, a2};
  };
  // right arm aims at target
  let rPose: ArmPose = {sh: 18, el: 4};
  if (target) {
    const gx = (target.x - x) / s - shR.x;
    const gy = (target.y - (y + bob)) / s - shR.y;
    const ang = (Math.atan2(gx, gy) * 180) / Math.PI; // 0 = down, 90 = right, 180 = up
    rPose = {sh: Math.max(10, Math.min(170, ang - 8)), el: 10};
  }
  const lPoses: Record<string, ArmPose> = {
    relax: {sh: -16, el: -6},
    hip: {sh: -40, el: 80},
    wave: {sh: -150 + Math.sin(f / 4) * 14, el: -20 + Math.sin(f / 4) * 25},
    think: {sh: -30, el: -150},
    thumb: {sh: -60, el: -80},
  };
  const lPose = lPoses[leftPose] ?? lPoses.relax;
  const R = arm(shR, rPose);
  const L = arm(shL, lPose);
  const stroke = '#26231F';
  const sleeve = '#2E2C33';
  return (
    <svg width={1} height={1} style={{position: 'absolute', left: x, top: y + bob, overflow: 'visible'}}>
      <g transform={`scale(${s})`}>
        {/* shadow */}
        <ellipse cx={0} cy={4} rx={110} ry={16} fill="rgba(60,30,10,0.22)" />
        {/* legs */}
        <path d={`M -18 -196 L ${-34 - walk * 0.4} -4`} stroke={stroke} strokeWidth={12} strokeLinecap="round" />
        <path d={`M 18 -196 L ${34 + walk * 0.4} -4`} stroke={stroke} strokeWidth={12} strokeLinecap="round" />
        <ellipse cx={-44 - walk * 0.4} cy={-4} rx={26} ry={11} fill="#1F1D1B" />
        <ellipse cx={44 + walk * 0.4} cy={-4} rx={26} ry={11} fill="#1F1D1B" />
        {/* left arm behind */}
        <path d={`M ${shL.x} ${shL.y} L ${L.ex} ${L.ey} L ${L.hx} ${L.hy}`} fill="none" stroke={sleeve} strokeWidth={24} strokeLinecap="round" strokeLinejoin="round" />
        {/* torso (t-shirt) */}
        <path d="M -70 -384 C -40 -396 40 -396 70 -384 L 92 -330 L 66 -318 L 60 -190 C 20 -182 -20 -182 -60 -190 L -66 -318 L -92 -330 Z" fill="#E9D9BF" stroke={stroke} strokeWidth={5} strokeLinejoin="round" />
        {/* chest logo: piano + clef */}
        <g transform="translate(0 -292)">
          <rect x={-30} y={-24} width={60} height={46} rx={10} fill="#7A4E2D" />
          {[0, 1, 2, 3, 4].map((i) => (
            <rect key={i} x={-24 + i * 10} y={0} width={8} height={16} rx={1.5} fill="#F5EBDD" />
          ))}
          <path d="M 2 -6 C -8 -8 -8 -18 0 -20 C 8 -22 8 -12 2 -10 L -2 6" fill="none" stroke="#F5EBDD" strokeWidth={3} strokeLinecap="round" />
        </g>
        {/* neck + head */}
        <rect x={-9} y={-410} width={18} height={26} fill="#FFFDF8" stroke={stroke} strokeWidth={4} />
        <circle cx={0} cy={-462} r={62} fill="#FFFDF8" stroke={stroke} strokeWidth={5} />
        {/* hair */}
        <path d="M -60 -470 C -66 -446 -60 -432 -52 -424 C -54 -440 -50 -452 -44 -462 Z" fill="#6B3E22" />
        <path d="M 60 -470 C 66 -446 60 -432 52 -424 C 54 -440 50 -452 44 -462 Z" fill="#6B3E22" />
        {/* cap */}
        <path d="M -62 -478 C -60 -540 60 -540 62 -478 Z" fill="#1F2B4A" stroke={stroke} strokeWidth={4} />
        <path d="M -66 -480 C -30 -470 40 -470 92 -484 C 80 -470 40 -462 -66 -474 Z" fill="#17213A" stroke={stroke} strokeWidth={3} />
        <circle cx={0} cy={-532} r={5} fill="#17213A" />
        {/* face */}
        <path d="M -32 -476 Q -22 -482 -12 -476" fill="none" stroke={stroke} strokeWidth={4} strokeLinecap="round" />
        <path d="M 12 -476 Q 22 -482 32 -476" fill="none" stroke={stroke} strokeWidth={4} strokeLinecap="round" />
        <ellipse cx={-22} cy={-458} rx={6} ry={8 * blink} fill={stroke} />
        <ellipse cx={22} cy={-458} rx={6} ry={8 * blink} fill={stroke} />
        <circle cx={-38} cy={-438} r={8} fill="#F4B6A6" opacity={0.55} />
        <circle cx={38} cy={-438} r={8} fill="#F4B6A6" opacity={0.55} />
        {mouthOpen > 0.05 ? (
          <g>
            <path d={`M -18 -432 Q 0 ${-430 + 14 + mouthOpen * 12} 18 -432 Z`} fill="#7A2E2E" stroke={stroke} strokeWidth={3.5} strokeLinejoin="round" />
          </g>
        ) : (
          <path d="M -20 -434 Q 0 -416 20 -434" fill="none" stroke={stroke} strokeWidth={4.5} strokeLinecap="round" />
        )}
        {/* right arm (front) + pointer stick */}
        <path d={`M ${shR.x} ${shR.y} L ${R.ex} ${R.ey} L ${R.hx} ${R.hy}`} fill="none" stroke={sleeve} strokeWidth={24} strokeLinecap="round" strokeLinejoin="round" />
        {target ? <line x1={R.hx} y1={R.hy} x2={R.hx + Math.sin(R.a2) * 150} y2={R.hy + Math.cos(R.a2) * 150} stroke="#7B4D25" strokeWidth={7} strokeLinecap="round" /> : null}
        {target ? <circle cx={R.hx + Math.sin(R.a2) * 150} cy={R.hy + Math.cos(R.a2) * 150} r={6} fill={brand.accent} /> : null}
        <circle cx={R.hx} cy={R.hy} r={15} fill="#FFFDF8" stroke={stroke} strokeWidth={4} />
        <circle cx={L.hx} cy={L.hy} r={15} fill="#FFFDF8" stroke={stroke} strokeWidth={4} />
        {leftPose === 'thumb' ? <rect x={L.hx - 5} y={L.hy - 34} width={10} height={24} rx={5} fill="#FFFDF8" stroke={stroke} strokeWidth={3.5} /> : null}
      </g>
    </svg>
  );
};

/* ------------------------------------------------------------------ speech bubble */
const Bubble: React.FC<{x: number; y: number; w: number; k: number; text: string; o: number; brand: Brand; tailLeft: boolean}> = ({x, y, w, k, text, o, brand, tailLeft}) => (
  <div style={{position: 'absolute', left: x, top: y, width: w, opacity: o, transform: `scale(${0.94 + 0.06 * o})`, transformOrigin: tailLeft ? 'bottom left' : 'bottom right'}}>
    <div dir="rtl" style={{position: 'relative', background: '#FFFFFF', borderRadius: 26 * k, padding: `${20 * k}px ${26 * k}px`, border: `${3 * k}px solid #26231F`, boxShadow: `0 ${10 * k}px ${0}px ${hexA(brand.accent, 0.9)}`, fontFamily: FONT_HAND, fontWeight: 500, fontSize: Math.min(w / 16, 36 * k), lineHeight: 1.6, color: '#1E1E24', textAlign: 'right'}}>
      {text}
      <div style={{position: 'absolute', bottom: -26 * k, [tailLeft ? 'left' : 'right']: 60 * k, width: 0, height: 0, borderLeft: `${18 * k}px solid transparent`, borderRight: `${18 * k}px solid transparent`, borderTop: `${28 * k}px solid #26231F`}} />
    </div>
  </div>
);

/* ------------------------------------------------------------------ main */
const SceneInk: React.FC<{p: ScriptProps; i: number; dur: number; inks: Inks; g: ReturnType<typeof useGeom>}> = ({p, i, dur, inks, g}) => {
  const f = useCurrentFrame();
  const brand = resolveBrand(p);
  const layout = layoutScene(p.scenes[i], g.board.w, g.board.h, g.ub, dur, {episode: p.episode ? `جلسهٔ ${toFa(p.episode)}` : '', courseTitle: p.courseTitle, handle: p.handle, cta: p.cta, brandName: brand.nameFa});
  const fade = interpolate(f, [dur - 12, dur], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <div style={{position: 'absolute', left: g.board.x, top: g.board.y, width: g.board.w, height: g.board.h, opacity: fade}}>
      <BoardInk layout={layout} bw={g.board.w} bh={g.board.h} ink={inks} u={g.ub} />
    </div>
  );
};

export const Stickman: React.FC<ScriptProps> = (p) => {
  const brand = resolveBrand(p);
  const g = useGeom();
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const scenes: Scene[] = buildScenes('Stickman', p);
  const caps = buildCaptions(scenes);
  const inks: Inks = {title: INK[p.ink || 'blue'], body: '#1E2230', accent: '#B0472A', good: INK.green, fill: hexA(brand.accent2 || INK.blue, 0.3)};
  const si = Math.max(0, scenes.findIndex((s) => f >= s.from && f < s.from + s.frames));
  const sc = scenes[si] ?? scenes[0];
  const local = f - (sc?.from ?? 0);
  const kind = p.scenes[si]?.kind ?? 'explain';
  // pointer target follows the pen (same engine as the ink)
  const layout = sc ? layoutScene(p.scenes[si], g.board.w, g.board.h, g.ub, sc.frames, {episode: p.episode ? `جلسهٔ ${toFa(p.episode)}` : '', courseTitle: p.courseTitle, handle: p.handle, cta: p.cta, brandName: brand.nameFa}) : {items: [], end: 0};
  const pen = penAt(layout.items, local, {x: g.mode === 'port' ? g.board.w * 0.3 : 0, y: g.board.h * 0.95});
  const target = g.mode === 'port' ? undefined : {x: g.board.x + pen.x, y: g.board.y + pen.y};
  const cap = caps.find((c) => f >= c.from && f < c.to + 4);
  const talking = !!caps.find((c) => f >= c.from && f < c.to);
  const capO = cap ? Math.min(interpolate(f, [cap.from, cap.from + 6], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}), interpolate(f, [cap.to, cap.to + 4], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})) : 0;
  const answerAt = sc ? sc.frames * 0.72 : 0;
  const leftPose = kind === 'title' && local < 75 ? 'wave' : kind === 'outro' && local > 20 ? 'wave' : kind === 'quiz' ? (local < answerAt ? 'think' : 'thumb') : kind === 'exercise' ? 'thumb' : 'hip';
  const enter = spring({frame: f, fps, config: {damping: 200}, durationInFrames: 30});
  const manX = g.man.x - (1 - enter) * 500 * g.k;
  return (
    <Stage p={p} watermark={false} noBackdrop>
      <Room brand={brand} floor={g.floor} />
      <Easel x={g.board.x} y={g.board.y} w={g.board.w} h={g.board.h} k={g.k} floor={g.floor} brand={brand} />
      {scenes.map((s, i) => (
        <Sequence key={i} from={s.from} durationInFrames={s.frames} name={s.label}>
          <SceneInk p={p} i={i} dur={s.frames} inks={inks} g={g} />
        </Sequence>
      ))}
      <Teacher x={manX} y={g.man.y} s={g.man.s} brand={brand} talking={talking} target={target} leftPose={leftPose as any} enter={enter} />
      {p.captions !== false && cap ? <Bubble x={g.bubble.x} y={g.bubble.y} w={g.bubble.w} k={g.k} text={cap.text} o={capO} brand={brand} tailLeft={g.mode !== 'land'} /> : null}
      {/* brand plate */}
      <div style={{position: 'absolute', left: 36 * g.k, top: g.mode === 'land' ? undefined : 40 * g.k, bottom: g.mode === 'land' ? 36 * g.k : undefined, direction: 'ltr', display: g.mode === 'port' ? 'none' : 'block'}}>
        <div style={{fontFamily: FONT_LATIN_SERIF, fontWeight: 700, fontSize: 26 * g.k, letterSpacing: 4 * g.k, color: '#5A3A1E'}}>{brand.nameEn}</div>
      </div>
      {g.mode === 'port' ? (
        <div style={{position: 'absolute', left: 0, right: 0, top: 40 * g.k, textAlign: 'center', fontFamily: FONT_LATIN_SERIF, fontWeight: 700, fontSize: 30 * g.k, letterSpacing: 5 * g.k, color: '#5A3A1E', direction: 'ltr'}}>
          {brand.nameEn}
          <span style={{fontFamily: FONT_HAND, letterSpacing: 0, fontSize: 26 * g.k, color: '#8A5A30'}}>{p.episode ? `  ·  جلسهٔ ${toFa(p.episode)}` : ''}</span>
        </div>
      ) : null}
    </Stage>
  );
};
