/**
 * Word-synced captions.
 *  - karaoke (16:9 lessons): up to 2 lines, active word highlighted, glass pill
 *  - pop (9:16 Shorts): 1–3 big words that pop in, active word in accent colour
 */
import React, {useMemo} from 'react';
import {spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {Theme, hexA, toFa} from '../theme';
import {F} from '../fonts';
import {AbsWord, captionPages} from '../timeline';

export const Captions: React.FC<{theme: Theme; words: AbsWord[]; mode: 'karaoke' | 'pop'; u: number; bottom: number; maxWidth: number}> = ({theme, words, mode, u, bottom, maxWidth}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = f / fps;
  const pages = useMemo(() => (mode === 'pop' ? captionPages(words, 16, 1, 3) : captionPages(words, 36, 2)), [words, mode]);
  const page = pages.find((p) => t >= p.start - 0.05 && t < p.end);
  if (!page) return null;
  const pf = Math.round((t - page.start) * fps);
  if (mode === 'pop') {
    const s = spring({frame: pf, fps, config: {damping: 10, stiffness: 220, mass: 0.5}});
    return (
      <div style={{position: 'absolute', left: 0, right: 0, bottom, display: 'flex', justifyContent: 'center'}}>
        <div dir="rtl" style={{maxWidth, textAlign: 'center', transform: `scale(${0.7 + 0.3 * s})`, opacity: Math.min(1, s * 2)}}>
          {page.words.map((w, i) => {
            const on = t >= w.t && t < w.t + w.d + 0.08;
            return (
              <span
                key={i}
                style={{
                  fontFamily: F.hook, fontSize: 92 * u, lineHeight: 1.25, padding: `0 ${10 * u}px`, display: 'inline-block',
                  color: on ? theme.accent : theme.dark ? '#FFFFFF' : theme.ink,
                  WebkitTextStroke: theme.dark ? `${10 * u}px #000` : `${8 * u}px #FFFFFF`, paintOrder: 'stroke fill',
                  textShadow: theme.dark ? `0 ${6 * u}px ${18 * u}px rgba(0,0,0,0.6)` : `0 ${4 * u}px ${14 * u}px rgba(60,40,10,0.18)`,
                  transform: on ? `translateY(${-4 * u}px) scale(1.06)` : undefined,
                }}
              >
                {toFa(w.w)}
              </span>
            );
          })}
        </div>
      </div>
    );
  }
  const s = spring({frame: pf, fps, config: {damping: 200, stiffness: 200}});
  return (
    <div style={{position: 'absolute', left: 0, right: 0, bottom, display: 'flex', justifyContent: 'center', pointerEvents: 'none'}}>
      <div
        dir="rtl"
        style={{
          maxWidth, padding: `${14 * u}px ${30 * u}px`, borderRadius: 22 * u, textAlign: 'center',
          background: theme.dark ? 'rgba(8,8,10,0.62)' : 'rgba(255,255,255,0.78)', border: `1px solid ${theme.glassLine}`,
          boxShadow: `0 ${10 * u}px ${30 * u}px rgba(0,0,0,${theme.dark ? 0.35 : 0.12})`,
          opacity: s, transform: `translateY(${(1 - s) * 16 * u}px)`,
        }}
      >
        {page.lines.map((line, li) => (
          <div key={li} style={{fontFamily: F.body, fontWeight: 700, fontSize: 44 * u, lineHeight: 1.55, whiteSpace: 'nowrap'}}>
            {line.map((w, i) => {
              const on = t >= w.t && t < w.t + w.d + 0.05;
              const past = t >= w.t + w.d;
              return (
                <React.Fragment key={i}>{i > 0 ? ' ' : null}<span style={{color: on ? theme.accent : past ? theme.ink : hexA(theme.ink, 0.62), textShadow: on && theme.dark ? `0 0 ${14 * u}px ${hexA(theme.accent, 0.6)}` : undefined, padding: `0 ${2 * u}px`}}>
                  {toFa(w.w)}
                </span></React.Fragment>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};
