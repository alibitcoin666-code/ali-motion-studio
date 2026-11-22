import React from 'react';
import {interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {Brand, hexA, toFa} from '../theme';
import {faNoteName, isBlack} from './music';
import {FONT_FA} from '../fonts';

export type PlayMode = 'sequence' | 'chord' | 'arpeggio';

/**
 * Animated piano keyboard (pure SVG → renders identically in Player, browser render and cloud render).
 * Notes light up with a beam, finger numbers (left hand: 5..1) and Persian note names.
 */
export const Keyboard: React.FC<{
  brand: Brand;
  notes: number[];
  fingers?: string[];
  mode?: PlayMode;
  start?: number;
  step?: number; // frames between notes
  width: number;
  showNames?: boolean;
  beam?: number; // beam height in px (0 = none)
  minOctaves?: number;
}> = ({brand, notes, fingers = [], mode = 'sequence', start = 0, step = 10, width: widthIn, showNames = true, beam = 160, minOctaves = 2}) => {
  const f = useCurrentFrame();
  const {fps, width: CW, height: CH} = useVideoConfig();
  // On square canvases keep the keyboard compact so text and labels still fit.
  const width = CW === CH ? Math.min(widthIn, CW * 0.78) : widthIn;

  // Range: start at the C below the lowest note, cover at least `minOctaves`.
  const lo = notes.length ? Math.min(...notes) : 48;
  const hi = notes.length ? Math.max(...notes) : 71;
  const from = Math.floor(lo / 12) * 12;
  let to = Math.max(from + minOctaves * 12 - 1, Math.ceil((hi + 1) / 12) * 12 - 1);
  if (to - from > 47) to = from + 47;

  const whites: number[] = [];
  for (let m = from; m <= to; m++) if (!isBlack(m)) whites.push(m);
  const ww = width / whites.length;
  const wh = ww * 5.2;
  const bw = ww * 0.62;
  const bh = wh * 0.62;
  const labelH = showNames ? ww * 1.25 : 0;
  const top = beam;
  const H = top + wh + labelH + 8;

  const xOfWhite = (m: number) => whites.indexOf(m) * ww;
  const xOf = (m: number) => (isBlack(m) ? xOfWhite(m - 1) + ww - bw / 2 : xOfWhite(m));

  // Press timing per note index
  const pressAt = (i: number) => (mode === 'chord' ? start : start + i * step);
  const pressAmount = (i: number) => {
    const t = f - pressAt(i);
    if (t < 0) return 0;
    const s = spring({frame: t, fps, config: {damping: 18, stiffness: 260}});
    if (mode === 'sequence') {
      // release after one step (last note stays)
      const rel = i < notes.length - 1 ? interpolate(t, [step * 1.1, step * 1.6], [1, 0.25], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}) : 1;
      return s * rel;
    }
    return s;
  };

  const active = new Map<number, {amt: number; idx: number}>();
  notes.forEach((m, i) => {
    const a = pressAmount(i);
    const prev = active.get(m);
    if (!prev || a > prev.amt) active.set(m, {amt: a, idx: i});
  });

  const keyFill = (m: number, base: string) => {
    const a = active.get(m)?.amt ?? 0;
    return a > 0.01 ? base : undefined;
  };

  const gid = `g-${brand.id}`;
  return (
    <svg width={width} height={H} viewBox={`0 0 ${width} ${H}`} style={{overflow: 'visible', direction: 'ltr'}}>
      <defs>
        <linearGradient id={`${gid}-beam`} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor={brand.accent} stopOpacity="0.85" />
          <stop offset="100%" stopColor={brand.accent} stopOpacity="0" />
        </linearGradient>
        <linearGradient id={`${gid}-white`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#E6E1D8" />
        </linearGradient>
        <linearGradient id={`${gid}-black`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2A2A2E" />
          <stop offset="100%" stopColor="#0A0A0B" />
        </linearGradient>
        <linearGradient id={`${gid}-on`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={brand.accent} />
          <stop offset="100%" stopColor={brand.accent2} />
        </linearGradient>
      </defs>

      {/* beams */}
      {beam > 0 &&
        [...active.entries()].map(([m, {amt}]) =>
          amt > 0.02 ? (
            <rect key={`b${m}`} x={xOf(m) + (isBlack(m) ? 0 : ww * 0.12)} y={top - beam * amt} width={isBlack(m) ? bw : ww * 0.76} height={beam * amt} rx={ww * 0.12} fill={`url(#${gid}-beam)`} opacity={amt} />
          ) : null,
        )}

      {/* frame line */}
      <rect x={-4} y={top - 6} width={width + 8} height={6} fill={brand.accent} opacity={0.9} rx={3} />

      {/* white keys */}
      {whites.map((m) => {
        const a = active.get(m)?.amt ?? 0;
        return (
          <g key={m} transform={`translate(0 ${a * 4})`}>
            <rect x={xOfWhite(m) + 1} y={top} width={ww - 2} height={wh} rx={ww * 0.08} fill={`url(#${gid}-white)`} />
            {keyFill(m, '') !== undefined ? <rect x={xOfWhite(m) + 1} y={top} width={ww - 2} height={wh} rx={ww * 0.08} fill={`url(#${gid}-on)`} opacity={a} /> : null}
          </g>
        );
      })}
      {/* black keys */}
      {Array.from({length: to - from + 1}, (_, k) => from + k)
        .filter(isBlack)
        .map((m) => {
          const a = active.get(m)?.amt ?? 0;
          return (
            <g key={m} transform={`translate(0 ${a * 3})`}>
              <rect x={xOf(m)} y={top} width={bw} height={bh} rx={bw * 0.12} fill={`url(#${gid}-black)`} />
              {a > 0.01 ? <rect x={xOf(m)} y={top} width={bw} height={bh} rx={bw * 0.12} fill={`url(#${gid}-on)`} opacity={a} /> : null}
            </g>
          );
        })}

      {/* finger numbers on pressed keys */}
      {[...active.entries()].map(([m, {amt, idx}]) => {
        const fg = fingers[idx];
        if (!fg || amt < 0.05) return null;
        const cx = xOf(m) + (isBlack(m) ? bw / 2 : ww / 2);
        const cy = top + (isBlack(m) ? bh - bw * 0.7 : wh - ww * 0.7);
        const r = (isBlack(m) ? bw : ww) * 0.36;
        return (
          <g key={`f${m}`} opacity={amt}>
            <circle cx={cx} cy={cy} r={r} fill={brand.bg} stroke={brand.accent} strokeWidth={2} />
            <text x={cx} y={cy + r * 0.38} textAnchor="middle" fontSize={r * 1.1} fontWeight={800} fill={brand.accent} fontFamily={FONT_FA}>
              {toFa(fg)}
            </text>
          </g>
        );
      })}

      {/* Persian note names under the keys */}
      {showNames &&
        [...active.entries()].map(([m, {amt}]) => {
          if (amt < 0.05) return null;
          const cx = xOf(m) + (isBlack(m) ? bw / 2 : ww / 2);
          return (
            <text key={`n${m}`} x={cx} y={top + wh + labelH * 0.78} textAnchor="middle" fontSize={ww * 0.42} fontWeight={700} fill={hexA(brand.text, amt)} fontFamily={FONT_FA} direction="rtl">
              {faNoteName(m)}
            </text>
          );
        })}
    </svg>
  );
};
