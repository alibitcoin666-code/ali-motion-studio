import {BRANDS, BrandId} from '../remotion/theme';
import {buildCaptions, buildScenes, cleanText, toChapters, toSRT, ttsPrompt, fmtClock, Scene} from '../narration/narration';

export const download = (name: string, text: string, type = 'text/plain;charset=utf-8') => {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], {type}));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
};

const titleOf = (p: any) => cleanText(p.title || p.hook || p.trackTitle || p.nameFa || p.message || (p.lines || [])[0] || '');

/** Title / description / tags / chapters ready to paste into YouTube Studio (never auto-published). */
export const youtubePack = (tid: string, p: any) => {
  const b = BRANDS[p.brand as BrandId] ?? BRANDS.ali;
  const scenes = buildScenes(tid, p);
  const chapters = toChapters(scenes);
  const t = titleOf(p);
  const ep = p.episode ? `جلسهٔ ${p.episode} — ` : '';
  const course = p.courseTitle ? ` | ${p.courseTitle}` : '';
  const title = `${ep}${t}${course} | ${b.nameFa}`.slice(0, 100);
  const summary = scenes.map((s) => s.label).filter(Boolean).slice(0, 6).join('، ');
  const tags = ['آموزش پیانو', 'پیانو', 'پیانو از صفر', 'آموزش پیانو مبتدی', 'نت خوانی', 'piano tutorial', 'piano lesson persian', b.nameFa, b.nameEn].filter(Boolean);
  const description = [
    `${t} — ${p.subtitle ? cleanText(p.subtitle) : 'آموزش ساده و قدم‌به‌قدم'}`,
    '',
    `در این ویدیو: ${summary}.`,
    '',
    chapters ? `فصل‌ها:\n${chapters}` : '',
    '',
    p.keyPoint ? `نکتهٔ کلیدی: ${cleanText(p.keyPoint)}` : '',
    `تمرینت را در کامنت بنویس؛ جواب می‌دهم.`,
    '',
    `${b.nameFa} · ${p.handle || b.handle}`,
    '#آموزش_پیانو #پیانو #' + b.nameFa.replace(/\s+/g, '_'),
  ]
    .filter((x, i, a) => !(x === '' && a[i - 1] === ''))
    .join('\n');
  return {title, description, tags: tags.join(', '), chapters};
};

export const narrationMarkdown = (tid: string, p: any) => {
  const b = BRANDS[p.brand as BrandId] ?? BRANDS.ali;
  const scenes = buildScenes(tid, p);
  const caps = buildCaptions(scenes);
  const yt = youtubePack(tid, p);
  const lines = [
    `# نریشن ویدیو — ${titleOf(p)}`,
    '',
    `- قالب: ${tid} · برند: ${b.nameFa} · قطع: ${p.format}`,
    `- مدت کل: ${fmtClock(scenes.reduce((a: number, s: Scene) => a + s.frames, 0))}`,
    '',
    '## متن هر صحنه (هم‌زمان با تصویر)',
    '',
    ...scenes.flatMap((s, i) => [`### ${i + 1}. ${s.label} — ${fmtClock(s.from)} تا ${fmtClock(s.from + s.frames)}`, '', s.text || '(بدون نریشن)', '']),
    '---',
    '',
    ttsPrompt(scenes, caps, {brandName: b.nameFa, voice: p.voice, title: titleOf(p)}),
    '',
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
  return {md: lines.join('\n'), srt: toSRT(caps), tts: ttsPrompt(scenes, caps, {brandName: b.nameFa, voice: p.voice, title: titleOf(p)}), yt};
};
