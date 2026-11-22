import React from 'react';
import {Theme, hexA, toFa} from '../theme';
import {faName, isBlack} from '../music';
import {F} from '../fonts';

export interface KeyState { p: number; color?: string } // p = press 0..1

export const keyRange = (notes: number[], minOct = 2, maxKeys = 49) => {
  const lo = notes.length ? Math.min(...notes) : 60;
  const hi = notes.length ? Math.max(...notes) : 72;
  let from = Math.floor(lo / 12) * 12;
  let to = Math.max(from + minOct * 12, Math.ceil((hi + 1) / 12) * 12);
  if (to - from > maxKeys) to = from + maxKeys - 1;
  if (from < 21) from = 21;
  return {from, to};
};

/** Geometry shared by Keyboard and FallingNotes so notes land exactly on keys. */
export const keyGeom = (from: number, to: number, width: number) => {
  const whites: number[] = [];
  for (let m = from; m <= to; m++) if (!isBlack(m)) whites.push(m);
  const ww = width / whites.length;
  const bw = ww * 0.6;
  const x = (m: number) => (isBlack(m) ? (whites.indexOf(m - 1) + 1) * ww - bw / 2 : whites.indexOf(m) * ww);
  const w = (m: number) => (isBlack(m) ? bw : ww);
  return {whites, ww, bw, x, w, wh: ww * 4.6, bh: ww * 4.6 * 0.63};
};

/**
 * Realistic SVG piano: ivory keys with soft gradient, glossy black keys, red felt strip, cast shadow.
 * Pressed keys sink, tint with the hand colour and bloom.
 */
export const Keyboard: React.FC<{
  theme: Theme;
  from: number;
  to: number;
  width: number;
  state?: Record<number, KeyState>;
  fingers?: Record<number, string>;
  labels?: 'none' | 'active' | 'all' | 'c';
  mark?: number[]; // softly marked keys (e.g. middle C)
  felt?: boolean;
  id?: string;
}> = ({theme, from, to, width, state = {}, fingers = {}, labels = 'active', mark = [], felt = true, id = 'kb'}) => {
  const g = keyGeom(from, to, width);
  const top = felt ? g.ww * 0.28 : 0;
  const labH = labels === 'none' ? 0 : g.ww * 1.05;
  const H = top + g.wh + labH + 4;
  const blacks: number[] = [];
  for (let m = from; m <= to; m++) if (isBlack(m)) blacks.push(m);
  const st = (m: number) => state[m]?.p ?? 0;
  const col = (m: number) => state[m]?.color ?? theme.keyGlow;
  const fs = Math.max(14, g.ww * 0.42);
  const showLabel = (m: number) => labels === 'all' ? !isBlack(m) || st(m) > 0.05 : labels === 'c' ? m % 12 === 0 || st(m) > 0.05 : labels === 'active' ? st(m) > 0.05 : false;
  return (
    <svg width={width} height={H} viewBox={`0 0 ${width} ${H}`} style={{overflow: 'visible', display: 'block'}}>
      <defs>
        <linearGradient id={`${id}w`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFFDF8" />
          <stop offset="0.82" stopColor="#F3EEE4" />
          <stop offset="1" stopColor="#D9D2C4" />
        </linearGradient>
        <linearGradient id={`${id}b`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2A2A2E" />
          <stop offset="0.85" stopColor="#0B0B0D" />
          <stop offset="1" stopColor="#3A3A40" />
        </linearGradient>
        <linearGradient id={`${id}gloss`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity={0} />
          <stop offset="0.5" stopColor="#fff" stopOpacity={0.22} />
          <stop offset="1" stopColor="#fff" stopOpacity={0} />
        </linearGradient>
        <filter id={`${id}glow`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation={g.ww * 0.35} />
        </filter>
      </defs>
      {/* cast shadow */}
      <rect x={4} y={top + 10} width={width - 8} height={g.wh} rx={g.ww * 0.12} fill="#000" opacity={theme.dark ? 0.55 : 0.18} filter={`url(#${id}glow)`} />
      {felt ? <rect x={0} y={0} width={width} height={top + 3} rx={3} fill="#7A1420" /> : null}
      {felt ? <rect x={0} y={top - 3} width={width} height={3} fill="#3C070C" /> : null}
      {/* white keys */}
      {g.whites.map((m) => {
        const p = st(m);
        const x = g.x(m);
        return (
          <g key={m} transform={`translate(0 ${p * 4})`}>
            <rect x={x + 1} y={top} width={g.ww - 2} height={g.wh} rx={g.ww * 0.1} fill={`url(#${id}w)`} />
            {mark.includes(m) ? <rect x={x + 1} y={top} width={g.ww - 2} height={g.wh} rx={g.ww * 0.1} fill={theme.accent} opacity={0.22} /> : null}
            {p > 0 ? <rect x={x + 1} y={top} width={g.ww - 2} height={g.wh} rx={g.ww * 0.1} fill={col(m)} opacity={0.78 * p} /> : null}
            <rect x={x + 1} y={top + g.wh - g.ww * 0.18} width={g.ww - 2} height={g.ww * 0.18} rx={g.ww * 0.08} fill="#000" opacity={0.08 + 0.1 * p} />
          </g>
        );
      })}
      {/* bloom on pressed keys */}
      {[...g.whites, ...blacks].filter((m) => st(m) > 0.05).map((m) => (
        <rect key={`b${m}`} x={g.x(m) - g.ww * 0.15} y={top - g.ww * 0.8} width={g.w(m) + g.ww * 0.3} height={g.ww * 1.6} rx={g.ww} fill={col(m)} opacity={0.75 * st(m)} filter={`url(#${id}glow)`} />
      ))}
      {/* black keys */}
      {blacks.map((m) => {
        const p = st(m);
        const x = g.x(m);
        return (
          <g key={m} transform={`translate(0 ${p * 3})`}>
            <rect x={x + 2} y={top + 4} width={g.bw} height={g.bh} rx={g.bw * 0.14} fill="#000" opacity={0.35} />
            <rect x={x} y={top} width={g.bw} height={g.bh} rx={g.bw * 0.14} fill={`url(#${id}b)`} />
            <rect x={x + g.bw * 0.18} y={top + 2} width={g.bw * 0.64} height={g.bh * 0.86} rx={g.bw * 0.1} fill={`url(#${id}gloss)`} />
            {p > 0 ? <rect x={x} y={top} width={g.bw} height={g.bh} rx={g.bw * 0.14} fill={col(m)} opacity={0.85 * p} /> : null}
          </g>
        );
      })}
      {/* finger numbers */}
      {Object.entries(fingers).map(([k, v]) => {
        const m = +k;
        const p = st(m);
        if (p < 0.05 || !v) return null;
        const cx = g.x(m) + g.w(m) / 2;
        const cy = top + (isBlack(m) ? g.bh * 0.72 : g.wh * 0.76);
        const r = g.ww * 0.36;
        return (
          <g key={`f${m}`} opacity={Math.min(1, p * 1.5)} transform={`translate(${cx} ${cy}) scale(${0.6 + 0.4 * p})`}>
            <circle r={r} fill={theme.dark ? '#111' : '#16140F'} stroke={col(m)} strokeWidth={3} />
            <text y={r * 0.38} textAnchor="middle" fontFamily={F.head} fontWeight={900} fontSize={r * 1.15} fill="#fff">{toFa(v)}</text>
          </g>
        );
      })}
      {/* Persian note names */}
      {labels !== 'none'
        ? [...g.whites, ...blacks].filter(showLabel).map((m) => {
            const p = st(m);
            return (
              <text key={`l${m}`} x={g.x(m) + g.w(m) / 2} y={top + g.wh + labH * 0.8} textAnchor="middle" direction="rtl" fontFamily={F.body} fontWeight={800} fontSize={fs * (isBlack(m) ? 0.72 : 1)} fill={p > 0.05 ? col(m) : theme.muted} opacity={labels === 'active' ? Math.min(1, p * 2) : 1}>
                {faName(m)}
              </text>
            );
          })
        : null}
    </svg>
  );
};

export const keyboardHeight = (width: number, from: number, to: number, labels = true, felt = true) => {
  const g = keyGeom(from, to, width);
  return (felt ? g.ww * 0.28 : 0) + g.wh + (labels ? g.ww * 1.05 : 0) + 4;
};

/** Press envelope for a note event at time t (seconds): fast attack, hold, release. */
export const pressAt = (t: number, start: number, dur: number) => {
  if (t < start) return 0;
  const a = Math.min(1, (t - start) / 0.04);
  const rel = t > start + dur ? Math.max(0, 1 - (t - start - dur) / 0.12) : 1;
  return a * rel;
};
export const glowHex = hexA;
