/** LogoIntro — 5 s branded sting: the mascot drops in, keys play a C-major arpeggio, wordmark tightens. */
import React from 'react';
import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {CommonProps, getBrand, getTheme, hexA, layout} from '../theme';
import {F, useFontsReady} from '../fonts';
import {Background, LightSweep, Particles, ease} from '../components/core';
import {SoundLayer} from '../components/Sound';
import {Mascot, Wordmark} from '../mascot/Mascot';

export interface LogoProps extends CommonProps {
  slogan?: string;
  line?: string; // optional extra line (e.g. episode name)
  seconds?: number;
}
export const logoFrames = (p: LogoProps, fps = 30) => Math.round(Math.max(3, Math.min(10, p.seconds ?? 5)) * fps);

export const LogoIntro: React.FC<LogoProps> = (p) => {
  useFontsReady();
  const f = useCurrentFrame();
  const {fps, width: W, height: H, durationInFrames} = useVideoConfig();
  const L = layout(W, H);
  const u = L.u;
  const theme = getTheme(p.theme, p.brand);
  const brand = getBrand(p.brand);
  const ring = spring({frame: f - 2, fps, config: {damping: 30, stiffness: 60}});
  const word = interpolate(f, [22, 58], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease});
  const slogan = spring({frame: f - 52, fps, config: {damping: 200}});
  const out = interpolate(f, [durationInFrames - 14, durationInFrames], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const mW = (L.portrait ? 760 : 640) * u;
  const arp = [60, 64, 67, 72];
  return (
    <AbsoluteFill style={{background: theme.bg, opacity: 1 - out, transform: `scale(${1 + out * 0.06})`}}>
      <Background theme={theme} seed={21} floor={false} />
      <Particles theme={theme} count={30} seed="logo" />
      {/* light ring */}
      <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center'}}>
        <div style={{width: 900 * u * ring, height: 900 * u * ring, borderRadius: '50%', border: `${2 * u}px solid ${hexA(theme.accent, 0.5 * (1 - ring * 0.6))}`, boxShadow: `0 0 ${120 * u}px ${hexA(theme.accent, 0.25)}`}} />
      </AbsoluteFill>
      <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 30 * u}}>
        {brand.mascot ? (
          <Mascot pose={f > 40 ? 'wave' : 'idle'} prevPose="idle" poseAt={40} width={mW} enterAt={4} sticker={theme.dark ? '#F3EEE4' : '#FFFFFF'} talk={(fr) => (arp.some((_, i) => fr >= 14 + i * 5 && fr < 18 + i * 5) ? 1 : 0)} />
        ) : null}
        {brand.id === 'ali' ? (
          <Wordmark size={(L.portrait ? 120 : 110) * u} color={theme.ink} subColor={theme.accent} progress={word} />
        ) : (
          <div dir="ltr" style={{fontFamily: F.latin, fontWeight: 800, fontSize: 120 * u, color: theme.ink, letterSpacing: `${interpolate(word, [0, 1], [0.3, 0.02])}em`, opacity: word}}>{brand.nameEn}</div>
        )}
        <div dir="rtl" style={{fontFamily: F.slogan, fontSize: 64 * u, color: theme.accent, opacity: slogan, transform: `translateY(${(1 - slogan) * 20}px)`}}>{p.slogan || brand.sloganFa}</div>
        {p.line ? <div dir="rtl" style={{fontFamily: F.body, fontWeight: 700, fontSize: 40 * u, color: theme.muted, opacity: slogan}}>{p.line}</div> : null}
      </AbsoluteFill>
      <LightSweep theme={theme} at={50} dur={30} />
      <SoundLayer
        total={durationInFrames}
        fps={fps}
        bed="none"
        sfx={[{at: 0, name: 'riser', vol: 0.3}, {at: 4, name: 'logo', vol: 0.55}, {at: 52, name: 'shimmer', vol: 0.35}]}
        notes={arp.map((m, i) => ({at: 14 + i * 5, midi: m, dur: 40 - i * 5, vol: 0.6}))}
        sfxOn={p.sfx !== false}
      />
    </AbsoluteFill>
  );
};
