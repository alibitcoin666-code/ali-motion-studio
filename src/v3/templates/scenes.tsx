/**
 * Scene library shared by LessonPro (16:9 lessons) and TipShort (9:16 tips).
 * Each scene kind = one proven retention pattern from trending piano channels (see STEP_07).
 */
import React from 'react';
import {interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {Theme, hexA, toFa} from '../theme';
import {F} from '../fonts';
import {Countdown, Eyebrow, Glass, KineticText, Pop, ease} from '../components/core';
import {Keyboard, KeyState, keyRange, keyboardHeight, pressAt} from '../components/Keyboard';
import {Staff} from '../components/Staff';
import {parseChord, parseFingers, parseNotes} from '../music';
import {TimedScene} from '../timeline';
import {Pose} from '../mascot/Mascot';
import {NoteHit, SfxEvent} from '../components/Sound';

export type Kind = 'hook' | 'title' | 'explain' | 'keyboard' | 'staff' | 'chord' | 'compare' | 'wrong' | 'right' | 'steps' | 'quiz' | 'recap' | 'punch' | 'cta' | 'outro';
export interface LessonScene {
  kind: Kind;
  label?: string; // chapter name
  title?: string;
  text?: string;
  items?: string[];
  notes?: string; // "C4 E4 G4"
  fingers?: string; // "1 3 5"
  mode?: 'sequence' | 'chord' | 'arpeggio';
  chord?: string; // "Am"
  wrong?: string;
  right?: string;
  answer?: number;
  say?: string; // narration (use [مکث ۱ ثانیه] for pauses)
  min?: number;
  pose?: Pose;
}

export const KIND_FA: Record<Kind, string> = {
  hook: 'قلاب شروع', title: 'عنوان', explain: 'توضیح', keyboard: 'کیبورد', staff: 'حامل و نت', chord: 'آکورد',
  compare: 'اشتباه / درست', wrong: 'اشتباه رایج', right: 'روش درست', steps: 'گام‌به‌گام', quiz: 'کوییز', recap: 'جمع‌بندی',
  punch: 'جملهٔ طلایی', cta: 'دعوت به اقدام', outro: 'پایان و سابسکرایب',
};

export const DEFAULT_POSE: Record<Kind, Pose> = {
  hook: 'point', title: 'wave', explain: 'present', keyboard: 'present', staff: 'present', chord: 'present', compare: 'shrug',
  wrong: 'shrug', right: 'point', steps: 'present', quiz: 'think', recap: 'talk', punch: 'point', cta: 'celebrate', outro: 'wave',
};
const MIN: Partial<Record<Kind, number>> = {hook: 2.6, title: 3.6, outro: 7, cta: 3, quiz: 6};

export const NOTE_STEP = 0.5; // s between notes when a scene plays its notes
export const sceneNotes = (sc: LessonScene) => {
  if (sc.kind === 'chord') return parseChord(sc.chord || 'C', 4)?.notes ?? [];
  return parseNotes(sc.notes || '');
};
/** Seconds of playing after the narration (notes are demonstrated after the teacher explains). */
export const playTime = (sc: LessonScene) => {
  const n = sceneNotes(sc).length;
  if (!n || !['keyboard', 'staff', 'chord', 'right', 'wrong'].includes(sc.kind)) return 0;
  if (sc.kind === 'chord') return n * NOTE_STEP + 2.2;
  if (sc.mode === 'chord') return 2.2;
  return n * NOTE_STEP + (sc.mode === 'arpeggio' ? 2 : 0.9);
};
export const minOf = (sc: LessonScene) => MIN[sc.kind] ?? 3.2;
export const extraOf = (sc: LessonScene) => playTime(sc) + (sc.kind === 'steps' || sc.kind === 'recap' ? 0.6 : 0);

/** Note events for a scene (absolute frames). */
export const notesFor = (s: TimedScene<LessonScene>, fps: number): {at: number; midi: number; dur: number; i: number}[] => {
  const sc = s.scene;
  const ns = sceneNotes(sc);
  if (!playTime(sc)) return [];
  const start = s.voiceFrom + Math.round((s.voiceDur + 0.25) * fps);
  const step = Math.round(NOTE_STEP * fps);
  const block = sc.kind === 'chord' || sc.mode === 'arpeggio';
  const out: {at: number; midi: number; dur: number; i: number}[] = [];
  if (sc.mode === 'chord') ns.forEach((m, i) => out.push({at: start, midi: m, dur: Math.round(1.8 * fps), i}));
  else {
    ns.forEach((m, i) => out.push({at: start + i * step, midi: m, dur: block ? Math.round((ns.length - i) * NOTE_STEP * fps) : step - 2, i}));
    if (block) ns.forEach((m, i) => out.push({at: start + ns.length * step + 4, midi: m, dur: Math.round(1.6 * fps), i}));
  }
  return out;
};

export const sfxFor = (s: TimedScene<LessonScene>, fps: number, first: boolean): SfxEvent[] => {
  const k = s.scene.kind;
  const at = s.from;
  const ev: SfxEvent[] = [];
  if (!first) ev.push({at: Math.max(0, at - 6), name: 'whoosh', vol: 0.35});
  if (k === 'hook') ev.push({at, name: 'riser', vol: 0.35}, {at: at + 14, name: 'impact', vol: 0.5});
  if (k === 'title') ev.push({at: at + 6, name: 'shimmer', vol: 0.35});
  if (k === 'explain' || k === 'steps' || k === 'recap') (s.scene.items || []).forEach((_, i) => ev.push({at: s.voiceFrom + itemAt(s, i, fps), name: k === 'recap' ? 'correct' : 'pop', vol: k === 'recap' ? 0.2 : 0.35}));
  if (k === 'compare') ev.push({at: s.voiceFrom + 4, name: 'wrong', vol: 0.45}, {at: s.voiceFrom + compareRightAt(s, fps), name: 'correct', vol: 0.35});
  if (k === 'wrong') ev.push({at: at + 8, name: 'wrong', vol: 0.5});
  if (k === 'right') ev.push({at: at + 8, name: 'correct', vol: 0.4});
  if (k === 'quiz') {
    const r = quizReveal(s, fps);
    for (let i = 0; i < 3; i++) ev.push({at: r - (3 - i) * fps, name: 'tick', vol: 0.6});
    ev.push({at: r, name: 'ding', vol: 0.5});
  }
  if (k === 'punch') ev.push({at: at + 4, name: 'impact', vol: 0.4});
  if (k === 'cta' || k === 'outro') ev.push({at: at + 10, name: 'pop', vol: 0.4}, {at: at + 30, name: 'click', vol: 0.6});
  return ev;
};

/** Local frame (relative to voiceFrom) when item i appears — spread across the narration. */
export const itemAt = (s: TimedScene<LessonScene>, i: number, fps: number) => {
  const n = (s.scene.items || []).length || 1;
  const span = Math.max(0.8, s.voiceDur * 0.85);
  return Math.round(((span * i) / n) * fps) + 6;
};
const compareRightAt = (s: TimedScene<LessonScene>, fps: number) => Math.round(Math.max(1.2, s.voiceDur * 0.48) * fps);
/** Absolute frame of the quiz answer reveal: start of the second narration segment, else after a 3 s countdown. */
export const quizReveal = (s: TimedScene<LessonScene>, fps: number) =>
  s.voiceFrom + Math.round((s.segs[1] ? s.segs[1].start : s.voiceDur + 3.2) * fps);

/* ======================================================================= scene view */
export interface Zone { x: number; y: number; w: number; h: number }

export const SceneView: React.FC<{s: TimedScene<LessonScene>; theme: Theme; zone: Zone; u: number; portrait: boolean; episode?: string; course?: string; brandName: string; handle: string; shorts?: boolean}> = (props) => {
  const {s, theme, zone, u, portrait} = props;
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const sc = s.scene;
  const vLocal = s.voiceFrom - s.from; // local frame when the voice starts
  const big = portrait ? 1.0 : 1.0;

  const box: React.CSSProperties = {position: 'absolute', left: zone.x, top: zone.y, width: zone.w, height: zone.h, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'flex-end', gap: 28 * u};
  const title = (size = portrait ? 92 : 84, delay = 2) =>
    sc.title ? <KineticText text={sc.title} theme={theme} size={size * u * big} delay={delay} maxWidth={zone.w} /> : null;
  const text = (delay = 10, size = portrait ? 46 : 42) =>
    sc.text ? <KineticText text={sc.text} theme={theme} size={size * u} delay={delay} stagger={1} font={F.body} weight={500} color={theme.muted} lineHeight={1.6} maxWidth={zone.w} reveal="blur" /> : null;

  /* ---------- notes on keyboard */
  const ns = sceneNotes(sc);
  const fing = parseFingers(sc.fingers || '');
  const hits = notesFor(s, fps).map((h) => ({...h, at: h.at - s.from}));
  const tSec = f / fps;
  const kbState: Record<number, KeyState> = {};
  for (const h of hits) {
    const p = pressAt(tSec, h.at / fps, h.dur / fps);
    if (p > (kbState[h.midi]?.p ?? 0)) kbState[h.midi] = {p, color: theme.keyGlow};
  }
  const fingerMap: Record<number, string> = {};
  ns.forEach((m, i) => { if (fing[i]) fingerMap[m] = fing[i]; });
  const preview = f >= vLocal && hits.length && f < hits[0].at ? ns : []; // soft-marked while explaining
  const KB = (width: number, labels: 'active' | 'all' | 'c' = 'active') => {
    const {from, to} = keyRange(ns.length ? ns : [60], portrait ? 1 : 2, portrait ? 25 : 37);
    return (
      <Pop delay={8}>
        <Keyboard theme={theme} from={from} to={to} width={width} state={kbState} fingers={fingerMap} labels={labels} mark={preview} id={`kb${s.index}`} />
      </Pop>
    );
  };

  switch (sc.kind) {
    case 'hook':
      return (
        <div style={{...box, alignItems: 'center', textAlign: 'center'}}>
          <KineticText text={sc.title || sc.text || ''} theme={theme} size={(portrait ? 120 : 116) * u} font={props.shorts ? F.hook : F.head} weight={props.shorts ? 400 : 900} align="center" reveal="pop" stagger={4} maxWidth={zone.w} lineHeight={1.25} />
          {sc.title && sc.text ? <KineticText text={sc.text} theme={theme} size={46 * u} delay={18} font={F.body} weight={600} color={theme.muted} align="center" reveal="blur" stagger={2} maxWidth={zone.w * 0.9} /> : null}
          {ns.length ? <div style={{marginTop: 20 * u}}>{KB(Math.min(zone.w, 1000 * u), 'active')}</div> : null}
        </div>
      );
    case 'title': {
      const line = interpolate(f, [10, 40], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease});
      return (
        <div style={box}>
          <Eyebrow theme={theme} size={30 * u}>{[props.course, props.episode ? `جلسه ${toFa(props.episode)}` : ''].filter(Boolean).join(' · ')}</Eyebrow>
          <KineticText text={sc.title || ''} theme={theme} size={(portrait ? 120 : 132) * u} delay={6} stagger={4} maxWidth={zone.w} lineHeight={1.2} />
          <div style={{height: 5 * u, width: zone.w * 0.38 * line, background: `linear-gradient(270deg, ${theme.accentGrad[0]}, ${theme.accent}, transparent)`, borderRadius: 9}} />
          {sc.text ? <KineticText text={sc.text} theme={theme} size={44 * u} delay={20} stagger={2} font={F.body} weight={500} color={theme.muted} maxWidth={zone.w} reveal="blur" /> : null}
        </div>
      );
    }
    case 'explain':
    case 'steps':
    case 'recap': {
      const items = sc.items || [];
      return (
        <div style={{...box, justifyContent: 'center'}}>
          {title(portrait ? 84 : 76)}
          {text(10, 38)}
          <div style={{display: 'flex', flexDirection: 'column', gap: 18 * u, width: '100%', alignItems: 'flex-end', marginTop: 8 * u}}>
            {items.map((it, i) => {
              const at = vLocal + itemAt(s, i, fps);
              const p = spring({frame: f - at, fps, config: {damping: 15, stiffness: 140}});
              const active = f >= at && (i === items.length - 1 || f < vLocal + itemAt(s, i + 1, fps));
              return (
                <div key={i} dir="rtl" style={{width: '100%', opacity: Math.min(1, p * 1.4), transform: `translateX(${(1 - p) * -60 * u}px)`}}>
                  <Glass theme={theme} radius={22 * u} glow={active} style={{display: 'flex', alignItems: 'center', gap: 22 * u, padding: `${18 * u}px ${26 * u}px`, borderColor: active ? hexA(theme.accent, 0.55) : undefined}}>
                    <div style={{flex: 'none', width: 62 * u, height: 62 * u, borderRadius: 18 * u, display: 'grid', placeItems: 'center', background: sc.kind === 'recap' ? hexA(theme.good, 0.18) : active ? theme.accent : hexA(theme.accent, 0.15), color: sc.kind === 'recap' ? theme.good : active ? (theme.dark ? '#111' : '#fff') : theme.accent, fontFamily: F.head, fontWeight: 900, fontSize: 32 * u}}>
                      {sc.kind === 'recap' ? <Check p={spring({frame: f - at - 4, fps, config: {damping: 200}})} size={34 * u} color={theme.good} /> : toFa(i + 1)}
                    </div>
                    <div style={{fontFamily: F.body, fontWeight: 700, fontSize: (portrait ? 44 : 40) * u, color: theme.ink, lineHeight: 1.45}}>{toFa(it.replace(/\*/g, ''))}</div>
                  </Glass>
                </div>
              );
            })}
          </div>
        </div>
      );
    }
    case 'keyboard':
      return (
        <div style={box}>
          {title(portrait ? 80 : 72)}
          {text(10, 38)}
          <div style={{marginTop: 26 * u, alignSelf: 'center'}}>{KB(Math.min(zone.w, (portrait ? 960 : 1240) * u), 'c')}</div>
        </div>
      );
    case 'staff': {
      const start = hits[0]?.at ?? 99999;
      return (
        <div style={box}>
          {title(portrait ? 80 : 72)}
          {text(10, 36)}
          <Glass theme={theme} radius={26 * u} style={{alignSelf: 'stretch', padding: `${10 * u}px ${30 * u}px ${4 * u}px`}}>
            <div dir="ltr">
              <Staff theme={theme} notes={ns} width={zone.w - 60 * u} space={24 * u} appearAt={(i) => vLocal + 6 + i * 5} activeAt={(i) => (f >= start + i * NOTE_STEP * fps && f < start + (i + 1) * NOTE_STEP * fps ? 1 : 0)} />
            </div>
          </Glass>
          <div style={{alignSelf: 'center'}}>{KB(Math.min(zone.w * 0.9, 1000 * u), 'active')}</div>
        </div>
      );
    }
    case 'chord': {
      const c = parseChord(sc.chord || 'C', 4);
      return (
        <div style={{...box, alignItems: 'center'}}>
          <div style={{display: 'flex', alignItems: 'center', gap: 40 * u, flexDirection: portrait ? 'column' : 'row-reverse'}}>
            <Pop delay={2} from={0.4} damping={10}>
              <div dir="ltr" style={{fontFamily: F.latin, fontWeight: 800, fontSize: 210 * u, lineHeight: 1, color: theme.accent, textShadow: theme.dark ? `0 0 ${60 * u}px ${hexA(theme.accent, 0.5)}` : undefined}}>{sc.chord || 'C'}</div>
            </Pop>
            <div style={{display: 'flex', flexDirection: 'column', alignItems: portrait ? 'center' : 'flex-end', gap: 10 * u}}>
              <KineticText text={sc.title || c?.nameFa || ''} theme={theme} size={86 * u} delay={8} />
              <Pop delay={18}><div dir="rtl" style={{fontFamily: F.body, fontWeight: 700, fontSize: 40 * u, color: theme.muted}}>فرمول: {c?.formula}</div></Pop>
            </div>
          </div>
          {sc.text ? <KineticText text={sc.text} theme={theme} size={38 * u} delay={20} font={F.body} weight={500} color={theme.muted} align="center" reveal="blur" stagger={1} maxWidth={zone.w} /> : null}
          <div style={{marginTop: 16 * u}}>{KB(Math.min(zone.w, 1100 * u), 'active')}</div>
        </div>
      );
    }
    case 'compare': {
      const rAt = vLocal + compareRightAt(s, fps);
      const card = (good: boolean, body: string, at: number) => {
        const p = spring({frame: f - at, fps, config: {damping: 13, stiffness: 130}});
        const c = good ? theme.good : theme.bad;
        const dim = !good && f > rAt + 10 ? 0.55 : 1;
        return (
          <div style={{flex: 1, opacity: Math.min(1, p * 1.4) * dim, transform: `translateY(${(1 - p) * 50 * u}px) rotate(${(1 - p) * (good ? 3 : -3)}deg)`}}>
            <Glass theme={theme} radius={30 * u} style={{padding: `${30 * u}px ${34 * u}px`, borderColor: hexA(c, 0.6), boxShadow: `0 0 ${50 * u}px ${hexA(c, 0.18)}`, height: '100%'}}>
              <div dir="rtl" style={{display: 'flex', alignItems: 'center', gap: 16 * u, marginBottom: 16 * u}}>
                <div style={{width: 64 * u, height: 64 * u, borderRadius: 99, background: c, display: 'grid', placeItems: 'center'}}>
                  {good ? <Check p={1} size={36 * u} color="#fff" /> : <Cross size={30 * u} color="#fff" />}
                </div>
                <div style={{fontFamily: F.head, fontWeight: 900, fontSize: 54 * u, color: c}}>{good ? 'درست' : 'اشتباه'}</div>
              </div>
              <div dir="rtl" style={{fontFamily: F.body, fontWeight: 700, fontSize: (portrait ? 44 : 40) * u, color: theme.ink, lineHeight: 1.55}}>{toFa(body)}</div>
            </Glass>
          </div>
        );
      };
      return (
        <div style={box}>
          {title(portrait ? 80 : 72)}
          <div dir="rtl" style={{display: 'flex', flexDirection: portrait ? 'column' : 'row', gap: 30 * u, width: '100%', marginTop: 14 * u}}>
            {card(false, sc.wrong || '', vLocal)}
            {card(true, sc.right || '', rAt)}
          </div>
        </div>
      );
    }
    case 'wrong':
    case 'right': {
      const good = sc.kind === 'right';
      const c = good ? theme.good : theme.bad;
      const shake = !good ? Math.sin(f * 1.6) * interpolate(f, [8, 22], [14, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}) * u : 0;
      return (
        <div style={{...box, alignItems: 'center', textAlign: 'center'}}>
          <Pop delay={4} from={0.3} damping={9}>
            <div style={{transform: `translateX(${shake}px)`, display: 'flex', alignItems: 'center', gap: 22 * u, padding: `${16 * u}px ${42 * u}px`, borderRadius: 999, background: c, boxShadow: `0 0 ${70 * u}px ${hexA(c, 0.45)}`}}>
              {good ? <Check p={1} size={56 * u} color="#fff" /> : <Cross size={46 * u} color="#fff" />}
              <span style={{fontFamily: F.hook, fontSize: 96 * u, color: '#fff', lineHeight: 1.3}}>{sc.title || (good ? 'درست' : 'اشتباه')}</span>
            </div>
          </Pop>
          {sc.text ? <KineticText text={sc.text} theme={theme} size={(portrait ? 64 : 56) * u} delay={14} align="center" stagger={3} maxWidth={zone.w} lineHeight={1.4} /> : null}
          {ns.length ? <div style={{marginTop: 30 * u}}>{KB(Math.min(zone.w, 980 * u), 'active')}</div> : null}
        </div>
      );
    }
    case 'quiz': {
      const reveal = quizReveal(s, fps) - s.from;
      const items = sc.items || [];
      const cdFrom = reveal - 3 * fps;
      return (
        <div style={box}>
          <div dir="rtl" style={{display: 'flex', alignItems: 'center', gap: 22 * u, alignSelf: 'stretch', justifyContent: 'space-between'}}>
            <Eyebrow theme={theme} size={30 * u}>{sc.title || 'کوییز'}</Eyebrow>
            {f >= cdFrom && f < reveal + 20 ? <Countdown theme={theme} from={cdFrom} secs={3} size={120 * u} /> : <div style={{height: 120 * u}} />}
          </div>
          <KineticText text={sc.text || ''} theme={theme} size={(portrait ? 70 : 64) * u} delay={4} stagger={2} maxWidth={zone.w} lineHeight={1.4} />
          <div dir="rtl" style={{display: 'grid', gridTemplateColumns: portrait ? '1fr' : '1fr 1fr', gap: 22 * u, width: '100%', marginTop: 10 * u}}>
            {items.map((it, i) => {
              const p = spring({frame: f - (vLocal + 10 + i * 6), fps, config: {damping: 14}});
              const ok = i === (sc.answer ?? 0);
              const rv = spring({frame: f - reveal, fps, config: {damping: 12}});
              const shown = f >= reveal;
              return (
                <div key={i} style={{opacity: Math.min(1, p * 1.4) * (shown && !ok ? 0.4 : 1), transform: `scale(${0.9 + 0.1 * p + (shown && ok ? 0.04 * rv : 0)})`}}>
                  <Glass theme={theme} radius={24 * u} style={{display: 'flex', alignItems: 'center', gap: 18 * u, padding: `${20 * u}px ${24 * u}px`, borderColor: shown && ok ? theme.good : undefined, background: shown && ok ? hexA(theme.good, 0.16) : undefined}}>
                    <div style={{width: 58 * u, height: 58 * u, borderRadius: 16 * u, display: 'grid', placeItems: 'center', background: shown && ok ? theme.good : hexA(theme.accent, 0.15), color: shown && ok ? '#fff' : theme.accent, fontFamily: F.head, fontWeight: 900, fontSize: 30 * u}}>
                      {shown && ok ? <Check p={rv} size={30 * u} color="#fff" /> : 'الف ب ج د'.split(' ')[i] ?? toFa(i + 1)}
                    </div>
                    <div style={{fontFamily: F.body, fontWeight: 800, fontSize: 42 * u, color: theme.ink}}>{toFa(it)}</div>
                  </Glass>
                </div>
              );
            })}
          </div>
        </div>
      );
    }
    case 'punch':
      return (
        <div style={{...box, alignItems: 'center', textAlign: 'center'}}>
          <div style={{fontFamily: F.slogan, fontSize: 160 * u, lineHeight: 0.6, color: theme.accent, opacity: 0.5, height: 70 * u}}>«</div>
          <KineticText text={sc.title || sc.text || ''} theme={theme} size={(portrait ? 96 : 90) * u} font={F.slogan} weight={700} align="center" stagger={4} reveal="blur" maxWidth={zone.w} lineHeight={1.5} />
        </div>
      );
    case 'cta':
    case 'outro':
      return <Outro {...props} />;
  }
  return null;
};

/* ======================================================================= bits */
export const Check: React.FC<{p: number; size: number; color: string}> = ({p, size, color}) => (
  <svg width={size} height={size} viewBox="0 0 24 24"><path d="M4 12.5l5 5L20 6.5" fill="none" stroke={color} strokeWidth={3.4} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={24} strokeDashoffset={24 * (1 - Math.min(1, Math.max(0, p)))} /></svg>
);
export const Cross: React.FC<{size: number; color: string}> = ({size, color}) => (
  <svg width={size} height={size} viewBox="0 0 24 24"><path d="M5 5l14 14M19 5L5 19" stroke={color} strokeWidth={3.6} strokeLinecap="round" /></svg>
);

const Outro: React.FC<{s: TimedScene<LessonScene>; theme: Theme; zone: Zone; u: number; portrait: boolean; brandName: string; handle: string; shorts?: boolean}> = ({s, theme, zone, u, portrait, brandName, handle, shorts}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const sc = s.scene;
  const press = interpolate(f, [28, 32, 38], [1, 0.9, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const subscribed = f > 32;
  const btn = spring({frame: f - 8, fps, config: {damping: 11}});
  const cursor = interpolate(f, [12, 28], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease});
  const bell = f > 40 ? Math.sin((f - 40) * 0.8) * interpolate(f, [40, 70], [22, 0], {extrapolateRight: 'clamp'}) : 0;
  const endCards = sc.kind === 'outro' && !shorts;
  return (
    <div style={{position: 'absolute', left: zone.x, top: zone.y, width: zone.w, height: zone.h, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 34 * u}}>
      <KineticText text={sc.title || 'اگر مفید بود، *سابسکرایب* کن'} theme={theme} size={(portrait ? 84 : 76) * u} align="center" stagger={3} maxWidth={zone.w} />
      {sc.text ? <KineticText text={sc.text} theme={theme} size={40 * u} delay={10} font={F.body} weight={500} color={theme.muted} align="center" reveal="blur" stagger={1} maxWidth={zone.w * 0.9} /> : null}
      <div style={{display: 'flex', alignItems: 'center', gap: 24 * u, transform: `scale(${btn * press})`, position: 'relative'}}>
        <div dir="rtl" style={{display: 'flex', alignItems: 'center', gap: 16 * u, padding: `${20 * u}px ${46 * u}px`, borderRadius: 999, background: subscribed ? (theme.dark ? '#2A2A2E' : '#CFC7B8') : '#E62117', color: '#fff', fontFamily: F.head, fontWeight: 900, fontSize: 46 * u, boxShadow: subscribed ? 'none' : `0 0 ${50 * u}px rgba(230,33,23,0.45)`}}>
          {subscribed ? 'سابسکرایب شد' : 'سابسکرایب'}
        </div>
        <svg width={70 * u} height={70 * u} viewBox="0 0 24 24" style={{transform: `rotate(${bell}deg)`, transformOrigin: '50% 10%'}}>
          <path d="M12 2a1.5 1.5 0 0 0-1.5 1.5v.6A6.5 6.5 0 0 0 5.5 10.5V15l-2 2v1h17v-1l-2-2v-4.5a6.5 6.5 0 0 0-5-6.4v-.6A1.5 1.5 0 0 0 12 2zm-2 18a2 2 0 0 0 4 0z" fill={theme.ink} />
        </svg>
        <svg width={64 * u} height={64 * u} viewBox="0 0 24 24" style={{position: 'absolute', right: 40 * u, top: 40 * u + cursor * 220 * u, opacity: f < 60 ? 1 : 0}}>
          <path d="M5 3l14 8-6 1.5L16 20l-3 1.2-3-7.2L5 18z" fill="#fff" stroke="#000" strokeWidth={1.2} />
        </svg>
      </div>
      <div dir="ltr" style={{fontFamily: F.latin, fontWeight: 600, fontSize: 30 * u, color: theme.muted, letterSpacing: 3}}>{brandName} · {handle}</div>
      {endCards ? (
        <div style={{display: 'flex', gap: 30 * u, marginTop: 10 * u}}>
          {['ویدیوی بعدی', 'پلی‌لیست دوره'].map((l, i) => (
            <Pop key={l} delay={20 + i * 6}>
              <div style={{width: 400 * u, height: 225 * u, borderRadius: 24 * u, border: `2px dashed ${hexA(theme.ink, 0.35)}`, display: 'grid', placeItems: 'center', fontFamily: F.body, fontWeight: 700, fontSize: 32 * u, color: theme.muted, background: hexA(theme.ink, 0.04)}}>{l}</div>
            </Pop>
          ))}
        </div>
      ) : null}
    </div>
  );
};
