/**
 * v3 template registry — the single list the web app, Remotion Root, cloud renderer and Worker use.
 * Add a template: write a component in src/v3/templates, then add an entry here (see AGENTS.md).
 */
import React from 'react';
import {DIMENSIONS, FPS, Format} from './theme';
import {ScriptVideo, scriptFrames} from './templates/ScriptVideo';
import {FallingNotes, fallingFrames} from './templates/FallingNotes';
import {LogoIntro, logoFrames} from './templates/LogoIntro';
import {LessonScene} from './templates/scenes';
import {VoicePack} from './theme';
// Pre-generated narration for the sample scripts (scripts/render-job.mjs --samples). Empty = estimated timing.
import PACKS from '../../public/voice/packs.json';
const pack = (id: string): VoicePack | null => ((PACKS as Record<string, VoicePack>)[id] ?? null);

export type FieldType = 'text' | 'textarea' | 'number' | 'select' | 'scenes' | 'check';
export interface Field {
  key: string;
  label: string;
  type: FieldType;
  help?: string;
  options?: {value: string; label: string}[];
  min?: number;
  max?: number;
  step?: number;
}
export interface TemplateDef {
  id: string;
  nameFa: string;
  descFa: string;
  category: 'آموزشی' | 'نکته و تکنیک' | 'نت‌های ریزان' | 'آکورد' | 'برندینگ' | 'انگیزشی';
  defaultFormat: Format;
  component: React.FC<any>;
  defaultProps: Record<string, any>;
  fields: Field[];
  duration: (p: any) => number;
  inspiration: string;
  scripted: boolean; // has scenes with narration
}

/* ------------------------------------------------------------------ samples */
export const SAMPLE_LESSON: LessonScene[] = [
  {kind: 'hook', label: 'شروع', title: '*۹۰٪* مبتدی‌ها این اشتباه را در *جلسهٔ اول* می‌کنند', say: 'نود درصد مبتدی‌ها همین اشتباه را در جلسهٔ اول می‌کنند. بیا با هم درستش کنیم.'},
  {kind: 'title', label: 'معرفی', title: 'اولین قرار با *پیانو*', text: 'نشستن درست، شناخت کیبورد و پیدا کردن دوی میانی', say: 'سلام! من علی هستم و این جلسهٔ اولِ دورهٔ پیانو از صفر است.'},
  {kind: 'explain', label: 'نشستن درست', title: 'نشستن *درست*', items: ['پشت صاف، ولی شانه‌ها آزاد', 'ساعد تقریباً موازی زمین', 'پاها راحت روی زمین'], say: 'اول نشستن. پشتت صاف باشد، اما شانه‌ها آزاد. ارتفاع نیمکت را طوری تنظیم کن که ساعدت تقریباً موازی زمین شود، و پاهایت راحت روی زمین باشند.'},
  {kind: 'keyboard', label: 'دوی میانی', title: 'دوی *میانی* کجاست؟', text: 'کلید سفیدِ سمت چپِ دو کلید سیاهِ جفت', notes: 'C4', fingers: '1', say: 'حالا ستارهٔ امروز: دوی میانی. وسط کیبورد، دو کلید سیاهِ کنار هم را پیدا کن. کلید سفیدِ درست سمت چپ آن‌ها، دو است. گوش کن.'},
  {kind: 'keyboard', label: 'پنج انگشت', title: 'پنج انگشت، پنج *نت*', text: 'شست روی دو؛ بقیهٔ انگشت‌ها پشت سر هم', notes: 'C4 D4 E4 F4 G4', fingers: '1 2 3 4 5', say: 'شستِ دست راست روی دو، و بقیهٔ انگشت‌ها روی نت‌های بعدی: دو، ر، می، فا، سل. با هم بشنویم.'},
  {kind: 'compare', label: 'فرم دست', title: 'فرم *دست*', wrong: 'انگشت‌های صاف و مچِ افتاده', right: 'انگشت‌های خمیده؛ مثل نگه‌داشتن یک توپ کوچک', say: 'اشتباه رایج: انگشت‌های صاف و مچِ افتاده. روش درست: انگشت‌ها خمیده، انگار یک توپ کوچک در دستت داری.'},
  {kind: 'staff', label: 'روی حامل', title: 'همین نت‌ها روی *حامل*', notes: 'C4 D4 E4 F4 G4', say: 'و این همان پنج نت روی حامل است. دوی میانی روی یک خطِ کوچک، زیر حامل می‌نشیند.'},
  {kind: 'quiz', label: 'کوییز', title: 'کوییز', text: 'کلید سفیدِ سمت چپِ دو سیاهِ جفت چه نام دارد؟', items: ['دو', 'ر', 'فا', 'سل'], answer: 0, say: 'یک سؤال: کلید سفیدِ سمت چپِ دو کلید سیاهِ جفت، چه نام دارد؟ [مکث ۳ ثانیه] آفرین! جواب، دو است.'},
  {kind: 'recap', label: 'جمع‌بندی', title: 'جمع‌بندی *امروز*', items: ['نشستن درست', 'فرم خمیدهٔ دست', 'پیدا کردن دوی میانی'], say: 'جمع‌بندی امروز: نشستن درست، فرمِ خمیدهٔ دست، و پیدا کردن دوی میانی.'},
  {kind: 'outro', label: 'پایان', title: 'اگر مفید بود، *سابسکرایب* کن', text: 'جلسهٔ بعد: اولین ملودی با پنج انگشت', say: 'اگر این ویدیو برایت مفید بود، سابسکرایب کن و زنگوله را بزن. جلسهٔ بعد، اولین ملودی‌مان را می‌زنیم.'},
];

export const SAMPLE_TIP: LessonScene[] = [
  {kind: 'hook', title: 'دستت *زود خسته* می‌شود؟', say: 'دستت موقع پیانو زدن زود خسته می‌شود؟ مشکل از اینجاست.'},
  {kind: 'wrong', title: 'اشتباه', text: 'فشار دادن کلید با *زور بازو*', notes: 'C4 C4 C4', say: 'بیشتر مبتدی‌ها کلید را با زورِ بازو فشار می‌دهند.'},
  {kind: 'right', title: 'درست', text: 'وزنِ *آزاد* دست + انگشتِ خمیده', notes: 'C4 D4 E4 F4 G4', fingers: '1 2 3 4 5', say: 'به جایش وزنِ آزادِ دست را رها کن، و فقط با نوکِ انگشتِ خمیده بزن.'},
  {kind: 'punch', title: '*آرام* بزن تا *سریع* شوی', say: 'یادت باشد: آرام بزن، تا سریع شوی.'},
  {kind: 'cta', title: 'برای نکته‌های بیشتر *دنبال* کن', say: 'برای نکته‌های بیشتر، دنبال کن.'},
];

export const SAMPLE_CHORD: LessonScene[] = [
  {kind: 'hook', title: 'یک آکورد، *صدها* آهنگ', say: 'با همین یک آکورد، صدها آهنگ را می‌توانی همراهی کنی.'},
  {kind: 'chord', chord: 'Am', title: 'لا *مینور*', text: 'غمگین، عمیق و سینمایی', say: 'آکورد امروز: لا مینور. سه نتِ لا، دو و می. اول جدا جدا، بعد با هم.'},
  {kind: 'staff', title: 'روی *حامل*', notes: 'A4 C5 E5', say: 'روی حامل، این‌طور نوشته می‌شود.'},
  {kind: 'cta', title: 'آکورد فردا را *از دست نده*', say: 'آکوردِ فردا را از دست نده.'},
];

export const SAMPLE_QUOTE: LessonScene[] = [
  {kind: 'punch', title: '*یک دست*، *یک رویا*', say: 'یک دست، یک رویا.'},
  {kind: 'punch', title: 'محدودیت، فقط یک *شروعِ* دیگر است', say: 'محدودیت، فقط یک شروعِ دیگر است.'},
  {kind: 'punch', title: 'هر روز *ده دقیقه*؛ همین کافی است', say: 'هر روز ده دقیقه تمرین. همین کافی است.'},
  {kind: 'cta', title: 'با *علی پیانو* همراه باش', say: 'با علی پیانو همراه باش.'},
];

/* ------------------------------------------------------------------ fields */
const THEME_FIELD: Field = {key: 'theme', label: 'تم رنگی', type: 'select', options: [
  {value: '', label: 'پیش‌فرض برند'}, {value: 'noir', label: 'نوآر عاجی (مشکی + طلایی)'}, {value: 'midnight', label: 'نیمه‌شب طلایی (سرمه‌ای)'},
  {value: 'neon', label: 'کلیدهای نئون'}, {value: 'cream', label: 'استودیو کرم (روشن)'},
]};
const MUSIC_FIELD: Field = {key: 'music', label: 'موسیقی بستر', type: 'select', options: [
  {value: 'lesson', label: 'آموزشی آرام'}, {value: 'tip', label: 'پرانرژی (Shorts)'}, {value: 'luxe', label: 'لوکس سینمایی'}, {value: 'none', label: 'بدون موسیقی'},
]};
const scriptFields: Field[] = [
  {key: 'courseTitle', label: 'نام دوره', type: 'text'},
  {key: 'episode', label: 'شماره جلسه', type: 'text'},
  {key: 'scenes', label: 'صحنه‌ها (هر صحنه نریشن خودش را دارد)', type: 'scenes'},
];

const base = {captions: true, sfx: true, musicVolume: 0.5, voice: 'farid', voicePack: null};

export const TEMPLATES: TemplateDef[] = [
  {
    id: 'LessonPro', nameFa: 'درس آموزشی پیانو (حرفه‌ای)', category: 'آموزشی', defaultFormat: '16:9', scripted: true,
    descFa: 'معلم = لوگوی شما که حرف می‌زند و اشاره می‌کند؛ قلاب شروع، کیبورد واقعی با صدای پیانو، حامل، اشتباه/درست، کوییز با شمارش معکوس، جمع‌بندی و صفحهٔ پایانی',
    inspiration: 'Pianote (۶۴٪ بازدید از ویدیوهای بلند) + تکنیک‌های نگه‌داشت مخاطب',
    component: ScriptVideo,
    defaultProps: {...base, voicePack: pack('LessonPro'), variant: 'lesson', brand: 'ali', theme: 'noir', format: '16:9', music: 'lesson', courseTitle: 'پیانو از صفر', episode: '1', scenes: SAMPLE_LESSON},
    fields: [THEME_FIELD, ...scriptFields, MUSIC_FIELD],
    duration: scriptFrames,
  },
  {
    id: 'TipShort', nameFa: 'نکته و تکنیک (Shorts)', category: 'نکته و تکنیک', defaultFormat: '9:16', scripted: true,
    descFa: 'قلاب یک‌ثانیه‌ای، «اشتباه / درست» با نمایش روی کیبورد، جملهٔ طلایی و دعوت؛ زیرنویس درشت کلمه‌به‌کلمه',
    inspiration: 'الگوی Shorts پربازدید: قلاب + مقایسه + زیرنویس متحرک (۷۸٪ ویدیوهای موفق)',
    component: ScriptVideo,
    defaultProps: {...base, variant: 'tip', brand: 'ali', theme: 'midnight', format: '9:16', music: 'tip', scenes: SAMPLE_TIP, voicePack: pack('TipShort')},
    fields: [THEME_FIELD, {key: 'scenes', label: 'صحنه‌ها', type: 'scenes'}, MUSIC_FIELD],
    duration: scriptFrames,
  },
  {
    id: 'FallingNotes', nameFa: 'نت‌های ریزان (سینتسیا)', category: 'نت‌های ریزان', defaultFormat: '16:9', scripted: false,
    descFa: 'نت‌های نورانی روی کیبورد می‌ریزند و با صدای پیانوی واقعی نواخته می‌شوند؛ نام فارسی نت‌ها، دو رنگ برای دو دست',
    inspiration: 'Pianothesia (۷۸۴ هزار سابسکرایبر) و کانال‌های Synthesia',
    component: FallingNotes,
    defaultProps: {brand: 'ali', theme: 'neon', format: '16:9', song: 'ode', hands: 'both', speed: 2.2, tempo: 1, showNames: true, sfx: true, title: ''},
    fields: [
      THEME_FIELD,
      {key: 'song', label: 'آهنگ (آزاد از حق نشر)', type: 'select', options: [{value: 'ode', label: 'سرود شادی — بتهوون'}, {value: 'twinkle', label: 'چشمک بزن ستاره کوچولو'}, {value: 'elise', label: 'برای الیز — بتهوون'}, {value: 'minuet', label: 'مینوئت در سل'}]},
      {key: 'hands', label: 'دست‌ها', type: 'select', options: [{value: 'both', label: 'دو دست'}, {value: 'right', label: 'فقط دست راست (آسان)'}]},
      {key: 'tempo', label: 'سرعت اجرا', type: 'number', min: 0.5, max: 1.4, step: 0.05},
      {key: 'speed', label: 'زمان سقوط نت (ثانیه)', type: 'number', min: 1.2, max: 4, step: 0.1},
      {key: 'title', label: 'عنوان (خالی = نام آهنگ)', type: 'text'},
      {key: 'showNames', label: 'نام فارسی نت‌ها', type: 'check'},
    ],
    duration: (p) => fallingFrames(p, FPS),
  },
  {
    id: 'ChordDay', nameFa: 'آکورد روز', category: 'آکورد', defaultFormat: '9:16', scripted: true,
    descFa: 'نماد بزرگ آکورد، نام فارسی و فرمول، آرپژ و آکورد کامل با صدای پیانو، و نمایش روی حامل',
    inspiration: 'سری‌های «Chord of the day» در Shorts',
    component: ScriptVideo,
    defaultProps: {...base, variant: 'tip', brand: 'ali', theme: 'noir', format: '9:16', music: 'luxe', scenes: SAMPLE_CHORD, voicePack: pack('ChordDay')},
    fields: [THEME_FIELD, {key: 'scenes', label: 'صحنه‌ها', type: 'scenes'}, MUSIC_FIELD],
    duration: scriptFrames,
  },
  {
    id: 'KineticQuote', nameFa: 'جملهٔ انگیزشی (تایپوگرافی)', category: 'انگیزشی', defaultFormat: '9:16', scripted: true,
    descFa: 'تایپوگرافی جنبشی فارسی با فونت میرزا، کلمه‌های طلایی، موسیقی لوکس و صدای گوینده',
    inspiration: 'ترند تایپوگرافی جنبشی ۲۰۲۶',
    component: ScriptVideo,
    defaultProps: {...base, variant: 'tip', brand: 'ali', theme: 'noir', format: '9:16', music: 'luxe', mascot: false, scenes: SAMPLE_QUOTE, voicePack: pack('KineticQuote')},
    fields: [THEME_FIELD, {key: 'scenes', label: 'جمله‌ها', type: 'scenes'}, MUSIC_FIELD, {key: 'mascot', label: 'نمایش معلم (لوگو)', type: 'check'}],
    duration: scriptFrames,
  },
  {
    id: 'LogoIntro', nameFa: 'اینترو / اوترو لوگو', category: 'برندینگ', defaultFormat: '16:9', scripted: false,
    descFa: 'لوگوی شما با پرش و دست تکان دادن وارد می‌شود، آرپژ دو ماژور، حروف ALi Piano.IR جمع می‌شوند و شعار «یک دست، یک رویا»',
    inspiration: 'استینگرهای برند کانال‌های موسیقی',
    component: LogoIntro,
    defaultProps: {brand: 'ali', theme: 'noir', format: '16:9', seconds: 5, slogan: '', line: '', sfx: true},
    fields: [THEME_FIELD, {key: 'slogan', label: 'شعار (خالی = شعار برند)', type: 'text'}, {key: 'line', label: 'خط اضافه (مثلاً نام جلسه)', type: 'text'}, {key: 'seconds', label: 'مدت (ثانیه)', type: 'number', min: 3, max: 10}],
    duration: (p) => logoFrames(p, FPS),
  },
];

export const getTemplate = (id: string) => TEMPLATES.find((t) => t.id === id) ?? TEMPLATES[0];
export const compositionMeta = (id: string, props: any) => {
  const t = getTemplate(id);
  const fmt = (props?.format as Format) || t.defaultFormat;
  return {...DIMENSIONS[fmt], fps: FPS, durationInFrames: Math.max(FPS, t.duration(props)), props};
};
