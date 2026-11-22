/** Music helpers: note parsing, Persian solfège, chords and a tiny melody DSL. */
const BASE: Record<string, number> = {C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11};
const FA: Record<string, string> = {C: 'دو', D: 'ر', E: 'می', F: 'فا', G: 'سل', A: 'لا', B: 'سی'};
const SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export const parseNote = (n: string): number | null => {
  const m = n.trim().match(/^([A-Ga-g])([#b]?)(-?\d)$/);
  if (!m) return null;
  const pc = BASE[m[1].toUpperCase()] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
  return (Number(m[3]) + 1) * 12 + pc;
};
export const parseNotes = (s: string): number[] =>
  (s || '').split(/[\s,،]+/).map(parseNote).filter((x): x is number => x !== null);
export const parseFingers = (s: string): string[] => (s || '').split(/[\s,،]+/).filter(Boolean);
export const isBlack = (m: number) => [1, 3, 6, 8, 10].includes(((m % 12) + 12) % 12);
export const faName = (m: number) => {
  const n = SHARP[((m % 12) + 12) % 12];
  return n.length > 1 ? `${FA[n[0]]} دیز` : FA[n[0]];
};
export const enName = (m: number) => SHARP[((m % 12) + 12) % 12] + (Math.floor(m / 12) - 1);
export const clampMidi = (m: number) => Math.max(36, Math.min(96, m));

/* ---------------------------------------------------------------- chords */
const QUALITY: Record<string, {iv: number[]; fa: string; formula: string}> = {
  '': {iv: [0, 4, 7], fa: 'ماژور', formula: '۱ – ۳ – ۵'},
  m: {iv: [0, 3, 7], fa: 'مینور', formula: '۱ – ♭۳ – ۵'},
  '7': {iv: [0, 4, 7, 10], fa: 'هفتم نمایان', formula: '۱ – ۳ – ۵ – ♭۷'},
  maj7: {iv: [0, 4, 7, 11], fa: 'ماژور هفت', formula: '۱ – ۳ – ۵ – ۷'},
  m7: {iv: [0, 3, 7, 10], fa: 'مینور هفت', formula: '۱ – ♭۳ – ۵ – ♭۷'},
  dim: {iv: [0, 3, 6], fa: 'کاسته', formula: '۱ – ♭۳ – ♭۵'},
  aug: {iv: [0, 4, 8], fa: 'افزوده', formula: '۱ – ۳ – #۵'},
  sus2: {iv: [0, 2, 7], fa: 'معلق ۲', formula: '۱ – ۲ – ۵'},
  sus4: {iv: [0, 5, 7], fa: 'معلق ۴', formula: '۱ – ۴ – ۵'},
};
export const parseChord = (sym: string, octave = 4) => {
  const m = (sym || 'C').trim().match(/^([A-G])([#b]?)(maj7|m7|m|7|dim|aug|sus2|sus4)?$/);
  if (!m) return null;
  const root = parseNote(`${m[1]}${m[2]}${octave}`)!;
  const q = QUALITY[m[3] || ''];
  const rootFa = FA[m[1]] + (m[2] === '#' ? ' دیز' : m[2] === 'b' ? ' بمل' : '');
  return {root, notes: q.iv.map((i) => root + i), nameFa: `${rootFa} ${q.fa}`, formula: q.formula, symbol: sym};
};

/* ---------------------------------------------------------------- melody DSL
 * Tokens separated by spaces:  NOTE:beats   [N1 N2 N3]:beats (chord)   R:beats (rest)
 * Example: "E4:1 E4:1 F4:1 G4:1 [C3 E3 G3]:2 R:1"
 */
export interface NoteEvent { midi: number; t: number; d: number; hand: 'R' | 'L' }
export const parseMelody = (src: string, bpm: number, hand: 'R' | 'L' = 'R', offsetBeats = 0): NoteEvent[] => {
  const spb = 60 / bpm;
  const out: NoteEvent[] = [];
  let beat = offsetBeats;
  const re = /\[([^\]]+)\]:([\d.]+)|(\S+?):([\d.]+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src || ''))) {
    const beats = Number(m[2] ?? m[4]) || 1;
    const names = m[1] ? m[1].split(/\s+/) : [m[3]];
    for (const n of names) {
      if (/^R$/i.test(n)) continue;
      const midi = parseNote(n);
      if (midi !== null) out.push({midi, t: beat * spb, d: beats * spb * 0.95, hand});
    }
    beat += beats;
  }
  return out;
};
export const melodyLength = (ev: NoteEvent[]) => ev.reduce((a, e) => Math.max(a, e.t + e.d), 0);

/** Public-domain pieces (arranged simply for beginners). */
export const SONGS: Record<string, {nameFa: string; nameEn: string; composer: string; bpm: number; right: string; left: string}> = {
  ode: {
    nameFa: 'سرود شادی', nameEn: 'Ode to Joy', composer: 'بتهوون', bpm: 96,
    right: 'E4:1 E4:1 F4:1 G4:1 G4:1 F4:1 E4:1 D4:1 C4:1 C4:1 D4:1 E4:1 E4:1.5 D4:0.5 D4:2 E4:1 E4:1 F4:1 G4:1 G4:1 F4:1 E4:1 D4:1 C4:1 C4:1 D4:1 E4:1 D4:1.5 C4:0.5 C4:2',
    left: '[C3 G3]:4 [G2 G3]:4 [C3 G3]:4 [G2 G3]:4 [C3 G3]:4 [G2 G3]:4 [C3 G3]:2 [G2 F3]:2 [C3 E3]:4',
  },
  twinkle: {
    nameFa: 'چشمک بزن ستاره کوچولو', nameEn: 'Twinkle Twinkle', composer: 'ملودی فولکلور فرانسوی', bpm: 100,
    right: 'C4:1 C4:1 G4:1 G4:1 A4:1 A4:1 G4:2 F4:1 F4:1 E4:1 E4:1 D4:1 D4:1 C4:2 G4:1 G4:1 F4:1 F4:1 E4:1 E4:1 D4:2 G4:1 G4:1 F4:1 F4:1 E4:1 E4:1 D4:2',
    left: '[C3 G3]:4 [F3 A3]:2 [C3 G3]:2 [F3 A3]:2 [C3 G3]:2 [G2 F3]:2 [C3 E3]:2 [C3 G3]:2 [F3 A3]:2 [C3 G3]:2 [G2 F3]:2 [C3 G3]:2 [F3 A3]:2 [C3 G3]:2 [G2 F3]:2',
  },
  elise: {
    nameFa: 'برای الیز', nameEn: 'Für Elise', composer: 'بتهوون', bpm: 132,
    right: 'E5:0.5 D#5:0.5 E5:0.5 D#5:0.5 E5:0.5 B4:0.5 D5:0.5 C5:0.5 A4:1.5 C4:0.5 E4:0.5 A4:0.5 B4:1.5 E4:0.5 G#4:0.5 B4:0.5 C5:1.5 E4:0.5 E5:0.5 D#5:0.5 E5:0.5 D#5:0.5 E5:0.5 B4:0.5 D5:0.5 C5:0.5 A4:1.5 C4:0.5 E4:0.5 A4:0.5 B4:1.5 E4:0.5 C5:0.5 B4:0.5 A4:2',
    left: 'R:4 A2:0.5 E3:0.5 A3:1 R:0.5 E2:0.5 E3:0.5 G#3:1 R:0.5 A2:0.5 E3:0.5 A3:1 R:3.5 A2:0.5 E3:0.5 A3:1 R:0.5 E2:0.5 E3:0.5 G#3:1 R:0.5 A2:0.5 E3:0.5 A3:1.5',
  },
  minuet: {
    nameFa: 'مینوئت در سل', nameEn: 'Minuet in G', composer: 'پتسولد (منسوب به باخ)', bpm: 120,
    right: 'D5:1 G4:0.5 A4:0.5 B4:0.5 C5:0.5 D5:1 G4:1 G4:1 E5:1 C5:0.5 D5:0.5 E5:0.5 F#5:0.5 G5:1 G4:1 G4:1 C5:1 D5:0.5 C5:0.5 B4:0.5 A4:0.5 B4:1 C5:0.5 B4:0.5 A4:0.5 G4:0.5 F#4:1 G4:0.5 A4:0.5 B4:0.5 G4:0.5 A4:3',
    left: '[G3 B3 D4]:2 A3:1 B3:3 C4:3 B3:3 A3:3 G3:3 D4:1 B3:1 G3:1 D4:1 D3:1 C4:1 B3:1 A3:1',
  },
};
