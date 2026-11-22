import {useEffect, useState} from 'react';
import {continueRender, delayRender, staticFile} from 'remotion';

// Persian-first font stack. Vazirmatn FD = Farsi digits (۰۱۲۳).
export const FONT_FA = "'Vazirmatn FD', 'Estedad', Tahoma, sans-serif";
export const FONT_FA_DISPLAY = "'Estedad', 'Vazirmatn FD', sans-serif";
export const FONT_FA_POSTER = "'Lalezar', 'Estedad', sans-serif";
export const FONT_LATIN_SERIF = "'Playfair Display', Georgia, serif";
// Handwriting (marker) font with Persian glyphs; missing glyphs fall back to Vazirmatn.
export const FONT_HAND = "'Playpen Sans Arabic', 'Vazirmatn FD', sans-serif";

const faces: Array<[string, string, string, string]> = [
  ['Vazirmatn FD', 'fonts/Vazirmatn-FD-Light.woff2', '300', 'woff2'],
  ['Vazirmatn FD', 'fonts/Vazirmatn-FD-Regular.woff2', '400', 'woff2'],
  ['Vazirmatn FD', 'fonts/Vazirmatn-FD-Medium.woff2', '500', 'woff2'],
  ['Vazirmatn FD', 'fonts/Vazirmatn-FD-Bold.woff2', '700', 'woff2'],
  ['Vazirmatn FD', 'fonts/Vazirmatn-FD-ExtraBold.woff2', '800', 'woff2'],
  ['Vazirmatn FD', 'fonts/Vazirmatn-FD-Black.woff2', '900', 'woff2'],
  ['Estedad', 'fonts/Estedad-Bold.woff2', '700', 'woff2'],
  ['Estedad', 'fonts/Estedad-Black.woff2', '900', 'woff2'],
  ['Lalezar', 'fonts/Lalezar-Regular.ttf', '400', 'truetype'],
  ['Playfair Display', 'fonts/PlayfairDisplay.ttf', '400 900', 'truetype'],
  ['Playpen Sans Arabic', 'fonts/PlaypenSansArabic.woff2', '100 800', 'woff2'],
];

let injected: Promise<void> | null = null;

// Inside a Remotion bundle (CLI / cloud render) use staticFile; in the Vite web app resolve
// relative to the page so it also works under a sub-path (GitHub Pages) or the Worker mirror.
export const assetUrl = (file: string) => fontUrl(file);
const fontUrl = (file: string): string =>
  typeof window !== 'undefined' && 'remotion_staticBase' in window ? staticFile(file) : new URL(file, document.baseURI).href;

export const ensureFonts = (): Promise<void> => {
  if (injected) return injected;
  if (typeof document === 'undefined') return Promise.resolve();
  const css = faces
    .map(([fam, file, w, fmt]) => `@font-face{font-family:'${fam}';src:url('${fontUrl(file)}') format('${fmt}');font-weight:${w};font-display:block;}`)
    .join('\n');
  const style = document.createElement('style');
  style.setAttribute('data-ams-fonts', '1');
  style.textContent = css;
  document.head.appendChild(style);
  const loads = faces.map(([fam, , w]) => document.fonts.load(`${w.split(' ')[0]} 40px '${fam}'`, 'سلام ABC ۱۲۳'));
  injected = Promise.all(loads).then(() => undefined).catch(() => undefined);
  return injected;
};

// Hook used by every template so the renderer waits until fonts are loaded.
export const useFontsReady = () => {
  const [h] = useState(() => delayRender('Loading Persian fonts'));
  useEffect(() => {
    ensureFonts().then(() => continueRender(h));
  }, [h]);
};
