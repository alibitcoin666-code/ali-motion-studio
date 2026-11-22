/**
 * FallingNotes — the Synthesia-style format behind the biggest piano channels (see STEP_07).
 * Glowing notes fall onto a realistic keyboard; real Salamander piano samples play on every hit.
 */
import React, {useMemo} from 'react';
import {AbsoluteFill, interpolate, random, useCurrentFrame, useVideoConfig} from 'remotion';
import {CommonProps, getBrand, getTheme, hexA, layout} from '../theme';
import {F, useFontsReady} from '../fonts';
import {Background, Chip, KineticText, ProgressBar, ease} from '../components/core';
import {Keyboard, KeyState, keyGeom, keyRange, keyboardHeight, pressAt} from '../components/Keyboard';
import {SoundLayer} from '../components/Sound';
import {Mascot} from '../mascot/Mascot';
import {NoteEvent, SONGS, faName, isBlack, melodyLength, parseMelody} from '../music';

export interface FallingProps extends CommonProps {
  song: keyof typeof SONGS | string;
  hands?: 'both' | 'right';
  speed?: number; // seconds a note takes to fall
  title?: string;
  subtitle?: string;
  showNames?: boolean;
  tempo?: number; // 0.6..1.2 multiplier
}

const INTRO = 2.4; // s
const OUTRO = 3; // s

export const fallingEvents = (p: FallingProps): NoteEvent[] => {
  const s = SONGS[p.song as string] ?? SONGS.ode;
  const bpm = s.bpm * Math.max(0.5, Math.min(1.5, p.tempo ?? 1));
  const r = parseMelody(s.right, bpm, 'R');
  const l = p.hands === 'right' ? [] : parseMelody(s.left, bpm, 'L');
  return [...l, ...r].sort((a, b) => a.t - b.t);
};
export const fallingFrames = (p: FallingProps, fps = 30) => {
  const ev = fallingEvents(p);
  return Math.ceil((INTRO + (p.speed ?? 2.2) + melodyLength(ev) + OUTRO) * fps);
};

export const FallingNotes: React.FC<FallingProps> = (p) => {
  useFontsReady();
  const f = useCurrentFrame();
  const {fps, width: W, height: H, durationInFrames} = useVideoConfig();
  const L = layout(W, H);
  const u = L.u;
  const theme = getTheme(p.theme, p.brand);
  const brand = getBrand(p.brand);
  const song = SONGS[p.song as string] ?? SONGS.ode;
  const fall = p.speed ?? 2.2;
  const ev = useMemo(() => fallingEvents(p), [p.song, p.hands, p.tempo]);
  const t0 = INTRO + fall; // song time 0 hits the keyboard at this video time
  const t = f / fps;
  const st = t - t0; // song time

  const all = ev.map((e) => e.midi);
  const {from, to} = keyRange(all, 2, 61);
  const kbW = W - (L.portrait ? 40 : 80);
  const g = keyGeom(from, to, kbW);
  const kbH = keyboardHeight(kbW, from, to, true, true);
  const kbTop = H - kbH - (L.portrait ? 300 : 40);
  const hitY = kbTop + g.ww * 0.28;
  const pxPerSec = (hitY - (L.portrait ? 380 : 150)) / fall;
  const kbX = (W - kbW) / 2;
  const colR = theme.accent;
  const colL = theme.accent2;

  const state: Record<number, KeyState> = {};
  for (const e of ev) {
    const pr = pressAt(st, e.t, e.d);
    if (pr > (state[e.midi]?.p ?? 0)) state[e.midi] = {p: pr, color: e.hand === 'R' ? colR : colL};
  }
  const hits = useMemo(() => ev.map((e) => ({at: Math.round((t0 + e.t) * fps), midi: e.midi, dur: Math.max(6, Math.round(e.d * fps)), vol: e.hand === 'L' ? 0.55 : 0.85})), [ev, t0, fps]);
  const talk = (fr: number) => {
    const s2 = fr / fps - t0;
    return ev.some((e) => e.hand === 'R' && s2 >= e.t && s2 < e.t + 0.18) ? 0.9 : 0;
  };

  const introP = interpolate(f, [0, 18], [0, 1], {extrapolateRight: 'clamp', easing: ease});
  const titleOut = interpolate(t, [INTRO + 0.6, INTRO + 1.2], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const outroIn = interpolate(f, [durationInFrames - OUTRO * fps, durationInFrames - OUTRO * fps + 20], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

  return (
    <AbsoluteFill style={{background: theme.bg, direction: 'ltr'}}>
      <Background theme={theme} seed={11} floor={false} />
      {/* lane guides */}
      <svg width={W} height={H} style={{position: 'absolute', inset: 0}}>
        <defs>
          <linearGradient id="noteR" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={theme.accentGrad[0]} /><stop offset="1" stopColor={colR} /></linearGradient>
          <linearGradient id="noteL" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#FFFFFF" stopOpacity={0.9} /><stop offset="1" stopColor={colL} /></linearGradient>
          <filter id="nglow" x="-50%" y="-20%" width="200%" height="140%"><feGaussianBlur stdDeviation={8 * u} /></filter>
          <linearGradient id="fadeTop" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={theme.bg} stopOpacity={1} /><stop offset="0.18" stopColor={theme.bg} stopOpacity={0} /></linearGradient>
        </defs>
        {g.whites.filter((m) => m % 12 === 0).map((m) => (
          <line key={m} x1={kbX + g.x(m)} x2={kbX + g.x(m)} y1={0} y2={hitY} stroke={hexA(theme.ink, 0.07)} strokeWidth={1.5} />
        ))}
        {/* falling notes */}
        {ev.map((e, i) => {
          const yBottom = hitY - (e.t - st) * pxPerSec;
          const h = Math.max(14 * u, e.d * pxPerSec - 4);
          const yTop = yBottom - h;
          if (yTop > hitY || yBottom < 0) return null;
          const x = kbX + g.x(e.midi) + (isBlack(e.midi) ? 0 : g.ww * 0.08);
          const w = isBlack(e.midi) ? g.bw : g.ww * 0.84;
          const clipB = Math.min(yBottom, hitY);
          const on = st >= e.t && st < e.t + e.d;
          const fill = e.hand === 'R' ? 'url(#noteR)' : 'url(#noteL)';
          return (
            <g key={i}>
              <rect x={x} y={yTop} width={w} height={Math.max(0, clipB - yTop)} rx={Math.min(w, h) * 0.35} fill={e.hand === 'R' ? colR : colL} opacity={on ? 0.9 : 0.45} filter="url(#nglow)" />
              <rect x={x} y={yTop} width={w} height={Math.max(0, clipB - yTop)} rx={Math.min(w, h) * 0.35} fill={fill} stroke={hexA('#ffffff', 0.5)} strokeWidth={1.5} />
              {p.showNames !== false && clipB - yTop > w * 0.9 && !isBlack(e.midi) ? (
                <text x={x + w / 2} y={clipB - w * 0.35} textAnchor="middle" direction="rtl" fontFamily={F.body} fontWeight={800} fontSize={Math.min(w * 0.42, 30 * u)} fill={theme.dark ? '#0A0A0B' : '#fff'}>{faName(e.midi)}</text>
              ) : null}
            </g>
          );
        })}
        <rect x={0} y={0} width={W} height={H * 0.5} fill="url(#fadeTop)" />
        {/* hit line */}
        <rect x={kbX} y={hitY - 3} width={kbW} height={6} fill={theme.accent} opacity={0.85} filter="url(#nglow)" />
        <rect x={kbX} y={hitY - 1.5} width={kbW} height={3} fill={theme.accentGrad[0]} />
        {/* sparks */}
        {ev.map((e, i) => {
          const age = st - e.t;
          if (age < 0 || age > 0.6) return null;
          const cx = kbX + g.x(e.midi) + g.w(e.midi) / 2;
          return Array.from({length: 7}).map((_, k) => {
            const a = -Math.PI / 2 + (random(`s${i}-${k}`) - 0.5) * 1.6;
            const v = (180 + random(`v${i}-${k}`) * 260) * u;
            const x = cx + Math.cos(a) * v * age;
            const y = hitY + Math.sin(a) * v * age + 400 * u * age * age;
            return <circle key={`${i}-${k}`} cx={x} cy={y} r={(3.5 - age * 4) * u} fill={e.hand === 'R' ? theme.accentGrad[0] : '#fff'} opacity={1 - age / 0.6} />;
          });
        })}
      </svg>
      <div style={{position: 'absolute', left: kbX, top: kbTop}}>
        <Keyboard theme={theme} from={from} to={to} width={kbW} state={state} labels={p.showNames === false ? 'none' : 'active'} id="fkb" />
      </div>

      {/* now-playing chip */}
      <div style={{position: 'absolute', right: 50 * u, top: (L.portrait ? 200 : 40) * u, opacity: 1 - titleOut * 0.999}}>
        <Chip theme={theme} size={26 * u}>
          <span style={{width: 12 * u, height: 12 * u, borderRadius: 99, background: theme.accent, boxShadow: `0 0 12px ${theme.accent}`}} />
          {p.title || song.nameFa} · {song.composer}
        </Chip>
      </div>
      {/* intro title card */}
      {titleOut > 0 ? (
        <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', opacity: titleOut, background: hexA(theme.bg, 0.55 * introP)}}>
          <div style={{transform: `scale(${0.92 + 0.08 * introP})`, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18 * u}}>
            <Chip theme={theme} size={26 * u} solid>آموزش آسان پیانو</Chip>
            <KineticText text={p.title || song.nameFa} theme={theme} size={(L.portrait ? 120 : 130) * u} align="center" delay={4} stagger={4} />
            <div dir="ltr" style={{fontFamily: F.latin, fontWeight: 300, fontSize: 44 * u, color: theme.muted, letterSpacing: 6, opacity: introP}}>{song.nameEn}</div>
            <KineticText text={p.subtitle || `${song.composer} · ${p.hands === 'right' ? 'دست راست' : 'دو دست'}`} theme={theme} size={36 * u} delay={14} font={F.body} weight={600} color={theme.accent} align="center" reveal="blur" />
          </div>
        </AbsoluteFill>
      ) : null}

      {/* mascot bobbing with the melody */}
      {brand.mascot && p.mascot !== false ? (
        <div style={{position: 'absolute', left: 36 * u, top: (L.portrait ? 170 : 30) * u}}>
          <Mascot pose={outroIn > 0.5 ? 'wave' : 'idle'} prevPose="idle" poseAt={durationInFrames - OUTRO * fps} talk={talk} width={(L.portrait ? 300 : 260) * u} enterAt={Math.round(INTRO * fps * 0.6)} shadow={false} sticker={theme.dark ? '#F3EEE4' : '#fff'} />
        </div>
      ) : null}

      {/* outro */}
      {outroIn > 0 ? (
        <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', background: hexA(theme.bg, 0.7 * outroIn)}}>
          <div style={{opacity: outroIn, transform: `translateY(${(1 - outroIn) * 30}px)`, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 * u}}>
            <KineticText text="آموزش کامل این آهنگ را *ببین*" theme={theme} size={(L.portrait ? 80 : 78) * u} align="center" delay={durationInFrames - OUTRO * fps} />
            <div dir="ltr" style={{fontFamily: F.latin, fontWeight: 700, fontSize: 40 * u, color: theme.ink}}>{brand.nameEn} <span style={{fontWeight: 300, color: theme.muted}}>· {brand.handle}</span></div>
          </div>
        </AbsoluteFill>
      ) : null}
      <ProgressBar theme={theme} total={durationInFrames} />
      <SoundLayer total={durationInFrames} fps={fps} bed="none" notes={hits} sfx={[{at: 0, name: 'shimmer', vol: 0.3}, {at: Math.round(INTRO * fps * 0.6), name: 'pop', vol: 0.3}]} sfxOn={p.sfx !== false} noteVolume={0.9} />
    </AbsoluteFill>
  );
};
