import {useEffect, useState} from 'react';
import {continueRender, delayRender, staticFile} from 'remotion';

/** Font roles (see docs/progress/STEP_08_V3_DESIGN.md). */
export const F = {
  head: "'Estedad', 'Vazirmatn FD', sans-serif", // headlines (900)
  body: "'Vazirmatn FD', 'Estedad', Tahoma, sans-serif", // body + captions, Persian digits
  hook: "'Lalezar', 'Estedad', sans-serif", // Shorts hooks
  slogan: "'Mirza', 'Vazirmatn FD', serif", // emotional lines / slogans
  latin: "'Outfit', 'Vazirmatn FD', sans-serif", // logo + Latin
  music: "'Bravura'", // SMuFL notation glyphs
};

const faces: Array<[string, string, string, string]> = [
  ['Vazirmatn FD', 'fonts/Vazirmatn-FD-Regular.woff2', '400', 'woff2'],
  ['Vazirmatn FD', 'fonts/Vazirmatn-FD-Medium.woff2', '500', 'woff2'],
  ['Vazirmatn FD', 'fonts/Vazirmatn-FD-Bold.woff2', '700', 'woff2'],
  ['Vazirmatn FD', 'fonts/Vazirmatn-FD-ExtraBold.woff2', '800', 'woff2'],
  ['Vazirmatn FD', 'fonts/Vazirmatn-FD-Black.woff2', '900', 'woff2'],
  ['Estedad', 'fonts/Estedad-Bold.woff2', '700', 'woff2'],
  ['Estedad', 'fonts/Estedad-Black.woff2', '900', 'woff2'],
  ['Lalezar', 'fonts/Lalezar-Regular.ttf', '400', 'truetype'],
  ['Mirza', 'fonts/Mirza-Bold.ttf', '400 700', 'truetype'],
  ['Outfit', 'fonts/Outfit.ttf', '100 900', 'truetype'],
  ['Bravura', 'fonts/Bravura.woff2', '400', 'woff2'],
];

/** Resolve a file in /public both inside a Remotion bundle and in the Vite web app (sub-path safe). */
export const assetUrl = (file: string): string => {
  if (/^(https?:|blob:|data:)/.test(file)) return file;
  if (typeof window !== 'undefined' && 'remotion_staticBase' in window) return staticFile(file);
  if (typeof document !== 'undefined') return new URL(file, document.baseURI).href;
  return file;
};

let injected: Promise<void> | null = null;
export const ensureFonts = (): Promise<void> => {
  if (injected) return injected;
  if (typeof document === 'undefined') return Promise.resolve();
  const css = faces
    .map(([fam, file, w, fmt]) => `@font-face{font-family:'${fam}';src:url('${assetUrl(file)}') format('${fmt}');font-weight:${w};font-display:block;}`)
    .join('\n');
  const style = document.createElement('style');
  style.setAttribute('data-ams-fonts', 'v3');
  style.textContent = css;
  document.head.appendChild(style);
  const loads = faces.map(([fam, , w]) =>
    document.fonts.load(`${w.split(' ').pop()} 40px '${fam}'`, fam === 'Bravura' ? '\uE050\uE0A4' : 'سلام ABC ۱۲۳'),
  );
  injected = Promise.all(loads).then(() => undefined).catch(() => undefined);
  return injected;
};

export const useFontsReady = () => {
  const [h] = useState(() => delayRender('Loading fonts'));
  useEffect(() => {
    ensureFonts().then(() => continueRender(h));
  }, [h]);
};
