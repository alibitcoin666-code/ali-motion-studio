import React from 'react';
import {AbsoluteFill, Easing, interpolate, random, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {Audio} from '@remotion/media';
import {BaseProps, Brand, hexA, resolveBrand} from '../theme';
import {FONT_FA, FONT_LATIN_SERIF, useFontsReady} from '../fonts';
import {Bokeh, GoldText, Grain, LightLeak, PhotoBackground, resolveBgImage} from './luxe';
import {buildCaptions, buildScenes} from '../../narration/narration';
import {Captions} from './Captions';

/** Whether the luxe look is active (provided by <Stage>). */
export const LuxeContext = React.createContext(false);

/** Scale unit: 1 = 1px on a 1080px short side. */
export const useUnit = () => {
  const {width, height} = useVideoConfig();
  const square = height === width;
  // Square uses the stacked (vertical) layout, scaled down to fit the shorter canvas.
  return {u: (Math.min(width, height) / 1080) * (square ? 0.74 : 1), width, height, vertical: height >= width, square};
};

export const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

/** Smooth in/out envelope for a scene of `dur` frames. */
export const useEnvelope = (dur: number, inF = 12, outF = 12) => {
  const f = useCurrentFrame();
  const a = interpolate(f, [0, inF], [0, 1], {...clamp, easing: Easing.out(Easing.cubic)});
  const b = interpolate(f, [dur - outF, dur], [1, 0], {...clamp, easing: Easing.in(Easing.cubic)});
  return Math.min(a, b);
};

/* ---------------------------------------------------------- Backdrop */
export const Backdrop: React.FC<{brand: Brand; intensity?: number}> = ({brand, intensity = 1}) => {
  const f = useCurrentFrame();
  const {width, height} = useVideoConfig();
  const breathe = 0.5 + 0.5 * Math.sin(f / 45);
  const dust = new Array(46).fill(0).map((_, i) => {
    const x0 = random(`dx${i}`) * width;
    const y0 = random(`dy${i}`) * height;
    const sp = 0.15 + random(`ds${i}`) * 0.55;
    const r = 0.8 + random(`dr${i}`) * 2.6;
    const y = ((y0 - f * sp * 2) % height + height) % height;
    const x = x0 + Math.sin((f + i * 40) / 60) * 14;
    const tw = 0.25 + 0.75 * Math.abs(Math.sin((f + i * 17) / (20 + i)));
    return {x, y, r, o: tw * 0.55 * intensity};
  });
  const lines = new Array(9).fill(0).map((_, i) => ({
    y: (height / 10) * (i + 1),
    o: 0.035 + 0.03 * Math.sin((f + i * 30) / 50),
  }));
  return (
    <AbsoluteFill style={{background: `linear-gradient(160deg, ${brand.bg2} 0%, ${brand.bg} 55%, ${brand.bg} 100%)`}}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle, ${hexA(brand.accent, 0.10 + 0.06 * breathe * intensity)} 0%, ${hexA(brand.accent, 0)} 60%)`,
        }}
      />
      <svg width={width} height={height} style={{position: 'absolute', inset: 0}}>
        {lines.map((l, i) => (
          <rect key={i} x={0} y={l.y} width={width} height={1} fill={brand.accent} opacity={l.o * intensity} />
        ))}
        {dust.map((d, i) => (
          <circle key={i} cx={d.x} cy={d.y} r={d.r} fill={brand.accent} opacity={d.o} />
        ))}
      </svg>
      {/* vignette */}
      <AbsoluteFill
        style={{background: `radial-gradient(circle, rgba(0,0,0,0) 45%, rgba(0,0,0,0.55) 100%)`}}
      />
    </AbsoluteFill>
  );
};

/* ---------------------------------------------------------- Stage (wrapper used by all templates) */
export const Stage: React.FC<React.PropsWithChildren<{p: BaseProps; intensity?: number; watermark?: boolean; tid?: string; captionsBottom?: number; lightCaptions?: boolean; noBackdrop?: boolean}>> = ({
  p,
  children,
  intensity,
  watermark = true,
  tid,
  captionsBottom,
  lightCaptions,
  noBackdrop,
}) => {
  useFontsReady();
  const brand = resolveBrand(p);
  const luxe = p.look !== 'clean';
  const bg = resolveBgImage(p.bgImage);
  // Duck background music under the voice-over.
  const musicVol = (p.audioVolume ?? 1) * (p.narrationUrl ? 0.3 : 1);
  return (
    <LuxeContext.Provider value={luxe}>
      <AbsoluteFill style={{fontFamily: FONT_FA, color: brand.text, direction: 'rtl', overflow: 'hidden'}}>
        {noBackdrop ? null : <Backdrop brand={brand} intensity={intensity} />}
        {bg && !noBackdrop ? <PhotoBackground src={bg} brand={brand} /> : null}
        {luxe && !noBackdrop ? <LightLeak brand={brand} /> : null}
        {luxe && !noBackdrop ? <Bokeh brand={brand} /> : null}
        {children}
        {tid && p.captions ? <Captions brand={brand} caps={buildCaptions(buildScenes(tid, p))} bottom={captionsBottom} light={lightCaptions} /> : null}
        {watermark && p.showWatermark !== false ? <Watermark brand={brand} /> : null}
        {luxe ? <Grain /> : null}
        {p.audioUrl ? <Audio src={p.audioUrl} volume={musicVol} /> : null}
        {p.narrationUrl ? <Audio src={p.narrationUrl} volume={p.narrationVolume ?? 1} /> : null}
      </AbsoluteFill>
    </LuxeContext.Provider>
  );
};

export const Watermark: React.FC<{brand: Brand}> = ({brand}) => {
  const {u, vertical} = useUnit();
  const f = useCurrentFrame();
  const o = interpolate(f, [10, 30], [0, 0.75], clamp);
  return (
    <div
      style={{
        position: 'absolute',
        top: (vertical ? 70 : 44) * u,
        left: 48 * u,
        display: 'flex',
        alignItems: 'center',
        gap: 12 * u,
        opacity: o,
        direction: 'ltr',
      }}
    >
      <div style={{width: 10 * u, height: 10 * u, borderRadius: 99, background: brand.accent}} />
      <div style={{fontFamily: FONT_LATIN_SERIF, fontSize: 22 * u, letterSpacing: 4 * u, color: brand.text, fontWeight: 600}}>
        {brand.nameEn}
      </div>
    </div>
  );
};

/** Split text into words; spans wrapped in *stars* (one or many words) are flagged as highlighted. */
export const tokenizeMarked = (text: string): {t: string; hi: boolean}[] => {
  const out: {t: string; hi: boolean}[] = [];
  let hi = false;
  for (const raw of (text || '').split(/\s+/).filter(Boolean)) {
    let w = raw;
    let open = hi;
    let closeAfter = false;
    if (w.startsWith('*')) { open = true; w = w.slice(1); }
    if (w.endsWith('*')) { closeAfter = true; w = w.slice(0, -1); }
    w = w.replace(/\*/g, '');
    if (w) out.push({t: w, hi: open});
    hi = closeAfter ? false : open;
  }
  return out;
};
export const stripMarks = (text: string) => (text || '').replace(/\*/g, '');

/* ---------------------------------------------------------- Kinetic words (RTL safe: animates whole words, never splits letters) */
export const Words: React.FC<{
  text: string;
  start?: number;
  stagger?: number;
  size: number;
  color: string;
  weight?: number;
  font?: string;
  highlight?: string; // words wrapped in *stars* get this color
  align?: 'center' | 'flex-start' | 'flex-end';
  lineHeight?: number;
  maxWidth?: number;
  mode?: 'rise' | 'slam' | 'blur';
}> = ({text, start = 0, stagger = 4, size, color, weight = 800, font, highlight, align = 'center', lineHeight = 1.35, maxWidth, mode = 'rise'}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const luxe = React.useContext(LuxeContext);
  const words = tokenizeMarked(text);
  // keep highlighted phrases (up to 3 words) together on one line
  const groups: {w: {t: string; hi: boolean}; i: number}[][] = [];
  words.forEach((w, i) => {
    const last = groups[groups.length - 1];
    if (w.hi && last && last[0].w.hi && last.length < 3 && words[i - 1]?.hi) last.push({w, i});
    else groups.push([{w, i}]);
  });
  return (
    <div
      dir="rtl"
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: align,
        columnGap: size * 0.28,
        rowGap: size * (lineHeight - 1),
        maxWidth,
        fontFamily: font ?? FONT_FA,
      }}
    >
      {groups.map((g, gi) => {
        const renderWord = (w: {t: string; hi: boolean}, i: number) => {
        const isHi = w.hi;
        const clean = w.t;
        const s = spring({frame: f - start - i * stagger, fps, config: mode === 'slam' ? {damping: 11, mass: 0.6, stiffness: 180} : {damping: 16, mass: 0.7}});
        const y = mode === 'slam' ? interpolate(s, [0, 1], [size * 0.9, 0]) : interpolate(s, [0, 1], [size * 0.55, 0]);
        const sc = mode === 'slam' ? interpolate(s, [0, 1], [1.35, 1]) : 1;
        const blur = interpolate(s, [0, 1], [mode === 'blur' ? 18 : 8, 0], clamp);
        return (
          <span
            key={i}
            style={{
              display: 'inline-block',
              fontSize: size,
              fontWeight: weight,
              lineHeight,
              color: isHi ? highlight ?? color : color,
              opacity: interpolate(s, [0, 0.6], [0, 1], clamp),
              transform: `translateY(${y}px) scale(${sc})`,
              filter: blur > 0.3 ? `blur(${blur}px)` : undefined,
            }}
          >
            {isHi && luxe && highlight ? <GoldText accent={highlight} offset={i * 25}>{clean}</GoldText> : clean}
          </span>
        );
        };
        if (g.length === 1) return renderWord(g[0].w, g[0].i);
        return (
          <span key={`g${gi}`} style={{display: 'inline-flex', flexWrap: 'nowrap', columnGap: size * 0.28, direction: 'rtl'}}>
            {g.map((x) => renderWord(x.w, x.i))}
          </span>
        );
      })}
    </div>
  );
};

/* ---------------------------------------------------------- Accent rule that draws itself */
export const Rule: React.FC<{brand: Brand; start?: number; width: number; height?: number; color?: string}> = ({brand, start = 0, width, height = 4, color}) => {
  const f = useCurrentFrame();
  const p = interpolate(f - start, [0, 18], [0, 1], {...clamp, easing: Easing.out(Easing.exp)});
  return (
    <div style={{width, height, position: 'relative'}}>
      <div style={{position: 'absolute', right: 0, top: 0, height, width: width * p, background: color ?? brand.accent, borderRadius: height}} />
    </div>
  );
};

/* ---------------------------------------------------------- Pill badge */
export const Badge: React.FC<{brand: Brand; text: string; start?: number; size?: number; solid?: boolean}> = ({brand, text, start = 0, size = 30, solid}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = spring({frame: f - start, fps, config: {damping: 14}});
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: size * 0.4,
        padding: `${size * 0.32}px ${size * 0.8}px`,
        borderRadius: 999,
        border: `${Math.max(1.5, size / 16)}px solid ${brand.accent}`,
        background: solid ? brand.accent : hexA(brand.accent, 0.08),
        color: solid ? brand.bg : brand.accent,
        fontSize: size,
        fontWeight: 700,
        opacity: s,
        transform: `scale(${interpolate(s, [0, 1], [0.7, 1])})`,
      }}
    >
      {text}
    </div>
  );
};

/* ---------------------------------------------------------- Subscribe CTA */
export const SubscribeCTA: React.FC<{brand: Brand; text: string; handle: string; start?: number; size?: number}> = ({brand, text, handle, start = 0, size = 44}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = spring({frame: f - start, fps, config: {damping: 12}});
  const click = spring({frame: f - start - 28, fps, config: {damping: 9, stiffness: 220}});
  const pressed = interpolate(click, [0, 0.5, 1], [1, 0.9, 1]);
  const bell = Math.sin((f - start - 30) / 2.2) * interpolate(f - start, [30, 40, 60], [0, 18, 0], clamp);
  return (
    <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: size * 0.5, opacity: s, transform: `translateY(${(1 - s) * 60}px)`}}>
      <div style={{display: 'flex', alignItems: 'center', gap: size * 0.4}}>
        <div
          style={{
            padding: `${size * 0.4}px ${size * 1.1}px`,
            borderRadius: size * 0.35,
            background: click > 0.5 ? brand.bg2 : brand.accent2,
            border: `2px solid ${click > 0.5 ? brand.accent : brand.accent2}`,
            color: click > 0.5 ? brand.accent : '#fff',
            fontSize: size,
            fontWeight: 800,
            transform: `scale(${pressed})`,
            boxShadow: `0 ${size * 0.3}px ${size}px ${hexA(brand.accent2, 0.35)}`,
          }}
        >
          {click > 0.5 ? 'دنبال شد ✓' : text}
        </div>
        <svg width={size * 1.4} height={size * 1.4} viewBox="0 0 24 24" style={{transform: `rotate(${bell}deg)`}}>
          <path
            d="M12 22a2.5 2.5 0 0 0 2.45-2h-4.9A2.5 2.5 0 0 0 12 22Zm7-6V11a7 7 0 0 0-5.5-6.84V3.5a1.5 1.5 0 0 0-3 0v.66A7 7 0 0 0 5 11v5l-2 2v1h18v-1l-2-2Z"
            fill={brand.accent}
          />
        </svg>
      </div>
      <div style={{fontSize: size * 0.62, color: brand.muted, direction: 'ltr', fontWeight: 500}}>{handle}</div>
    </div>
  );
};

/* ---------------------------------------------------------- Scene wipe transition (accent bar sweeping) */
export const Wipe: React.FC<{brand: Brand; at: number; dur?: number}> = ({brand, at, dur = 16}) => {
  const f = useCurrentFrame();
  const {width} = useVideoConfig();
  const p = interpolate(f, [at, at + dur], [0, 1], {...clamp, easing: Easing.inOut(Easing.cubic)});
  if (p <= 0 || p >= 1) return null;
  const x = interpolate(p, [0, 1], [width * 1.1, -width * 0.6]);
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      <div style={{position: 'absolute', top: 0, bottom: 0, left: x, width: width * 0.5, background: `linear-gradient(90deg, ${hexA(brand.accent, 0)} 0%, ${hexA(brand.accent, 0.9)} 45%, ${brand.accent2} 55%, ${hexA(brand.accent2, 0)} 100%)`, transform: 'skewX(-12deg)'}} />
    </AbsoluteFill>
  );
};

/* ---------------------------------------------------------- Progress bar along the bottom */
export const ProgressBar: React.FC<{brand: Brand; total: number}> = ({brand, total}) => {
  const f = useCurrentFrame();
  const {width} = useVideoConfig();
  const {u} = useUnit();
  return (
    <div style={{position: 'absolute', bottom: 0, right: 0, height: 6 * u, width: (width * f) / Math.max(1, total - 1), background: `linear-gradient(270deg, ${brand.accent}, ${brand.accent2})`}} />
  );
};
