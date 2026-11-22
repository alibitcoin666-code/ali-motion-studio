import React, {useMemo, useState} from 'react';
import {getTemplate} from '../v3/registry';
import {FPS} from '../v3/theme';
import {fmtDur, missingClips} from '../v3/timeline';
import {KIND_FA, LessonScene} from '../v3/templates/scenes';
import {download, narrationMarkdown, timing} from './youtube';

const fa = (n: number | string) => String(n).replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[+d]);
const VOICES = [{v: 'farid', l: 'فرید (مرد، گرم)'}, {v: 'dilara', l: 'دلارا (زن، روشن)'}, {v: 'none', l: 'بدون گوینده'}];

/**
 * Narration: every scene has its own line. Voice clips are generated in the cloud (free edge-tts) with
 * word timings → scene lengths, karaoke captions and the talking mascot follow the real voice.
 */
export const NarrationPanel: React.FC<{tid: string; props: Record<string, any>; set: (k: string, v: any) => void; flash: (m: string) => void; api: string}> = ({tid, props, set, flash, api}) => {
  const t = getTemplate(tid);
  const tm = useMemo(() => timing(tid, props), [tid, props]);
  const [busy, setBusy] = useState<string | null>(null);
  if (!t.scripted || !tm) return <div className="form"><p className="hint">این قالب نریشن ندارد (موسیقی و افکت صوتی دارد).</p></div>;
  const voice = props.voice ?? 'farid';
  const missing = voice === 'none' ? [] : missingClips(props.scenes || [], props.voicePack, voice);
  const editSay = (i: number, v: string) => set('scenes', (props.scenes || []).map((s: LessonScene, j: number) => (j === i ? {...s, say: v} : s)));
  const base = `${tid}_${new Date().toISOString().slice(0, 10)}`;
  const copy = (txt: string, m: string) => navigator.clipboard?.writeText(txt).then(() => flash(m)).catch(() => flash('کپی نشد؛ از دکمهٔ دانلود استفاده کنید'));
  const total = tm.ts.reduce((a, s) => a + s.frames, 0);

  /** Cloud voice job: queue → GitHub Actions edge-tts → pack with clip URLs (poll every 15 s). */
  const buildVoice = async () => {
    try {
      setBusy('در صف ساخت صدا…');
      const r = await fetch(`${api}/api/jobs`, {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({type: 'tts', template: tid, props: {scenes: props.scenes, voice}, title: `${tid}_voice`})});
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'خطا');
      for (let k = 0; k < 80; k++) {
        await new Promise((res) => setTimeout(res, 15000));
        const s = await fetch(`${api}/api/jobs/${j.id}`).then((x) => x.json()).catch(() => null);
        if (!s) continue;
        if (s.status === 'done' && s.files?.pack) {
          const pack = s.files.pack;
          const merged = props.voicePack?.voice === voice ? {voice, clips: {...props.voicePack.clips, ...pack.clips}} : pack;
          set('voicePack', merged);
          setBusy(null);
          flash('صدای گوینده ساخته شد؛ پیش‌نمایش حالا با صدا و زیرنویس دقیق است');
          return;
        }
        if (s.status === 'error') throw new Error(s.error || 'خطا در ساخت صدا');
        setBusy(s.status === 'rendering' ? 'در حال ساخت صدا…' : `در صف${s.position ? ` (نفر ${fa(s.position)})` : ''}…`);
      }
      throw new Error('زمان انتظار تمام شد؛ بعداً دوباره امتحان کنید');
    } catch (e: any) { setBusy(null); flash(e.message || 'خطا'); }
  };

  return (
    <div className="form">
      <label>صدای گوینده (رایگان؛ Microsoft Neural فارسی)</label>
      <div className="seg">
        {VOICES.map((v) => <button key={v.v} className={voice === v.v ? 'on' : ''} onClick={() => set('voice', v.v)}>{v.l}</button>)}
      </div>
      <label className="check"><input type="checkbox" checked={props.captions !== false} onChange={(e) => set('captions', e.target.checked)} /> زیرنویس کلمه‌به‌کلمه روی ویدیو</label>
      <p className="hint">مدت کل: {fmtDur(total)} · {fa(tm.pages.length)} زیرنویس · {voice === 'none' ? 'بدون گوینده' : missing.length ? `${fa(missing.length)} جمله هنوز صدا ندارد (زمان‌بندی تخمینی است)` : 'همهٔ جمله‌ها صدا دارند و هم‌زمان‌اند'}</p>
      {voice !== 'none' && missing.length > 0 && (
        <>
          <button className="secondary" disabled={!!busy} onClick={buildVoice}>{busy ?? 'ساخت صدای گوینده در ابر (۱ تا ۵ دقیقه)'}</button>
          <p className="hint">رندر ابری هم خودش صدا را می‌سازد؛ این دکمه فقط برای پیش‌نمایش و رندر در مرورگر با صدای واقعی است.</p>
        </>
      )}

      {tm.ts.map((s, i) => (
        <div className="step" key={i}>
          <div className="row between">
            <b>{fa(i + 1)}. {s.scene.label || KIND_FA[s.scene.kind]}</b>
            <small className="muted">{fmtDur(s.from)} · {fa((s.frames / FPS).toFixed(1))} ثانیه{s.segs.length && s.segs.every((g) => g.clip) ? ' · صدا آماده' : ''}</small>
          </div>
          <textarea rows={3} value={s.scene.say ?? ''} onChange={(e) => editSay(i, e.target.value)} placeholder="متن گوینده برای این صحنه — مکث: [مکث ۲ ثانیه]" />
        </div>
      ))}

      <hr />
      <label>دانلود همراه ویدیو</label>
      <div className="row wrap">
        <button className="ghost" onClick={() => download(`${base}.srt`, tm.srt)}>زیرنویس SRT (کلمه‌به‌کلمه)</button>
        <button className="ghost" onClick={() => download(`${base}_narration.md`, narrationMarkdown(tid, props).md)}>متن نریشن + بستهٔ یوتیوب (MD)</button>
      </div>
      <label>بستهٔ یوتیوب (فقط کپی؛ چیزی منتشر نمی‌شود)</label>
      <div className="row wrap">
        <button className="ghost sm" onClick={() => copy(narrationMarkdown(tid, props).yt.title, 'عنوان کپی شد')}>کپی عنوان</button>
        <button className="ghost sm" onClick={() => copy(narrationMarkdown(tid, props).yt.description, 'توضیحات کپی شد')}>کپی توضیحات + فصل‌ها</button>
        <button className="ghost sm" onClick={() => copy(narrationMarkdown(tid, props).yt.tags, 'تگ‌ها کپی شد')}>کپی تگ‌ها</button>
      </div>
    </div>
  );
};
