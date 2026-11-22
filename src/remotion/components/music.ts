// Note helpers: "C4", "F#3", "Bb2" -> MIDI numbers, Persian solfège labels.
const BASE: Record<string, number> = {C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11};
const FA_NAMES: Record<string, string> = {C: 'دو', D: 'ر', E: 'می', F: 'فا', G: 'سل', A: 'لا', B: 'سی'};

export const parseNote = (n: string): number | null => {
  const m = n.trim().match(/^([A-Ga-g])([#b]?)(-?\d)$/);
  if (!m) return null;
  const pc = BASE[m[1].toUpperCase()] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
  return (Number(m[3]) + 1) * 12 + pc;
};

export const parseNotes = (s: string): number[] =>
  (s || '')
    .split(/[\s,،]+/)
    .map(parseNote)
    .filter((x): x is number => x !== null);

export const parseFingers = (s: string): string[] => (s || '').split(/[\s,،]+/).filter(Boolean);

export const isBlack = (midi: number) => [1, 3, 6, 8, 10].includes(((midi % 12) + 12) % 12);

const SHARP_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
export const faNoteName = (midi: number) => {
  const n = SHARP_NAMES[((midi % 12) + 12) % 12];
  const fa = FA_NAMES[n[0]];
  return n.length > 1 ? `${fa} دیز` : fa;
};
export const enNoteName = (midi: number) => SHARP_NAMES[((midi % 12) + 12) % 12] + (Math.floor(midi / 12) - 1);
