export type BrandId = 'ali' | 'pianova' | 'mr69';
export type Format = '16:9' | '9:16' | '1:1';

export interface Brand {
  id: BrandId;
  nameFa: string;
  nameEn: string;
  sloganFa: string;
  sloganEn: string;
  handle: string;
  bg: string;
  bg2: string;
  accent: string;
  accent2: string;
  text: string;
  muted: string;
}

// Brand kits. IMPORTANT: brands are independent — never mix assets.
export const BRANDS: Record<BrandId, Brand> = {
  ali: {
    id: 'ali',
    nameFa: 'علی باغبانی',
    nameEn: 'ALI BAGHBANI',
    sloganFa: 'یک دست، یک رویا',
    sloganEn: 'ONE HAND, ONE DREAM',
    handle: 'alipiano.ir',
    bg: '#0B0B0C',
    bg2: '#1A1A1D',
    accent: '#C9A45C',
    accent2: '#C8561E',
    text: '#F4EFE6',
    muted: '#9C968C',
  },
  pianova: {
    id: 'pianova',
    nameFa: 'پیانووا',
    nameEn: 'PIANOVA',
    sloganFa: 'پیانو را ساده یاد بگیر',
    sloganEn: 'LEARN PIANO, SIMPLY',
    handle: '@Pianovali',
    bg: '#070B18',
    bg2: '#121A33',
    accent: '#F2D49B',
    accent2: '#5B8CFF',
    text: '#F5F1E8',
    muted: '#8F97AE',
  },
  mr69: {
    id: 'mr69',
    nameFa: 'موزیک رادیو ۶۹',
    nameEn: 'MUSIC RADIO 69',
    sloganFa: 'موسیقی را حس کن',
    sloganEn: 'FEEL THE MUSIC',
    handle: '@musicradio69',
    bg: '#050505',
    bg2: '#17150F',
    accent: '#D4AF37',
    accent2: '#B9BDC4',
    text: '#F7F3E8',
    muted: '#8A8577',
  },
};

export const DIMENSIONS: Record<Format, {width: number; height: number}> = {
  '16:9': {width: 1920, height: 1080},
  '9:16': {width: 1080, height: 1920},
  '1:1': {width: 1080, height: 1080},
};

export const FPS = 30;

export interface BaseProps {
  brand: BrandId;
  format: Format;
  accentOverride?: string;
  audioUrl?: string;
  audioVolume?: number;
  showWatermark?: boolean;
  /** 'luxe' (default) adds gold metallic text, bokeh, light leaks and grain. */
  look?: 'luxe' | 'clean';
  /** Background photo: '' / 'none', 'grand-piano', or any image URL. */
  bgImage?: string;
  /** Narration voice-over audio (uploaded file or TTS from the cloud render). */
  narrationUrl?: string;
  narrationVolume?: number;
  /** Burn synced narration subtitles into the video. */
  captions?: boolean;
  /** Per-scene narration overrides (index = scene index from the narration plan). */
  narration?: string[];
}

export const resolveBrand = (p: BaseProps): Brand => {
  const b = BRANDS[p.brand] ?? BRANDS.ali;
  return p.accentOverride ? {...b, accent: p.accentOverride} : b;
};

const FA_DIGITS = '۰۱۲۳۴۵۶۷۸۹';
export const toFa = (v: string | number) => String(v).replace(/[0-9]/g, (d) => FA_DIGITS[Number(d)]);

export const hexA = (hex: string, a: number) => {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};
