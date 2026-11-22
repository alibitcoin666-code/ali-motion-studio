import React from 'react';
import {KIND_FA, Kind, LessonScene} from '../v3/templates/scenes';

const fa = (n: number | string) => String(n).replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[+d]);
const KINDS = Object.keys(KIND_FA) as Kind[];

/** Which inputs each scene kind uses (everything else is hidden to keep the editor simple). */
const USES: Record<Kind, string[]> = {
  hook: ['title'], title: ['title', 'text'], explain: ['title', 'items', 'text'], keyboard: ['title', 'text', 'notes', 'fingers', 'mode'],
  staff: ['title', 'notes'], chord: ['chord', 'title', 'text'], compare: ['title', 'wrong', 'right'], wrong: ['title', 'text', 'notes'],
  right: ['title', 'text', 'notes', 'fingers'], steps: ['title', 'items'], quiz: ['text', 'items', 'answer'], recap: ['title', 'items'],
  punch: ['title'], cta: ['title'], outro: ['title', 'text'],
};
const PH: Record<string, string> = {title: 'تیتر روی صفحه (کلمهٔ مهم را *بین ستاره* بنویسید)', text: 'متن کوتاه زیر تیتر', wrong: 'روش اشتباه', right: 'روش درست'};

/** Editor for scripted templates. Every scene owns its narration line (`say`). */
export const ScenesEditor: React.FC<{value: LessonScene[]; onChange: (v: LessonScene[]) => void; label: string}> = ({value, onChange, label}) => {
  const upd = (i: number, k: keyof LessonScene, v: any) => onChange(value.map((s, j) => (j === i ? {...s, [k]: v} : s)));
  const move = (i: number, d: number) => { const n = [...value]; const [x] = n.splice(i, 1); n.splice(i + d, 0, x); onChange(n); };
  return (
    <div className="field">
      <label>{label}</label>
      {value.map((s, i) => {
        const u = USES[s.kind] || ['title'];
        return (
          <details className="step" key={i} open={i === 0}>
            <summary className="row between">
              <b>{fa(i + 1)}. {s.label || s.title?.replace(/\*/g, '') || 'صحنه'}</b>
              <small className="muted">{KIND_FA[s.kind]}</small>
            </summary>
            <div className="row">
              <select value={s.kind} onChange={(e) => upd(i, 'kind', e.target.value)}>
                {KINDS.map((k) => <option key={k} value={k}>{KIND_FA[k]}</option>)}
              </select>
              <span className="row">
                {i > 0 && <button className="ghost sm" onClick={() => move(i, -1)} title="بالا">▲</button>}
                {i < value.length - 1 && <button className="ghost sm" onClick={() => move(i, 1)} title="پایین">▼</button>}
                <button className="ghost sm" onClick={() => onChange([...value.slice(0, i + 1), {...s}, ...value.slice(i + 1)])}>کپی</button>
                <button className="ghost sm" onClick={() => onChange(value.filter((_, j) => j !== i))}>حذف</button>
              </span>
            </div>
            <input placeholder="نام فصل (برای فصل‌بندی یوتیوب، اختیاری)" value={s.label ?? ''} onChange={(e) => upd(i, 'label', e.target.value)} />
            {u.includes('chord') && <input dir="ltr" placeholder="Am, C, G7, Fmaj7…" value={s.chord ?? ''} onChange={(e) => upd(i, 'chord', e.target.value)} />}
            {u.includes('title') && <input placeholder={PH.title} value={s.title ?? ''} onChange={(e) => upd(i, 'title', e.target.value)} />}
            {u.includes('text') && <textarea rows={2} placeholder={s.kind === 'quiz' ? 'سؤال' : PH.text} value={s.text ?? ''} onChange={(e) => upd(i, 'text', e.target.value)} />}
            {u.includes('wrong') && <input placeholder={PH.wrong} value={s.wrong ?? ''} onChange={(e) => upd(i, 'wrong', e.target.value)} />}
            {u.includes('right') && <input placeholder={PH.right} value={s.right ?? ''} onChange={(e) => upd(i, 'right', e.target.value)} />}
            {u.includes('items') && (
              <textarea rows={3} placeholder={s.kind === 'quiz' ? 'چهار گزینه (هر خط یکی)' : 'موارد (هر خط یکی)'} value={(s.items || []).join('\n')} onChange={(e) => upd(i, 'items', e.target.value.split('\n'))} />
            )}
            {u.includes('answer') && (
              <select value={s.answer ?? 0} onChange={(e) => upd(i, 'answer', +e.target.value)}>
                {[0, 1, 2, 3].map((n) => <option key={n} value={n}>پاسخ درست: گزینهٔ {fa(n + 1)}</option>)}
              </select>
            )}
            {u.includes('notes') && (
              <div className="row">
                <input dir="ltr" placeholder="C4 E4 G4" value={s.notes ?? ''} onChange={(e) => upd(i, 'notes', e.target.value)} />
                {u.includes('fingers') && <input dir="ltr" placeholder="1 3 5" value={s.fingers ?? ''} onChange={(e) => upd(i, 'fingers', e.target.value)} style={{maxWidth: 110}} />}
              </div>
            )}
            {u.includes('mode') && (
              <select value={s.mode ?? 'sequence'} onChange={(e) => upd(i, 'mode', e.target.value)}>
                <option value="sequence">نت‌ها پشت سر هم</option>
                <option value="arpeggio">آرپژ + آکورد</option>
                <option value="chord">هم‌زمان (آکورد)</option>
              </select>
            )}
            <label className="sub">نریشن این صحنه (صدای گوینده و زیرنویس)</label>
            <textarea rows={3} placeholder="متنی که گوینده می‌گوید. برای مکث: [مکث ۲ ثانیه]" value={s.say ?? ''} onChange={(e) => upd(i, 'say', e.target.value)} />
            <div className="row">
              <small className="muted">حداقل مدت صحنه (ثانیه، ۰ = خودکار)</small>
              <input type="number" min={0} max={240} value={s.min ?? 0} onChange={(e) => upd(i, 'min', +e.target.value)} style={{maxWidth: 90}} />
            </div>
          </details>
        );
      })}
      {value.length < 30 && (
        <button className="ghost" onClick={() => onChange([...value, {kind: 'explain', title: 'صحنهٔ جدید', items: [], say: ''}])}>+ افزودن صحنه</button>
      )}
    </div>
  );
};
