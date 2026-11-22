import React from 'react';
import {AbsoluteFill, interpolate, Sequence, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {BaseProps, hexA, resolveBrand, toFa} from '../theme';
import {Badge, clamp, ProgressBar, Rule, Stage, SubscribeCTA, useEnvelope, useUnit, Wipe, Words, stripMarks} from '../components/core';
import {Keyboard, PlayMode} from '../components/Keyboard';
import {parseFingers, parseNotes} from '../components/music';
import {FONT_FA_DISPLAY, FONT_LATIN_SERIF} from '../fonts';
import {buildScenes, totalFrames} from '../../narration/narration';

export interface LessonStep {
  title: string;
  text: string;
  notes: string;
  fingers: string;
  mode: PlayMode;
}

export interface PianoLessonProps extends BaseProps {
  episode: string;
  title: string;
  subtitle: string;
  steps: LessonStep[];
  stepSeconds: number;
  summaryTitle: string;
  cta: string;
  handle: string;
}

export const lessonTiming = (p: Pick<PianoLessonProps, 'steps' | 'stepSeconds'>) => {
  const intro = 105;
  const step = Math.round((p.stepSeconds || 6) * 30);
  const summary = 120;
  const outro = 110;
  const n = Math.max(1, p.steps?.length ?? 1);
  return {intro, step, summary, outro, n, total: intro + step * n + summary + outro};
};

const Intro: React.FC<{p: PianoLessonProps; dur: number}> = ({p, dur}) => {
  const b = resolveBrand(p);
  const {u, vertical} = useUnit();
  const env = useEnvelope(dur, 1, 14);
  return (
    <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', opacity: env, padding: 90 * u}}>
      <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 34 * u, textAlign: 'center'}}>
        <Badge brand={b} text={`آموزش پیانو · جلسه ${toFa(p.episode)}`} size={34 * u} start={4} />
        <Words text={p.title} size={(vertical ? 104 : 118) * u} color={b.text} highlight={b.accent} start={12} stagger={5} weight={900} font={FONT_FA_DISPLAY} maxWidth={(vertical ? 900 : 1500) * u} mode="slam" />
        <Rule brand={b} width={260 * u} height={6 * u} start={34} />
        <Words text={p.subtitle} size={44 * u} color={b.muted} start={40} stagger={3} weight={500} maxWidth={1200 * u} />
      </div>
    </AbsoluteFill>
  );
};

const StepScene: React.FC<{p: PianoLessonProps; s: LessonStep; i: number; dur: number}> = ({p, s, i, dur}) => {
  const b = resolveBrand(p);
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const {u, vertical, width} = useUnit();
  const env = useEnvelope(dur, 14, 12);
  const notes = parseNotes(s.notes);
  const fingers = parseFingers(s.fingers);
  const num = spring({frame: f - 2, fps, config: {damping: 12}});
  const total = (p.steps || []).length;

  const textBlock = (
    <div style={{display: 'flex', flexDirection: 'column', gap: 26 * u, alignItems: vertical ? 'center' : 'flex-start', textAlign: vertical ? 'center' : 'right', maxWidth: (vertical ? 940 : 760) * u}}>
      <div style={{display: 'flex', alignItems: 'center', gap: 22 * u}}>
        <div
          style={{
            width: 110 * u,
            height: 110 * u,
            borderRadius: 28 * u,
            border: `3px solid ${b.accent}`,
            background: hexA(b.accent, 0.1),
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            fontSize: 64 * u,
            fontWeight: 900,
            color: b.accent,
            transform: `scale(${interpolate(num, [0, 1], [0.4, 1])}) rotate(${interpolate(num, [0, 1], [-20, 0])}deg)`,
            opacity: num,
          }}
        >
          {toFa(i + 1)}
        </div>
        <div style={{fontSize: 30 * u, color: b.muted, fontWeight: 600, opacity: interpolate(f, [8, 20], [0, 1], clamp)}}>
          {`گام ${toFa(i + 1)} از ${toFa(total)}`}
        </div>
      </div>
      <Words text={s.title} size={(vertical ? 76 : 80) * u} color={b.text} highlight={b.accent} start={8} stagger={4} weight={900} font={FONT_FA_DISPLAY} align={vertical ? 'center' : 'flex-start'} maxWidth={(vertical ? 940 : 760) * u} />
      <Words text={s.text} size={(vertical ? 44 : 40) * u} color={hexA(b.text, 0.82)} start={20} stagger={2} weight={500} align={vertical ? 'center' : 'flex-start'} lineHeight={1.6} maxWidth={(vertical ? 940 : 760) * u} mode="blur" />
    </div>
  );

  const kbWidth = vertical ? width - 120 * u : 900 * u;
  const kbIn = spring({frame: f - 10, fps, config: {damping: 16}});
  const kb = notes.length ? (
    <div style={{opacity: kbIn, transform: `translateY(${(1 - kbIn) * 80 * u}px)`}}>
      <Keyboard brand={b} notes={notes} fingers={fingers} mode={s.mode} start={34} step={Math.max(8, Math.floor((dur - 70) / Math.max(1, notes.length)))} width={kbWidth} beam={(vertical ? 220 : 200) * u} />
    </div>
  ) : null;

  return (
    <AbsoluteFill style={{opacity: env, padding: `${(vertical ? 160 : 90) * u}px ${90 * u}px`, display: 'flex', flexDirection: vertical ? 'column' : 'row', justifyContent: vertical ? 'space-around' : 'space-between', alignItems: 'center'}}>
      {textBlock}
      {kb}
    </AbsoluteFill>
  );
};

const Summary: React.FC<{p: PianoLessonProps; dur: number}> = ({p, dur}) => {
  const b = resolveBrand(p);
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const {u, vertical} = useUnit();
  const env = useEnvelope(dur, 12, 12);
  return (
    <AbsoluteFill style={{opacity: env, justifyContent: 'center', alignItems: 'center', padding: 100 * u}}>
      <div style={{display: 'flex', flexDirection: 'column', gap: 30 * u, minWidth: (vertical ? 860 : 1100) * u}}>
        <Words text={p.summaryTitle} size={72 * u} color={b.accent} weight={900} font={FONT_FA_DISPLAY} align="flex-start" />
        {(p.steps || []).map((s, i) => {
          const sp = spring({frame: f - 14 - i * 7, fps, config: {damping: 14}});
          return (
            <div key={i} style={{display: 'flex', alignItems: 'center', gap: 24 * u, opacity: sp, transform: `translateX(${(1 - sp) * -80 * u}px)`}}>
              <div style={{width: 54 * u, height: 54 * u, borderRadius: 99, background: b.accent, color: b.bg, display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: 32 * u, fontWeight: 900}}>✓</div>
              <div style={{fontSize: 46 * u, fontWeight: 700}}>{stripMarks(s.title)}</div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

export const Outro: React.FC<{p: BaseProps & {cta: string; handle: string}; dur: number}> = ({p, dur}) => {
  const b = resolveBrand(p);
  const {u} = useUnit();
  const env = useEnvelope(dur, 12, 1);
  return (
    <AbsoluteFill style={{opacity: env, justifyContent: 'center', alignItems: 'center', gap: 50 * u, flexDirection: 'column'}}>
      <div style={{fontFamily: FONT_LATIN_SERIF, fontSize: 46 * u, letterSpacing: 10 * u, color: b.accent, direction: 'ltr'}}>{b.sloganEn}</div>
      <Words text={b.sloganFa} size={70 * u} color={b.text} weight={800} start={6} font={FONT_FA_DISPLAY} />
      <SubscribeCTA brand={b} text={p.cta} handle={p.handle || b.handle} size={46 * u} start={16} />
    </AbsoluteFill>
  );
};

export const PianoLesson: React.FC<PianoLessonProps> = (p) => {
  const b = resolveBrand(p);
  const sc = buildScenes('PianoLesson', p);
  const steps = p.steps || [];
  const intro = sc[0];
  const summary = sc[sc.length - 2];
  const outro = sc[sc.length - 1];
  return (
    <Stage p={p} tid="PianoLesson">
      <Sequence durationInFrames={intro.frames} name="Intro">
        <Intro p={p} dur={intro.frames} />
      </Sequence>
      {steps.map((s, i) => (
        <Sequence key={i} from={sc[i + 1].from} durationInFrames={sc[i + 1].frames} name={`Step ${i + 1}`}>
          <StepScene p={p} s={s} i={i} dur={sc[i + 1].frames} />
        </Sequence>
      ))}
      <Sequence from={summary.from} durationInFrames={summary.frames} name="Summary">
        <Summary p={p} dur={summary.frames} />
      </Sequence>
      <Sequence from={outro.from} durationInFrames={outro.frames} name="Outro">
        <Outro p={p} dur={outro.frames} />
      </Sequence>
      <Wipe brand={b} at={intro.frames - 8} />
      <Wipe brand={b} at={summary.from - 8} />
      <ProgressBar brand={b} total={totalFrames(sc)} />
    </Stage>
  );
};
