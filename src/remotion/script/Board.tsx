import React from 'react';
import {random, useCurrentFrame} from 'remotion';
import {FONT_HAND} from '../fonts';
import {hexA, toFa} from '../theme';
import {faNoteName, isBlack} from '../components/music';
import {BoardLayout, Item, textProgress} from './layout';

export interface Inks {
  title: string;
  body: string;
  accent: string;
  good: string;
  fill: string; // highlight fill (semi-transparent)
}

const prog = (f: number, a: number, b: number) => Math.max(0, Math.min(1, (f - a) / Math.max(1, b - a)));

/** A slightly wobbly rectangle path (hand-drawn look). */
const sketchRect = (x: number, y: number, w: number, h: number, seed: string, j = 2.2) => {
  const r = (k: number) => (random(`${seed}-${k}`) - 0.5) * j * 2;
  return `M ${x + r(1)} ${y + r(2)} L ${x + w + r(3)} ${y + r(4)} L ${x + w + r(5)} ${y + h + r(6)} L ${x + r(7)} ${y + h + r(8)} Z`;
};
const sketchEllipse = (cx: number, cy: number, rx: number, ry: number, seed: string) => {
  const pts: string[] = [];
  const n = 40;
  for (let i = 0; i <= n + 4; i++) {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2;
    const k = 1 + (random(`${seed}-${i % n}`) - 0.5) * 0.05 + i * 0.0015;
    pts.push(`${(cx + Math.cos(a) * rx * k).toFixed(1)} ${(cy + Math.sin(a) * ry * k).toFixed(1)}`);
  }
  return `M ${pts.join(' L ')}`;
};

/** Stroke that "draws on" from 0 to p. */
const Ink: React.FC<{d: string; p: number; color: string; w: number; fill?: string; fillP?: number}> = ({d, p, color, w, fill, fillP = 0}) =>
  p <= 0 ? null : (
    <>
      {fill && fillP > 0 ? <path d={d} fill={fill} opacity={fillP} stroke="none" /> : null}
      <path d={d} pathLength={1} fill="none" stroke={color} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" strokeDasharray="1 1" strokeDashoffset={1 - p} />
    </>
  );

const KeyboardSketch: React.FC<{it: Extract<Item, {type: 'keyboard'}>; f: number; ink: Inks; u: number}> = ({it, f, ink, u}) => {
  const lo = it.notes.length ? Math.min(...it.notes) : 60;
  const hi = it.notes.length ? Math.max(...it.notes) : 72;
  const start = Math.floor(lo / 12) * 12; // C of lowest octave
  const whites: number[] = [];
  for (let m = start; whites.length < 14 || m <= hi; m++) if (!isBlack(m)) whites.push(m);
  const ww = it.w / whites.length;
  const lw = 4 * u;
  const outline = prog(f, it.t0, it.t0 + 14);
  const sep = prog(f, it.t0 + 8, it.t0 + 26);
  const blk = prog(f, it.t0 + 20, it.t0 + 34);
  const hl0 = it.t0 + 34;
  const idx = (m: number) => it.notes.indexOf(m);
  const keyX = (m: number) => {
    if (!isBlack(m)) return it.x + whites.indexOf(m) * ww;
    return it.x + whites.indexOf(m - 1) * ww + ww * 0.68;
  };
  return (
    <g>
      {whites.map((m, i) => {
        const k = idx(m);
        const on = k >= 0 ? prog(f, hl0 + k * 14, hl0 + k * 14 + 8) : 0;
        return on > 0 ? <rect key={`h${m}`} x={it.x + i * ww + 3 * u} y={it.y + 3 * u} width={ww - 6 * u} height={it.h - 6 * u} rx={6 * u} fill={ink.fill} opacity={on} /> : null;
      })}
      <Ink d={sketchRect(it.x, it.y, it.w, it.h, 'kb', 2 * u)} p={outline} color={ink.body} w={lw} />
      {whites.slice(1).map((m, i) => (
        <Ink key={m} d={`M ${it.x + (i + 1) * ww} ${it.y + 2} L ${it.x + (i + 1) * ww + (random(`s${i}`) - 0.5) * 2 * u} ${it.y + it.h - 2}`} p={Math.max(0, Math.min(1, sep * whites.length - i))} color={ink.body} w={lw * 0.7} />
      ))}
      {whites.map((m) => {
        if (!isBlack(m + 1) || m + 1 > whites[whites.length - 1]) return null;
        const x = keyX(m + 1);
        const k = idx(m + 1);
        const on = k >= 0 ? prog(f, hl0 + k * 14, hl0 + k * 14 + 8) : 0;
        return (
          <g key={`b${m}`} opacity={blk}>
            <path d={sketchRect(x, it.y, ww * 0.64, it.h * 0.6, `b${m}`, 1.5 * u)} fill={on > 0 ? ink.accent : ink.body} stroke={ink.body} strokeWidth={lw * 0.6} />
          </g>
        );
      })}
      {it.notes.map((m, k) => {
        const p = prog(f, hl0 + k * 14, hl0 + k * 14 + 8);
        if (p <= 0) return null;
        const bw = isBlack(m) ? ww * 0.64 : ww;
        const cx = keyX(m) + bw / 2;
        const finger = it.fingers[k];
        const r = Math.min(ww * 0.36, 26 * u);
        return (
          <g key={`n${k}`} opacity={p}>
            {finger ? (
              <>
                <circle cx={cx} cy={it.y - r * 1.5} r={r} fill="none" stroke={ink.title} strokeWidth={lw * 0.8} />
                <text x={cx} y={it.y - r * 1.5 + r * 0.38} textAnchor="middle" fontFamily={FONT_HAND} fontWeight={700} fontSize={r * 1.15} fill={ink.title}>
                  {toFa(finger)}
                </text>
              </>
            ) : null}
            <text x={cx} y={it.y + it.h + 40 * u} textAnchor="middle" fontFamily={FONT_HAND} fontWeight={600} fontSize={Math.min(30 * u, ww * 0.42)} fill={ink.accent} direction="rtl">
              {faNoteName(m)}
            </text>
          </g>
        );
      })}
    </g>
  );
};

const CLEF = 'M 0.62 0.98 C 0.40 1.02 0.30 0.86 0.42 0.76 C 0.56 0.66 0.80 0.74 0.78 0.92 C 0.76 1.08 0.42 1.10 0.30 0.94 C 0.12 0.72 0.28 0.52 0.52 0.36 C 0.70 0.22 0.72 0.04 0.60 0.00 C 0.48 -0.04 0.42 0.16 0.48 0.34 L 0.66 1.16 C 0.70 1.30 0.52 1.34 0.46 1.24';

const StaffSketch: React.FC<{it: Extract<Item, {type: 'staff'}>; f: number; ink: Inks; u: number}> = ({it, f, ink, u}) => {
  const gap = Math.min(it.h / 9, 30 * u);
  const top = it.y + gap * 2;
  const bottom = top + gap * 4;
  const lw = 3.4 * u;
  const clefH = gap * 6.2;
  const x0 = it.x + gap * 4.4;
  const span = it.w - gap * 5;
  const n = Math.max(1, it.notes.length);
  const yOf = (pos: number) => bottom - (pos - 2) * (gap / 2);
  return (
    <g>
      {[0, 1, 2, 3, 4].map((i) => (
        <Ink key={i} d={`M ${it.x} ${top + i * gap} L ${it.x + it.w} ${top + i * gap + (random(`st${i}`) - 0.5) * 2 * u}`} p={prog(f, it.t0 + i * 3, it.t0 + i * 3 + 14)} color={ink.body} w={lw} />
      ))}
      <g transform={`translate(${it.x + gap * 0.6} ${top - gap * 1.3}) scale(${clefH * 0.82} ${clefH * 0.82})`}>
        <path d={CLEF} pathLength={1} fill="none" stroke={ink.title} strokeWidth={(5 * u) / (clefH * 0.82)} strokeLinecap="round" strokeDasharray="1 1" strokeDashoffset={1 - prog(f, it.t0 + 14, it.t0 + 32)} />
      </g>
      {it.notes.map((nt, k) => {
        const t0 = it.t0 + 34 + k * 14;
        const p = prog(f, t0, t0 + 8);
        if (p <= 0) return null;
        const cx = x0 + (span / n) * (k + 0.5);
        const cy = yOf(nt.pos);
        const ledgers: number[] = [];
        for (let lp = 0; lp >= nt.pos; lp -= 2) ledgers.push(lp);
        for (let lp = 12; lp <= nt.pos; lp += 2) ledgers.push(lp);
        const up = nt.pos < 6;
        return (
          <g key={k} opacity={p} transform={`translate(0 ${(1 - p) * -12 * u})`}>
            {ledgers.map((lp) => (
              <line key={lp} x1={cx - gap * 1.05} x2={cx + gap * 1.05} y1={yOf(lp)} y2={yOf(lp)} stroke={ink.body} strokeWidth={lw} strokeLinecap="round" />
            ))}
            <ellipse cx={cx} cy={cy} rx={gap * 0.66} ry={gap * 0.46} transform={`rotate(-20 ${cx} ${cy})`} fill={ink.body} />
            <line x1={up ? cx + gap * 0.6 : cx - gap * 0.6} x2={up ? cx + gap * 0.6 : cx - gap * 0.6} y1={cy} y2={up ? cy - gap * 3.3 : cy + gap * 3.3} stroke={ink.body} strokeWidth={lw} strokeLinecap="round" />
            <text x={cx} y={bottom + gap * 3.6} textAnchor="middle" fontFamily={FONT_HAND} fontWeight={600} fontSize={Math.min(30 * u, (span / n) * 0.5)} fill={ink.accent} direction="rtl">
              {nt.label}
            </text>
          </g>
        );
      })}
    </g>
  );
};

/** Hand outline with finger numbers (1 = thumb). Right hand palm-down: thumb on the left. */
const HandSketch: React.FC<{it: Extract<Item, {type: 'hand'}>; f: number; ink: Inks; u: number}> = ({it, f, ink, u}) => {
  const s = Math.min(it.w, it.h) / 200;
  const fingers = [
    {n: 1, x: 40, y: 128, len: 52, ang: -48, w: 26},
    {n: 2, x: 72, y: 92, len: 70, ang: -6, w: 24},
    {n: 3, x: 100, y: 88, len: 80, ang: 0, w: 24},
    {n: 4, x: 127, y: 92, len: 72, ang: 5, w: 23},
    {n: 5, x: 152, y: 104, len: 54, ang: 12, w: 21},
  ];
  const draw = prog(f, it.t0, it.t0 + 30);
  const lw = 4.2 / s;
  const mirror = it.side === 'left';
  return (
    <g transform={`translate(${it.x + (mirror ? 200 * s : 0)} ${it.y}) scale(${mirror ? -s : s} ${s})`}>
      {fingers.map((fg) => {
        const k = it.fingers.indexOf(fg.n);
        const on = k >= 0 ? prog(f, it.t0 + 32 + k * 12, it.t0 + 40 + k * 12) : 0;
        const tipX = fg.x + Math.sin((fg.ang * Math.PI) / 180) * fg.len;
        const tipY = fg.y - Math.cos((fg.ang * Math.PI) / 180) * fg.len;
        return (
          <g key={fg.n}>
            <g transform={`rotate(${fg.ang} ${fg.x} ${fg.y})`}>
              <rect x={fg.x - fg.w / 2} y={fg.y - fg.len} width={fg.w} height={fg.len + 14} rx={fg.w / 2} fill={on > 0 ? ink.fill : 'none'} fillOpacity={on} />
              <path
                d={`M ${fg.x - fg.w / 2} ${fg.y + 10} L ${fg.x - fg.w / 2} ${fg.y - fg.len + fg.w / 2} A ${fg.w / 2} ${fg.w / 2} 0 0 1 ${fg.x + fg.w / 2} ${fg.y - fg.len + fg.w / 2} L ${fg.x + fg.w / 2} ${fg.y + 10}`}
                pathLength={1}
                fill="none"
                stroke={ink.body}
                strokeWidth={lw}
                strokeLinecap="round"
                strokeDasharray="1 1"
                strokeDashoffset={1 - draw}
              />
            </g>
            <g opacity={draw} transform={`translate(${tipX + Math.sin((fg.ang * Math.PI) / 180) * 22} ${tipY - Math.cos((fg.ang * Math.PI) / 180) * 22}) scale(${mirror ? -1 : 1} 1)`}>
              <circle r={13} fill={on > 0 ? ink.title : 'none'} stroke={ink.title} strokeWidth={lw * 0.7} />
              <text y={5.5} textAnchor="middle" fontFamily={FONT_HAND} fontWeight={700} fontSize={16} fill={on > 0 ? '#FFFFFF' : ink.title}>
                {toFa(fg.n)}
              </text>
            </g>
          </g>
        );
      })}
      <path d="M 52 98 C 50 130 40 150 56 182 C 70 200 140 202 156 184 C 168 168 166 130 164 106" pathLength={1} fill="none" stroke={ink.body} strokeWidth={lw} strokeLinecap="round" strokeDasharray="1 1" strokeDashoffset={1 - draw} />
      <g opacity={draw} transform={`translate(104 160) scale(${mirror ? -1 : 1} 1)`}>
        <text textAnchor="middle" fontFamily={FONT_HAND} fontWeight={600} fontSize={17} fill={ink.accent} direction="rtl">
          {it.side === 'left' ? 'دست چپ' : 'دست راست'}
        </text>
      </g>
    </g>
  );
};

/** Renders a laid-out board. Must be placed inside the scene's <Sequence> (uses local frame). */
export const BoardInk: React.FC<{layout: BoardLayout; bw: number; bh: number; ink: Inks; u: number; erase?: number}> = ({layout, bw, bh, ink, u, erase = 0}) => {
  const f = useCurrentFrame();
  const color = (c: string) => (c === 'title' ? ink.title : c === 'accent' ? ink.accent : c === 'good' ? ink.good : ink.body);
  const lw = 4.4 * u;
  const clip = erase > 0 ? `inset(0 ${erase * 100}% 0 0)` : undefined;
  return (
    <div style={{position: 'absolute', inset: 0, clipPath: clip}}>
      <svg width={bw} height={bh} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
        {layout.items.map((it, i) => {
          const p = prog(f, it.t0, it.t1);
          switch (it.type) {
            case 'underline': {
              const d = `M ${it.x + it.w} ${it.y} C ${it.x + it.w * 0.66} ${it.y + 6 * u} ${it.x + it.w * 0.33} ${it.y - 5 * u} ${it.x} ${it.y + 3 * u}`;
              return <Ink key={i} d={d} p={p} color={ink.title} w={lw * 1.1} />;
            }
            case 'bullet':
              return p > 0 ? <circle key={i} cx={it.x + it.s / 2} cy={it.y} r={(it.s / 3) * Math.min(1, p * 1.5)} fill={ink.title} /> : null;
            case 'check':
              return <Ink key={i} d={`M ${it.x} ${it.y + it.s * 0.5} L ${it.x + it.s * 0.38} ${it.y + it.s * 0.88} L ${it.x + it.s} ${it.y}`} p={p} color={ink.good} w={lw * 1.3} />;
            case 'box':
              return <Ink key={i} d={sketchRect(it.x, it.y, it.w, it.h, `bx${i}`, 2.4 * u)} p={p} color={ink.body} w={lw * 0.8} />;
            case 'circle':
              return <Ink key={i} d={sketchEllipse(it.x + it.w / 2, it.y + it.h / 2, it.w / 2, it.h / 2, `c${i}`)} p={p} color={ink.good} w={lw * 1.2} />;
            case 'clock': {
              const r = it.s / 2;
              const cx = it.x + r;
              const cy = it.y + r;
              const a = (f / 30) * Math.PI * 2 * 0.25;
              return (
                <g key={i}>
                  <Ink d={sketchEllipse(cx, cy, r, r, `ck${i}`)} p={p} color={ink.title} w={lw} />
                  {p >= 1 ? <line x1={cx} y1={cy} x2={cx + Math.sin(a) * r * 0.7} y2={cy - Math.cos(a) * r * 0.7} stroke={ink.title} strokeWidth={lw} strokeLinecap="round" /> : null}
                  {p >= 1 ? <line x1={cx} y1={cy} x2={cx} y2={cy - r * 0.45} stroke={ink.body} strokeWidth={lw} strokeLinecap="round" /> : null}
                </g>
              );
            }
            case 'keyboard':
              return <KeyboardSketch key={i} it={it} f={f} ink={ink} u={u} />;
            case 'staff':
              return <StaffSketch key={i} it={it} f={f} ink={ink} u={u} />;
            case 'hand':
              return <HandSketch key={i} it={it} f={f} ink={ink} u={u} />;
            default:
              return null;
          }
        })}
      </svg>
      {layout.items.map((it, i) => {
        if (it.type !== 'text') return null;
        const lp = textProgress(it, f);
        return it.lines.map((l, k) =>
          lp[k] <= 0 ? null : (
            <div
              key={`${i}-${k}`}
              dir="rtl"
              style={{
                position: 'absolute',
                right: bw - l.xr,
                top: l.y,
                whiteSpace: 'nowrap',
                fontFamily: FONT_HAND,
                fontWeight: it.weight,
                fontSize: it.size,
                lineHeight: 1.3,
                color: color(it.color),
                textShadow: `0 0 ${1.2 * u}px ${hexA(color(it.color), 0.55)}`,
                clipPath: `inset(-30% 0 -40% ${(1 - lp[k]) * 100}%)`,
              }}
            >
              {l.text}
            </div>
          ),
        );
      })}
    </div>
  );
};
