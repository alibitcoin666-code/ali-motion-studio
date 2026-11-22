import React, {useMemo} from 'react';
import {buildCaptions, buildScenes, fmtClock, speechFrames, VOICES, wordCount} from '../narration/narration';
import {FPS} from '../remotion/theme';
import {download, narrationMarkdown} from './youtube';

const fa = (n: number | string) => String(n).replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[+d]);
const SCRIPT = ['Whiteboard', 'Stickman'];

/** Every video carries its own narration: edit per scene, choose a voice, download script / SRT / TTS prompt. */
export const NarrationPanel: React.FC<{tid: string; props: Record<string, any>; set: (k: string, v: any) => void; onAudio: (e: React.ChangeEvent<HTMLInputElement>) => void; flash: (m: string) => void}> = ({tid, props, set, onAudio, flash}) => {
  const scenes = useMemo(() => buildScenes(tid, props), [tid, props]);
  const caps = useMemo(() => buildCaptions(scenes), [scenes]);
  const isScript = SCRIPT.includes(tid);
  const editText = (i: number, v: string) => {
    if (isScript) set('scenes', (props.scenes || []).map((s: any, j: number) => (j === i ? {...s, narration: v} : s)));
    else {
      const arr = [...(props.narration || [])];
      while (arr.length < scenes.length) arr.push('');
      arr[i] = v;
      set('narration', arr);
    }
  };
  const pack = () => narrationMarkdown(tid, props);
  const base = `${tid}_${new Date().toISOString().slice(0, 10)}`;
  const copy = (t: string, m: string) => navigator.clipboard?.writeText(t).then(() => flash(m)).catch(() => flash('کپی نشد؛ از دکمهٔ دانلود استفاده کنید'));
  const total = scenes.reduce((a, s) => a + s.frames, 0);
  return (
    <div className="form">
      <label>صدای گوینده (رایگان، در رندر ابری ساخته و روی ویدیو میکس می‌شود)</label>
      <div className="seg">
        {(Object.keys(VOICES) as (keyof typeof VOICES)[]).map((v) => (
          <button key={v} className={(props.voice ?? 'farid') === v ? 'on' : ''} onClick={() => set('voice', v)}>{VOICES[v].label}</button>
        ))}
        <button className={props.voice === 'none' ? 'on' : ''} onClick={() => set('voice', 'none')}>بدون صدا</button>
      </div>
      <label className="check"><input type="checkbox" checked={props.captions !== false && !!(props.captions ?? isScript)} onChange={(e) => set('captions', e.target.checked)} /> نمایش زیرنویس هم‌زمان روی ویدیو</label>
      <label className="check"><input type="checkbox" checked={props.syncNarration !== false} onChange={(e) => set('syncNarration', e.target.checked)} /> طول هر صحنه خودکار با نریشن هماهنگ شود</label>
      <p className="hint">مدت کل: {fa(fmtClock(total))} · {fa(caps.length)} جملهٔ زمان‌بندی‌شده · سرعت گفتار حدود {fa(129)} کلمه در دقیقه</p>

      {scenes.map((s, i) => {
        const need = speechFrames(s.text) / FPS;
        const over = need > s.frames / FPS - 0.5;
        return (
          <div className="step" key={s.key}>
            <div className="row between">
              <b>{fa(i + 1)}. {s.label}</b>
              <small className="muted">{fa(fmtClock(s.from))} · {fa((s.frames / FPS).toFixed(1))} ثانیه</small>
            </div>
            <textarea rows={3} value={isScript ? props.scenes?.[i]?.narration ?? '' : props.narration?.[i] || s.text} onChange={(e) => editText(i, e.target.value)} placeholder="متن گوینده برای این صحنه" />
            <small className={over ? 'err' : 'muted'}>{fa(wordCount(s.text))} کلمه · حدود {fa(need.toFixed(1))} ثانیه گفتار{over ? ' — صحنه کمی طولانی‌تر می‌شود' : ''}</small>
          </div>
        );
      })}
      {!isScript && (props.narration || []).some(Boolean) ? <button className="ghost sm" onClick={() => set('narration', [])}>بازگشت به نریشن خودکار</button> : null}

      <hr />
      <label>فایل صدای آماده (اختیاری — اگر خودتان ضبط کرده‌اید)</label>
      <input type="file" accept="audio/*" onChange={onAudio} />
      {props.narrationUrl ? (
        <>
          <label>بلندی نریشن: {fa(Math.round((props.narrationVolume ?? 1) * 100))}٪</label>
          <input type="range" min={0} max={1.5} step={0.05} value={props.narrationVolume ?? 1} onChange={(e) => set('narrationVolume', +e.target.value)} />
          <button className="ghost sm" onClick={() => set('narrationUrl', '')}>حذف فایل نریشن</button>
        </>
      ) : null}

      <hr />
      <label>دانلود همراه ویدیو</label>
      <div className="row wrap">
        <button className="ghost" onClick={() => download(`${base}_narration.md`, pack().md)}>متن نریشن + پرامپت (MD)</button>
        <button className="ghost" onClick={() => download(`${base}.srt`, pack().srt)}>زیرنویس SRT</button>
        <button className="ghost" onClick={() => download(`${base}_tts_prompt.txt`, pack().tts)}>پرامپت TTS</button>
      </div>
      <label>بستهٔ یوتیوب (فقط کپی؛ چیزی منتشر نمی‌شود)</label>
      <div className="row wrap">
        <button className="ghost sm" onClick={() => copy(pack().yt.title, 'عنوان کپی شد')}>کپی عنوان</button>
        <button className="ghost sm" onClick={() => copy(pack().yt.description, 'توضیحات کپی شد')}>کپی توضیحات + فصل‌ها</button>
        <button className="ghost sm" onClick={() => copy(pack().yt.tags, 'تگ‌ها کپی شد')}>کپی تگ‌ها</button>
      </div>
    </div>
  );
};
