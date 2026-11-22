import React from 'react';
import {AbsoluteFill, Img, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {useAudioData, visualizeAudio} from '@remotion/media-utils';
import {BaseProps, Brand, hexA, resolveBrand} from '../theme';
import {Badge, clamp, Stage, useUnit, Words} from '../components/core';
import {FONT_FA_DISPLAY, FONT_LATIN_SERIF} from '../fonts';

export interface MusicReleaseProps extends BaseProps {
  trackTitle: string;
  trackTitleEn: string;
  artist: string;
  tagline: string;
  coverUrl: string;
  platforms: string;
  durationSec: number;
}

const BARS = 48;

const fakeSpectrum = (f: number) =>
  new Array(BARS).fill(0).map((_, i) => {
    const beat = Math.pow(Math.max(0, Math.sin((f / 15) * Math.PI)), 6);
    const v = 0.25 + 0.35 * Math.abs(Math.sin(f / 7 + i * 0.45)) * (1 - i / BARS) + 0.4 * beat * (1 - i / (BARS * 1.3));
    return Math.min(1, v);
  });

const Spectrum: React.FC<{brand: Brand; values: number[]; width: number; height: number}> = ({brand, values, width, height}) => {
  const bw = width / values.length;
  const mid = height / 2;
  const pts = values.map((v, i) => `${i * bw + bw / 2},${mid - v * mid * 0.9}`).join(' ');
  return (
    <svg width={width} height={height} style={{direction: 'ltr', overflow: 'visible'}}>
      {values.map((v, i) => {
        const h = Math.max(4, v * height * 0.9);
        return <rect key={i} x={i * bw + bw * 0.18} y={mid - h / 2} width={bw * 0.64} height={h} rx={bw * 0.3} fill={i % 2 ? brand.accent : brand.accent2} opacity={0.35 + v * 0.65} />;
      })}
      <polyline points={pts} fill="none" stroke={hexA('#FFFFFF', 0.6)} strokeWidth={2} />
    </svg>
  );
};

const RealSpectrum: React.FC<{src: string; brand: Brand; width: number; height: number}> = ({src, brand, width, height}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const data = useAudioData(src);
  if (!data) return <Spectrum brand={brand} values={fakeSpectrum(f)} width={width} height={height} />;
  const raw = visualizeAudio({fps, frame: f, audioData: data, numberOfSamples: 64}).slice(0, BARS);
  const values = raw.map((v) => Math.min(1, Math.pow(v * 6, 0.7)));
  return <Spectrum brand={brand} values={values} width={width} height={height} />;
};

export const MusicRelease: React.FC<MusicReleaseProps> = (p) => {
  const b = resolveBrand(p);
  const f = useCurrentFrame();
  const {fps, durationInFrames} = useVideoConfig();
  const {u, vertical: v0, width, square} = useUnit();
  const vertical = v0 && !square;
  const coverIn = spring({frame: f - 4, fps, config: {damping: 15}});
  const out = interpolate(f, [durationInFrames - 15, durationInFrames], [1, 0], clamp);
  const coverSize = (vertical ? 600 : square ? 420 : 560) * u;
  const rot = f * 0.6;
  const specW = vertical ? width - 140 * u : 1500 * u;
  const cover = p.coverUrl ? (
    <Img src={p.coverUrl} style={{width: coverSize, height: coverSize, objectFit: 'cover', borderRadius: 28 * u}} />
  ) : (
    <div style={{width: coverSize, height: coverSize, borderRadius: 28 * u, background: `linear-gradient(135deg, ${b.bg2} 0%, ${b.accent} 140%)`, display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column', gap: 10 * u}}>
      <div style={{fontFamily: FONT_LATIN_SERIF, fontSize: 64 * u, color: b.text, letterSpacing: 6 * u, direction: 'ltr', textAlign: 'center', padding: 30 * u}}>{p.trackTitleEn || b.nameEn}</div>
    </div>
  );
  return (
    <Stage p={p} intensity={1.1}>
      <AbsoluteFill style={{opacity: out, display: 'flex', flexDirection: vertical ? 'column' : 'row', justifyContent: 'center', alignItems: 'center', gap: (vertical ? 70 : 110) * u, padding: 80 * u, paddingBottom: (vertical ? 420 : 300) * u}}>
        <div style={{position: 'relative', width: coverSize * 1.45, height: coverSize, opacity: coverIn, transform: `scale(${interpolate(coverIn, [0, 1], [0.8, 1])})`}}>
          {/* vinyl */}
          <svg width={coverSize} height={coverSize} style={{position: 'absolute', top: 0, left: 0, transform: `translateX(${interpolate(coverIn, [0, 1], [coverSize * 0.45, 0])}px) rotate(${rot}deg)`}}>
            <circle cx={coverSize / 2} cy={coverSize / 2} r={coverSize / 2} fill="#0A0A0A" />
            {[0.92, 0.8, 0.68, 0.56].map((r, i) => (
              <circle key={i} cx={coverSize / 2} cy={coverSize / 2} r={(coverSize / 2) * r} fill="none" stroke={hexA('#FFFFFF', 0.07)} strokeWidth={2} />
            ))}
            <circle cx={coverSize / 2} cy={coverSize / 2} r={coverSize * 0.16} fill={b.accent} />
            <circle cx={coverSize / 2} cy={coverSize / 2} r={coverSize * 0.02} fill={b.bg} />
          </svg>
          <div style={{position: 'absolute', top: 0, right: 0, boxShadow: `0 ${30 * u}px ${80 * u}px rgba(0,0,0,0.6)`, borderRadius: 28 * u}}>{cover}</div>
        </div>
        <div style={{display: 'flex', flexDirection: 'column', gap: 24 * u, alignItems: vertical ? 'center' : 'flex-start', textAlign: vertical ? 'center' : 'right', maxWidth: (square ? 600 : 820) * u}}>
          <Badge brand={b} text={p.tagline} size={30 * u} start={10} />
          <Words text={p.trackTitle} size={(vertical ? 110 : 112) * u} color={b.text} weight={900} font={FONT_FA_DISPLAY} start={16} align={vertical ? 'center' : 'flex-start'} mode="slam" />
          {p.trackTitleEn ? <div style={{fontFamily: FONT_LATIN_SERIF, fontSize: 46 * u, color: b.accent, direction: 'ltr', letterSpacing: 4 * u, opacity: interpolate(f, [26, 40], [0, 1], clamp)}}>{p.trackTitleEn}</div> : null}
          <Words text={p.artist} size={50 * u} color={b.muted} weight={600} start={30} align={vertical ? 'center' : 'flex-start'} />
          <div style={{fontSize: 30 * u, color: hexA(b.text, 0.7), opacity: interpolate(f, [50, 70], [0, 1], clamp), marginTop: 10 * u}}>{p.platforms}</div>
        </div>
      </AbsoluteFill>
      <div style={{position: 'absolute', bottom: (vertical ? 120 : 70) * u, left: (width - specW) / 2, opacity: out}}>
        {p.audioUrl ? <RealSpectrum src={p.audioUrl} brand={b} width={specW} height={(vertical ? 260 : 200) * u} /> : <Spectrum brand={b} values={fakeSpectrum(f)} width={specW} height={(vertical ? 260 : 200) * u} />}
      </div>
    </Stage>
  );
};
