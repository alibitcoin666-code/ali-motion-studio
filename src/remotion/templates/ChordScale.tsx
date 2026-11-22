import React from 'react';
import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {BaseProps, hexA, resolveBrand, toFa} from '../theme';
import {Badge, clamp, ProgressBar, Stage, useUnit, Words} from '../components/core';
import {Keyboard, PlayMode} from '../components/Keyboard';
import {enNoteName, faNoteName, parseFingers, parseNotes} from '../components/music';
import {FONT_FA_DISPLAY, FONT_LATIN_SERIF} from '../fonts';

export interface ChordScaleProps extends BaseProps {
  kind: string; // e.g. "آکورد روز" / "گام روز"
  nameFa: string;
  symbol: string; // Am, C maj7 ...
  notes: string;
  fingers: string;
  mode: PlayMode;
  formula: string;
  tip: string;
  durationSec: number;
}

export const ChordScale: React.FC<ChordScaleProps> = (p) => {
  const b = resolveBrand(p);
  const f = useCurrentFrame();
  const {fps, durationInFrames} = useVideoConfig();
  const {u, vertical, width, square} = useUnit();
  const notes = parseNotes(p.notes);
  const sym = spring({frame: f - 6, fps, config: {damping: 11}});
  const out = interpolate(f, [durationInFrames - 12, durationInFrames], [1, 0], clamp);
  const playStart = 40;
  const step = Math.max(8, Math.floor((durationInFrames * 0.55) / Math.max(1, notes.length)));
  return (
    <Stage p={p}>
      <AbsoluteFill style={{opacity: out, padding: `${(vertical ? 170 : 50) * u}px ${80 * u}px`, display: 'flex', flexDirection: 'column', justifyContent: 'space-around', alignItems: 'center'}}>
        <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 * u}}>
          <Badge brand={b} text={p.kind} size={32 * u} />
          <div style={{display: 'flex', alignItems: 'baseline', gap: 36 * u, flexDirection: vertical && !square ? 'column' : 'row', justifyContent: 'center'}}>
            <div style={{fontFamily: FONT_LATIN_SERIF, fontWeight: 800, fontSize: (vertical ? 200 : 150) * u, color: b.accent, direction: 'ltr', lineHeight: 1, transform: `scale(${interpolate(sym, [0, 1], [0.5, 1])})`, opacity: sym, alignSelf: 'center'}}>{p.symbol}</div>
            <Words text={p.nameFa} size={(vertical ? 80 : 84) * u} color={b.text} weight={900} font={FONT_FA_DISPLAY} start={14} />
          </div>
          <div style={{fontSize: 40 * u, color: b.muted, fontWeight: 600, opacity: interpolate(f, [24, 36], [0, 1], clamp)}}><span>فرمول: </span><bdi dir="ltr" style={{unicodeBidi: 'isolate', direction: 'ltr'}}>{toFa((p.formula || '').replace(/b(?=\d)/g, '♭').replace(/#(?=\d)/g, '♯'))}</bdi></div>
        </div>
        <Keyboard brand={b} notes={notes} fingers={parseFingers(p.fingers)} mode={p.mode} start={playStart} step={step} width={vertical ? width - 100 * u : 940 * u} beam={(square ? 110 : vertical ? 260 : 90) * u} />
        <div style={{display: 'flex', gap: 18 * u, flexWrap: 'wrap', justifyContent: 'center'}}>
          {notes.map((m, i) => {
            const s = spring({frame: f - playStart - (p.mode === 'chord' ? 0 : i * step), fps, config: {damping: 14}});
            return (
              <div key={i} style={{padding: `${12 * u}px ${26 * u}px`, borderRadius: 20 * u, background: hexA(b.accent, 0.1), border: `2px solid ${hexA(b.accent, 0.6)}`, opacity: s, transform: `translateY(${(1 - s) * 30}px)`, display: 'flex', gap: 12 * u, alignItems: 'baseline'}}>
                <span style={{fontSize: 38 * u, fontWeight: 800}}>{faNoteName(m)}</span>
                <span style={{fontSize: 26 * u, color: b.muted, direction: 'ltr'}}>{enNoteName(m)}</span>
              </div>
            );
          })}
        </div>
        <Words text={p.tip} size={40 * u} color={hexA(b.text, 0.85)} weight={600} start={Math.round(durationInFrames * 0.6)} stagger={2} maxWidth={(vertical ? 920 : 1500) * u} mode="blur" />
      </AbsoluteFill>
      <ProgressBar brand={b} total={durationInFrames} />
    </Stage>
  );
};
