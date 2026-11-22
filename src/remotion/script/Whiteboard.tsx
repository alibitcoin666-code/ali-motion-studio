import React from 'react';
import {AbsoluteFill, interpolate, random, Sequence, useCurrentFrame, useVideoConfig} from 'remotion';
import {Brand, hexA, resolveBrand, toFa} from '../theme';
import {Stage} from '../components/core';
import {FONT_HAND, FONT_LATIN_SERIF} from '../fonts';
import {buildScenes} from '../../narration/narration';
import {BoardInk, Inks} from './Board';
import {layoutScene, penAt} from './layout';
import {INK, ScriptProps} from './types';

/* ------------------------------------------------------------------ geometry per format */
export const useBoardGeom = () => {
  const {width, height} = useVideoConfig();
  if (width > height) {
    const k = width / 1920;
    return {k, mode: 'land' as const, bx: 70 * k, by: 56 * k, bw: 1360 * k, bh: 800 * k, ub: 1.22 * k, side: {x: 1478 * k, y: 70 * k, w: 380 * k, h: 520 * k}};
  }
  const k = width / 1080;
  if (height === width) return {k, mode: 'square' as const, bx: 40 * k, by: 120 * k, bw: 1000 * k, bh: 790 * k, ub: 0.9 * k, side: {x: 0, y: 0, w: 0, h: 0}};
  return {k, mode: 'port' as const, bx: 44 * k, by: 360 * k, bw: 992 * k, bh: 1090 * k, ub: 1.05 * k, side: {x: 60 * k, y: 60 * k, w: 960 * k, h: 260 * k}};
};

/* ------------------------------------------------------------------ chalk wall */
const DOODLES = [
  'M0 30 L0 -10 C6 -4 14 0 14 10 M0 30 C-8 26 -12 34 -4 38 C2 40 4 34 0 30', // eighth note
  'M0 30 L0 -6 L26 -12 L26 24 M0 30 C-8 26 -12 34 -4 38 C2 40 4 34 0 30 M26 24 C18 20 14 28 22 32 C28 34 30 28 26 24', // beamed
  'M-4 -12 L-4 22 M6 -16 L6 18 M-12 0 L14 -6 M-12 12 L14 6', // sharp
  'M0 -18 L0 22 C10 12 18 4 8 0 C4 -2 0 4 0 6', // flat
  'M-14 0 C-14 -20 14 -20 14 0 M-18 0 L-18 12 L-10 12 L-10 0 Z M18 0 L18 12 L10 12 L10 0 Z', // headphones
  'M-16 -8 L16 -8 L16 14 L-16 14 Z M-8 -8 L-8 14 M0 -8 L0 14 M8 -8 L8 14', // mini piano
  'M-20 0 C-12 -10 -4 10 4 0 C12 -10 20 10 28 0', // wave
  'M0 -14 L4 -4 L14 -4 L6 2 L9 12 L0 6 L-9 12 L-6 2 L-14 -4 L-4 -4 Z', // star
];
const ChalkWall: React.FC<{brand: Brand}> = ({brand}) => {
  const {width, height} = useVideoConfig();
  const f = useCurrentFrame();
  const k = Math.min(width, height) / 1080;
  const n = 34;
  return (
    <AbsoluteFill style={{background: 'radial-gradient(120% 90% at 40% 30%, #3C4245 0%, #2B3033 55%, #1F2325 100%)'}}>
      <svg width={width} height={height} style={{position: 'absolute', inset: 0}}>
        {Array.from({length: n}).map((_, i) => {
          const x = random(`dx${i}`) * width;
          const y = random(`dy${i}`) * height;
          const s = (1.4 + random(`ds${i}`) * 1.4) * k;
          const r = (random(`dr${i}`) - 0.5) * 50;
          const tw = 0.18 + 0.12 * Math.sin(f / 40 + i);
          return (
            <path key={i} d={DOODLES[i % DOODLES.length]} transform={`translate(${x} ${y}) rotate(${r}) scale(${s})`} fill="none" stroke="#FFFFFF" strokeOpacity={tw} strokeWidth={2.2 / s * k} strokeLinecap="round" strokeLinejoin="round" />
          );
        })}
      </svg>
      {/* chalk dust smudges */}
      <AbsoluteFill style={{background: 'radial-gradient(40% 30% at 70% 80%, rgba(255,255,255,0.06), transparent 70%), radial-gradient(30% 25% at 15% 20%, rgba(255,255,255,0.05), transparent 70%)'}} />
      {/* warm luxury key light */}
      <AbsoluteFill style={{background: `radial-gradient(60% 50% at 45% 40%, ${hexA(brand.accent, 0.10)}, transparent 70%)`}} />
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ board with wooden frame */
const WoodFrame: React.FC<{x: number; y: number; w: number; h: number; k: number; brand: Brand}> = ({x, y, w, h, k, brand}) => {
  const t = 24 * k;
  const wood = 'linear-gradient(180deg, #A9743F 0%, #8B5A2B 45%, #6E4320 100%)';
  return (
    <>
      <div style={{position: 'absolute', left: x - t, top: y - t, width: w + t * 2, height: h + t * 2, borderRadius: 10 * k, background: wood, boxShadow: `0 ${30 * k}px ${60 * k}px rgba(0,0,0,0.55), inset 0 ${2 * k}px 0 rgba(255,255,255,0.25)`}}>
        {/* wood grain */}
        <div style={{position: 'absolute', inset: 0, borderRadius: 10 * k, opacity: 0.35, background: 'repeating-linear-gradient(90deg, rgba(60,30,10,0.0) 0px, rgba(60,30,10,0.35) 2px, rgba(60,30,10,0.0) 7px, rgba(255,220,170,0.12) 13px, rgba(60,30,10,0.0) 19px)'}} />
        {/* brass corners (luxury touch) */}
        {[
          [0, 0],
          [1, 0],
          [0, 1],
          [1, 1],
        ].map(([cx, cy], i) => (
          <div key={i} style={{position: 'absolute', left: cx ? undefined : 6 * k, right: cx ? 6 * k : undefined, top: cy ? undefined : 6 * k, bottom: cy ? 6 * k : undefined, width: 26 * k, height: 26 * k, borderRadius: 6 * k, background: `linear-gradient(135deg, #FFF1C9, ${brand.accent} 45%, #7A5A1E)`, boxShadow: `0 ${2 * k}px ${4 * k}px rgba(0,0,0,0.4)`}} />
        ))}
      </div>
      <div style={{position: 'absolute', left: x, top: y, width: w, height: h, borderRadius: 4 * k, background: 'linear-gradient(160deg, #FFFFFF 0%, #F6F7F5 55%, #ECEEEB 100%)', boxShadow: `inset 0 0 ${18 * k}px rgba(0,0,0,0.18)`, overflow: 'hidden'}}>
        {/* faint ghost of old erased writing + glossy reflection */}
        <div style={{position: 'absolute', inset: 0, background: 'radial-gradient(35% 18% at 30% 70%, rgba(120,130,140,0.07), transparent 70%), radial-gradient(28% 14% at 75% 30%, rgba(120,130,140,0.06), transparent 70%)'}} />
        <div style={{position: 'absolute', top: -h * 0.3, left: -w * 0.2, width: w * 0.5, height: h * 1.6, transform: 'rotate(18deg)', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.55), transparent)', opacity: 0.5}} />
      </div>
    </>
  );
};

const Tray: React.FC<{x: number; y: number; w: number; k: number; brand: Brand; inkTitle: string}> = ({x, y, w, k, brand, inkTitle}) => {
  const h = 30 * k;
  const marker = (c: string, mx: number, rot: number) => (
    <div style={{position: 'absolute', left: mx, top: -16 * k, width: 150 * k, height: 22 * k, transform: `rotate(${rot}deg)`, display: 'flex', filter: `drop-shadow(0 ${4 * k}px ${4 * k}px rgba(0,0,0,0.45))`}}>
      <div style={{width: 18 * k, background: c, borderRadius: `${10 * k}px 0 0 ${10 * k}px`}} />
      <div style={{flex: 1, background: 'linear-gradient(180deg,#FFFFFF,#D9D9D9)', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
        <div style={{width: '70%', height: 6 * k, background: c, borderRadius: 3 * k, opacity: 0.85}} />
      </div>
      <div style={{width: 40 * k, background: c, borderRadius: `0 ${6 * k}px ${6 * k}px 0`}} />
    </div>
  );
  return (
    <div style={{position: 'absolute', left: x - 30 * k, top: y, width: w + 60 * k, height: h, background: 'linear-gradient(180deg,#B07A45,#7B4D25)', borderRadius: 6 * k, boxShadow: `0 ${14 * k}px ${24 * k}px rgba(0,0,0,0.5)`}}>
      {marker(inkTitle, w * 0.12, -4)}
      {marker(INK.blue, w * 0.24, 3)}
      {marker(INK.black, w * 0.36, -2)}
      {/* eraser with brand */}
      <div style={{position: 'absolute', right: w * 0.1, top: -40 * k, width: 190 * k, height: 50 * k, borderRadius: 8 * k, background: 'linear-gradient(180deg,#2F7D4F,#1F5C38)', boxShadow: `0 ${6 * k}px ${10 * k}px rgba(0,0,0,0.45)`, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
        <div style={{position: 'absolute', bottom: 0, left: 0, right: 0, height: 12 * k, background: '#3A3A3A', borderRadius: `0 0 ${8 * k}px ${8 * k}px`}} />
        <span style={{fontFamily: FONT_LATIN_SERIF, fontWeight: 700, fontSize: 18 * k, letterSpacing: 3 * k, color: brand.accent, marginBottom: 10 * k}}>{brand.nameEn}</span>
      </div>
    </div>
  );
};

/** Cork board with pinned notes: lesson number + key point. */
const CorkBoard: React.FC<{x: number; y: number; w: number; h: number; k: number; brand: Brand; p: ScriptProps; landscape: boolean}> = ({x, y, w, h, k, brand, p, landscape}) => {
  const f = useCurrentFrame();
  const pin = (c: string, px: number, py: number) => (
    <div style={{position: 'absolute', left: px - 10 * k, top: py - 10 * k, width: 20 * k, height: 20 * k, borderRadius: 99, background: `radial-gradient(circle at 35% 30%, #FFFFFF 0%, ${c} 35%, ${c} 70%, #00000088 100%)`, boxShadow: `${3 * k}px ${5 * k}px ${5 * k}px rgba(0,0,0,0.4)`, zIndex: 2}} />
  );
  const sway = (i: number) => Math.sin(f / 50 + i) * 0.8;
  const noteW = landscape ? w * 0.8 : w * 0.42;
  return (
    <div style={{position: 'absolute', left: x, top: y, width: w, height: h, borderRadius: 8 * k, background: 'linear-gradient(180deg,#8B5A2B,#6E4320)', padding: 12 * k, boxShadow: `0 ${20 * k}px ${40 * k}px rgba(0,0,0,0.5)`}}>
      <div style={{position: 'relative', width: '100%', height: '100%', borderRadius: 4 * k, background: '#C08A57', backgroundImage: 'radial-gradient(rgba(90,50,20,0.35) 1.2px, transparent 1.4px), radial-gradient(rgba(255,230,190,0.25) 1px, transparent 1.2px)', backgroundSize: `${7 * k}px ${7 * k}px, ${11 * k}px ${11 * k}px`, overflow: 'hidden'}}>
        {/* sticky: episode */}
        <div dir="rtl" style={{position: 'absolute', right: 16 * k, top: 18 * k, width: noteW, padding: `${16 * k}px ${18 * k}px`, background: 'linear-gradient(180deg,#FFE98A,#F7D85A)', transform: `rotate(${-3 + sway(1)}deg)`, boxShadow: `${4 * k}px ${8 * k}px ${12 * k}px rgba(0,0,0,0.35)`, fontFamily: FONT_HAND}}>
          {pin('#D7263D', noteW / 2, 0)}
          <div style={{fontSize: 22 * k, color: '#6B4E00'}}>{p.courseTitle}</div>
          <div style={{fontSize: 40 * k, fontWeight: 700, color: '#2B2100'}}>{p.episode ? `جلسهٔ ${toFa(p.episode)}` : brand.nameFa}</div>
        </div>
        {/* blue paper: key point */}
        {p.keyPoint ? (
          <div dir="rtl" style={{position: 'absolute', right: landscape ? 30 * k : undefined, left: landscape ? undefined : 18 * k, top: landscape ? 190 * k : 18 * k, width: noteW, padding: `${18 * k}px ${20 * k}px`, background: 'linear-gradient(180deg,#5AA0E6,#3D7FC8)', transform: `rotate(${2.5 + sway(2)}deg)`, boxShadow: `${4 * k}px ${8 * k}px ${12 * k}px rgba(0,0,0,0.35)`, fontFamily: FONT_HAND, color: '#FFFFFF'}}>
            {pin('#F2C94C', noteW / 2, 0)}
            <div style={{fontSize: 22 * k, opacity: 0.85}}>نکتهٔ کلیدی</div>
            <div style={{fontSize: 27 * k, fontWeight: 600, lineHeight: 1.5}}>{p.keyPoint}</div>
          </div>
        ) : null}
        {pin('#2F80ED', 30 * k, h - 50 * k)}
        {pin('#27AE60', w - 50 * k, h - 40 * k)}
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ hand holding a marker */
const MarkerHand: React.FC<{x: number; y: number; k: number; color: string; down: boolean}> = ({x, y, k, color, down}) => {
  const f = useCurrentFrame();
  const lift = down ? Math.sin(f * 1.7) * 1.5 * k : -10 * k;
  return (
    <div style={{position: 'absolute', left: x, top: y + lift, width: 0, height: 0, zIndex: 20, pointerEvents: 'none'}}>
      <svg width={420 * k} height={420 * k} viewBox="0 0 420 420" style={{position: 'absolute', left: -6 * k, top: -6 * k, overflow: 'visible', filter: `drop-shadow(${14 * k}px ${18 * k}px ${12 * k}px rgba(0,0,0,0.28))`}}>
        <g transform="translate(6 6) rotate(-32)">
          {/* marker */}
          <path d="M0 0 L10 -6 L14 26 L-4 28 Z" fill={color} />
          <rect x="-10" y="24" width="30" height="34" rx="4" fill="#2A2A2A" />
          <rect x="-12" y="56" width="34" height="170" rx="10" fill="#FAFAFA" stroke="#D6D6D6" strokeWidth="2" />
          <rect x="-12" y="110" width="34" height="46" fill={color} />
          <rect x="-14" y="200" width="38" height="56" rx="10" fill={color} />
        </g>
        {/* hand (skin) wrapped around the marker */}
        <g transform="translate(6 6) rotate(-32)">
          <path d="M-26 70 C-46 74 -52 100 -40 116 C-30 128 -14 124 -8 112 Z" fill="#E8B596" />
          <path d="M-34 104 C-60 120 -62 160 -40 186 C-20 208 40 214 60 190 C80 166 78 120 56 98 C40 82 0 84 -34 104 Z" fill="#F1C3A3" />
          <path d="M30 82 C46 70 66 78 66 96 C66 112 48 118 34 110 Z" fill="#EBB898" />
          <path d="M-10 92 C-2 80 16 80 22 92" fill="none" stroke="#D99B7A" strokeWidth="4" strokeLinecap="round" />
          <path d="M-40 186 C-30 230 -20 300 -10 420 L120 420 C100 300 80 230 60 190 Z" fill="#1E2A44" />
          <path d="M-42 182 C-20 196 40 202 62 186" fill="none" stroke="#FFFFFF" strokeOpacity="0.35" strokeWidth="6" />
        </g>
      </svg>
    </div>
  );
};

/* ------------------------------------------------------------------ main */
const SceneBoard: React.FC<{p: ScriptProps; i: number; dur: number; last: boolean; inks: Inks; g: ReturnType<typeof useBoardGeom>; withHand: boolean}> = ({p, i, dur, last, inks, g, withHand}) => {
  const f = useCurrentFrame();
  const sc = p.scenes[i];
  const brand = resolveBrand(p);
  const layout = layoutScene(sc, g.bw, g.bh, g.ub, dur, {episode: p.episode ? `جلسهٔ ${toFa(p.episode)}` : '', courseTitle: p.courseTitle, handle: p.handle, cta: p.cta, brandName: brand.nameFa});
  const eraseStart = dur - 18;
  const erase = last ? 0 : interpolate(f, [eraseStart, dur - 2], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const rest = {x: g.bw + 260 * g.k, y: g.bh + 520 * g.k};
  const pen = penAt(layout.items, f, rest);
  const eraserX = g.bw * (1 - erase);
  return (
    <AbsoluteFill>
      <div style={{position: 'absolute', left: g.bx, top: g.by, width: g.bw, height: g.bh}}>
        <BoardInk layout={layout} bw={g.bw} bh={g.bh} ink={inks} u={g.ub} erase={erase} />
        {erase > 0 && erase < 1 ? (
          <div style={{position: 'absolute', left: eraserX - 90 * g.k, top: g.bh * 0.5 - 60 * g.k + Math.sin(f) * 40 * g.k, width: 180 * g.k, height: 110 * g.k, borderRadius: 12 * g.k, background: 'linear-gradient(180deg,#2F7D4F,#1F5C38)', boxShadow: `0 ${10 * g.k}px ${20 * g.k}px rgba(0,0,0,0.35)`, zIndex: 15}} />
        ) : null}
      </div>
      {withHand && erase === 0 ? <MarkerHand x={g.bx + pen.x} y={g.by + pen.y} k={g.k} color={inks.title} down={pen.down} /> : null}
    </AbsoluteFill>
  );
};

export const Whiteboard: React.FC<ScriptProps> = (p) => {
  const brand = resolveBrand(p);
  const g = useBoardGeom();
  const f = useCurrentFrame();
  const scenes = buildScenes('Whiteboard', p);
  const inks: Inks = {title: INK[p.ink || 'red'], body: '#1E2230', accent: INK.blue, good: INK.green, fill: hexA(INK[p.ink || 'red'], 0.28)};
  const k = g.k;
  const sweep = interpolate(f % 300, [0, 80], [-0.4, 1.4], {extrapolateRight: 'clamp'});
  return (
    <Stage p={p} tid="Whiteboard" watermark={false} noBackdrop captionsBottom={g.mode === 'land' ? 34 * k : g.mode === 'square' ? 26 * k : 250 * k}>
      <ChalkWall brand={brand} />
      <WoodFrame x={g.bx} y={g.by} w={g.bw} h={g.bh} k={k} brand={brand} />
      {g.mode !== 'square' ? <CorkBoard x={g.side.x} y={g.side.y} w={g.side.w} h={g.side.h} k={k} brand={brand} p={p} landscape={g.mode === 'land'} /> : null}
      {scenes.map((s, i) => (
        <Sequence key={i} from={s.from} durationInFrames={s.frames} name={s.label}>
          <SceneBoard p={p} i={i} dur={s.frames} last={i === scenes.length - 1} inks={inks} g={g} withHand />
        </Sequence>
      ))}
      {/* glossy light sweep across the board */}
      <div style={{position: 'absolute', left: g.bx, top: g.by, width: g.bw, height: g.bh, overflow: 'hidden', pointerEvents: 'none'}}>
        <div style={{position: 'absolute', top: 0, bottom: 0, width: g.bw * 0.18, left: g.bw * sweep, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent)', transform: 'skewX(-18deg)'}} />
      </div>
      <Tray x={g.bx} y={g.by + g.bh + 24 * k} w={g.bw} k={k} brand={brand} inkTitle={inks.title} />
      {/* chalk logo */}
      <div style={{position: 'absolute', right: 40 * k, top: g.mode === 'square' ? 22 * k : undefined, bottom: g.mode === 'square' ? undefined : (g.mode === 'land' ? 120 : 120) * k, textAlign: 'center', direction: 'ltr', opacity: 0.92}}>
        <div style={{fontFamily: FONT_LATIN_SERIF, fontSize: 30 * k, letterSpacing: 5 * k, fontWeight: 700, color: brand.accent, textShadow: `0 0 ${8 * k}px ${hexA(brand.accent, 0.4)}`}}>{brand.nameEn}</div>
        <div style={{fontFamily: FONT_HAND, fontSize: 22 * k, color: 'rgba(255,255,255,0.75)', direction: 'rtl'}}>{p.handle || brand.handle}</div>
      </div>
    </Stage>
  );
};
