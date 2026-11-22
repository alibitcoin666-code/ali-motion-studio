/**
 * Narration engine — the single source of truth for scene timing.
 *
 * Every template is described as a list of scenes. Each scene has on-screen content and a
 * narration text (auto-written from the template fields, or overridden by the user, or taken
 * from an imported course lesson). A scene lasts at least as long as its narration needs, so
 * picture, subtitles and the voice-over always line up. The same plan drives:
 *   - scene placement inside the templates (Sequence from/duration)
 *   - burned-in subtitles
 *   - SRT export, YouTube chapters, TTS prompt
 *   - the cloud voice-over (edge-tts clips placed at each caption start)
 */
import {FPS, BRANDS, toFa} from '../remotion/theme';

export const WORDS_PER_SEC = 2.15; // measured with fa-IR-FaridNeural / DilaraNeural at rate +0%
const LEAD = 8; // frames of silence at the start of each scene
const TAIL = 14; // frames of breathing room at the end of each scene

export interface Scene {
  key: string;
  label: string; // chapter / scene label (Persian)
  text: string; // narration text for this scene
  base: number; // designed duration (frames)
  frames: number; // final duration (frames) after fitting the narration
  from: number; // start frame
}

export interface Caption {
  scene: number;
  from: number; // frame
  to: number; // frame
  text: string; // text to show and to speak
  pauseAfter: number; // seconds of silence requested after this chunk
}

/* ------------------------------------------------------------------ text helpers */
const EMOJI = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{200D}\u{20E3}]/gu;
export const cleanText = (s: string) =>
  (s || '')
    .replace(/\*/g, '')
    .replace(EMOJI, '')
    .replace(/\s+/g, ' ')
    .trim();

const PAUSE = /\[\s*مکث\s*([0-9۰-۹.٫,]+)\s*ثانیه\s*\]/g;
const faNum = (s: string) => Number(s.replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d))).replace(/[٫,]/g, '.')) || 0;

export const wordCount = (s: string) => cleanText(s.replace(PAUSE, ' ')).split(' ').filter(Boolean).length;

/** Estimated speech length in frames (includes requested pauses and sentence breaths). */
export const speechFrames = (text: string) => {
  const t = text || '';
  if (!cleanText(t.replace(PAUSE, ''))) return 0;
  let pauses = 0;
  t.replace(PAUSE, (_, n) => {
    pauses += faNum(n);
    return '';
  });
  const breaths = (t.match(/[.!؟?؛]/g) || []).length * 0.25;
  return Math.ceil((wordCount(t) / WORDS_PER_SEC + pauses + breaths) * FPS);
};

/** Split narration into caption chunks (sentences, then ~14-word pieces), keeping pause markers. */
export const splitChunks = (text: string): {text: string; pauseAfter: number}[] => {
  const out: {text: string; pauseAfter: number}[] = [];
  const parts = (text || '').split(PAUSE);
  // split() with a capture group interleaves: [text, pauseNum, text, pauseNum, ...]
  for (let i = 0; i < parts.length; i += 2) {
    const seg = parts[i] || '';
    const pause = i + 1 < parts.length ? faNum(parts[i + 1]) : 0;
    const sentences = seg.split(/(?<=[.!؟?؛])\s+/).map(cleanText).filter(Boolean);
    sentences.forEach((s, si) => {
      const words = s.split(' ');
      const pieces: string[] = [];
      if (words.length <= 16) pieces.push(s);
      else {
        // split long sentences at commas first, else every ~12 words
        const byComma = s.split(/(?<=[،,:])\s+/);
        let cur: string[] = [];
        for (const c of byComma) {
          const cw = c.split(' ');
          if (cur.length + cw.length > 14 && cur.length) {
            pieces.push(cur.join(' '));
            cur = [];
          }
          if (cw.length > 16) {
            for (let k = 0; k < cw.length; k += 12) pieces.push(cw.slice(k, k + 12).join(' '));
          } else cur.push(...cw);
        }
        if (cur.length) pieces.push(cur.join(' '));
      }
      pieces.forEach((pc, pi) => out.push({text: pc, pauseAfter: si === sentences.length - 1 && pi === pieces.length - 1 ? pause : 0}));
    });
    if (!sentences.length && pause && out.length) out[out.length - 1].pauseAfter += pause;
  }
  return out;
};

/* ------------------------------------------------------------------ scene lists per template */
type RawScene = {key: string; label: string; auto: string; base: number; minFrames?: number};
const s = (v: unknown) => cleanText(String(v ?? ''));
const brandOf = (p: any) => BRANDS[p?.brand as keyof typeof BRANDS] ?? BRANDS.ali;

const RAW: Record<string, (p: any) => RawScene[]> = {
  PianoLesson: (p) => {
    const b = brandOf(p);
    const steps: any[] = p.steps || [];
    const stepBase = Math.round((Number(p.stepSeconds) || 6) * FPS);
    return [
      {key: 'intro', label: 'شروع', base: 105, auto: `سلام، به ${b.nameFa} خوش آمدید. جلسهٔ ${s(p.episode)}: ${s(p.title)}.`},
      ...steps.map((st, i) => ({key: `step${i}`, label: `قدم ${toFa(i + 1)}: ${s(st.title)}`, base: stepBase, auto: `قدم ${toFa(i + 1)}، ${s(st.title)}. ${s(st.text)}.`})),
      {key: 'summary', label: 'مرور', base: 120, auto: `مرور کنیم: ${steps.map((st) => s(st.title)).join('، ')}.`},
      {key: 'outro', label: 'پایان', base: 110, auto: `اگر این آموزش برایتان مفید بود، ${s(p.cta) || 'عضو کانال شوید'}.`},
    ];
  },
  PianoTip: (p) => [
    {key: 'hook', label: 'هوک', base: 96, auto: s(p.hook)},
    {key: 'compare', label: 'اشتباه رایج و روش درست', base: 165, auto: `اشتباه رایج: ${s(p.mistake)}. روش درست: ${s(p.correct)}.`},
    {key: 'demo', label: 'دمو', base: 180, auto: `${s(p.demoTitle)}. با دقت به کلیدها نگاه کنید.`},
    {key: 'take', label: 'خلاصه', base: 110, auto: s(p.takeaway)},
    {key: 'outro', label: 'پایان', base: 100, auto: `${s(p.cta) || 'دنبال کنید'} تا نکته‌های بعدی را از دست ندهید.`},
  ],
  KineticQuote: (p) => {
    const beat = (60 / Math.max(40, Math.min(200, p.bpm || 90))) * FPS;
    const line = Math.round(beat * Math.max(2, p.beatsPerLine || 6));
    const lines: string[] = (p.lines || []).filter(Boolean);
    return [
      ...lines.map((l, i) => ({key: `line${i}`, label: `خط ${toFa(i + 1)}`, base: line, auto: s(l)})),
      {key: 'end', label: 'امضا', base: 120, auto: s(p.author)},
    ];
  },
  ChordScale: (p) => [
    {key: 'main', label: s(p.nameFa) || 'آکورد', base: Math.round((Number(p.durationSec) || 12) * FPS), auto: `${s(p.kind)}: ${s(p.nameFa)}. فرمول: ${s(p.formula).replace(/b(?=\d)/g, ' بمل ')}. ${s(p.tip)}.`},
  ],
  BrandIntro: (p) => [{key: 'main', label: 'اینترو', base: Math.round((Number(p.durationSec) || 5) * FPS), auto: ''}],
  MusicRelease: (p) => [
    {key: 'main', label: s(p.trackTitle) || 'آهنگ', base: Math.round((Number(p.durationSec) || 20) * FPS), auto: `${s(p.tagline)}: ${s(p.trackTitle)}، از ${s(p.artist)}. همین حالا گوش کنید.`},
  ],
  EndScreen: (p) => [{key: 'main', label: 'پایان', base: Math.round((Number(p.durationSec) || 20) * FPS), auto: `${s(p.message)}. ${s(p.cta)}.`}],
};

/** Scene-based templates (Whiteboard, Stickman) carry their own scenes with narration. */
const fromScriptScenes = (p: any): RawScene[] =>
  ((p.scenes || []) as any[]).map((sc, i) => ({
    key: `s${i}`,
    label: s(sc.title) || `صحنه ${toFa(i + 1)}`,
    auto: sc.narration || '',
    base: Math.round((Number(sc.sec) || 0) * FPS),
    minFrames: sc.kind === 'title' || sc.kind === 'outro' ? 120 : 150,
  }));
RAW.Whiteboard = fromScriptScenes;
RAW.Stickman = fromScriptScenes;

/** Build the scene timeline for a template. */
export const buildScenes = (templateId: string, p: any): Scene[] => {
  const raw = (RAW[templateId] ?? (() => []))(p);
  const sync = p?.syncNarration !== false;
  const beat = templateId === 'KineticQuote' ? (60 / Math.max(40, Math.min(200, p.bpm || 90))) * FPS : 0;
  let at = 0;
  return raw.map((r, i) => {
    const override = Array.isArray(p?.narration) ? p.narration[i] : undefined;
    const text = typeof override === 'string' && override.trim() ? override : r.auto;
    let frames = Math.max(r.base, r.minFrames ?? 0);
    if (sync) {
      const need = speechFrames(text) + LEAD + TAIL;
      if (need > frames) frames = beat ? Math.ceil(need / beat) * beat : need;
    }
    frames = Math.max(30, Math.round(frames));
    const sc: Scene = {key: r.key, label: r.label, text, base: r.base, frames, from: at};
    at += frames;
    return sc;
  });
};

export const totalFrames = (scenes: Scene[]) => scenes.reduce((a, b) => a + b.frames, 0);

/** Caption chunks placed inside each scene, proportionally to their speech length. */
export const buildCaptions = (scenes: Scene[]): Caption[] => {
  const caps: Caption[] = [];
  scenes.forEach((sc, si) => {
    const chunks = splitChunks(sc.text);
    if (!chunks.length) return;
    const lens = chunks.map((c) => speechFrames(c.text) + Math.round(c.pauseAfter * FPS));
    const need = lens.reduce((a, b) => a + b, 0);
    const avail = Math.max(1, sc.frames - LEAD - TAIL);
    const k = need > avail ? avail / need : 1;
    let t = sc.from + LEAD;
    chunks.forEach((c, ci) => {
      const speak = (lens[ci] - Math.round(c.pauseAfter * FPS)) * k;
      const from = Math.round(t);
      const to = Math.round(t + speak);
      caps.push({scene: si, from, to: Math.max(from + 12, to), text: c.text, pauseAfter: c.pauseAfter});
      t += lens[ci] * k;
    });
  });
  return caps;
};

/* ------------------------------------------------------------------ exports */
const pad = (n: number, l = 2) => String(Math.floor(n)).padStart(l, '0');
export const fmtClock = (frames: number) => {
  const sec = frames / FPS;
  return `${pad(sec / 60)}:${pad(sec % 60)}`;
};
const srtTime = (frames: number) => {
  const ms = Math.round((frames / FPS) * 1000);
  return `${pad(ms / 3600000)}:${pad((ms / 60000) % 60)}:${pad((ms / 1000) % 60)},${String(ms % 1000).padStart(3, '0')}`;
};

export const toSRT = (caps: Caption[]) => caps.map((c, i) => `${i + 1}\n${srtTime(c.from)} --> ${srtTime(c.to)}\n${c.text}\n`).join('\n');

/** YouTube chapters: first at 00:00, each ≥ 10 s, at least 3 (else empty). */
export const toChapters = (scenes: Scene[]) => {
  const merged: {from: number; label: string; frames: number}[] = [];
  for (const sc of scenes) {
    const last = merged[merged.length - 1];
    if (last && last.frames < 10 * FPS) {
      last.frames += sc.frames;
    } else merged.push({from: sc.from, label: sc.label, frames: sc.frames});
  }
  if (merged.length > 1 && merged[merged.length - 1].frames < 10 * FPS) {
    const l = merged.pop()!;
    merged[merged.length - 1].frames += l.frames;
  }
  if (merged.length < 3) return '';
  return merged.map((m, i) => `${i === 0 ? '00:00' : fmtClock(m.from)} ${m.label}`).join('\n');
};

export type VoiceId = 'farid' | 'dilara' | 'none';
export const VOICES: Record<Exclude<VoiceId, 'none'>, {label: string; edge: string; desc: string}> = {
  farid: {label: 'فرید (مرد، گرم)', edge: 'fa-IR-FaridNeural', desc: 'male, warm, friendly'},
  dilara: {label: 'دلارا (زن، روشن)', edge: 'fa-IR-DilaraNeural', desc: 'female, bright, friendly'},
};

export const ttsPrompt = (scenes: Scene[], caps: Caption[], opts: {brandName: string; voice?: VoiceId; title?: string}) => {
  const v = opts.voice && opts.voice !== 'none' ? VOICES[opts.voice] : VOICES.farid;
  const head = [
    `# پرامپت نریشن — ${opts.title || opts.brandName}`,
    '',
    'مشخصات صدا (برای هر موتور TTS یا گوینده):',
    `- زبان: فارسی معیار، لحن ${opts.brandName}: گرم، صمیمی، مطمئن، مثل یک معلم آرام.`,
    `- صدای پیشنهادی رایگان: ${v.edge} (${v.desc}).`,
    `- سرعت: حدود ${Math.round(WORDS_PER_SEC * 60)} کلمه در دقیقه؛ هر خط باید در بازهٔ زمانی خودش تمام شود.`,
    '- مکث‌ها: جایی که [مکث] آمده سکوت کن؛ بین صحنه‌ها نیم ثانیه نفس.',
    '- تأکید روی نام نت‌ها (دو، ر، می، فا، سل، لا، سی)، اعداد و کلمات کلیدی.',
    '- خروجی: یک فایل WAV یا MP3 هم‌طول ویدیو؛ هر خط دقیقاً از زمان شروعش.',
    '',
    '## متن زمان‌بندی‌شده',
    '',
  ];
  const body = scenes.flatMap((sc, si) => {
    const lines = caps.filter((c) => c.scene === si).map((c) => `[${fmtClock(c.from)}–${fmtClock(c.to)}] ${c.text}${c.pauseAfter ? ` [مکث ${toFa(c.pauseAfter)} ثانیه]` : ''}`);
    return lines.length ? [`### ${sc.label} (${fmtClock(sc.from)}–${fmtClock(sc.from + sc.frames)})`, ...lines, ''] : [];
  });
  return [...head, ...body].join('\n');
};

/** Plan sent with cloud jobs so the renderer can synthesise and place every clip. */
export const cloudPlan = (caps: Caption[]) => caps.map((c) => ({start: +(c.from / FPS).toFixed(3), end: +(c.to / FPS).toFixed(3), text: c.text}));
