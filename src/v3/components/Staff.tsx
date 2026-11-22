/** Music staff drawn with the Bravura (SMuFL) font. Notes appear one by one and glow when active. */
import React from 'react';
import {spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {Theme, hexA} from '../theme';
import {F} from '../fonts';
import {faName} from '../music';

const STEP = [0, 0, 1, 1, 2, 3, 3, 4, 4, 5, 5, 6]; // diatonic step of each pitch class
const SHARP = [false, true, false, true, false, false, true, false, true, false, true, false];
const dia = (m: number) => Math.floor(m / 12) * 7 + STEP[((m % 12) + 12) % 12];

export const Staff: React.FC<{
  theme: Theme;
  notes: number[];
  width: number;
  space?: number; // distance between staff lines
  clef?: 'treble' | 'bass';
  appearAt?: (i: number) => number; // local frame each note appears
  activeAt?: (i: number) => number; // 0..1 highlight
  chord?: boolean;
  names?: boolean;
}> = ({theme, notes, width, space = 26, clef = 'treble', appearAt = (i) => 6 + i * 6, activeAt = () => 0, chord, names = true}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const ref = clef === 'treble' ? dia(64) : dia(43); // bottom line: E4 / G2
  const top = space * 3;
  const bottomY = top + space * 4;
  const H = bottomY + space * 4.5;
  const x0 = space * 4.2;
  const gap = chord ? 0 : Math.min(space * 4, (width - x0 - space * 2) / Math.max(1, notes.length));
  const ink = theme.ink;
  return (
    <svg width={width} height={H} viewBox={`0 0 ${width} ${H}`} style={{overflow: 'visible', display: 'block'}}>
      {[0, 1, 2, 3, 4].map((i) => (
        <line key={i} x1={0} x2={width} y1={top + i * space} y2={top + i * space} stroke={hexA(ink, 0.55)} strokeWidth={Math.max(1.5, space * 0.07)} />
      ))}
      <text x={space * 0.4} y={clef === 'treble' ? top + space * 3 : top + space} fontFamily={F.music} fontSize={space * 4} fill={ink}>
        {clef === 'treble' ? '\uE050' : '\uE062'}
      </text>
      {notes.map((m, i) => {
        const s = spring({frame: f - appearAt(i), fps, config: {damping: 12, stiffness: 160}});
        if (s <= 0.01) return null;
        const a = activeAt(i);
        const step = dia(m) - ref;
        const y = bottomY - (step * space) / 2;
        const x = x0 + (chord ? space * 2 : gap * i + gap / 2);
        const ledgers: number[] = [];
        for (let st = -2; st >= step; st -= 2) ledgers.push(bottomY - (st * space) / 2);
        for (let st = 10; st <= step; st += 2) ledgers.push(bottomY - (st * space) / 2);
        const col = a > 0.05 ? theme.accent : ink;
        const up = step < 4;
        return (
          <g key={i} opacity={Math.min(1, s * 1.5)} transform={`translate(0 ${(1 - s) * -space * 1.5})`}>
            {ledgers.map((ly, j) => <line key={j} x1={x - space * 0.85} x2={x + space * 0.85} y1={ly} y2={ly} stroke={ink} strokeWidth={Math.max(1.5, space * 0.08)} />)}
            {a > 0.05 ? <circle cx={x} cy={y} r={space * 1.1} fill={theme.accent} opacity={0.3 * a} /> : null}
            {SHARP[((m % 12) + 12) % 12] ? <text x={x - space * 1.7} y={y} fontFamily={F.music} fontSize={space * 4} fill={col}>{'\uE262'}</text> : null}
            <text x={x - space * 0.6} y={y} fontFamily={F.music} fontSize={space * 4} fill={col}>{'\uE0A4'}</text>
            {!chord ? <line x1={up ? x + space * 0.55 : x - space * 0.55} x2={up ? x + space * 0.55 : x - space * 0.55} y1={y} y2={up ? y - space * 3.4 : y + space * 3.4} stroke={col} strokeWidth={Math.max(2, space * 0.1)} /> : null}
            {names && !chord ? (
              <text x={x} y={H - space * 0.4} textAnchor="middle" direction="rtl" fontFamily={F.body} fontWeight={800} fontSize={space * 0.95} fill={a > 0.05 ? theme.accent : theme.muted}>{faName(m)}</text>
            ) : null}
          </g>
        );
      })}
    </svg>
  );
};
