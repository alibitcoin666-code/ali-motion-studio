/**
 * Narration prompt pack — written next to every video as <name>.narration.md (+ .narration.json).
 * Gives the exact timed Persian script plus ready-to-paste prompts for expressive AI voices
 * (Gemini TTS director-style prompt, ElevenLabs v3 audio tags, plain TTS) and a self-recording sheet.
 * Structure follows Google's Gemini TTS guide (audio profile → scene → director's notes → transcript)
 * and ElevenLabs' v3 audio-tag guide (inline [tags], "..." and line breaks for pauses).
 */
const FPS = 30;
const LEAD = 0.35, TAIL = 0.55;
const PAUSE = /\[\s*مکث\s*([0-9۰-۹.٫,]+)\s*ثانیه\s*\]/g;
const faNum = (s) => Number(String(s).replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d))).replace(/[٫,]/g, '.')) || 0;
const fa = (n) => String(n).replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[d]).replace('.', '٫');
const clean = (s) => String(s || '').replace(/\*/g, '').replace(/\s+/g, ' ').trim();
const ts2 = (sec) => { const m = Math.floor(sec / 60), s = sec - m * 60; return `${m}:${s.toFixed(1).padStart(4, '0')}`; };

export const PERSONA = {
  ali: {
    name: 'علی (ALi Piano.IR)',
    fa: 'معلم پیانوی گرم، صبور و مطمئن. مثل کلاس خصوصی با یک شاگرد صحبت می‌کند؛ دوستانه، دقیق و بدون عجله.',
    en: 'Ali, a warm, patient and confident Persian piano teacher speaking one-to-one to a student. Friendly, precise, never rushed. Mid-low male voice, smile in the voice.',
    scene: 'Quiet home studio next to a grand piano, evening light; recording a YouTube piano lesson for Persian-speaking beginners.',
  },
  pianova: {
    name: 'Pianova',
    fa: 'مربی پرانرژی و الهام‌بخش برند Pianova؛ مدرن، سریع‌تر و انگیزه‌دهنده.',
    en: 'The Pianova coach: modern, upbeat and motivating Persian piano coach for short social videos. Bright, energetic, clear diction.',
    scene: 'Bright modern studio, filming a fast vertical Short for Instagram and YouTube Shorts.',
  },
  mr69: {
    name: 'Music Radio 69',
    fa: 'گویندهٔ رادیوی موسیقی؛ صدای بم، آرام، سینمایی و صمیمی.',
    en: 'Late-night music radio host: deep, calm, cinematic and intimate Persian voice.',
    scene: 'Dimly lit radio booth, introducing a piece of music to listeners at night.',
  },
};

// per scene kind: Persian direction, inline tags (Gemini/ElevenLabs read free-form English tags), pace
export const DIRECTION = {
  hook: {fa: 'پرانرژی و کنجکاوکننده؛ روی کلمهٔ کلیدی تأکید کن تا بیننده نرود', tag: '[excited]', pace: 'کمی سریع'},
  title: {fa: 'مطمئن و گرم؛ عنوان را واضح اعلام کن', tag: '[warmly]', pace: 'معمولی'},
  explain: {fa: 'آرام و شمرده، مثل توضیح دادن به یک شاگرد', tag: '[calm, clear]', pace: 'آرام'},
  keyboard: {fa: 'آهسته و هم‌زمان با نمایش کلیدها؛ بعد از نام هر نت مکث کوتاه', tag: '[slowly]', pace: 'آهسته'},
  staff: {fa: 'آهسته و دقیق؛ نام نت‌ها را کامل تلفظ کن', tag: '[slowly, precise]', pace: 'آهسته'},
  chord: {fa: 'واضح و آموزشی؛ نام آکورد را برجسته کن', tag: '[clearly]', pace: 'معمولی'},
  compare: {fa: 'متفکر؛ تفاوت دو حالت را با تغییر لحن نشان بده', tag: '[thoughtful]', pace: 'معمولی'},
  wrong: {fa: 'کمی هشداردهنده ولی بدون سرزنش', tag: '[concerned]', pace: 'معمولی'},
  right: {fa: 'راضی و تشویق‌کننده، با لبخند در صدا', tag: '[reassuring, smiling]', pace: 'معمولی'},
  steps: {fa: 'ریتمیک؛ هر قدم یک ضرب، بین قدم‌ها مکث کوتاه', tag: '[steady rhythm]', pace: 'منظم'},
  quiz: {fa: 'کنجکاو؛ بعد از سؤال مکث کن تا بیننده فکر کند', tag: '[curious]', pace: 'آرام'},
  recap: {fa: 'جمع‌بندی مطمئن و کمی سریع‌تر', tag: '[confident]', pace: 'کمی سریع'},
  punch: {fa: 'آرام و پرمعنا؛ کلمهٔ آخر را کمی بکش', tag: '[softly, meaningful]', pace: 'آهسته'},
  cta: {fa: 'دوستانه و صمیمی، بدون التماس', tag: '[friendly]', pace: 'معمولی'},
  outro: {fa: 'گرم و قدردان', tag: '[warmly]', pace: 'معمولی'},
};

const pauseTag = (sec, style) => style === 'eleven' ? (sec >= 1.2 ? '\n[pause] ...\n' : ' ... ')
  : style === 'gemini' ? ` [pause ${sec} seconds] ` : ` [مکث ${fa(sec)} ثانیه] `;
const withPauses = (say, style) => clean(String(say || '').replace(PAUSE, (_, n) => `\u0000${faNum(n)}\u0000`))
  .split('\u0000').map((p, i) => (i % 2 ? pauseTag(+p, style) : p)).join('').replace(/ +/g, ' ').trim();

const onScreen = (s) => clean([s.title, s.text, s.chord && `آکورد ${s.chord}`, s.notes && `نت‌ها: ${s.notes}`, s.wrong && `✗ ${s.wrong}`, s.right && `✓ ${s.right}`, ...(s.items || [])].filter(Boolean).join(' | '));

/** @param m node-entry module (timeScript, KIND_FA, TEMPLATES) */
export function narrationPack(m, template, props) {
  const t = m.TEMPLATES.find((x) => x.id === template);
  const brand = props.brand || 'ali';
  const P = PERSONA[brand] || PERSONA.ali;
  const short = (props.format || t?.defaultFormat) === '9:16' || props.variant === 'tip';
  const title = clean(props.title || props.courseTitle || props.episode || t?.nameFa || template);
  const real = !!props.voicePack;
  const scenes = [];
  if (t?.scripted && props.scenes?.length) {
    for (const s of m.timeScript(props)) {
      const sc = s.scene;
      const d = DIRECTION[sc.kind] || DIRECTION.explain;
      const start = s.from / FPS, end = (s.from + s.frames) / FPS;
      const words = clean(String(sc.say || '').replace(PAUSE, ' ')).split(' ').filter(Boolean).length;
      scenes.push({
        i: s.index + 1, kind: sc.kind, kindFa: m.KIND_FA?.[sc.kind] || sc.kind, label: sc.label || '',
        start: +start.toFixed(2), end: +end.toFixed(2), voiceSec: +s.voiceDur.toFixed(2),
        maxVoiceSec: +Math.max(0.5, end - start - LEAD - TAIL).toFixed(2), words,
        screen: onScreen(sc), say: clean(sc.say), direction: d.fa, tag: d.tag, pace: d.pace,
      });
    }
  }
  const total = scenes.length ? scenes[scenes.length - 1].end : 0;
  const allWords = scenes.reduce((a, s) => a + s.words, 0);
  const voiceSec = scenes.reduce((a, s) => a + s.voiceSec, 0);
  const wps = voiceSec ? +(allWords / voiceSec).toFixed(2) : 0;
  const pacing = short ? 'Energetic Shorts pacing (~2.3 words/second), tight pauses, hook in the first 2 seconds.'
    : 'Calm lesson pacing (~2 words/second), short breaths between sentences, slow down on note names and numbers.';

  const json = {template, title, brand, format: props.format || t?.defaultFormat, durationSec: total, timing: real ? 'real (edge-tts)' : 'estimated',
    usedVoice: props.voice === 'dilara' ? 'edge-tts fa-IR-DilaraNeural' : 'edge-tts fa-IR-FaridNeural', wordsPerSec: wps, persona: P, scenes};

  const L = [];
  L.push(`# پرامپت نریشن: ${title}`, '');
  L.push(`- قالب: **${template}**؛ برند: **${P.name}**؛ مدت ویدیو: **${fa(total.toFixed(1))} ثانیه**؛ زمان‌بندی: ${real ? 'واقعی، از روی صدای ساخته‌شده' : 'تخمینی'}`);
  L.push(`- صدای استفاده‌شده در ویدیو: ${json.usedVoice}؛ سرعت فعلی: ${fa(wps)} کلمه در ثانیه`);
  L.push('- برای ساخت صدای طبیعی‌تر یکی از پرامپت‌های زیر را در ابزار صدای هوش مصنوعی بچسبان یا خودت روی متن ضبط کن. اگر صدای هر صحنه از «حداکثر» بیشتر شود، از تصویر عقب می‌افتد.', '');
  if (!scenes.length) {
    L.push('> این قالب نریشن صحنه‌به‌صحنه ندارد. در صورت نیاز این جمله را به‌عنوان اینترو یا اوترو ضبط کن:', '');
    L.push(`> «${title}؛ با ${P.name} همراه باش.»`, '');
  } else {
    L.push('## ۱. متن زمان‌بندی‌شده', '', '| # | زمان | صحنه | روی صفحه | متن گوینده | لحن | حداکثر صدا |', '|---|---|---|---|---|---|---|');
    for (const s of scenes) L.push(`| ${fa(s.i)} | ${ts2(s.start)}–${ts2(s.end)} | ${s.kindFa} | ${s.screen.replace(/\|/g, '/') || '—'} | ${s.say.replace(/\|/g, '/')} | ${s.direction} | ${fa(s.maxVoiceSec)} ث |`);
    L.push('');

    L.push('## ۲. پرامپت کارگردانی برای Gemini TTS، ChatGPT Voice و هر صدای هوش مصنوعی', '', '```');
    L.push(`# AUDIO PROFILE: ${P.en}`, '', `## THE SCENE: ${P.scene}`, '', "### DIRECTOR'S NOTES");
    L.push(`Language: Persian (Farsi, fa-IR), standard Tehrani accent. Pronounce every ezafe (kasre-ye ezafe) clearly; read numbers and note names naturally.`);
    L.push(`Style: ${short ? 'Punchy, smiling, social-video energy; every sentence lands like a beat.' : 'Educational, reassuring, one-to-one; explain like a private lesson.'} Follow each line\'s [tag] for its emotion.`);
    L.push(`Pacing: ${pacing} Total spoken length must fit ${total.toFixed(1)} seconds.`);
    L.push('Do NOT read the bracketed tags aloud; they are performance directions.', '', '#### TRANSCRIPT');
    for (const s of scenes) L.push(`${s.tag} ${withPauses(s.say, 'gemini')}`);
    L.push('```', '');

    L.push('## ۳. نسخهٔ ElevenLabs v3 با Audio Tags', '', 'مدل Eleven v3، Stability روی Natural، زبان فارسی. بین صحنه‌ها یک خط خالی گذاشته شده تا مکث طبیعی ایجاد شود.', '', '```');
    for (const s of scenes) L.push(`${s.tag} ${withPauses(s.say, 'eleven')}`, '');
    L.push('```', '');

    L.push('## ۴. متن ساده برای edge-tts یا هر TTS بدون تگ', '', '```');
    for (const s of scenes) L.push(withPauses(s.say, 'plain'));
    L.push('```', '');

    L.push('## ۵. برگهٔ ضبط با صدای خودت', '');
    L.push('- با گوشی در اتاق کم‌پژواک ضبط کن (پشت کمد یا زیر پتو). فاصلهٔ دهان تا گوشی یک وجب باشد.');
    L.push('- هر صحنه را در یک فایل جدا ضبط کن: `scene_01.wav`، `scene_02.wav` و همین‌طور تا آخر. قبل از هر جمله نیم ثانیه سکوت بگذار.');
    L.push('- مدت هر فایل را با ستون «حداکثر صدا» مقایسه کن. اگر بلندتر شد، کمی سریع‌تر بخوان یا متن را کوتاه کن.', '');
    for (const s of scenes) L.push(`${fa(s.i)}. (${s.kindFa}، حداکثر ${fa(s.maxVoiceSec)} ثانیه، لحن: ${s.pace}) ${s.say}`);
    L.push('');
  }
  return {md: L.join('\n'), json};
}
