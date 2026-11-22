import React from 'react';
import {interpolate, useCurrentFrame} from 'remotion';
import {Brand, hexA} from '../theme';
import {Caption} from '../../narration/narration';
import {FONT_FA} from '../fonts';
import {useUnit} from './core';

/** Burned-in narration subtitles, synced to the same plan as the voice-over. */
export const Captions: React.FC<{brand: Brand; caps: Caption[]; bottom?: number; light?: boolean}> = ({brand, caps, bottom, light}) => {
  const f = useCurrentFrame();
  const {u, vertical} = useUnit();
  const c = caps.find((x) => f >= x.from && f < x.to + 6);
  if (!c) return null;
  const o = Math.min(interpolate(f, [c.from, c.from + 5], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}), interpolate(f, [c.to, c.to + 6], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}));
  return (
    <div style={{position: 'absolute', left: 0, right: 0, bottom: bottom ?? (vertical ? 230 : 46) * u, display: 'flex', justifyContent: 'center', opacity: o, pointerEvents: 'none'}}>
      <div
        dir="rtl"
        style={{
          maxWidth: (vertical ? 940 : 1500) * u,
          padding: `${12 * u}px ${30 * u}px`,
          borderRadius: 18 * u,
          background: light ? 'rgba(255,255,255,0.92)' : hexA('#000000', 0.62),
          border: `1.5px solid ${hexA(brand.accent, light ? 0.5 : 0.35)}`,
          color: light ? '#1d1d1f' : '#FFFFFF',
          fontFamily: FONT_FA,
          fontWeight: 600,
          fontSize: (vertical ? 40 : 36) * u,
          lineHeight: 1.55,
          textAlign: 'center',
          boxShadow: `0 ${8 * u}px ${30 * u}px rgba(0,0,0,0.25)`,
        }}
      >
        {c.text}
      </div>
    </div>
  );
};
