/**
 * v3 design system — themes, brands, formats and small helpers.
 * Every visual value used by templates comes from here so a theme switch restyles everything.
 */
export type Format = '16:9' | '9:16' | '1:1';
export type ThemeId = 'noir' | 'midnight' | 'neon' | 'cream';
export type BrandId = 'ali' | 'pianova' | 'mr69';

export const FPS = 30;
export const DIMENSIONS: Record<Format, {width: number; height: number}> = {
  '16:9': {width: 1920, height: 1080},
  '9:16': {width: 1080, height: 1920},
  '1:1': {width: 1080, height: 1080},
};

export interface Theme {
  id: ThemeId;
  nameFa: string;
  dark: boolean;
  bg: string; // base background
  bg2: string; // secondary (cards, gradient end)
  ink: string; // main text
  muted: string; // secondary text
  accent: string; // gold / main highlight
  accent2: string; // secondary highlight
  accentGrad: [string, string, string]; // metallic gradient for highlighted words
  blobs: [string, string, string]; // drifting light colours
  glass: string; // glass card fill
  glassLine: string; // glass card border
  good: string;
  bad: string;
  keyGlow: string; // pressed key glow
  grid?: boolean; // neon floor grid
}

export const THEMES: Record<ThemeId, Theme> = {
  noir: {
    id: 'noir', nameFa: 'نوآر عاجی', dark: true,
    bg: '#0A0A0B', bg2: '#16151A', ink: '#F3EEE4', muted: '#A39E94',
    accent: '#D4AF6A', accent2: '#E9D3A1', accentGrad: ['#F6E2B3', '#D4AF6A', '#9C7A3C'],
    blobs: ['#3A2E1A', '#1E1B26', '#2B2116'],
    glass: 'rgba(255,255,255,0.055)', glassLine: 'rgba(255,255,255,0.12)',
    good: '#7BD88F', bad: '#FF6B6B', keyGlow: '#F2C878',
  },
  midnight: {
    id: 'midnight', nameFa: 'نیمه‌شب طلایی', dark: true,
    bg: '#070912', bg2: '#111633', ink: '#F1ECE2', muted: '#9AA3C0',
    accent: '#E8B64C', accent2: '#6C8CFF', accentGrad: ['#FFE6A6', '#E8B64C', '#B07A1E'],
    blobs: ['#1B2A6B', '#3B2A10', '#0F1A45'],
    glass: 'rgba(140,160,255,0.07)', glassLine: 'rgba(160,180,255,0.18)',
    good: '#6EE7A8', bad: '#FF7A7A', keyGlow: '#FFD36E',
  },
  neon: {
    id: 'neon', nameFa: 'کلیدهای نئون', dark: true,
    bg: '#05040B', bg2: '#120E24', ink: '#F4F1FF', muted: '#A59FC4',
    accent: '#33E1FF', accent2: '#FF4FD8', accentGrad: ['#B8F6FF', '#33E1FF', '#FF4FD8'],
    blobs: ['#3A0F5C', '#06395A', '#4A0B3E'],
    glass: 'rgba(120,90,255,0.08)', glassLine: 'rgba(130,220,255,0.22)',
    good: '#52FFA8', bad: '#FF5C8A', keyGlow: '#33E1FF', grid: true,
  },
  cream: {
    id: 'cream', nameFa: 'استودیو کرم (روشن)', dark: false,
    bg: '#F4EFE6', bg2: '#E9E1D2', ink: '#16140F', muted: '#6E665A',
    accent: '#B8862F', accent2: '#2F4B8A', accentGrad: ['#D9A84E', '#B8862F', '#7A5414'],
    blobs: ['#F0D9A8', '#D8E0F0', '#EED3C0'],
    glass: 'rgba(255,255,255,0.65)', glassLine: 'rgba(22,20,15,0.10)',
    good: '#1F9D55', bad: '#D64545', keyGlow: '#E0A73C',
  },
};

export interface Brand {
  id: BrandId;
  nameFa: string;
  nameEn: string;
  sloganFa: string;
  sloganEn: string;
  handle: string;
  mascot: boolean; // the ALi Piano.IR logo teacher
  defaultTheme: ThemeId;
}

// Brands are independent — never mix assets between them.
export const BRANDS: Record<BrandId, Brand> = {
  ali: {id: 'ali', nameFa: 'علی پیانو', nameEn: 'ALi Piano.IR', sloganFa: 'یک دست، یک رویا', sloganEn: 'ONE HAND, ONE DREAM', handle: 'alipiano.ir', mascot: true, defaultTheme: 'noir'},
  pianova: {id: 'pianova', nameFa: 'پیانووا', nameEn: 'PIANOVA', sloganFa: 'پیانو را ساده یاد بگیر', sloganEn: 'LEARN PIANO, SIMPLY', handle: '@Pianovali', mascot: true, defaultTheme: 'midnight'},
  mr69: {id: 'mr69', nameFa: 'موزیک رادیو ۶۹', nameEn: 'MUSIC RADIO 69', sloganFa: 'موسیقی را حس کن', sloganEn: 'FEEL THE MUSIC', handle: '@musicradio69', mascot: false, defaultTheme: 'neon'},
};

export const getTheme = (id?: string, brand?: string): Theme =>
  THEMES[(id as ThemeId) || BRANDS[(brand as BrandId) || 'ali']?.defaultTheme || 'noir'] ?? THEMES.noir;
export const getBrand = (id?: string): Brand => BRANDS[(id as BrandId) || 'ali'] ?? BRANDS.ali;

/** Persian digits. */
export const toFa = (s: string | number) => String(s).replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[+d]);

export const hexA = (hex: string, a: number) => {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};

/** Layout helper: `u` = 1 at 1080 short side; portrait/landscape flags. */
export const layout = (w: number, h: number) => {
  const u = Math.min(w, h) / 1080;
  return {u, w, h, portrait: h > w * 1.2, square: Math.abs(w - h) < 10, landscape: w > h * 1.2};
};

/** Common props every v3 template accepts. */
export interface CommonProps {
  brand: BrandId;
  theme?: ThemeId;
  format: Format;
  captions?: boolean;
  music?: 'lesson' | 'tip' | 'luxe' | 'none';
  musicVolume?: number;
  sfx?: boolean;
  voice?: 'farid' | 'dilara' | 'none';
  voicePack?: VoicePack | null;
  mascot?: boolean;
  watermark?: boolean;
}

export interface Word { w: string; t: number; d: number } // seconds, relative to clip start
export interface VoiceClip { src: string; dur: number; words: Word[] }
/** Voice clips keyed by hash(voice|text) so editing one scene keeps the other clips valid. */
export interface VoicePack { voice: string; clips: Record<string, VoiceClip> }
