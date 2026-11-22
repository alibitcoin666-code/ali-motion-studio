/**
 * LessonPro (16:9 piano lesson) and TipShort (9:16 tip/technique) — one engine, two presets.
 * Audio-first: scene lengths follow the narration; captions + mascot follow real word timings.
 */
import React, {useMemo} from 'react';
import {AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig} from 'remotion';
import {CommonProps, getBrand, getTheme, layout} from '../theme';
import {useFontsReady} from '../fonts';
import {Background, BrandMark, Chip, LightSweep, Particles, ProgressBar, SceneShell} from '../components/core';
import {Captions} from '../components/Captions';
import {SoundLayer} from '../components/Sound';
import {Mascot, Pose, talkFrom} from '../mascot/Mascot';
import {allWords, timeScenes, totalOf, TimedScene} from '../timeline';
import {DEFAULT_POSE, LessonScene, SceneView, Zone, extraOf, minOf, notesFor, sfxFor} from './scenes';

export interface ScriptProps extends CommonProps {
  variant?: 'lesson' | 'tip';
  episode?: string;
  courseTitle?: string;
  scenes: LessonScene[];
  showProgress?: boolean;
}

export const timeScript = (p: ScriptProps) => timeScenes<LessonScene>(p.scenes || [], p.voicePack, p.voice || 'farid', minOf, extraOf);
export const scriptFrames = (p: ScriptProps) => totalOf(timeScript(p));

const zoneFor = (w: number, h: number, mascot: boolean): Zone => {
  const L = layout(w, h);
  if (L.portrait) return {x: 70, y: 250, w: w - 140, h: h - 250 - (mascot ? 820 : 640)};
  if (L.square) return {x: 60, y: 120, w: w - 120, h: h - 120 - (mascot ? 330 : 200)};
  return {x: mascot ? 560 : 160, y: 130, w: w - (mascot ? 560 : 160) - 110, h: h - 130 - 190};
};

export const ScriptVideo: React.FC<ScriptProps> = (p) => {
  useFontsReady();
  const f = useCurrentFrame();
  const {fps, width: W, height: H} = useVideoConfig();
  const L = layout(W, H);
  const theme = getTheme(p.theme, p.brand);
  const brand = getBrand(p.brand);
  const shorts = p.variant === 'tip' || L.portrait;
  const showMascot = (p.mascot ?? brand.mascot) !== false && brand.mascot;
  const ts = useMemo(() => timeScript(p), [p.scenes, p.voicePack, p.voice]);
  const total = totalOf(ts);
  const words = useMemo(() => allWords(ts, fps), [ts, fps]);
  const sfx = useMemo(() => ts.flatMap((s, i) => sfxFor(s, fps, i === 0)), [ts, fps]);
  const notes = useMemo(() => ts.flatMap((s) => notesFor(s, fps)), [ts, fps]);
  const zone = zoneFor(W, H, showMascot);
  const u = L.u;

  const cur: TimedScene<LessonScene> | undefined = ts.find((s) => f >= s.from && f < s.from + s.frames) ?? ts[ts.length - 1];
  const prev = cur ? ts[cur.index - 1] : undefined;
  const poseOf = (s?: TimedScene<LessonScene>): Pose => (s ? s.scene.pose || DEFAULT_POSE[s.scene.kind] : 'idle');
  // quiz: think while waiting, celebrate on reveal
  let pose = poseOf(cur);
  let poseAt = cur?.from ?? 0;
  if (cur?.scene.kind === 'quiz' && cur.segs[1] && f >= cur.voiceFrom + cur.segs[1].start * fps) { pose = 'celebrate'; poseAt = Math.round(cur.voiceFrom + cur.segs[1].start * fps); }
  const talk = useMemo(() => {
    const fns = ts.map((s) => talkFrom(s.words, s.voiceFrom, fps));
    return (fr: number) => {
      const s = ts.find((x) => fr >= x.from && fr < x.from + x.frames);
      return s ? fns[s.index](fr) : 0;
    };
  }, [ts, fps]);

  const mW = L.portrait ? 460 : L.square ? 300 : 500;
  const capBottom = L.portrait ? 640 : L.square ? 40 : 40;
  const capMax = L.portrait ? W - 120 : L.square ? W - 100 : W - zone.x - 60;

  return (
    <AbsoluteFill style={{background: theme.bg, direction: 'ltr'}}>
      <Background theme={theme} seed={p.variant === 'tip' ? 7 : 3} />
      <Particles theme={theme} count={L.portrait ? 18 : 24} />
      {ts.map((s) => (
        <Sequence key={s.index} from={s.from} durationInFrames={s.frames} layout="none">
          <SceneShell frames={s.frames} enter={s.index > 0} exit={s.index < ts.length - 1}>
            <SceneView s={s} theme={theme} zone={zone} u={u} portrait={L.portrait} episode={p.episode} course={p.courseTitle} brandName={brand.nameEn} handle={brand.handle} shorts={shorts} />
          </SceneShell>
          <LightSweep theme={theme} at={0} dur={26} />
        </Sequence>
      ))}

      {showMascot && cur ? (
        <div style={{position: 'absolute', left: L.portrait ? 40 : 40, bottom: L.portrait ? 250 : L.square ? 20 : 60}}>
          <Mascot
            pose={pose}
            prevPose={pose === poseOf(cur) ? poseOf(prev) : poseOf(cur)}
            poseAt={poseAt}
            talk={talk}
            width={mW}
            enterAt={0}
            sticker={theme.dark ? '#F3EEE4' : '#FFFFFF'}
          />
        </div>
      ) : null}

      {/* HUD */}
      <BrandMark theme={theme} name={brand.nameEn} handle={brand.handle} u={u} portrait={L.portrait} />
      {cur && cur.scene.label && !L.portrait ? (
        <div style={{position: 'absolute', right: 56 * u, top: 36 * u}}>
          <Chip theme={theme} size={24 * u}>{cur.scene.label}</Chip>
        </div>
      ) : null}
      {p.showProgress !== false ? <ProgressBar theme={theme} total={total} /> : null}
      {p.captions !== false ? (
        <div style={{position: 'absolute', left: L.landscape ? zone.x - 20 : 0, right: L.landscape ? 60 : 0, bottom: 0, top: 0}}>
          <Captions theme={theme} words={words} mode={shorts ? 'pop' : 'karaoke'} u={u} bottom={capBottom} maxWidth={capMax} />
        </div>
      ) : null}

      <SoundLayer total={total} fps={fps} bed={p.music ?? (p.variant === 'tip' ? 'tip' : 'lesson')} bedVolume={p.musicVolume ?? 0.5} scenes={ts} sfx={sfx} notes={notes} sfxOn={p.sfx !== false} />
    </AbsoluteFill>
  );
};
