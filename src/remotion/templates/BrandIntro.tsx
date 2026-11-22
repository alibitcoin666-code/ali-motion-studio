import React from 'react';
import {AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {BaseProps, hexA, resolveBrand} from '../theme';
import {clamp, Stage, useUnit, Words} from '../components/core';
import {FONT_FA_DISPLAY, FONT_LATIN_SERIF} from '../fonts';

export interface BrandIntroProps extends BaseProps {
  titleFa: string;
  titleEn: string;
  slogan: string;
  durationSec: number;
}

/** Logo sting: piano keys rise like an equalizer, a light sweeps, the name locks up. */
export const BrandIntro: React.FC<BrandIntroProps> = (p) => {
  const b = resolveBrand(p);
  const f = useCurrentFrame();
  const {fps, durationInFrames} = useVideoConfig();
  const {u, width, height} = useUnit();
  const keys = 15;
  const kw = 46 * u;
  const gap = 10 * u;
  const total = keys * kw + (keys - 1) * gap;
  const lock = spring({frame: f - 38, fps, config: {damping: 14}});
  const out = interpolate(f, [durationInFrames - 14, durationInFrames], [1, 0], clamp);
  const sweep = interpolate(f, [44, 80], [-0.3, 1.3], {...clamp, easing: Easing.inOut(Easing.cubic)});
  return (
    <Stage p={p} watermark={false} intensity={1.3}>
      <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', opacity: out}}>
        <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 34 * u}}>
        <svg width={total} height={360 * u} style={{direction: 'ltr', display: 'block'}}>
          {new Array(keys).fill(0).map((_, i) => {
            const center = Math.abs(i - (keys - 1) / 2);
            const s = spring({frame: f - center * 2.2, fps, config: {damping: 10, stiffness: 120}});
            const wave = 0.55 + 0.45 * Math.sin((f - i * 3) / 6);
            const settle = interpolate(f, [30, 50], [1, 0], clamp);
            const h = (60 + (300 - center * 36) * (settle * wave + (1 - settle) * 0.35)) * u * s;
            const isB = [1, 3, 6, 8, 10, 13].includes(i);
            return <rect key={i} x={i * (kw + gap)} y={360 * u - h} width={kw} height={Math.max(0, h)} rx={8 * u} fill={isB ? b.accent2 : b.accent} opacity={0.35 + 0.65 * s} />;
          })}
        </svg>
        <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 22 * u, opacity: lock, transform: `translateY(${(1 - lock) * 50}px)`}}>
          <div style={{position: 'relative', fontFamily: FONT_LATIN_SERIF, fontWeight: 700, fontSize: 112 * u, letterSpacing: 18 * u, color: b.text, direction: 'ltr', overflow: 'hidden', padding: `0 ${20 * u}px`}}>
            {p.titleEn || b.nameEn}
            <div style={{position: 'absolute', top: 0, bottom: 0, left: `${sweep * 100}%`, width: '22%', background: `linear-gradient(90deg, ${hexA(b.accent, 0)} 0%, ${hexA('#FFFFFF', 0.55)} 50%, ${hexA(b.accent, 0)} 100%)`, transform: 'skewX(-20deg)'}} />
          </div>
          <div style={{width: interpolate(lock, [0, 1], [0, 520 * u]), height: 3 * u, background: b.accent}} />
          <Words text={p.titleFa || b.nameFa} size={68 * u} color={b.accent} weight={900} font={FONT_FA_DISPLAY} start={52} />
          <div style={{fontFamily: FONT_LATIN_SERIF, fontSize: 34 * u, letterSpacing: 12 * u, color: b.muted, direction: 'ltr', opacity: interpolate(f, [62, 80], [0, 1], clamp)}}>{p.slogan || b.sloganEn}</div>
        </div>
        </div>
      </AbsoluteFill>
    </Stage>
  );
};
