/**
 * Sound layer: music bed (looped, ducked under the voice), narration clips, SFX and real piano notes.
 * Everything is placed by frame so browser preview, browser render and cloud render sound identical.
 */
import React from 'react';
import {Sequence, interpolate} from 'remotion';
import {Audio} from '@remotion/media';
import {assetUrl} from '../fonts';
import {TimedScene} from '../timeline';

export type Sfx = 'whoosh' | 'pop' | 'click' | 'tick' | 'riser' | 'impact' | 'wrong' | 'ding' | 'shimmer' | 'logo' | 'correct';
export interface SfxEvent { at: number; name: Sfx; vol?: number }
export interface NoteHit { at: number; midi: number; dur: number; vol?: number } // frames

const BED_LEN: Record<string, number> = {lesson: 26.7, tip: 19.6, luxe: 32};

export const SoundLayer: React.FC<{
  total: number;
  fps: number;
  bed?: string; // lesson | tip | luxe | none
  bedVolume?: number;
  scenes?: TimedScene[]; // voice clips + ducking
  sfx?: SfxEvent[];
  notes?: NoteHit[];
  sfxOn?: boolean;
  notesOn?: boolean;
  noteVolume?: number;
}> = ({total, fps, bed = 'lesson', bedVolume = 0.5, scenes = [], sfx = [], notes = [], sfxOn = true, notesOn = true, noteVolume = 0.85}) => {
  const segs = scenes.flatMap((s) => s.segs.filter((g) => g.clip).map((g) => ({at: s.voiceFrom + Math.round(g.start * fps), dur: g.dur, src: g.clip!.src})));
  // ducking envelope (frames where the voice is speaking)
  const spans = segs.map((g) => [g.at - 6, g.at + Math.ceil(g.dur * fps) + 8]);
  const duck = (f: number) => {
    let d = 1;
    for (const [a, b] of spans) {
      if (f >= a - 10 && f <= b + 14) {
        const k = f < a ? (a - f) / 10 : f > b ? (f - b) / 14 : 0;
        d = Math.min(d, 0.28 + 0.72 * k);
      }
    }
    return d;
  };
  const playingNotes = (f: number) => notes.some((n) => f >= n.at && f < n.at + n.dur);
  const fadeIn = Math.min(30, total / 4);
  const fadeOut = Math.min(45, total / 3);
  const bedVol = (f: number) =>
    bedVolume * 0.55 * duck(f) * (playingNotes(f) ? 0.55 : 1) * interpolate(f, [0, fadeIn, total - fadeOut, total], [0, 1, 1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const bedLen = BED_LEN[bed] ?? 0;
  return (
    <>
      {bed !== 'none' && bedLen ? <Audio src={assetUrl(`audio/bed/${bed}.mp3`)} loop loopVolumeCurveBehavior="extend" volume={bedVol} /> : null}
      {segs.map((g, i) => (
        <Sequence key={`v${i}`} from={g.at} durationInFrames={Math.ceil(g.dur * fps) + 6} layout="none">
          <Audio src={assetUrl(g.src)} volume={1} />
        </Sequence>
      ))}
      {sfxOn
        ? sfx.filter((e) => e.at >= 0 && e.at < total).map((e, i) => (
            <Sequence key={`s${i}`} from={e.at} durationInFrames={Math.min(total - e.at, 4 * fps)} layout="none">
              <Audio src={assetUrl(`audio/sfx/${e.name}.mp3`)} volume={(e.vol ?? 0.5) * 0.8} />
            </Sequence>
          ))
        : null}
      {notesOn
        ? notes.filter((n) => n.at >= 0 && n.at < total).map((n, i) => {
            const len = Math.min(total - n.at, Math.round(n.dur + 0.5 * fps), Math.round(3.1 * fps));
            const m = Math.max(36, Math.min(96, Math.round(n.midi)));
            return (
              <Sequence key={`n${i}`} from={n.at} durationInFrames={Math.max(2, len)} layout="none">
                <Audio
                  src={assetUrl(`audio/piano/${m}.mp3`)}
                  volume={(f) => (n.vol ?? 0.8) * noteVolume * interpolate(f, [n.dur, len], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})}
                />
              </Sequence>
            );
          })
        : null}
    </>
  );
};
