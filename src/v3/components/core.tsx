import React from 'react';
import {AbsoluteFill, Img, interpolate, random, spring, useCurrentFrame, useVideoConfig, Easing} from 'remotion';
import {Theme, hexA, layout, toFa} from '../theme';
import {F, assetUrl} from '../fonts';

export const useL = () => {
  const {width, height} = useVideoConfig();
  return layout(width, height);
};

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
export const ease = Easing.bezier(0.22, 1, 0.36, 1); // easeOutQuint-ish
export const easeInOut = Easing.bezier(0.65, 0, 0.35, 1);

/* =========================================================================== background */
/** Drifting soft light blobs + optional neon grid floor + film grain + vignette. */
export const Background: React.FC<{theme: Theme; seed?: number; energy?: number; floor?: boolean}> = ({theme, seed = 1, energy = 1, floor}) => {
  const f = useCurrentFrame();
  const {width: W, height: H} = useVideoConfig();
  const t = f / 30;
  const blob = (i: number) => {
    const r = (k: number) => random(`b${seed}-${i}-${k}`);
    const x = (0.15 + 0.7 * r(1) + 0.08 * Math.sin(t * (0.08 + 0.05 * r(2)) * energy + r(3) * 6)) * W;
    const y = (0.15 + 0.7 * r(4) + 0.08 * Math.cos(t * (0.07 + 0.05 * r(5)) * energy + r(6) * 6)) * H;
    const s = Math.max(W, H) * (0.45 + 0.25 * r(7));
    return `radial-gradient(${s}px ${s * 0.8}px at ${x}px ${y}px, ${hexA(theme.blobs[i % 3], theme.dark ? 0.85 : 0.9)} 0%, transparent 70%)`;
  };
  return (
    <AbsoluteFill style={{background: theme.bg, overflow: 'hidden'}}>
      <AbsoluteFill style={{background: [blob(0), blob(1), blob(2)].join(','), opacity: 0.9}} />
      {(floor ?? theme.grid) ? <GridFloor theme={theme} /> : null}
      <Grain dark={theme.dark} />
      <AbsoluteFill
        style={{
          background: theme.dark
            ? 'radial-gradient(ellipse at 50% 45%, transparent 45%, rgba(0,0,0,0.55) 100%)'
            : 'radial-gradient(ellipse at 50% 45%, transparent 55%, rgba(80,60,30,0.16) 100%)',
        }}
      />
    </AbsoluteFill>
  );
};

export const Grain: React.FC<{dark: boolean; opacity?: number}> = ({dark, opacity}) => {
  const f = useCurrentFrame();
  const ox = Math.floor(random(`g${Math.floor(f / 2)}`) * 256);
  const oy = Math.floor(random(`h${Math.floor(f / 2)}`) * 256);
  return (
    <AbsoluteFill
      style={{
        backgroundImage: `url(${assetUrl('fx/grain.png')})`,
        backgroundPosition: `${ox}px ${oy}px`,
        opacity: opacity ?? (dark ? 0.07 : 0.05),
        mixBlendMode: dark ? 'screen' : 'multiply',
        pointerEvents: 'none',
      }}
    />
  );
};

const GridFloor: React.FC<{theme: Theme}> = ({theme}) => {
  const f = useCurrentFrame();
  const {width: W, height: H} = useVideoConfig();
  const hz = H * 0.62;
  const lines: React.ReactNode[] = [];
  const off = (f % 30) / 30;
  for (let i = 0; i < 14; i++) {
    const k = (i + off) / 14;
    const y = hz + (H - hz) * k * k;
    lines.push(<line key={`h${i}`} x1={0} x2={W} y1={y} y2={y} stroke={theme.accent} strokeOpacity={0.08 + 0.35 * k} strokeWidth={1 + 2 * k} />);
  }
  for (let i = -12; i <= 12; i++) {
    lines.push(<line key={`v${i}`} x1={W / 2 + i * W * 0.02} y1={hz} x2={W / 2 + i * W * 0.16} y2={H} stroke={theme.accent2} strokeOpacity={0.22} strokeWidth={1.5} />);
  }
  return (
    <svg width={W} height={H} style={{position: 'absolute', inset: 0}}>
      <defs>
        <linearGradient id="gfade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={theme.bg} stopOpacity={1} />
          <stop offset="0.25" stopColor={theme.bg} stopOpacity={0} />
        </linearGradient>
      </defs>
      {lines}
      <rect x={0} y={hz} width={W} height={H - hz} fill="url(#gfade)" />
      <rect x={0} y={hz - 2} width={W} height={4} fill={theme.accent2} opacity={0.35} />
    </svg>
  );
};

/* =========================================================================== kinetic text */
/** Splits "متن *برجسته* ادامه" into word tokens with highlight flags. */
export const tokens = (text: string) => {
  const out: {w: string; hi: boolean}[] = [];
  let hi = false;
  for (const part of (text || '').split(/(\*)/)) {
    if (part === '*') { hi = !hi; continue; }
    for (const w of part.split(/\s+/).filter(Boolean)) {
      // punctuation-only tokens (e.g. "،" right after a *highlight*) stick to the previous word
      if (/^[\u060C\u061B\u061F.,!?:;»«()\-–—]+$/.test(w) && out.length) { out[out.length - 1].w += w; continue; }
      out.push({w: toFa(w), hi});
    }
  }
  return out;
};

export type Reveal = 'rise' | 'blur' | 'pop' | 'mask';
/**
 * Kinetic headline: every word springs in (y + blur + opacity), `*highlight*` words get the accent
 * colour with a glow and an underline that swipes in right→left (RTL).
 */
export const KineticText: React.FC<{
  text: string;
  theme: Theme;
  size: number;
  delay?: number;
  stagger?: number;
  font?: string;
  weight?: number;
  color?: string;
  align?: 'right' | 'center' | 'left';
  lineHeight?: number;
  maxWidth?: number | string;
  reveal?: Reveal;
  exitAt?: number; // frame (local) where words start leaving
  style?: React.CSSProperties;
  underline?: boolean;
}> = ({text, theme, size, delay = 0, stagger = 3, font = F.head, weight = 900, color, align = 'right', lineHeight = 1.32, maxWidth, reveal = 'rise', exitAt, style, underline = true}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const toks = tokens(text);
  return (
    <div dir="rtl" style={{fontFamily: font, fontWeight: weight, fontSize: size, lineHeight, color: color ?? theme.ink, textAlign: align, maxWidth, ...style}}>
      {toks.map((t, i) => {
        const s = spring({frame: f - delay - i * stagger, fps, config: reveal === 'pop' ? {damping: 11, stiffness: 180, mass: 0.6} : {damping: 16, stiffness: 120, mass: 0.7}});
        const out = exitAt !== undefined ? interpolate(f, [exitAt + i * 1.2, exitAt + 10 + i * 1.2], [0, 1], clamp) : 0;
        const y = reveal === 'mask' ? (1 - s) * size * 1.1 : reveal === 'pop' ? 0 : (1 - s) * size * 0.55;
        const sc = reveal === 'pop' ? 0.4 + 0.6 * s : 1;
        const blur = reveal === 'blur' || reveal === 'rise' ? (1 - Math.min(1, s)) * 14 + out * 10 : out * 10;
        const ul = spring({frame: f - delay - i * stagger - 8, fps, config: {damping: 200}});
        return (
          <span key={i} style={{display: 'inline-block', overflow: reveal === 'mask' ? 'hidden' : undefined, verticalAlign: 'top', padding: '0 0.13em', margin: reveal === 'mask' ? '-0.1em 0' : undefined}}>
            <span
              style={{
                display: 'inline-block',
                position: 'relative',
                transform: `translateY(${y - out * size * 0.3}px) scale(${sc})`,
                opacity: Math.min(1, s * 1.4) * (1 - out),
                filter: blur > 0.3 ? `blur(${blur}px)` : undefined,
                color: t.hi ? theme.accent : undefined,
                textShadow: t.hi && theme.dark ? `0 0 ${size * 0.35}px ${hexA(theme.accent, 0.45)}` : undefined,
              }}
            >
              {t.w}
              {t.hi && underline ? (
                <span
                  style={{
                    position: 'absolute', right: '4%', left: '4%', bottom: '0.02em', height: Math.max(4, size * 0.07), borderRadius: 99,
                    background: `linear-gradient(270deg, ${theme.accentGrad[0]}, ${theme.accentGrad[1]}, ${theme.accentGrad[2]})`,
                    transform: `scaleX(${ul})`, transformOrigin: 'right center', opacity: 0.9,
                  }}
                />
              ) : null}
            </span>
          </span>
        );
      })}
    </div>
  );
};

/** Single-line letter-spaced Latin label (e.g. "LESSON 01"). */
export const Eyebrow: React.FC<{children: React.ReactNode; theme: Theme; size: number; delay?: number; color?: string; style?: React.CSSProperties}> = ({children, theme, size, delay = 0, color, style}) => {
  const f = useCurrentFrame();
  const p = interpolate(f - delay, [0, 18], [0, 1], {...clamp, easing: ease});
  return (
    <div style={{fontFamily: F.body, fontWeight: 700, fontSize: size, color: color ?? theme.accent, opacity: p, transform: `translateY(${(1 - p) * size}px)`, display: 'flex', alignItems: 'center', gap: size * 0.6, ...style}}>
      <span style={{width: size * 2.2 * p, height: Math.max(2, size * 0.09), background: color ?? theme.accent, borderRadius: 9}} />
      <span>{children}</span>
    </div>
  );
};

/* =========================================================================== surfaces */
export const Glass: React.FC<{theme: Theme; children?: React.ReactNode; style?: React.CSSProperties; radius?: number; glow?: boolean}> = ({theme, children, style, radius = 28, glow}) => (
  <div
    style={{
      background: theme.glass,
      border: `1.5px solid ${theme.glassLine}`,
      borderRadius: radius,
      boxShadow: theme.dark
        ? `0 30px 80px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.08)${glow ? `, 0 0 60px ${hexA(theme.accent, 0.18)}` : ''}`
        : `0 24px 60px rgba(60,40,10,0.14), inset 0 1px 0 rgba(255,255,255,0.8)`,
      backdropFilter: 'blur(18px)',
      ...style,
    }}
  >
    {children}
  </div>
);

/** Pop-in wrapper (scale + y + opacity spring). */
export const Pop: React.FC<{delay?: number; children: React.ReactNode; style?: React.CSSProperties; from?: number; damping?: number}> = ({delay = 0, children, style, from = 0.85, damping = 14}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = spring({frame: f - delay, fps, config: {damping, stiffness: 140, mass: 0.7}});
  return <div style={{transform: `translateY(${(1 - s) * 40}px) scale(${from + (1 - from) * s})`, opacity: Math.min(1, s * 1.5), ...style}}>{children}</div>;
};

/** Scene wrapper: slow push-in, enter/exit blur + scale so cuts feel like camera moves. */
export const SceneShell: React.FC<{frames: number; children: React.ReactNode; push?: number; enter?: boolean; exit?: boolean}> = ({frames, children, push = 0.035, enter = true, exit = true}) => {
  const f = useCurrentFrame();
  const inP = enter ? interpolate(f, [0, 12], [0, 1], {...clamp, easing: ease}) : 1;
  const outP = exit ? interpolate(f, [frames - 10, frames], [0, 1], {...clamp, easing: Easing.in(Easing.cubic)}) : 0;
  const z = 1 + push * (f / Math.max(1, frames)) + (1 - inP) * 0.04 - outP * 0.03;
  return (
    <AbsoluteFill style={{transform: `scale(${z})`, opacity: Math.min(inP * 1.2, 1) * (1 - outP), filter: inP < 1 || outP > 0 ? `blur(${(1 - inP) * 10 + outP * 12}px)` : undefined}}>
      {children}
    </AbsoluteFill>
  );
};

/** Diagonal light sweep across the frame (use at scene starts). */
export const LightSweep: React.FC<{theme: Theme; at?: number; dur?: number}> = ({theme, at = 0, dur = 24}) => {
  const f = useCurrentFrame();
  const p = interpolate(f - at, [0, dur], [-0.4, 1.4], clamp);
  if (p <= -0.4 || p >= 1.4) return null;
  return (
    <AbsoluteFill style={{pointerEvents: 'none', mixBlendMode: theme.dark ? 'screen' : 'soft-light'}}>
      <div style={{position: 'absolute', inset: '-50%', background: `linear-gradient(105deg, transparent ${p * 100 - 12}%, ${hexA(theme.accent2, 0.22)} ${p * 100}%, transparent ${p * 100 + 12}%)`}} />
    </AbsoluteFill>
  );
};

/** Floating dust/bokeh particles. */
export const Particles: React.FC<{theme: Theme; count?: number; seed?: string}> = ({theme, count = 26, seed = 'p'}) => {
  const f = useCurrentFrame();
  const {width: W, height: H} = useVideoConfig();
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      {Array.from({length: count}).map((_, i) => {
        const r = (k: number) => random(`${seed}${i}-${k}`);
        const sz = 2 + r(1) * 5;
        const sp = 0.15 + r(2) * 0.5;
        const y = ((r(3) * H - f * sp * 1.6) % H + H) % H;
        const x = r(4) * W + Math.sin(f / 40 + r(5) * 9) * 18;
        const tw = 0.3 + 0.7 * Math.abs(Math.sin(f / (25 + r(6) * 30) + r(7) * 6));
        return <div key={i} style={{position: 'absolute', left: x, top: y, width: sz, height: sz, borderRadius: 99, background: i % 4 === 0 ? theme.accent2 : theme.accent, opacity: tw * (theme.dark ? 0.55 : 0.35), boxShadow: `0 0 ${sz * 3}px ${theme.accent}`}} />;
      })}
    </AbsoluteFill>
  );
};

/* =========================================================================== HUD */
export const ProgressBar: React.FC<{theme: Theme; total: number}> = ({theme, total}) => {
  const f = useCurrentFrame();
  const {width: W} = useVideoConfig();
  return (
    <div style={{position: 'absolute', top: 0, right: 0, height: 6, width: W * (f / Math.max(1, total - 1)), background: `linear-gradient(270deg, ${theme.accentGrad[0]}, ${theme.accent})`, boxShadow: `0 0 14px ${hexA(theme.accent, 0.6)}`}} />
  );
};

export const Chip: React.FC<{theme: Theme; children: React.ReactNode; size: number; style?: React.CSSProperties; solid?: boolean}> = ({theme, children, size, style, solid}) => (
  <div
    dir="rtl"
    style={{
      display: 'inline-flex', alignItems: 'center', gap: size * 0.5, padding: `${size * 0.35}px ${size * 0.9}px`, borderRadius: 999,
      fontFamily: F.body, fontWeight: 800, fontSize: size, color: solid ? (theme.dark ? '#111' : '#fff') : theme.ink,
      background: solid ? theme.accent : theme.glass, border: `1.5px solid ${solid ? 'transparent' : theme.glassLine}`, ...style,
    }}
  >
    {children}
  </div>
);

/** Brand corner mark (wordmark — keeps brands separate). */
export const BrandMark: React.FC<{theme: Theme; name: string; handle: string; u: number; portrait: boolean}> = ({theme, name, handle, u, portrait}) => (
  <div dir="ltr" style={{position: 'absolute', left: (portrait ? 48 : 56) * u, top: (portrait ? 70 : 44) * u, display: 'flex', alignItems: 'baseline', gap: 12 * u, opacity: 0.85}}>
    <span style={{fontFamily: F.latin, fontWeight: 800, fontSize: 30 * u, color: theme.ink, letterSpacing: -0.5}}>{name}</span>
    <span style={{fontFamily: F.latin, fontWeight: 400, fontSize: 20 * u, color: theme.muted, letterSpacing: 2}}>{handle}</span>
  </div>
);

export const Countdown: React.FC<{theme: Theme; from: number; secs: number; size: number}> = ({theme, from, secs, size}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = (f - from) / fps;
  if (t < 0 || t > secs + 0.4) return null;
  const n = Math.max(1, Math.ceil(secs - t));
  const p = 1 - ((t % 1) + 1) % 1;
  const R = size / 2 - 6;
  return (
    <div style={{width: size, height: size, position: 'relative'}}>
      <svg width={size} height={size} style={{position: 'absolute', inset: 0, transform: 'rotate(-90deg)'}}>
        <circle cx={size / 2} cy={size / 2} r={R} stroke={theme.glassLine} strokeWidth={8} fill="none" />
        <circle cx={size / 2} cy={size / 2} r={R} stroke={theme.accent} strokeWidth={8} fill="none" strokeDasharray={2 * Math.PI * R} strokeDashoffset={2 * Math.PI * R * (1 - p)} strokeLinecap="round" />
      </svg>
      <div style={{position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', fontFamily: F.head, fontWeight: 900, fontSize: size * 0.5, color: theme.ink}}>{t > secs ? '✓' : toFa(n)}</div>
    </div>
  );
};

export const CoverImage: React.FC<{src: string; opacity?: number}> = ({src, opacity = 0.35}) => {
  const f = useCurrentFrame();
  return <Img src={assetUrl(src)} style={{position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity, transform: `scale(${1.05 + f * 0.0002})`}} />;
};
