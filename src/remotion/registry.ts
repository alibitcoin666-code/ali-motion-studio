import React from 'react';
import {DIMENSIONS, FPS, Format} from './theme';
import {PianoLesson, lessonTiming} from './templates/PianoLesson';
import {PianoTip, tipTiming} from './templates/PianoTip';
import {KineticQuote, quoteTiming} from './templates/KineticQuote';
import {BrandIntro} from './templates/BrandIntro';
import {ChordScale} from './templates/ChordScale';
import {MusicRelease} from './templates/MusicRelease';
import {EndScreen} from './templates/EndScreen';

export type FieldType = 'text' | 'textarea' | 'number' | 'select' | 'notes' | 'lines' | 'steps' | 'url';

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
  category: 'آموزشی' | 'نکته و تکنیک' | 'تایپوگرافی' | 'برندینگ' | 'موسیقی' | 'یوتیوب';
  defaultFormat: Format;
  component: React.FC<any>;
  defaultProps: Record<string, any>;
  fields: Field[];
  duration: (p: any) => number; // frames
  inspiration: string;
}

const MODE_OPTIONS = [
  {value: 'sequence', label: 'پشت سر هم (گام/ملودی)'},
  {value: 'arpeggio', label: 'آرپژ (نگه‌داشتن نت‌ها)'},
  {value: 'chord', label: 'هم‌زمان (آکورد)'},
];

const sec = (p: any, d: number) => Math.round(Math.max(3, Math.min(120, Number(p.durationSec) || d)) * FPS);

export const TEMPLATES: TemplateDef[] = [
  {
    id: 'PianoLesson',
    nameFa: 'ویدیوی آموزشی پیانو',
    descFa: 'اینترو + گام‌به‌گام با کیبورد متحرک، شماره انگشت و نام نت فارسی + جمع‌بندی + دعوت به اشتراک',
    category: 'آموزشی',
    defaultFormat: '16:9',
    component: PianoLesson,
    inspiration: 'prompt-motion: Derivative concept explainer + Whiteboard tutorial (ساختار آموزشی قدم‌به‌قدم)',
    defaultProps: {
      brand: 'pianova',
      format: '16:9',
      episode: '5',
      title: 'گام *دو ماژور* با دست چپ',
      subtitle: 'انگشت‌گذاری درست، بدون عجله و بدون تنش',
      stepSeconds: 6,
      steps: [
        {title: 'فرم *درست* دست', text: 'مچ آزاد، انگشت‌ها خمیده مثل نگه‌داشتن یک توپ کوچک', notes: 'C3 D3 E3 F3 G3', fingers: '5 4 3 2 1', mode: 'sequence'},
        {title: 'عبور انگشت *۳* از روی شست', text: 'بعد از نت سل با شست، انگشت سوم نرم از روی شست روی لا می‌نشیند', notes: 'C3 D3 E3 F3 G3 A3 B3 C4', fingers: '5 4 3 2 1 3 2 1', mode: 'sequence'},
        {title: 'آکورد پایه *دو ماژور*', text: 'سه نت دو، می و سل را هم‌زمان و با وزن یکسان بنوازید', notes: 'C3 E3 G3', fingers: '5 3 1', mode: 'chord'},
      ],
      summaryTitle: 'مرور این جلسه',
      cta: 'عضو کانال شوید',
      handle: '',
      showWatermark: true,
    },
    fields: [
      {key: 'episode', label: 'شماره جلسه', type: 'text'},
      {key: 'title', label: 'عنوان (کلمه بین *ستاره* رنگی می‌شود)', type: 'text'},
      {key: 'subtitle', label: 'زیرعنوان', type: 'text'},
      {key: 'steps', label: 'گام‌های آموزش', type: 'steps'},
      {key: 'stepSeconds', label: 'مدت هر گام (ثانیه)', type: 'number', min: 3, max: 20, step: 0.5},
      {key: 'summaryTitle', label: 'عنوان جمع‌بندی', type: 'text'},
      {key: 'cta', label: 'متن دکمه اشتراک', type: 'text'},
      {key: 'handle', label: 'آیدی/سایت (خالی = پیش‌فرض برند)', type: 'text'},
    ],
    duration: (p) => lessonTiming(p).total,
  },
  {
    id: 'PianoTip',
    nameFa: 'نکته و تکنیک پیانو',
    descFa: 'هوک ضربه‌ای + «اشتباه رایج / روش درست» + دمو روی کیبورد + خلاصه یک‌جمله‌ای؛ مناسب Shorts',
    category: 'نکته و تکنیک',
    defaultFormat: '9:16',
    component: PianoTip,
    inspiration: 'prompt-motion: TechHalla kinetic type bumper (هوک ضربه‌ای، اسپرینگ، جابه‌جایی رنگ در لحظه برخورد)',
    defaultProps: {
      brand: 'ali',
      format: '9:16',
      tipNumber: '12',
      category: 'تکنیک دست چپ',
      hook: 'ملودی و همراهی *فقط با یک دست*؟',
      mistake: 'همه نت‌ها را با یک قدرت می‌زنی و ملودی زیر همراهی گم می‌شود',
      correct: 'بم را نرم با انگشت ۵ بزن و ملودی را با شست پررنگ‌تر بخوان',
      demoTitle: 'آرپژ *لا مینور* + ملودی با شست',
      notes: 'A2 E3 A3 C4',
      fingers: '5 3 2 1',
      mode: 'arpeggio',
      takeaway: 'وزن دست را به *شست* بده تا ملودی آواز بخواند',
      cta: 'دنبال کنید',
      handle: '',
      showWatermark: true,
    },
    fields: [
      {key: 'tipNumber', label: 'شماره نکته', type: 'text'},
      {key: 'category', label: 'دسته', type: 'text'},
      {key: 'hook', label: 'جمله هوک (۲ ثانیه اول)', type: 'text'},
      {key: 'mistake', label: 'اشتباه رایج', type: 'textarea'},
      {key: 'correct', label: 'روش درست', type: 'textarea'},
      {key: 'demoTitle', label: 'عنوان دمو', type: 'text'},
      {key: 'notes', label: 'نت‌ها (مثل A2 E3 A3 C4)', type: 'notes'},
      {key: 'fingers', label: 'شماره انگشت‌ها (به ترتیب نت‌ها)', type: 'text'},
      {key: 'mode', label: 'نحوه نواختن', type: 'select', options: MODE_OPTIONS},
      {key: 'takeaway', label: 'خلاصه یک‌جمله‌ای', type: 'text'},
      {key: 'cta', label: 'متن دکمه', type: 'text'},
      {key: 'handle', label: 'آیدی/سایت', type: 'text'},
    ],
    duration: () => tipTiming().total,
  },
  {
    id: 'ChordScale',
    nameFa: 'آکورد / گام روز',
    descFa: 'نمایش آکورد یا گام با نماد بزرگ، فرمول، کیبورد متحرک و نام نت‌های فارسی و انگلیسی',
    category: 'آموزشی',
    defaultFormat: '9:16',
    component: ChordScale,
    inspiration: 'prompt-motion: Collision-driven music machine (هر نت = یک رویداد بصری)',
    defaultProps: {
      brand: 'pianova',
      format: '9:16',
      kind: 'آکورد روز',
      nameFa: 'لا مینور',
      symbol: 'Am',
      notes: 'A2 C3 E3',
      fingers: '5 3 1',
      mode: 'arpeggio',
      formula: '1 – b3 – 5',
      tip: 'رنگ غمگین و آرام؛ پایه بسیاری از قطعه‌های ایرانی و نئوکلاسیک',
      durationSec: 12,
      showWatermark: true,
    },
    fields: [
      {key: 'kind', label: 'برچسب', type: 'text'},
      {key: 'symbol', label: 'نماد (Am, Cmaj7 ...)', type: 'text'},
      {key: 'nameFa', label: 'نام فارسی', type: 'text'},
      {key: 'notes', label: 'نت‌ها', type: 'notes'},
      {key: 'fingers', label: 'شماره انگشت‌ها', type: 'text'},
      {key: 'mode', label: 'نحوه نواختن', type: 'select', options: MODE_OPTIONS},
      {key: 'formula', label: 'فرمول', type: 'text'},
      {key: 'tip', label: 'توضیح کوتاه', type: 'textarea'},
      {key: 'durationSec', label: 'مدت (ثانیه)', type: 'number', min: 6, max: 40},
    ],
    duration: (p) => sec(p, 12),
  },
  {
    id: 'KineticQuote',
    nameFa: 'تایپوگرافی متحرک (جمله/انگیزشی)',
    descFa: 'هر خط روی ضرب BPM می‌نشیند؛ اسلم، بلور و جابه‌جایی رنگ — برای جمله‌های الهام‌بخش یا معرفی',
    category: 'تایپوگرافی',
    defaultFormat: '9:16',
    component: KineticQuote,
    inspiration: 'prompt-motion: Bold kinetic type showreel + Swiss-style showreel',
    defaultProps: {
      brand: 'ali',
      format: '9:16',
      lines: ['دوازده سال پیش', 'دست راستم *ساکت* شد', 'اما موسیقی', '*ساکت* نشد', 'یک دست، *یک رویا*'],
      author: 'علی باغبانی',
      bpm: 96,
      beatsPerLine: 5,
      showWatermark: true,
    },
    fields: [
      {key: 'lines', label: 'خط‌ها (هر خط یک سطر)', type: 'lines'},
      {key: 'author', label: 'امضا', type: 'text'},
      {key: 'bpm', label: 'سرعت (BPM) — هماهنگ با آهنگ', type: 'number', min: 50, max: 180},
      {key: 'beatsPerLine', label: 'ضرب برای هر خط', type: 'number', min: 2, max: 16},
    ],
    duration: (p) => quoteTiming(p).total,
  },
  {
    id: 'BrandIntro',
    nameFa: 'اینترو / لوگو موشن',
    descFa: 'امضای تصویری چندثانیه‌ای: کلیدهای پیانو مثل اکولایزر بالا می‌آیند و نام برند قفل می‌شود',
    category: 'برندینگ',
    defaultFormat: '16:9',
    component: BrandIntro,
    inspiration: 'prompt-motion: TypingMind logo reveal + Orange dot motion system',
    defaultProps: {brand: 'ali', format: '16:9', titleFa: '', titleEn: '', slogan: '', durationSec: 5, showWatermark: false},
    fields: [
      {key: 'titleEn', label: 'نام لاتین (خالی = نام برند)', type: 'text'},
      {key: 'titleFa', label: 'نام فارسی (خالی = نام برند)', type: 'text'},
      {key: 'slogan', label: 'شعار (خالی = شعار برند)', type: 'text'},
      {key: 'durationSec', label: 'مدت (ثانیه)', type: 'number', min: 3, max: 10},
    ],
    duration: (p) => sec(p, 5),
  },
  {
    id: 'MusicRelease',
    nameFa: 'معرفی آهنگ / ویژوالایزر',
    descFa: 'کاور + صفحه گرامافون + طیف صوتی واکنش‌گرا به آهنگ آپلودی (یا شبیه‌سازی‌شده)',
    category: 'موسیقی',
    defaultFormat: '16:9',
    component: MusicRelease,
    inspiration: 'prompt-motion: Oscilloscope-style motion graphic + Synced lyrics video',
    defaultProps: {
      brand: 'ali',
      format: '16:9',
      trackTitle: 'بی‌ماه',
      trackTitleEn: 'Moonless',
      artist: 'علی باغبانی',
      tagline: 'قطعه پیانو تک‌دست',
      coverUrl: '',
      platforms: 'Spotify · Apple Music · Deezer · TIDAL',
      durationSec: 20,
      showWatermark: true,
    },
    fields: [
      {key: 'trackTitle', label: 'نام آهنگ (فارسی)', type: 'text'},
      {key: 'trackTitleEn', label: 'نام آهنگ (لاتین)', type: 'text'},
      {key: 'artist', label: 'هنرمند', type: 'text'},
      {key: 'tagline', label: 'برچسب', type: 'text'},
      {key: 'coverUrl', label: 'لینک یا فایل کاور', type: 'url'},
      {key: 'platforms', label: 'پلتفرم‌ها', type: 'text'},
      {key: 'durationSec', label: 'مدت (ثانیه)', type: 'number', min: 5, max: 120},
    ],
    duration: (p) => sec(p, 20),
  },
  {
    id: 'EndScreen',
    nameFa: 'اند‌اسکرین یوتیوب',
    descFa: 'پایان‌بندی ۲۰ ثانیه‌ای با جای خالی برای ویدیو بعدی و دکمه اشتراک در YouTube Studio',
    category: 'یوتیوب',
    defaultFormat: '16:9',
    component: EndScreen,
    inspiration: 'prompt-motion: Motion principles showreel (حلقه نرم و آرام)',
    defaultProps: {brand: 'pianova', format: '16:9', message: 'ممنون که تا *آخر* همراه بودید', nextLabel: 'ویدیوی بعدی', cta: 'عضو کانال شوید', handle: '', durationSec: 20, showWatermark: true},
    fields: [
      {key: 'message', label: 'پیام', type: 'text'},
      {key: 'nextLabel', label: 'برچسب کادر ویدیو', type: 'text'},
      {key: 'cta', label: 'متن دکمه', type: 'text'},
      {key: 'handle', label: 'آیدی/سایت', type: 'text'},
      {key: 'durationSec', label: 'مدت (ثانیه)', type: 'number', min: 5, max: 20},
    ],
    duration: (p) => sec(p, 20),
  },
];

export const getTemplate = (id: string) => TEMPLATES.find((t) => t.id === id) ?? TEMPLATES[0];

export const compositionMeta = (id: string, props: any) => {
  const t = getTemplate(id);
  const fmt: Format = props.format ?? t.defaultFormat;
  return {...DIMENSIONS[fmt], fps: FPS, durationInFrames: Math.max(30, t.duration(props))};
};
