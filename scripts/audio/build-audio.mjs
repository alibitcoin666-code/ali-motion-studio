#!/usr/bin/env node
/**
 * Builds every audio asset the templates use — no external/licensed sounds except Salamander Grand Piano (CC-BY 3.0).
 *   public/audio/piano/<midi>.mp3   chromatic C2..C7, pitch-corrected from the nearest Salamander sample
 *   public/audio/bed/<mood>.mp3     seamless piano music beds (generated from the same samples + reverb)
 *   public/audio/sfx/<name>.mp3     original synthesised SFX (whoosh, pop, click, tick, riser, impact, shimmer, ding, wrong)
 * Usage: node scripts/audio/build-audio.mjs <salamanderDir>
 */
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SAL = process.argv[2] || '/tmp/assets/sal';
const SR = 44100;
const out = (...p) => path.join(root, 'public/audio', ...p);
for (const d of ['piano', 'bed', 'sfx']) fs.mkdirSync(out(d), {recursive: true});

/* ---------- io */
function decode(file, rate = SR) {
  const buf = execFileSync('ffmpeg', ['-v', 'error', '-i', file, '-f', 'f32le', '-ac', '2', '-ar', String(rate), '-'], {maxBuffer: 1 << 30});
  const f = new Float32Array(buf.buffer, buf.byteOffset, buf.byteLength / 4);
  const L = new Float32Array(f.length / 2), R = new Float32Array(f.length / 2);
  for (let i = 0; i < L.length; i++) { L[i] = f[2 * i]; R[i] = f[2 * i + 1]; }
  return [L, R];
}
function encode([L, R], file, kbps = 160, mono = false) {
  const n = L.length, inter = new Float32Array(n * 2);
  for (let i = 0; i < n; i++) { inter[2 * i] = L[i]; inter[2 * i + 1] = R[i]; }
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-f', 'f32le', '-ar', String(SR), '-ac', '2', '-i', '-', ...(mono ? ['-ac', '1'] : []), '-c:a', 'libmp3lame', '-b:a', `${kbps}k`, file], {input: Buffer.from(inter.buffer)});
}
const buf = (sec) => [new Float32Array(Math.ceil(sec * SR)), new Float32Array(Math.ceil(sec * SR))];

/* ---------- piano: nearest-sample resampling (≤ ±1.5 semitones) */
const NAMES = {C: 0, Ds: 3, Fs: 6, A: 9};
const samples = [];
for (const f of fs.readdirSync(SAL)) {
  const m = f.match(/^([A-Z]s?)(\d)\.mp3$/);
  if (m) samples.push({midi: 12 * (+m[2] + 1) + NAMES[m[1]], file: path.join(SAL, f)});
}
samples.sort((a, b) => a.midi - b.midi);
const cache = new Map();
function note(midi, maxSec = 4.5) {
  const key = `${midi}:${maxSec}`;
  if (cache.has(key)) return cache.get(key);
  const s = samples.reduce((a, b) => (Math.abs(b.midi - midi) < Math.abs(a.midi - midi) ? b : a));
  const ratio = Math.pow(2, (midi - s.midi) / 12);
  // decode at SR/ratio then treat as SR → pitch × ratio
  const [L, R] = decode(s.file, Math.round(SR / ratio));
  const n = Math.min(L.length, Math.round(maxSec * SR));
  const fade = Math.round(0.6 * SR);
  const o = [L.slice(0, n), R.slice(0, n)];
  for (let i = n - fade; i < n; i++) { const g = Math.cos(((i - (n - fade)) / fade) * Math.PI / 2) ** 2; o[0][i] *= g; o[1][i] *= g; }
  cache.set(key, o);
  return o;
}
function mixIn(dst, src, at, gain = 1, pan = 0) {
  const s = Math.round(at * SR);
  const gl = gain * Math.cos((pan + 1) * Math.PI / 4) * Math.SQRT2, gr = gain * Math.sin((pan + 1) * Math.PI / 4) * Math.SQRT2;
  for (let i = 0; i < src[0].length && s + i < dst[0].length; i++) {
    if (s + i < 0) continue;
    dst[0][s + i] += src[0][i] * gl; dst[1][s + i] += src[1][i] * gr;
  }
}

/* ---------- Freeverb-style reverb */
function reverb([L, R], {room = 0.84, damp = 0.35, wet = 0.28, dry = 0.85, wrap = false} = {}) {
  const combT = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617], apT = [556, 441, 341, 225];
  const proc = (x, spread) => {
    const y = new Float32Array(x.length);
    const combs = combT.map((t) => ({b: new Float32Array(t + spread), i: 0, f: 0}));
    const aps = apT.map((t) => ({b: new Float32Array(t + spread), i: 0}));
    const passes = wrap ? 2 : 1; // wrap: run twice so the tail at the end also feeds the start (seamless loops)
    for (let p = 0; p < passes; p++) for (let n = 0; n < x.length; n++) {
      const inp = x[n] * 0.015;
      let s = 0;
      for (const c of combs) {
        const o = c.b[c.i];
        c.f = o * (1 - damp) + c.f * damp;
        c.b[c.i] = inp + c.f * room;
        c.i = (c.i + 1) % c.b.length;
        s += o;
      }
      for (const a of aps) { const o = a.b[a.i]; a.b[a.i] = s + o * 0.5; a.i = (a.i + 1) % a.b.length; s = o - s; }
      if (p === passes - 1) y[n] = s;
    }
    return y;
  };
  const wl = proc(L, 0), wr = proc(R, 23);
  const o = [new Float32Array(L.length), new Float32Array(L.length)];
  for (let i = 0; i < L.length; i++) { o[0][i] = L[i] * dry + wl[i] * wet; o[1][i] = R[i] * dry + wr[i] * wet; }
  return o;
}
function normalize(b, peak = 0.89) {
  let m = 0;
  for (const ch of b) for (const v of ch) m = Math.max(m, Math.abs(v));
  const g = m ? peak / m : 1;
  for (const ch of b) for (let i = 0; i < ch.length; i++) ch[i] *= g;
  return b;
}
function softClip(b) { for (const ch of b) for (let i = 0; i < ch.length; i++) ch[i] = Math.tanh(ch[i] * 1.1) / Math.tanh(1.1); return b; }

/* ---------- 1. chromatic piano notes */
for (let m = 36; m <= 96; m++) {
  const f = out('piano', `${m}.mp3`);
  if (!fs.existsSync(f)) encode(normalize(note(m, 3.2).map((c) => c.slice()), 0.9), f, 128);
}
console.log('piano notes ok');

/* ---------- 2. music beds (seamless loops) */
const N = (s) => { const m = s.match(/^([A-G])(#|b)?(\d)$/); return 12 * (+m[3] + 1) + {C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11}[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0); };
const rnd = (() => { let s = 7; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();
function bed(name, {bpm, chords, pattern, bars = 2, vel = 0.5, bass = true, top = false, rev}) {
  const beat = 60 / bpm, barSec = beat * 4;
  const total = chords.length * bars * barSec;
  const b = buf(total);
  chords.forEach((ch, ci) => {
    const notes = ch.split(' ').map(N);
    for (let bar = 0; bar < bars; bar++) {
      const t0 = (ci * bars + bar) * barSec;
      if (bass) mixIn(b, note(notes[0] - 12, 4.5), t0, vel * 0.9, -0.2);
      pattern.forEach(([pos, idx, g]) => {
        const m = notes[idx % notes.length] + (idx >= notes.length ? 12 : 0);
        const hum = (rnd() - 0.5) * 0.012;
        mixIn(b, note(m, 3.5), t0 + pos * beat + hum, vel * g * (0.85 + rnd() * 0.3), (idx % 3 - 1) * 0.35);
      });
      if (top && bar === bars - 1) mixIn(b, note(notes[notes.length - 1] + 12, 4), t0 + 2 * beat, vel * 0.35, 0.4);
    }
  });
  // wrap the decaying tail into the start so the loop is seamless
  const tail = buf(5);
  const wrapped = [b[0], b[1]];
  const ext = buf(total + 5);
  for (let c = 0; c < 2; c++) ext[c].set(wrapped[c]);
  void tail;
  const r = reverb(ext, rev);
  const n = b[0].length, o = buf(total);
  for (let c = 0; c < 2; c++) for (let i = 0; i < n; i++) o[c][i] = r[c][i] + (i + n < r[c].length ? r[c][i + n] : 0);
  encode(softClip(normalize(o, 0.7)), out('bed', `${name}.mp3`), 160);
  console.log('bed', name, total.toFixed(1) + 's');
}
// calm, warm — long lessons (Cmaj7 · Am9 · Fmaj7 · G6)
bed('lesson', {bpm: 72, bars: 2, vel: 0.42, chords: ['C3 G3 B3 E4', 'A2 E3 G3 C4', 'F2 C3 E3 A3', 'G2 D3 B3 E4'],
  pattern: [[0, 1, 0.8], [0.5, 2, 0.6], [1, 3, 0.7], [1.5, 2, 0.5], [2, 4, 0.55], [2.5, 3, 0.5], [3, 2, 0.55], [3.5, 1, 0.45]], top: true, rev: {room: 0.86, wet: 0.34}});
// light, bouncy — tips & shorts
bed('tip', {bpm: 98, bars: 2, vel: 0.45, chords: ['F2 C3 A3 E4', 'G2 D3 B3 D4', 'E2 B2 G3 D4', 'A2 E3 C4 G4'],
  pattern: [[0, 0, 0.6], [0.75, 2, 0.6], [1.5, 3, 0.7], [2, 1, 0.5], [2.5, 2, 0.6], [3, 3, 0.65], [3.5, 4, 0.5]], rev: {room: 0.78, wet: 0.24}});
// cinematic, luxe — intros, quotes
bed('luxe', {bpm: 60, bars: 2, vel: 0.4, chords: ['D2 A2 F3 C4 E4', 'Bb1 F2 D3 A3 C4', 'F2 C3 A3 E4 G4', 'C2 G2 E3 B3 D4'],
  pattern: [[0, 1, 0.7], [1, 2, 0.6], [2, 3, 0.7], [2.5, 4, 0.5], [3, 5, 0.45]], top: true, rev: {room: 0.9, wet: 0.42, damp: 0.25}});

/* ---------- 3. synthesised SFX */
function noise() { return rnd() * 2 - 1; }
function sfx(name, sec, gen, rev) {
  let b = buf(sec);
  for (let i = 0; i < b[0].length; i++) { const [l, r] = gen(i / SR, i); b[0][i] = l; b[1][i] = r ?? l; }
  if (rev) b = reverb(b, rev);
  encode(normalize(b, 0.8), out('sfx', `${name}.mp3`), 128);
}
// filtered-noise whoosh with a band-pass sweep and stereo movement
{
  let y1 = 0, y2 = 0, z1 = 0, z2 = 0;
  sfx('whoosh', 0.75, (t) => {
    const env = Math.sin(Math.PI * Math.min(1, t / 0.75)) ** 2.2;
    const fc = 300 + 2600 * Math.sin(Math.PI * Math.min(1, t / 0.75));
    const w = 2 * Math.PI * fc / SR, q = 1.6, al = Math.sin(w) / (2 * q);
    const b0 = al, a0 = 1 + al, a1 = -2 * Math.cos(w), a2 = 1 - al;
    const x = noise();
    const y = (b0 * x - b0 * z2 - a1 * y1 - a2 * y2) / a0; // simplified BPF
    z2 = z1; z1 = x; y2 = y1; y1 = y;
    const pan = t / 0.75;
    return [y * env * (1.2 - pan * 0.6), y * env * (0.6 + pan * 0.6)];
  }, {room: 0.5, wet: 0.15});
}
sfx('pop', 0.18, (t) => { const f = 900 * Math.exp(-t * 28) + 260; return [Math.sin(2 * Math.PI * f * t) * Math.exp(-t * 30)]; });
sfx('click', 0.06, (t) => [(noise() * 0.4 + Math.sin(2 * Math.PI * 2400 * t)) * Math.exp(-t * 140)]);
sfx('tick', 0.05, (t) => [Math.sin(2 * Math.PI * 1800 * t) * Math.exp(-t * 180)]);
sfx('riser', 1.6, (t) => { const p = t / 1.6; const f = 200 + 1400 * p * p; return [(Math.sin(2 * Math.PI * f * t) * 0.3 + noise() * 0.25 * p) * p ** 1.5 * (1 - Math.max(0, (p - 0.96) / 0.04))]; }, {room: 0.7, wet: 0.25});
sfx('impact', 1.8, (t) => { const f = 55 * Math.exp(-t * 2) + 38; return [(Math.sin(2 * Math.PI * f * t) * 0.9 + noise() * Math.exp(-t * 40) * 0.5) * Math.exp(-t * 2.2)]; }, {room: 0.8, wet: 0.3});
sfx('wrong', 0.45, (t) => { const f = t < 0.18 ? 330 : 247; return [Math.sign(Math.sin(2 * Math.PI * f * t)) * 0.25 * Math.exp(-((t % 0.18) * 9))]; });
// piano-based stingers (from real samples)
{
  const mk = (name, seq, wet) => {
    const b = buf(4);
    seq.forEach(([m, at, g]) => mixIn(b, note(m, 3.5), at, g));
    encode(normalize(reverb(b, {room: 0.88, wet}), 0.85), out('sfx', `${name}.mp3`), 128);
  };
  mk('ding', [[N('E6'), 0, 0.7], [N('B6'), 0.06, 0.5]], 0.35);
  mk('shimmer', [[N('C6'), 0, 0.4], [N('E6'), 0.07, 0.4], [N('G6'), 0.14, 0.4], [N('B6'), 0.21, 0.4], [N('E7'), 0.28, 0.35]], 0.45);
  mk('logo', [[N('C4'), 0, 0.55], [N('E4'), 0.16, 0.55], [N('G4'), 0.32, 0.6], [N('C5'), 0.5, 0.75], [N('C3'), 0.5, 0.6], [N('G3'), 0.5, 0.4]], 0.4);
  mk('correct', [[N('G5'), 0, 0.6], [N('C6'), 0.1, 0.7]], 0.3);
}
console.log('sfx ok');
