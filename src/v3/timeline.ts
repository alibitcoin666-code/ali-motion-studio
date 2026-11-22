/**
 * Audio-first timeline. Every template is a list of scenes; each scene may have a narration line (`say`).
 * Scene length = max(designed minimum, voice length + breathing room). With a voice pack the real
 * edge-tts word timings drive captions and the mascot; without it we estimate (~2.05 words/s).
 * The same data produces burned-in captions, SRT, YouTube chapters and the TTS job list.
 */
import {FPS, VoiceClip, VoicePack, Word, toFa} from './theme';

export const WPS = 2.05; // fa-IR Farid/Dilara at rate -4%
export const LEAD = 0.35; // s of silence before the voice inside a scene
export const TAIL = 0.55; // s after the voice

const PAUSE = /\[\s*مکث\s*([0-9۰-۹.٫,]+)\s*ثانیه\s*\]/g;
const EMOJI = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{200D}\u{20E3}]/gu;
export const clean = (s: string) => (s || '').replace(/\*/g, '').replace(EMOJI, '').replace(/\s+/g, ' ').trim();
/** Text actually sent to the TTS engine (pause markers become a comma pause). */
export const ttsText = (s: string) => clean((s || '').replace(PAUSE, '، ')).replace(/(،\s*)+/g, '، ').replace(/^،\s*|،\s*$/g, '');

/** FNV-1a hash → stable key for a voice clip. */
export const clipKey = (voice: string, text: string) => {
  let h = 0x811c9dc5;
  const s = `${voice}|${ttsText(text)}`;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
};

export const estimateWords = (text: string): Word[] => {
  const words = ttsText(text).split(' ').filter(Boolean);
  const out: Word[] = [];
  let t = 0;
  for (const w of words) {
    const d = Math.max(0.18, (w.replace(/[،.!؟?؛:]/g, '').length / 4.6) / WPS * 1.1);
    out.push({w, t, d});
    t += d + 0.06 + (/[.!؟?؛]$/.test(w) ? 0.35 : /[،,:]$/.test(w) ? 0.18 : 0);
  }
  return out;
};

export interface SceneLike { say?: string; min?: number; [k: string]: any }
export interface Segment { key: string; text: string; clip: VoiceClip | null; start: number; dur: number; words: Word[]; pauseBefore: number }
export interface TimedScene<S extends SceneLike = SceneLike> {
  scene: S;
  index: number;
  from: number; // frame
  frames: number;
  voiceFrom: number; // absolute frame where the voice starts
  segs: Segment[]; // narration split at [مکث N ثانیه] markers → real silent gaps
  clip: VoiceClip | null; // first real clip (null = estimated voice)
  words: Word[]; // all words, seconds relative to voiceFrom
  voiceDur: number; // seconds (incl. pauses)
}

const faNum = (s: string) => Number(s.replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d))).replace(/[٫,]/g, '.')) || 0;
/** Split narration at pause markers: [{text, pauseBefore}] */
export const splitSay = (say: string) => {
  const parts = (say || '').split(PAUSE);
  const out: {text: string; pauseBefore: number}[] = [];
  let pause = 0;
  for (let i = 0; i < parts.length; i += 2) {
    const text = ttsText(parts[i] || '');
    if (text) { out.push({text, pauseBefore: out.length ? pause : 0}); pause = 0; }
    if (i + 1 < parts.length) pause += faNum(parts[i + 1]);
  }
  return out;
};

export const timeScenes = <S extends SceneLike>(
  scenes: S[], pack: VoicePack | null | undefined, voice: string,
  minOf: (s: S) => number = () => 3, extraOf: (s: S) => number = () => 0, fps = FPS,
): TimedScene<S>[] => {
  let from = 0;
  const v = pack?.voice || voice;
  return (scenes || []).map((scene, index) => {
    let cursor = 0;
    const segs: Segment[] = splitSay(scene.say || '').map((p) => {
      const key = clipKey(v, p.text);
      const clip = pack?.clips?.[key] ?? null;
      const words = clip ? clip.words : estimateWords(p.text);
      const last = words[words.length - 1];
      const dur = clip ? clip.dur : last ? last.t + last.d : 0;
      cursor += p.pauseBefore;
      const seg = {key, text: p.text, clip, start: cursor, dur, words, pauseBefore: p.pauseBefore};
      cursor += dur;
      return seg;
    });
    const words = segs.flatMap((sg) => sg.words.map((w) => ({...w, t: w.t + sg.start})));
    const voiceDur = cursor;
    const minS = Number(scene.min) > 0 ? Number(scene.min) : minOf(scene);
    const frames = Math.ceil(Math.max(minS, voiceDur ? LEAD + voiceDur + TAIL + extraOf(scene) : 0) * fps);
    const t: TimedScene<S> = {scene, index, from, frames, voiceFrom: from + Math.round(LEAD * fps), segs, clip: segs.find((x) => x.clip)?.clip ?? null, words, voiceDur};
    from += frames;
    return t;
  });
};
export const totalOf = (ts: TimedScene[]) => ts.reduce((a, s) => a + s.frames, 0) || FPS;

/** Absolute word list for the whole video (seconds). */
export interface AbsWord extends Word { scene: number }
export const allWords = (ts: TimedScene[], fps = FPS): AbsWord[] =>
  ts.flatMap((s) => s.words.map((w) => ({...w, t: s.voiceFrom / fps + w.t, scene: s.index})));

/** Group words into caption pages of up to `lines` lines × `maxChars` characters. */
export interface CaptionPage { words: AbsWord[]; lines: AbsWord[][]; start: number; end: number }
export const captionPages = (words: AbsWord[], maxChars = 34, lines = 2, maxWords = 99): CaptionPage[] => {
  const pages: CaptionPage[] = [];
  let cur: AbsWord[][] = [[]];
  const len = (l: AbsWord[]) => l.reduce((a, w) => a + w.w.length + 1, 0);
  const flush = () => {
    const ws = cur.flat();
    if (ws.length) pages.push({words: ws, lines: cur.filter((l) => l.length), start: ws[0].t, end: ws[ws.length - 1].t + ws[ws.length - 1].d});
    cur = [[]];
  };
  let prev: AbsWord | null = null;
  for (const w of words) {
    if (prev && (w.scene !== prev.scene || w.t - (prev.t + prev.d) > 0.7)) flush();
    let line = cur[cur.length - 1];
    if (line.length && (len(line) + w.w.length > maxChars || cur.flat().length >= maxWords)) {
      if (cur.length >= lines || cur.flat().length >= maxWords) flush();
      else cur.push([]);
      line = cur[cur.length - 1];
    }
    line.push(w);
    prev = w;
    const ws = cur.flat();
    if (/[.!؟?؛]$/.test(w.w) && ws.length >= 3) flush();
    else if (maxWords < 10 && /[،,:]$/.test(w.w)) flush();
  }
  flush();
  // keep each page visible until the next one starts (max +0.6 s)
  pages.forEach((p, i) => {
    const next = pages[i + 1];
    p.end = next ? Math.min(next.start, p.end + 0.6) : p.end + 0.6;
  });
  return pages;
};

/* ---------------------------------------------------------------- exports */
const ts = (s: number) => {
  const ms = Math.max(0, Math.round(s * 1000));
  const p = (n: number, l = 2) => String(n).padStart(l, '0');
  return `${p(Math.floor(ms / 3600000))}:${p(Math.floor(ms / 60000) % 60)}:${p(Math.floor(ms / 1000) % 60)},${p(ms % 1000, 3)}`;
};
export const toSrt = (pages: CaptionPage[]) =>
  pages.map((p, i) => `${i + 1}\n${ts(p.start)} --> ${ts(p.end)}\n${p.lines.map((l) => l.map((w) => w.w).join(' ')).join('\n')}\n`).join('\n');

export const chapters = (tsList: TimedScene[], label: (s: any, i: number) => string, fps = FPS) => {
  const out: string[] = [];
  let lastLabel = '';
  let lastSec = 0;
  for (const s of tsList) {
    const l = label(s.scene, s.index);
    if (!l || l === lastLabel) continue;
    const sec = Math.floor(s.from / fps);
    // YouTube needs ≥ 10 s per chapter: merge short ones into the previous chapter
    if (out.length && sec - lastSec < 10) continue;
    lastSec = sec;
    out.push(`${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')} ${l}`);
    lastLabel = l;
  }
  if (out.length && !out[0].startsWith('0:00')) out[0] = out[0].replace(/^\S+/, '0:00');
  return out.join('\n');
};

/** Clips the cloud TTS job must create for these scenes (skips ones already in the pack). */
export const missingClips = (scenes: SceneLike[], pack: VoicePack | null | undefined, voice: string) => {
  const seen = new Set<string>();
  const out: {key: string; text: string}[] = [];
  for (const s of scenes) for (const p of splitSay(s.say || '')) {
    const key = clipKey(voice, p.text);
    if (seen.has(key) || (pack?.voice === voice && pack.clips[key])) continue;
    seen.add(key);
    out.push({key, text: p.text});
  }
  return out;
};

export const fmtDur = (frames: number, fps = FPS) => {
  const s = Math.round(frames / fps);
  return toFa(`${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`);
};
