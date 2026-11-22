import React from 'react';
import {AbsoluteFill, interpolate, Sequence, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {BaseProps, hexA, resolveBrand, toFa} from '../theme';
import {Badge, clamp, ProgressBar, Stage, useEnvelope, useUnit, Wipe, Words} from '../components/core';
import {Keyboard, PlayMode} from '../components/Keyboard';
import {parseFingers, parseNotes} from '../components/music';
import {FONT_FA_DISPLAY, FONT_FA_POSTER} from '../fonts';
import {Outro} from './PianoLesson';

export interface PianoTipProps extends BaseProps {
  tipNumber: string;
  category: string;
  hook: string;
  mistake: string;
  correct: string;
  demoTitle: string;
  notes: string;
  fingers: string;
  mode: PlayMode;
  takeaway: string;
  cta: string;
  handle: string;
}

export const tipTiming = () => {
  const hook = 96, compare = 165, demo = 180, take = 110, outro = 100;
  return {hook, compare, demo, take, outro, total: hook + compare + demo + take + outro};
};

const Hook: React.FC<{p: PianoTipProps; dur: number}> = ({p, dur}) => {
  const b = resolveBrand(p);
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const {u, vertical} = useUnit();
  const env = useEnvelope(dur, 1, 10);
  const slam = spring({frame: f - 2, fps, config: {damping: 9, mass: 0.7, stiffness: 200}});
  const shake = f > 4 && f < 14 ? Math.sin(f * 3.1) * (14 - f) * 1.2 * u : 0;
  return (
    <AbsoluteFill style={{opacity: env, justifyContent: 'center', alignItems: 'center', padding: 80 * u, transform: `translateX(${shake}px)`}}>
      <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 30 * u, textAlign: 'center'}}>
        <Badge brand={b} text={p.category} size={32 * u} start={0} />
        <div style={{position: 'relative', fontFamily: FONT_FA_POSTER, fontSize: (vertical ? 230 : 200) * u, lineHeight: 1.1, transform: `scale(${interpolate(slam, [0, 1], [2.2, 1])})`, opacity: interpolate(slam, [0, 0.4], [0, 1], clamp)}}>
          <span style={{position: 'absolute', inset: 0, color: b.accent2, transform: `translate(${6 * u}px, ${4 * u}px)`, opacity: 0.85}}>{`نکته ${toFa(p.tipNumber)}`}</span>
          <span style={{position: 'relative', color: b.accent}}>{`نکته ${toFa(p.tipNumber)}`}</span>
        </div>
        <Words text={p.hook} size={(vertical ? 74 : 70) * u} color={b.text} highlight={b.accent} start={16} stagger={4} weight={900} font={FONT_FA_DISPLAY} maxWidth={(vertical ? 920 : 1500) * u} mode="slam" />
      </div>
    </AbsoluteFill>
  );
};

const Card: React.FC<{good: boolean; title: string; text: string; start: number; p: PianoTipProps}> = ({good, title, text, start, p}) => {
  const b = resolveBrand(p);
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const {u, vertical} = useUnit();
  const s = spring({frame: f - start, fps, config: {damping: 15}});
  const color = good ? '#3FBF7F' : '#E5484D';
  return (
    <div
      style={{
        flex: 1,
        minWidth: (vertical ? 880 : 700) * u,
        maxWidth: (vertical ? 920 : 780) * u,
        padding: `${44 * u}px ${48 * u}px`,
        borderRadius: 36 * u,
        background: hexA(b.bg2, 0.85),
        border: `3px solid ${hexA(color, 0.75)}`,
        boxShadow: `0 ${20 * u}px ${60 * u}px rgba(0,0,0,0.45)`,
        opacity: s,
        transform: `translateY(${(1 - s) * 90 * u}px) scale(${interpolate(s, [0, 1], [0.9, 1])})`,
        display: 'flex',
        flexDirection: 'column',
        gap: 22 * u,
      }}
    >
      <div style={{display: 'flex', alignItems: 'center', gap: 18 * u}}>
        <div style={{width: 64 * u, height: 64 * u, borderRadius: 99, background: color, color: '#fff', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: 40 * u, fontWeight: 900}}>{good ? '✓' : '✕'}</div>
        <div style={{fontSize: 44 * u, fontWeight: 900, color}}>{title}</div>
      </div>
      <Words text={text} size={42 * u} color={b.text} start={start + 10} stagger={2} weight={600} align="flex-start" lineHeight={1.6} mode="blur" />
    </div>
  );
};

const Compare: React.FC<{p: PianoTipProps; dur: number}> = ({p, dur}) => {
  const {u, vertical} = useUnit();
  const env = useEnvelope(dur, 12, 12);
  return (
    <AbsoluteFill style={{opacity: env, justifyContent: 'center', alignItems: 'center', padding: 80 * u}}>
      <div style={{display: 'flex', flexDirection: vertical ? 'column' : 'row', gap: 44 * u, alignItems: 'stretch'}}>
        <Card good={false} title="اشتباه رایج" text={p.mistake} start={4} p={p} />
        <Card good title="روش درست" text={p.correct} start={vertical ? 60 : 40} p={p} />
      </div>
    </AbsoluteFill>
  );
};

const Demo: React.FC<{p: PianoTipProps; dur: number}> = ({p, dur}) => {
  const b = resolveBrand(p);
  const {u, vertical, width} = useUnit();
  const env = useEnvelope(dur, 12, 12);
  const notes = parseNotes(p.notes);
  return (
    <AbsoluteFill style={{opacity: env, justifyContent: 'center', alignItems: 'center', flexDirection: 'column', gap: 60 * u, padding: 80 * u}}>
      <Words text={p.demoTitle} size={(vertical ? 70 : 66) * u} color={b.text} highlight={b.accent} weight={900} font={FONT_FA_DISPLAY} maxWidth={(vertical ? 920 : 1500) * u} />
      <Badge brand={b} text="دست چپ · شماره انگشت‌ها روی کلیدها" size={28 * u} start={10} />
      <Keyboard brand={b} notes={notes} fingers={parseFingers(p.fingers)} mode={p.mode} start={26} step={Math.max(8, Math.floor((dur - 60) / Math.max(1, notes.length)))} width={vertical ? width - 100 * u : 1400 * u} beam={(vertical ? 260 : 190) * u} />
    </AbsoluteFill>
  );
};

const Takeaway: React.FC<{p: PianoTipProps; dur: number}> = ({p, dur}) => {
  const b = resolveBrand(p);
  const f = useCurrentFrame();
  const {u, vertical} = useUnit();
  const env = useEnvelope(dur, 10, 12);
  const glow = 0.5 + 0.5 * Math.sin(f / 8);
  return (
    <AbsoluteFill style={{opacity: env, justifyContent: 'center', alignItems: 'center', padding: 90 * u}}>
      <div style={{padding: `${60 * u}px ${70 * u}px`, borderRadius: 40 * u, border: `3px solid ${b.accent}`, boxShadow: `0 0 ${40 + glow * 40}px ${hexA(b.accent, 0.35)}`, background: hexA(b.bg, 0.6), display: 'flex', flexDirection: 'column', gap: 26 * u, alignItems: 'center', textAlign: 'center', maxWidth: (vertical ? 960 : 1500) * u}}>
        <div style={{fontSize: 36 * u, color: b.accent, fontWeight: 800}}>خلاصه در یک جمله</div>
        <Words text={p.takeaway} size={(vertical ? 72 : 76) * u} color={b.text} highlight={b.accent} start={8} stagger={4} weight={900} font={FONT_FA_DISPLAY} />
      </div>
    </AbsoluteFill>
  );
};

export const PianoTip: React.FC<PianoTipProps> = (p) => {
  const b = resolveBrand(p);
  const t = tipTiming();
  let at = 0;
  const seq = (dur: number, node: React.ReactNode, name: string) => {
    const from = at;
    at += dur;
    return (
      <Sequence key={name} from={from} durationInFrames={dur} name={name}>
        {node}
      </Sequence>
    );
  };
  return (
    <Stage p={p}>
      {seq(t.hook, <Hook p={p} dur={t.hook} />, 'Hook')}
      {seq(t.compare, <Compare p={p} dur={t.compare} />, 'Compare')}
      {seq(t.demo, <Demo p={p} dur={t.demo} />, 'Demo')}
      {seq(t.take, <Takeaway p={p} dur={t.take} />, 'Takeaway')}
      {seq(t.outro, <Outro p={p} dur={t.outro} />, 'Outro')}
      <Wipe brand={b} at={t.hook - 8} />
      <Wipe brand={b} at={t.hook + t.compare + t.demo - 8} />
      <ProgressBar brand={b} total={t.total} />
    </Stage>
  );
};
