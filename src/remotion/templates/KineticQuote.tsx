import React from 'react';
import {AbsoluteFill, interpolate, Sequence, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {BaseProps, hexA, resolveBrand, toFa} from '../theme';
import {clamp, ProgressBar, Stage, useUnit, Words} from '../components/core';
import {FONT_FA_DISPLAY, FONT_FA_POSTER, FONT_LATIN_SERIF} from '../fonts';

export interface KineticQuoteProps extends BaseProps {
  lines: string[];
  author: string;
  bpm: number;
  beatsPerLine: number;
}

export const quoteTiming = (p: Pick<KineticQuoteProps, 'lines' | 'bpm' | 'beatsPerLine'>) => {
  const beat = (60 / Math.max(40, Math.min(200, p.bpm || 90))) * 30;
  const line = Math.round(beat * Math.max(2, p.beatsPerLine || 6));
  const n = Math.max(1, (p.lines || []).filter(Boolean).length);
  const end = 120;
  return {beat, line, n, end, total: line * n + end};
};

/** One line: words hit on the beat grid, channel-split on impact, mask-wipe exit. */
const Line: React.FC<{p: KineticQuoteProps; text: string; i: number; dur: number; beat: number}> = ({p, text, i, dur, beat}) => {
  const b = resolveBrand(p);
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const {u, vertical} = useUnit();
  const stagger = Math.max(2, Math.round(beat / 2));
  const exit = interpolate(f, [dur - 10, dur], [0, 1], clamp);
  const impact = f < 6 ? 1 - f / 6 : 0;
  const big = (vertical ? 118 : 132) * u;
  const mode = i % 3 === 0 ? 'slam' : i % 3 === 1 ? 'rise' : 'blur';
  const idx = spring({frame: f, fps, config: {damping: 14}});
  const pulse = 1 + 0.012 * Math.sin((f / beat) * Math.PI * 2);
  return (
    <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', padding: 100 * u}}>
      {/* huge index number in the background */}
      <div style={{position: 'absolute', top: (vertical ? 260 : 80) * u, right: 90 * u, fontFamily: FONT_FA_POSTER, fontSize: 300 * u, color: hexA(b.accent, 0.08), transform: `translateY(${(1 - idx) * 100}px)`}}>{toFa(String(i + 1).padStart(2, '0'))}</div>
      <div style={{position: 'relative', transform: `scale(${pulse}) translateY(${-exit * 120 * u}px)`, opacity: 1 - exit, filter: exit > 0.05 ? `blur(${exit * 16}px)` : undefined}}>
        {impact > 0 ? (
          <div style={{position: 'absolute', inset: 0, transform: `translate(${impact * 10 * u}px, ${impact * -6 * u}px)`, opacity: 0.6 * impact}}>
            <Words text={text} size={big} color={b.accent2} weight={900} font={FONT_FA_DISPLAY} stagger={stagger} maxWidth={(vertical ? 920 : 1600) * u} mode={mode} />
          </div>
        ) : null}
        <Words text={text} size={big} color={b.text} highlight={b.accent} weight={900} font={FONT_FA_DISPLAY} stagger={stagger} maxWidth={(vertical ? 920 : 1600) * u} mode={mode} />
      </div>
      {/* beat ticks */}
      <div style={{position: 'absolute', bottom: (vertical ? 300 : 120) * u, display: 'flex', gap: 14 * u, direction: 'ltr'}}>
        {new Array(Math.round(dur / beat)).fill(0).map((_, k) => {
          const on = f >= k * beat;
          return <div key={k} style={{width: 46 * u, height: 6 * u, borderRadius: 6, background: on ? b.accent : hexA(b.text, 0.15)}} />;
        })}
      </div>
    </AbsoluteFill>
  );
};

const End: React.FC<{p: KineticQuoteProps; dur: number}> = ({p}) => {
  const b = resolveBrand(p);
  const {u} = useUnit();
  return (
    <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', flexDirection: 'column', gap: 30 * u}}>
      <Words text={`— ${p.author}`} size={64 * u} color={b.accent} weight={800} start={4} />
      <div style={{fontFamily: FONT_LATIN_SERIF, fontSize: 40 * u, letterSpacing: 10 * u, color: b.muted, direction: 'ltr'}}>{b.sloganEn}</div>
    </AbsoluteFill>
  );
};

export const KineticQuote: React.FC<KineticQuoteProps> = (p) => {
  const b = resolveBrand(p);
  const t = quoteTiming(p);
  const lines = (p.lines || []).filter(Boolean);
  return (
    <Stage p={p} intensity={1.2}>
      {lines.map((l, i) => (
        <Sequence key={i} from={i * t.line} durationInFrames={t.line} name={`Line ${i + 1}`}>
          <Line p={p} text={l} i={i} dur={t.line} beat={t.beat} />
        </Sequence>
      ))}
      <Sequence from={t.n * t.line} durationInFrames={t.end} name="End">
        <End p={p} dur={t.end} />
      </Sequence>
      <ProgressBar brand={b} total={t.total} />
    </Stage>
  );
};
