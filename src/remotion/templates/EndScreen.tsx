import React from 'react';
import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {BaseProps, hexA, resolveBrand} from '../theme';
import {clamp, Stage, SubscribeCTA, useUnit, Words} from '../components/core';
import {FONT_FA_DISPLAY, FONT_LATIN_SERIF} from '../fonts';

export interface EndScreenProps extends BaseProps {
  message: string;
  nextLabel: string;
  cta: string;
  handle: string;
  durationSec: number;
}

/** YouTube end screen (16:9). Leaves empty frames where YouTube Studio end-screen elements go. */
export const EndScreen: React.FC<EndScreenProps> = (p) => {
  const b = resolveBrand(p);
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const {u, vertical} = useUnit();
  const box = spring({frame: f - 20, fps, config: {damping: 15}});
  const dash = (f * 2) % 40;
  const frameBox = (w: number, h: number, label: string, radius: number) => (
    <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 * u, opacity: box, transform: `scale(${interpolate(box, [0, 1], [0.85, 1])})`}}>
      <svg width={w} height={h}>
        <rect x={3} y={3} width={w - 6} height={h - 6} rx={radius} fill={hexA(b.bg, 0.5)} stroke={b.accent} strokeWidth={3} strokeDasharray="18 22" strokeDashoffset={-dash} />
      </svg>
      <div style={{fontSize: 30 * u, color: b.muted, fontWeight: 600}}>{label}</div>
    </div>
  );
  return (
    <Stage p={p}>
      <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', flexDirection: 'column', gap: 60 * u, padding: 80 * u}}>
        <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 * u}}>
          <Words text={p.message} size={(vertical ? 76 : 80) * u} color={b.text} highlight={b.accent} weight={900} font={FONT_FA_DISPLAY} start={2} maxWidth={1500 * u} />
          <div style={{fontFamily: FONT_LATIN_SERIF, fontSize: 34 * u, letterSpacing: 10 * u, color: b.accent, direction: 'ltr', opacity: interpolate(f, [14, 30], [0, 1], clamp)}}>{b.sloganEn}</div>
        </div>
        <div style={{display: 'flex', gap: 90 * u, alignItems: 'center', flexDirection: vertical ? 'column' : 'row'}}>
          {frameBox(640 * u, 360 * u, p.nextLabel, 24 * u)}
          {frameBox(300 * u, 300 * u, 'اشتراک کانال', 150 * u)}
        </div>
        <SubscribeCTA brand={b} text={p.cta} handle={p.handle || b.handle} size={40 * u} start={40} />
      </AbsoluteFill>
    </Stage>
  );
};
