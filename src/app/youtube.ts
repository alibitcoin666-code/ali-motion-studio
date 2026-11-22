import {BRANDS, BrandId} from '../v3/theme';
import {getTemplate} from '../v3/registry';
import {timeScript} from '../v3/templates/ScriptVideo';
import {allWords, captionPages, chapters, clean, fmtDur, toSrt} from '../v3/timeline';
import {KIND_FA, LessonScene} from '../v3/templates/scenes';

export const download = (name: string, text: string, type = 'text/plain;charset=utf-8') => {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], {type}));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
};

const labelOf = (s: LessonScene) => s.label || KIND_FA[s.kind] || '';
const titleOf = (p: any) => clean(p.title || (p.scenes || []).find((s: LessonScene) => s.kind === 'title')?.title || (p.scenes || [])[0]?.title || '');

export const timing = (tid: string, p: any) => {
  const t = getTemplate(tid);
  if (!t.scripted) return null;
  const ts = timeScript(p);
  const lesson = (p.variant || 'lesson') === 'lesson';
  const pages = captionPages(allWords(ts), lesson ? 42 : 30, lesson ? 2 : 1);
  return {ts, srt: toSrt(pages), chapters: chapters(ts, labelOf), pages};
};

/** Title / description / tags / chapters ready to paste into YouTube Studio (never auto-published). */
export const youtubePack = (tid: string, p: any) => {
  const b = BRANDS[p.brand as BrandId] ?? BRANDS.ali;
  const tm = timing(tid, p);
  const t = titleOf(p) || getTemplate(tid).nameFa;
  const ep = p.episode ? `جلسهٔ ${p.episode} — ` : '';
  const course = p.courseTitle ? ` | ${p.courseTitle}` : '';
  const short = p.format === '9:16';
  const title = `${ep}${t}${course} | ${b.nameFa}${short ? ' #shorts' : ''}`.slice(0, 100);
  const summary = (p.scenes || []).map(labelOf).filter(Boolean).slice(0, 7).join('، ');
  const tags = ['آموزش پیانو', 'پیانو', 'پیانو از صفر', 'آموزش پیانو مبتدی', 'نت خوانی', 'piano tutorial', 'easy piano', b.nameFa, b.nameEn].filter(Boolean);
  const description = [
    `${t} — آموزش ساده و قدم‌به‌قدم پیانو به فارسی`,
    '',
    summary ? `در این ویدیو: ${summary}.` : '',
    '',
    tm && tm.chapters.split('\n').length >= 3 && !short ? `فصل‌ها:\n${tm.chapters}` : '',
    '',
    'تمرینت را در کامنت بنویس؛ جواب می‌دهم.',
    '',
    `${b.nameFa} · ${b.handle}`,
    '#آموزش_پیانو #پیانو #' + b.nameFa.replace(/\s+/g, '_'),
  ].filter((x, i, a) => !(x === '' && a[i - 1] === '')).join('\n');
  return {title, description, tags: tags.join(', '), chapters: tm?.chapters ?? ''};
};

export const narrationMarkdown = (tid: string, p: any) => {
  const b = BRANDS[p.brand as BrandId] ?? BRANDS.ali;
  const tm = timing(tid, p);
  const yt = youtubePack(tid, p);
  const lines = [
    `# نریشن ویدیو — ${titleOf(p)}`,
    '',
    `- قالب: ${tid} · برند: ${b.nameFa} · قطع: ${p.format}`,
    tm ? `- مدت کل: ${fmtDur(tm.ts.reduce((a, s) => a + s.frames, 0))}` : '',
    '',
    '## متن هر صحنه (هم‌زمان با تصویر)',
    '',
    ...(tm?.ts ?? []).flatMap((s, i) => [`### ${i + 1}. ${labelOf(s.scene)} — ${fmtDur(s.from)} تا ${fmtDur(s.from + s.frames)}`, '', s.scene.say || '(بدون نریشن)', '']),
    '---',
    '',
    '## بستهٔ یوتیوب',
    '',
    `**عنوان:** ${yt.title}`,
    '',
    '**توضیحات:**',
    '',
    '```',
    yt.description,
    '```',
    '',
    `**تگ‌ها:** ${yt.tags}`,
  ];
  return {md: lines.join('\n'), srt: tm?.srt ?? '', yt};
};
