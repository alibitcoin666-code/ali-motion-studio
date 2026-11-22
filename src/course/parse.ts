/**
 * Course package importer.
 * Accepts the files of a course ZIP (path → text) and extracts lessons (sessions),
 * motion/narration scripts, quizzes, curiosity & Friday posts and the publishing calendar.
 * Format reference: docs/COURSE_ZIP_FORMAT.md
 */
import type {ScriptScene} from '../remotion/script/types';

export interface Segment {
  from: number; // seconds
  to: number;
  text: string;
}
export interface MotionRow {
  from: number;
  to: number;
  visual: string;
  text: string;
  effect: string;
}
export interface Quiz {
  question: string;
  options: string[];
  answer: number;
  explain: string;
}
export interface Lesson {
  id: string; // L01
  num: number;
  title: string;
  dateFa: string;
  dateG: string;
  weekday: string;
  time: string;
  goal: string;
  prereq: string;
  caption: string;
  card: any;
  motion: MotionRow[];
  narration: Segment[];
  ttsPrompt: string;
  exercise: string;
  success: string;
  quiz: Quiz | null;
  image?: string;
}
export interface CuriosityPost {
  id: string;
  when: string;
  hook: string;
  fact: string;
  why: string;
  bridge: string;
  source: string;
  caption: string;
  image?: string;
}
export interface FridayPost {
  id: string;
  when: string;
  format: string;
  caption: string;
  image?: string;
}
export interface CalendarRow {
  day: string;
  dateFa: string;
  dateG: string;
  weekday: string;
  time: string;
  type: string;
  title: string;
  captionFile: string;
  imageFile: string;
  mediaFile: string;
  tags: string;
  status: string;
  ref?: string; // L01 / C01 / F01
}
export interface Course {
  title: string;
  channel: string;
  site: string;
  lessons: Lesson[];
  curiosity: CuriosityPost[];
  friday: FridayPost[];
  calendar: CalendarRow[];
  images: Record<string, string>; // file name → URL (blob: in the app, relative path in builds)
  importedAt: string;
}

/* ------------------------------------------------------------------ helpers */
const FA = '۰۱۲۳۴۵۶۷۸۹';
const AR = '٠١٢٣٤٥٦٧٨٩';
export const toEnDigits = (s: string) => (s || '').replace(/[۰-۹]/g, (d) => String(FA.indexOf(d))).replace(/[٠-٩]/g, (d) => String(AR.indexOf(d)));
const clock = (s: string) => {
  const t = toEnDigits(s).trim();
  const m = t.match(/(\d+):(\d+)/);
  if (m) return Number(m[1]) * 60 + Number(m[2]);
  const n = parseFloat(t.replace('٫', '.'));
  return isNaN(n) ? 0 : n;
};
const section = (md: string, re: RegExp) => {
  const lines = md.split('\n');
  const i = lines.findIndex((l) => /^##\s/.test(l) && re.test(l));
  if (i < 0) return '';
  const out: string[] = [];
  for (let j = i + 1; j < lines.length; j++) {
    if (/^##\s/.test(lines[j])) break;
    out.push(lines[j]);
  }
  return out.join('\n').trim();
};
const field = (block: string, label: string) => {
  const m = block.match(new RegExp(`[-*]\\s*${label}\\s*[:：]\\s*(.+)`));
  return m ? m[1].trim() : '';
};
const bold = (block: string, label: string) => {
  const m = block.match(new RegExp(`\\*\\*${label}[:：]?\\*\\*\\s*[:：]?\\s*([\\s\\S]*?)(?=\\n\\s*\\*\\*[^*]+[:：]?\\*\\*|\\n---|$)`));
  return m ? m[1].trim() : '';
};
const stripEmoji = (s: string) => (s || '').replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{2705}\u{1F000}-\u{1F2FF}]/gu, '').replace(/\s{2,}/g, ' ').trim();

/* ------------------------------------------------------------------ lessons */
export const parseLesson = (id: string, md: string, captionTxt?: string): Lesson => {
  const head = md.match(/^#\s*(.+)$/m)?.[1] ?? id;
  const spec = section(md, /مشخصات/);
  const num = Number(toEnDigits(field(spec, 'شمارهٔ جلسه').split(/\s/)[0])) || Number(id.replace(/\D/g, '')) || 0;
  const dateRaw = field(spec, 'تاریخ انتشار');
  const dateFa = dateRaw.split(/\s|\(/)[0] || '';
  const dateG = dateRaw.match(/\((\d{4}-\d{2}-\d{2})\)/)?.[1] ?? '';
  const weekday = dateRaw.split('،').pop()?.trim() ?? '';
  const capSec = section(md, /کپشن|متن پست/);
  const caption = captionTxt?.trim() || capSec.match(/```\n?([\s\S]*?)```/)?.[1]?.trim() || '';
  let card: any = {};
  try {
    card = JSON.parse(md.match(/```json\n([\s\S]*?)```/)?.[1] ?? '{}');
  } catch {
    card = {};
  }
  const motion: MotionRow[] = section(md, /موشن/)
    .split('\n')
    .filter((l) => /^\|/.test(l) && !/^\|\s*-/.test(l) && !/بازهٔ زمانی|بازه زمانی/.test(l))
    .map((l) => {
      const c = l.split('|').slice(1, -1).map((x) => x.trim());
      const r = toEnDigits(c[0] || '').match(/(\d+(?:\.\d+)?)\s*[–-]\s*(\d+(?:\.\d+)?)/);
      // the on-screen text column may itself contain "|" (e.g. "پیانو از صفر | جلسهٔ ۱")
      const effect = c[c.length - 1] || '';
      const text = c.slice(2, c.length - 1).join(' | ');
      return {from: r ? Number(r[1]) : 0, to: r ? Number(r[2]) : 0, visual: c[1] || '', text, effect};
    });
  const narrSec = section(md, /متن نریشن|نریشن/);
  const narration: Segment[] = [];
  const re = /\[([۰-۹0-9:٫.]+)\s*[–-]\s*([۰-۹0-9:٫.]+)\]\s*\n([\s\S]*?)(?=\n\s*\[[۰-۹0-9:٫.]+\s*[–-]|\n\s*تعداد کلمات|$)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(narrSec))) narration.push({from: clock(m[1]), to: clock(m[2]), text: m[3].trim()});
  const ttsPrompt = section(md, /TTS|تبدیل متن به صدا/);
  const ex = section(md, /تمرین/);
  const exercise = bold(ex, 'تمرین[^*]*');
  const success = bold(ex, 'معیار موفقیت');
  let quiz: Quiz | null = null;
  const q = ex.match(/سؤال\s*[:：]\s*(.+)/)?.[1]?.trim();
  if (q) {
    const opts: string[] = [];
    let answer = 0;
    for (const line of ex.split('\n')) {
      const om = line.match(/^\s*-\s*([۰-۹0-9]+)\s*[.)]\s*(.+)$/);
      if (om) {
        if (/✅/.test(om[2])) answer = opts.length;
        opts.push(om[2].replace('✅', '').trim());
      }
    }
    const explain = ex.match(/پاسخ درست\s*[:：]\s*(.+)/)?.[1]?.trim() ?? '';
    quiz = {question: q, options: opts.slice(0, 4), answer, explain};
  }
  const title = (field(spec, 'عنوان') || head.split('—').pop() || '').trim();
  return {id, num, title, dateFa, dateG, weekday, time: toEnDigits(field(spec, 'ساعت انتشار')).match(/\d+:\d+/)?.[0] ?? '', goal: field(spec, 'هدف یادگیری'), prereq: field(spec, 'پیش‌نیاز'), caption, card, motion, narration, ttsPrompt, exercise, success, quiz};
};

/* ------------------------------------------------------------------ posts */
export const parseCuriosity = (md: string): CuriosityPost[] =>
  md
    .split(/\n(?=##\s+C\d+)/)
    .filter((b) => /^##\s+C\d+/.test(b.trim()))
    .map((b) => {
      const h = b.trim().split('\n')[0];
      const id = h.match(/C\d+/)![0];
      const body = b.split('\n').slice(1).join('\n');
      const caption = body.replace(/\*\*منبع:\*\*[\s\S]*$/, '').replace(/\*\*([^*]+)\*\*/g, '$1').trim();
      return {id, when: h.replace(/^##\s+C\d+\s*—\s*/, '').trim(), hook: bold(body, 'قلاب'), fact: bold(body, 'واقعیت'), why: bold(body, 'چرا جالب است'), bridge: bold(body, 'پل به تمرین').split('\n')[0].trim(), source: bold(body, 'منبع'), caption};
    });

export const parseFriday = (md: string): FridayPost[] =>
  md
    .split(/\n(?=##\s+F\d+)/)
    .filter((b) => /^##\s+F\d+/.test(b.trim()))
    .map((b) => {
      const h = b.trim().split('\n')[0];
      const id = h.match(/F\d+/)![0];
      const format = h.match(/قالب\s*[:：]\s*(.+)$/)?.[1]?.trim() ?? '';
      const when = h.replace(/^##\s+F\d+\s*—\s*/, '').replace(/·\s*قالب.*$/, '').trim();
      const caption = bold(b, 'کپشن') || b.split('\n').slice(1).join('\n').trim();
      return {id, when, format, caption};
    });

const parseCSV = (txt: string): string[][] => {
  const rows: string[][] = [];
  let row: string[] = [];
  let cur = '';
  let q = false;
  const s = txt.replace(/^\uFEFF/, '');
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (q) {
      if (c === '"' && s[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (c === '"') q = false;
      else cur += c;
    } else if (c === '"') q = true;
    else if (c === ',') {
      row.push(cur);
      cur = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && s[i + 1] === '\n') i++;
      row.push(cur);
      cur = '';
      if (row.some((x) => x.trim())) rows.push(row);
      row = [];
    } else cur += c;
  }
  if (cur || row.length) {
    row.push(cur);
    if (row.some((x) => x.trim())) rows.push(row);
  }
  return rows;
};

export const parseCalendar = (csv: string): CalendarRow[] => {
  const rows = parseCSV(csv);
  return rows.slice(1).map((r) => {
    const [day, dateFa, dateG, weekday, time, type, title, captionFile, imageFile, mediaFile, tags, status] = r.map((x) => (x ?? '').trim());
    const ref = (captionFile || imageFile || '').match(/([LCF]\d{2})/)?.[1];
    return {day, dateFa, dateG, weekday, time, type, title, captionFile, imageFile, mediaFile, tags, status, ref};
  });
};

/* ------------------------------------------------------------------ whole package */
/** files: relative path (any leading folder is ignored) → text. images: file name → URL */
export const parseCourse = (files: Record<string, string>, images: Record<string, string> = {}): Course => {
  const byName: Record<string, string> = {};
  for (const [k, v] of Object.entries(files)) {
    const parts = k.replace(/\\/g, '/').split('/').filter(Boolean);
    // keep "lessons/L01.md" style keys, drop the top folder of the zip
    const idx = parts.findIndex((p) => ['lessons', 'captions', 'images'].includes(p));
    byName[idx >= 0 ? parts.slice(idx).join('/') : parts[parts.length - 1]] = v;
  }
  // prefer the main card ("L01_card.png") over variants such as "mobile_L01_card.png"
  const imgOf = (id: string) => {
    const keys = Object.keys(images);
    const n = keys.find((x) => x.split('/').pop()!.startsWith(`${id}_card.`)) ?? keys.find((x) => x.includes(`${id}_card`));
    return n ? images[n] : undefined;
  };
  const find = (re: RegExp) => Object.keys(byName).find((k) => re.test(k));
  const lessons = Object.keys(byName)
    .filter((k) => /(^|\/)L\d{2}\.md$/.test(k))
    .sort()
    .map((k) => {
      const id = k.match(/L\d{2}/)![0];
      const cap = byName[k.replace(/\.md$/, '_caption.txt')];
      const l = parseLesson(id, byName[k], cap);
      const img = imgOf(id);
      return img ? {...l, image: img} : l;
    });
  const curK = find(/curiosity.*\.md$/);
  const friK = find(/friday.*\.md$/);
  const calK = find(/calendar.*\.csv$/);
  const capOf = (id: string) => byName[`captions/${id}_caption.txt`];
  const curiosity = (curK ? parseCuriosity(byName[curK]) : []).map((c) => ({...c, caption: capOf(c.id)?.trim() || c.caption, image: imgOf(c.id)}));
  const friday = (friK ? parseFriday(byName[friK]) : []).map((c) => ({...c, caption: capOf(c.id)?.trim() || c.caption, image: imgOf(c.id)}));
  const finalK = find(/FINAL_REPORT\.md$/) ?? find(/course_outline\.md$/);
  const fin = finalK ? byName[finalK] : '';
  const all = fin + '\n' + Object.values(byName).slice(0, 60).join('\n');
  const title = all.match(/دوره(?:ٔ|ی)?\s*«([^»]+)»/)?.[1] ?? fin.match(/«([^»]+)»/)?.[1] ?? 'پیانو از صفر';
  return {
    title,
    channel: fin.match(/https:\/\/t\.me\/\w+/)?.[0] ?? '',
    site: fin.match(/https?:\/\/(?:www\.)?alipiano\.ir/)?.[0] ?? 'alipiano.ir',
    lessons,
    curiosity,
    friday,
    calendar: calK ? parseCalendar(byName[calK]) : [],
    images,
    importedAt: new Date().toISOString(),
  };
};

/* ------------------------------------------------------------------ lesson → video props */
const WHITE = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const highlightToNote = (h: number | string) => {
  if (typeof h === 'string' && h.startsWith('b')) {
    const n = Number(h.slice(1));
    return `${WHITE[n % 7]}#${4 + Math.floor(n / 7)}`;
  }
  const n = Number(h);
  return `${WHITE[n % 7]}${4 + Math.floor(n / 7)}`;
};
const posToNote = (pos: number) => `${WHITE[((pos % 7) + 7) % 7]}${4 + Math.floor(pos / 7)}`;

const firstSentences = (s: string, max = 130) => {
  const clean = stripEmoji(s.replace(/\[مکث[^\]]*\]/g, ' ')).replace(/\s+/g, ' ').trim();
  const parts = clean.split(/(?<=[.!؟?])\s+/);
  let out = '';
  for (const p of parts) {
    if ((out + ' ' + p).trim().length > max && out) break;
    out = (out + ' ' + p).trim();
  }
  return out.length > max + 40 ? out.slice(0, max) + '…' : out;
};

export interface LessonVideoProps {
  episode: string;
  courseTitle: string;
  title: string;
  subtitle: string;
  keyPoint: string;
  scenes: ScriptScene[];
  cta: string;
  handle: string;
}

/** Turn a lesson into Whiteboard / Stickman props: one scene per narration segment + quiz. */
export const lessonToScript = (l: Lesson, course?: Pick<Course, 'title' | 'site'>): LessonVideoProps => {
  const card = l.card || {};
  const hero = card.hero as string | undefined;
  const scenes: ScriptScene[] = [];
  let heroUsed = false;
  l.narration.forEach((seg, i) => {
    const rows = l.motion.filter((r) => r.to > seg.from && r.from < seg.to);
    const onScreen = rows.map((r) => r.text).filter(Boolean);
    const first = i === 0;
    const last = i === l.narration.length - 1;
    const t = seg.text;
    const sec = Math.max(0, seg.to - seg.from);
    if (first) {
      scenes.push({kind: 'title', title: l.title, text: card.subtitle || l.goal, narration: t, sec});
      return;
    }
    if (last || /^\s*جمع‌بندی/.test(t)) {
      const sum = t.match(/جمع‌بندی\s*[:：]\s*([^.]+)/)?.[1] ?? '';
      const items = sum.split(/،|\sو\s/).map((x) => x.trim()).filter(Boolean).slice(0, 4);
      scenes.push({kind: 'outro', title: 'جمع‌بندی امروز', items: items.length ? items : onScreen.slice(0, 3), narration: t, sec});
      return;
    }
    if (/^\s*تمرین/.test(t)) {
      scenes.push({kind: 'exercise', title: 'تمرین امروز', text: stripEmoji(l.exercise) || firstSentences(t), items: l.success ? [`معیار موفقیت: ${stripEmoji(l.success)}`] : [], narration: t, sec});
      return;
    }
    const heading = stripEmoji(onScreen[0] || '').split('|')[0].trim() || firstSentences(t, 40);
    if (!heroUsed && hero === 'keyboard' && (/کلید|دو|نت|انگشت/.test(t) || i >= 2)) {
      heroUsed = true;
      const notes = (card.highlights || [0]).map(highlightToNote).join(' ');
      scenes.push({kind: 'keyboard', title: heading, notes, text: stripEmoji(card.body || firstSentences(t, 90)), narration: t, sec});
      return;
    }
    if (!heroUsed && hero === 'staff' && (/حامل|خط|نت/.test(t) || i >= 2)) {
      heroUsed = true;
      const staff = (card.notes || []).map((n: [number, string]) => `${posToNote(n[0])}:${(n[1] || '•').replace(/\s+/g, '‌')}`).join(' ');
      scenes.push({kind: 'staff', title: heading, staff, text: stripEmoji(card.body || firstSentences(t, 90)), narration: t, sec});
      return;
    }
    if (!heroUsed && hero === 'hand' && (/انگشت|دست/.test(t) || i >= 2)) {
      heroUsed = true;
      scenes.push({kind: 'hand', title: heading, hand: card.hand_side === 'left' ? 'left' : 'right', fingers: '1 2 3 4 5', text: stripEmoji(card.body || firstSentences(t, 90)), narration: t, sec});
      return;
    }
    if (onScreen.length >= 3) {
      scenes.push({kind: 'list', title: heading, items: onScreen.slice(1, 4).map((x) => stripEmoji(x)), narration: t, sec});
      return;
    }
    scenes.push({kind: 'explain', title: heading, text: firstSentences(t), narration: t, sec});
  });
  if (l.quiz && l.quiz.options.length) {
    const q = l.quiz;
    const fa = '۱۲۳۴';
    const quizScene: ScriptScene = {
      kind: 'quiz',
      title: 'کوییز',
      text: q.question,
      items: q.options,
      answer: q.answer,
      narration: `حالا یک سؤال: ${q.question} [مکث ۱ ثانیه] چهار گزینه داریم. کمی فکر کن. [مکث ۱ ثانیه] پاسخ درست گزینهٔ ${fa[q.answer] ?? '۱'} است: ${q.options[q.answer]}.`,
      sec: 0,
    };
    const oi = scenes.findIndex((s) => s.kind === 'outro');
    if (oi >= 0) scenes.splice(oi, 0, quizScene);
    else scenes.push(quizScene);
  }
  return {
    episode: String(l.num),
    courseTitle: course?.title || 'پیانو از صفر',
    title: l.title,
    subtitle: card.subtitle || l.goal,
    keyPoint: stripEmoji(card.key_point || ''),
    scenes,
    cta: 'اگر مفید بود، سابسکرایب کن و تمرین امروز را کامنت کن',
    handle: (course?.site || 'alipiano.ir').replace(/^https?:\/\//, ''),
  };
};

/** Short vertical video for a curiosity post. */
export const curiosityToScript = (c: CuriosityPost, course?: Pick<Course, 'title' | 'site'>): LessonVideoProps => ({
  episode: '',
  courseTitle: 'کنجکاوی پیانووا',
  title: stripEmoji(c.hook),
  subtitle: '',
  keyPoint: stripEmoji(c.bridge).replace(/[[\]]/g, ''),
  scenes: [
    {kind: 'title', title: stripEmoji(c.hook), text: '', narration: stripEmoji(c.hook), sec: 0},
    {kind: 'explain', title: 'واقعیت', text: firstSentences(c.fact, 150), narration: stripEmoji(c.fact), sec: 0},
    {kind: 'explain', title: 'چرا جالب است؟', text: firstSentences(c.why, 130), narration: stripEmoji(c.why), sec: 0},
    {kind: 'outro', title: 'تمرین مرتبط', items: [stripEmoji(c.bridge).replace(/[[\]]/g, '')], narration: `اگر دوست داری این را روی پیانو حس کنی، سری به ${stripEmoji(c.bridge).replace(/[[\]]/g, '')} بزن.`, sec: 0},
  ],
  cta: 'برای کنجکاوی بعدی سابسکرایب کن',
  handle: (course?.site || 'alipiano.ir').replace(/^https?:\/\//, ''),
});
