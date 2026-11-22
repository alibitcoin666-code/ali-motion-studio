/**
 * Luxury effect layer: metallic gold text, light sweeps, bokeh, light leaks, film grain,
 * gold frames and an optional photo background. Everything here only uses CSS features that
 * Remotion's in-browser renderer supports (gradients, background-clip:text, blur, blend modes),
 * so the in-browser export matches the cloud render.
 */
import React from 'react';
import {AbsoluteFill, Easing, Img, interpolate, random, useCurrentFrame, useVideoConfig} from 'remotion';
import {Brand, hexA} from '../theme';
import {assetUrl} from '../fonts';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

/** Lighten (amt>0) or darken (amt<0) a hex colour. */
export const shade = (hex: string, amt: number) => {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  const ch = (v: number) => Math.round(Math.max(0, Math.min(255, amt >= 0 ? v + (255 - v) * amt : v * (1 + amt))));
  const r = ch((n >> 16) & 255), g = ch((n >> 8) & 255), b = ch(n & 255);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
};

/** Metallic gradient built from the brand accent. */
export const metal = (accent: string) =>
  `linear-gradient(100deg, ${shade(accent, -0.45)} 0%, ${shade(accent, 0.15)} 18%, ${shade(accent, 0.75)} 32%, ${accent} 46%, ${shade(accent, -0.3)} 60%, ${shade(accent, 0.55)} 76%, ${shade(accent, -0.4)} 100%)`;

/** Gold (accent) metallic text with a moving sheen. Works for Persian (whole-word, no letter splits). */
export const GoldText: React.FC<React.PropsWithChildren<{accent: string; style?: React.CSSProperties; speed?: number; offset?: number}>> = ({accent, children, style, speed = 1, offset = 0}) => {
  const f = useCurrentFrame();
  const pos = ((f * 0.9 * speed + offset) % 240) / 240; // 0..1 loop
  return (
    <span
      style={{
        backgroundImage: metal(accent),
        backgroundSize: '300% 100%',
        backgroundPosition: `${100 - pos * 100}% 50%`,
        WebkitBackgroundClip: 'text',
        backgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        color: 'transparent',
        filter: `drop-shadow(0 0 ${0.12}em ${hexA(accent, 0.35)})`,
        ...style,
      }}
    >
      {children}
    </span>
  );
};

/** Floating soft bokeh discs (cheap: radial gradients, no filters). */
export const Bokeh: React.FC<{brand: Brand; count?: number; intensity?: number}> = ({brand, count = 14, intensity = 1}) => {
  const f = useCurrentFrame();
  const {width, height} = useVideoConfig();
  const s = Math.min(width, height);
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      {new Array(count).fill(0).map((_, i) => {
        const r = s * (0.04 + random(`br${i}`) * 0.11);
        const x = random(`bx${i}`) * width + Math.sin((f + i * 50) / 140) * s * 0.05;
        const y = ((random(`by${i}`) * height - f * (0.2 + random(`bs${i}`) * 0.5)) % (height + r * 2) + height + r * 2) % (height + r * 2) - r;
        const o = (0.05 + random(`bo${i}`) * 0.12) * intensity * (0.6 + 0.4 * Math.sin((f + i * 30) / 40));
        const c = i % 3 === 0 ? brand.accent2 : brand.accent;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: x - r,
              top: y - r,
              width: r * 2,
              height: r * 2,
              borderRadius: '50%',
              background: `radial-gradient(circle, ${hexA(c, o)} 0%, ${hexA(c, o * 0.6)} 45%, ${hexA(c, 0)} 70%)`,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

/** Two slow, warm light leaks drifting across the frame. */
export const LightLeak: React.FC<{brand: Brand; intensity?: number}> = ({brand, intensity = 1}) => {
  const f = useCurrentFrame();
  const {width, height} = useVideoConfig();
  const a = (f / 260) % 1;
  const b = ((f + 130) / 320) % 1;
  const blob = (x: number, y: number, r: number, c: string, o: number) => (
    <div style={{position: 'absolute', left: x - r, top: y - r, width: r * 2, height: r * 2, borderRadius: '50%', background: `radial-gradient(circle, ${hexA(c, o)} 0%, ${hexA(c, 0)} 65%)`, mixBlendMode: 'screen'}} />
  );
  const env = (t: number) => Math.sin(t * Math.PI);
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      {blob(interpolate(a, [0, 1], [-0.2, 1.2]) * width, height * 0.15, Math.max(width, height) * 0.45, brand.accent, 0.16 * env(a) * intensity)}
      {blob(interpolate(b, [0, 1], [1.2, -0.2]) * width, height * 0.9, Math.max(width, height) * 0.4, brand.accent2, 0.1 * env(b) * intensity)}
    </AbsoluteFill>
  );
};

/** Film grain from a small tiled noise texture, jittered every 2 frames. */
export const Grain: React.FC<{opacity?: number}> = ({opacity = 0.06}) => {
  const f = useCurrentFrame();
  const k = Math.floor(f / 2);
  return (
    <AbsoluteFill
      style={{
        pointerEvents: 'none',
        opacity,
        backgroundImage: `url(${assetUrl('fx/grain.png')})`,
        backgroundRepeat: 'repeat',
        backgroundSize: '256px 256px',
        backgroundPosition: `${Math.floor(random(`gx${k}`) * 256)}px ${Math.floor(random(`gy${k}`) * 256)}px`,
        mixBlendMode: 'overlay',
      }}
    />
  );
};

/** Diagonal light sweep across the whole frame (e.g. over a title) starting at `at`. */
export const LightSweep: React.FC<{at: number; dur?: number; color?: string; widthRatio?: number}> = ({at, dur = 40, color = '#FFFFFF', widthRatio = 0.25}) => {
  const f = useCurrentFrame();
  const {width} = useVideoConfig();
  const p = interpolate(f, [at, at + dur], [0, 1], {...clamp, easing: Easing.inOut(Easing.cubic)});
  if (p <= 0 || p >= 1) return null;
  const w = width * widthRatio;
  return (
    <AbsoluteFill style={{pointerEvents: 'none', overflow: 'hidden'}}>
      <div
        style={{
          position: 'absolute',
          top: '-20%',
          height: '140%',
          left: interpolate(p, [0, 1], [-w * 1.5, width + w]),
          width: w,
          transform: 'rotate(18deg)',
          background: `linear-gradient(90deg, ${hexA(color, 0)} 0%, ${hexA(color, 0.16)} 50%, ${hexA(color, 0)} 100%)`,
          mixBlendMode: 'screen',
        }}
      />
    </AbsoluteFill>
  );
};

/** Thin double gold frame with corner ornaments that draws itself in. */
export const GoldFrame: React.FC<{brand: Brand; start?: number; inset?: number}> = ({brand, start = 0, inset}) => {
  const f = useCurrentFrame();
  const {width, height} = useVideoConfig();
  const s = Math.min(width, height);
  const m = inset ?? s * 0.035;
  const p = interpolate(f - start, [0, 40], [0, 1], {...clamp, easing: Easing.out(Easing.cubic)});
  const c = s * 0.06;
  const line = (style: React.CSSProperties) => <div style={{position: 'absolute', background: brand.accent, opacity: 0.55, ...style}} />;
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      {line({top: m, right: m, height: 1.5, width: (width - m * 2) * p})}
      {line({bottom: m, left: m, height: 1.5, width: (width - m * 2) * p})}
      {line({top: m, left: m, width: 1.5, height: (height - m * 2) * p})}
      {line({bottom: m, right: m, width: 1.5, height: (height - m * 2) * p})}
      {[[m, m], [width - m, m], [m, height - m], [width - m, height - m]].map(([x, y], i) => (
        <div key={i} style={{position: 'absolute', left: x - c / 2, top: y - c / 2, width: c, height: c, opacity: p}}>
          <svg width={c} height={c} viewBox="0 0 20 20">
            <path d="M10 2 L12 8 L18 10 L12 12 L10 18 L8 12 L2 10 L8 8 Z" fill={brand.accent} opacity={0.85} />
          </svg>
        </div>
      ))}
    </AbsoluteFill>
  );
};

/** Optional photo background with a slow Ken Burns push and brand-coloured grading. */
export const PhotoBackground: React.FC<{src: string; brand: Brand; dim?: number}> = ({src, brand, dim = 0.55}) => {
  const f = useCurrentFrame();
  const {durationInFrames} = useVideoConfig();
  const z = interpolate(f, [0, durationInFrames], [1.06, 1.16]);
  const x = interpolate(f, [0, durationInFrames], [0, -2.5]);
  return (
    <AbsoluteFill>
      <Img src={src} style={{width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${z}) translateX(${x}%)`}} />
      <AbsoluteFill style={{background: `linear-gradient(180deg, ${hexA(brand.bg, dim * 0.7)} 0%, ${hexA(brand.bg, dim)} 55%, ${hexA(brand.bg, Math.min(1, dim + 0.3))} 100%)`}} />
    </AbsoluteFill>
  );
};

export const BG_IMAGES: Record<string, string> = {
  'grand-piano': 'assets/grand-piano.jpg',
};
export const resolveBgImage = (v?: string) => (!v || v === 'none' ? '' : BG_IMAGES[v] ? assetUrl(BG_IMAGES[v]) : v);
