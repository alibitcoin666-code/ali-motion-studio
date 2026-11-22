import React from 'react';
import {SCENE_KIND_OPTIONS, ScriptScene} from '../remotion/script/types';

const fa = (n: number | string) => String(n).replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[+d]);

/** Editor for Whiteboard / Stickman scenes. Each scene owns its narration. */
export const ScenesEditor: React.FC<{value: ScriptScene[]; onChange: (v: ScriptScene[]) => void; label: string}> = ({value, onChange, label}) => {
  const upd = (i: number, k: keyof ScriptScene, v: any) => onChange(value.map((s, j) => (j === i ? {...s, [k]: v} : s)));
  const move = (i: number, d: number) => {
    const n = [...value];
    const [x] = n.splice(i, 1);
    n.splice(i + d, 0, x);
    onChange(n);
  };
  return (
    <div className="field">
      <label>{label}</label>
      {value.map((s, i) => (
        <details className="step" key={i} open={i === 0}>
          <summary className="row between">
            <b>{fa(i + 1)}. {s.title || 'صحنه'}</b>
            <small className="muted">{SCENE_KIND_OPTIONS.find((o) => o.value === s.kind)?.label}</small>
          </summary>
          <div className="row">
            <select value={s.kind} onChange={(e) => upd(i, 'kind', e.target.value)}>
              {SCENE_KIND_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <span>
              {i > 0 && <button className="ghost sm" onClick={() => move(i, -1)}>▲</button>}
              {i < value.length - 1 && <button className="ghost sm" onClick={() => move(i, 1)}>▼</button>}
              <button className="ghost sm" onClick={() => onChange(value.filter((_, j) => j !== i))}>حذف</button>
            </span>
          </div>
          <input placeholder="عنوان روی تخته" value={s.title} onChange={(e) => upd(i, 'title', e.target.value)} />
          {['title', 'explain', 'keyboard', 'staff', 'hand', 'exercise', 'quiz'].includes(s.kind) && (
            <textarea rows={2} placeholder={s.kind === 'quiz' ? 'سؤال' : 'متن روی تخته'} value={s.text ?? ''} onChange={(e) => upd(i, 'text', e.target.value)} />
          )}
          {['list', 'outro', 'quiz', 'exercise'].includes(s.kind) && (
            <textarea rows={3} placeholder={s.kind === 'quiz' ? 'چهار گزینه (هر خط یکی)' : 'موارد (هر خط یکی)'} value={(s.items || []).join('\n')} onChange={(e) => upd(i, 'items', e.target.value.split('\n'))} />
          )}
          {s.kind === 'quiz' && (
            <select value={s.answer ?? 0} onChange={(e) => upd(i, 'answer', +e.target.value)}>
              {[0, 1, 2, 3].map((n) => <option key={n} value={n}>پاسخ درست: گزینهٔ {fa(n + 1)}</option>)}
            </select>
          )}
          {s.kind === 'keyboard' && (
            <div className="row">
              <input dir="ltr" placeholder="C4 E4 G4" value={s.notes ?? ''} onChange={(e) => upd(i, 'notes', e.target.value)} />
              <input dir="ltr" placeholder="1 3 5" value={s.fingers ?? ''} onChange={(e) => upd(i, 'fingers', e.target.value)} style={{maxWidth: 110}} />
            </div>
          )}
          {s.kind === 'staff' && <input dir="ltr" placeholder="C4:دو E4:می G4:سل" value={s.staff ?? ''} onChange={(e) => upd(i, 'staff', e.target.value)} />}
          {s.kind === 'hand' && (
            <div className="row">
              <select value={s.hand ?? 'right'} onChange={(e) => upd(i, 'hand', e.target.value)}>
                <option value="right">دست راست</option>
                <option value="left">دست چپ</option>
              </select>
              <input dir="ltr" placeholder="1 2 3 4 5" value={s.fingers ?? ''} onChange={(e) => upd(i, 'fingers', e.target.value)} />
            </div>
          )}
          <label className="sub">نریشن این صحنه (صدای گوینده)</label>
          <textarea rows={3} placeholder="متنی که گوینده در این صحنه می‌گوید. مکث: [مکث ۱ ثانیه]" value={s.narration} onChange={(e) => upd(i, 'narration', e.target.value)} />
          <div className="row">
            <small className="muted">حداقل مدت (ثانیه، ۰ = خودکار با نریشن)</small>
            <input type="number" min={0} max={240} value={s.sec ?? 0} onChange={(e) => upd(i, 'sec', +e.target.value)} style={{maxWidth: 90}} />
          </div>
        </details>
      ))}
      {value.length < 20 && (
        <button className="ghost" onClick={() => onChange([...value, {kind: 'explain', title: 'صحنهٔ جدید', text: '', narration: '', sec: 0}])}>+ افزودن صحنه</button>
      )}
    </div>
  );
};
