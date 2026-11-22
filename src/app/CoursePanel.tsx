import React, {useEffect, useMemo, useState} from 'react';
import {unzip, strFromU8} from 'fflate';
import {Course, curiosityToScript, lessonToScript, parseCourse, toEnDigits} from '../course/parse';
import {download} from './youtube';

const LS = 'ams.course.v1';
const fa = (n: number | string) => String(n).replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[+d]);
const resolve = (u?: string) => (!u ? '' : /^(blob:|data:|https?:)/.test(u) ? u : new URL(u, document.baseURI).href);

const TYPE_CLASS: Record<string, string> = {جلسه: 'lesson', کنجکاوی: 'cur', جمعه: 'fri'};

/** Read a course ZIP in the browser (nothing is uploaded). */
export const readCourseZip = (file: File): Promise<Course> =>
  file.arrayBuffer().then(
    (buf) =>
      new Promise<Course>((res, rej) => {
        unzip(new Uint8Array(buf), (err, data) => {
          if (err) return rej(err);
          const texts: Record<string, string> = {};
          const images: Record<string, string> = {};
          for (const [k, v] of Object.entries(data)) {
            if (k.endsWith('/') || /__MACOSX|__pycache__/.test(k)) continue;
            if (/\.(md|txt|csv|ya?ml)$/i.test(k)) texts[k] = strFromU8(v);
            else if (/\.(png|jpe?g|webp)$/i.test(k)) {
              const name = k.split('/').pop()!;
              const type = /\.png$/i.test(k) ? 'image/png' : /\.webp$/i.test(k) ? 'image/webp' : 'image/jpeg';
              images[name] = URL.createObjectURL(new Blob([v as BlobPart], {type}));
            }
          }
          const c = parseCourse(texts, images);
          if (!c.lessons.length && !c.calendar.length) return rej(new Error('در این فایل زیپ، جلسه یا تقویمی پیدا نشد (راهنما: docs/COURSE_ZIP_FORMAT.md)'));
          res(c);
        });
      }),
  );

const ics = (c: Course) => {
  const pad = (n: number) => String(n).padStart(2, '0');
  const ev = c.calendar
    .filter((r) => /^\d{4}-\d{2}-\d{2}$/.test(r.dateG) && /\d/.test(toEnDigits(r.time)) && r.title && r.title !== '—')
    .map((r, i) => {
      const [h, m] = toEnDigits(r.time).split(':').map(Number);
      const d = r.dateG.replace(/-/g, '');
      const end = `${pad(h)}${pad((m + 30) % 60)}`;
      const endH = m + 30 >= 60 ? pad(h + 1) : pad(h);
      return ['BEGIN:VEVENT', `UID:ams-${i}-${d}@ali-motion-studio`, `DTSTAMP:${d}T000000Z`, `DTSTART;TZID=Asia/Tehran:${d}T${pad(h)}${pad(m)}00`, `DTEND;TZID=Asia/Tehran:${d}T${endH}${end.slice(2)}00`, `SUMMARY:${r.type} — ${r.title}`, `DESCRIPTION:${r.tags} (${r.status})`, 'END:VEVENT'].join('\r\n');
    });
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Ali Motion Studio//FA', 'CALSCALE:GREGORIAN', ...ev, 'END:VCALENDAR'].join('\r\n');
};

export const CoursePanel: React.FC<{onMake: (tid: string, props: Record<string, any>) => void; flash: (m: string) => void}> = ({onMake, flash}) => {
  const [course, setCourse] = useState<Course | null>(() => {
    try {
      return JSON.parse(localStorage.getItem(LS) || 'null');
    } catch {
      return null;
    }
  });
  const [tab, setTab] = useState<'lessons' | 'calendar' | 'cur' | 'fri'>('lessons');
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    if (course) return;
    fetch(new URL('course/pianova.json', document.baseURI).href)
      .then((r) => (r.ok ? r.json() : null))
      .then((c) => c && setCourse(c))
      .catch(() => undefined);
  }, [course]);

  const save = (c: Course) => {
    setCourse(c);
    try {
      // blob: image URLs do not survive a reload; keep only the text data
      const lite = {...c, images: {}, lessons: c.lessons.map((l) => ({...l, image: l.image?.startsWith('blob:') ? undefined : l.image}))};
      localStorage.setItem(LS, JSON.stringify(lite));
    } catch {
      /* quota */
    }
  };
  const onZip = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setBusy(true);
    try {
      const c = await readCourseZip(f);
      save(c);
      flash(`دوره وارد شد: ${fa(c.lessons.length)} جلسه، ${fa(c.curiosity.length + c.friday.length)} پست، ${fa(c.calendar.length)} روز تقویم`);
    } catch (err: any) {
      flash(err?.message || 'فایل زیپ خوانده نشد');
    } finally {
      setBusy(false);
      e.target.value = '';
    }
  };
  const reset = () => {
    localStorage.removeItem(LS);
    setCourse(null);
  };
  const copy = (t: string) => navigator.clipboard?.writeText(t).then(() => flash('کپی شد'));

  const stats = useMemo(() => {
    if (!course) return null;
    const types: Record<string, number> = {};
    course.calendar.forEach((r) => (types[r.type] = (types[r.type] || 0) + 1));
    return types;
  }, [course]);

  const make = (tid: string, base: any, format = '16:9') => onMake(tid, {...base, brand: 'pianova', theme: '', format, captions: true, voice: 'farid', voicePack: null});

  return (
    <div className="course">
      <div className="courseHead">
        <div>
          <h2>{course ? `دورهٔ «${course.title}»` : 'دوره و تقویم'}</h2>
          <p className="muted">فایل زیپ دوره را بدهید؛ جلسه‌ها، متن نریشن، کوییزها، پست‌ها و تقویم انتشار خودکار استخراج و اینجا بارگذاری می‌شوند. همه‌چیز داخل مرورگر خودتان خوانده می‌شود.</p>
        </div>
        <div className="row wrap">
          <label className="primary file">{busy ? 'در حال خواندن…' : 'ورود فایل زیپ دوره'}<input type="file" accept=".zip,application/zip" onChange={onZip} disabled={busy} /></label>
          {course ? <button className="ghost" onClick={() => download('pianova_calendar.ics', ics(course), 'text/calendar')}>خروجی تقویم (ICS)</button> : null}
          {course ? <button className="ghost" onClick={reset}>بازگشت به دورهٔ نمونه</button> : null}
        </div>
      </div>
      {!course ? (
        <p className="muted">در حال بارگذاری دورهٔ نمونه…</p>
      ) : (
        <>
          <div className="row wrap stats">
            <span className="pill">{fa(course.lessons.length)} جلسه</span>
            <span className="pill">{fa(course.curiosity.length)} پست کنجکاوی</span>
            <span className="pill">{fa(course.friday.length)} پست جمعه</span>
            <span className="pill">{fa(course.calendar.length)} روز در تقویم</span>
            {stats ? Object.entries(stats).map(([k, v]) => <span key={k} className={`chip ${TYPE_CLASS[k] || ''}`}>{k}: {fa(v)}</span>) : null}
          </div>
          <div className="tabs">
            <button className={tab === 'lessons' ? 'on' : ''} onClick={() => setTab('lessons')}>جلسه‌ها و ویدیوها</button>
            <button className={tab === 'calendar' ? 'on' : ''} onClick={() => setTab('calendar')}>تقویم انتشار</button>
            <button className={tab === 'cur' ? 'on' : ''} onClick={() => setTab('cur')}>پست‌های کنجکاوی</button>
            <button className={tab === 'fri' ? 'on' : ''} onClick={() => setTab('fri')}>پست‌های جمعه</button>
          </div>

          {tab === 'lessons' && (
            <div className="cards">
              {course.lessons.map((l) => (
                <article key={l.id} className="lcard">
                  {l.image ? <img src={resolve(l.image)} alt={l.title} loading="lazy" /> : <div className="noimg">{fa(l.num)}</div>}
                  <div className="body">
                    <small className="muted">جلسهٔ {fa(l.num)} · {l.weekday} {l.dateFa} · {fa(l.time)}</small>
                    <b>{l.title}</b>
                    <small>{l.goal}</small>
                    <div className="row wrap">
                      <button className="primary sm" onClick={() => make('LessonPro', lessonToScript(l, course))}>ساخت ویدیوی آموزشی</button>
                      <button className="ghost sm" onClick={() => make('LessonPro', {...lessonToScript(l, course), variant: 'tip'}, '9:16')}>نسخهٔ عمودی</button>
                      <button className="ghost sm" onClick={() => setOpen(open === l.id ? null : l.id)}>{open === l.id ? 'بستن' : 'جزئیات'}</button>
                    </div>
                    {open === l.id && (
                      <div className="detail">
                        <div className="row between"><b>کپشن تلگرام</b><button className="ghost sm" onClick={() => copy(l.caption)}>کپی</button></div>
                        <pre>{l.caption}</pre>
                        <b>نریشن ({fa(l.narration.length)} بخش)</b>
                        {l.narration.map((s, i) => <p key={i}><small className="muted">[{fa(Math.floor(s.from / 60))}:{fa(String(s.from % 60).padStart(2, '0'))}]</small> {s.text}</p>)}
                        <div className="row wrap">
                          <button className="ghost sm" onClick={() => download(`${l.id}_narration.md`, `# ${l.title}\n\n${l.narration.map((s) => `[${s.from}s–${s.to}s]\n${s.text}`).join('\n\n')}\n\n## TTS\n\n${l.ttsPrompt}`)}>دانلود نریشن</button>
                        </div>
                        {l.quiz ? (
                          <>
                            <b>کوییز</b>
                            <p>{l.quiz.question}</p>
                            <ol>{l.quiz.options.map((o, i) => <li key={i} className={i === l.quiz!.answer ? 'ok' : ''}>{o}</li>)}</ol>
                          </>
                        ) : null}
                        <b>تمرین</b>
                        <p>{l.exercise}</p>
                      </div>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}

          {tab === 'calendar' && (
            <div className="tbl">
              <table>
                <thead><tr><th>روز</th><th>تاریخ</th><th>ساعت</th><th>نوع</th><th>عنوان</th><th>وضعیت</th><th /></tr></thead>
                <tbody>
                  {course.calendar.map((r, i) => {
                    const l = r.ref?.startsWith('L') ? course.lessons.find((x) => x.id === r.ref) : undefined;
                    const c = r.ref?.startsWith('C') ? course.curiosity.find((x) => x.id === r.ref) : undefined;
                    return (
                      <tr key={i} className={TYPE_CLASS[r.type] || 'rest'}>
                        <td>{fa(r.day)} · {r.weekday}</td>
                        <td>{fa(r.dateFa)}</td>
                        <td>{fa(r.time)}</td>
                        <td><span className={`chip ${TYPE_CLASS[r.type] || ''}`}>{r.type}</span></td>
                        <td>{r.title}</td>
                        <td>{r.status}</td>
                        <td>
                          {l ? <button className="ghost sm" onClick={() => make('LessonPro', lessonToScript(l, course))}>ساخت ویدیو</button> : null}
                          {c ? <button className="ghost sm" onClick={() => make('TipShort', curiosityToScript(c, course), '9:16')}>شورتس</button> : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {tab === 'cur' && (
            <div className="cards">
              {course.curiosity.map((c) => (
                <article key={c.id} className="lcard">
                  {c.image ? <img src={resolve(c.image)} alt={c.hook} loading="lazy" /> : null}
                  <div className="body">
                    <small className="muted">{c.id} · {fa(c.when)}</small>
                    <b>{c.hook}</b>
                    <small>{c.fact.slice(0, 140)}…</small>
                    <div className="row wrap">
                      <button className="primary sm" onClick={() => make('TipShort', curiosityToScript(c, course), '9:16')}>ساخت Shorts</button>
                      <button className="ghost sm" onClick={() => copy(c.caption)}>کپی کپشن</button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}

          {tab === 'fri' && (
            <div className="cards">
              {course.friday.map((c) => (
                <article key={c.id} className="lcard">
                  {c.image ? <img src={resolve(c.image)} alt={c.format} loading="lazy" /> : null}
                  <div className="body">
                    <small className="muted">{c.id} · {fa(c.when)}</small>
                    <b>{c.format}</b>
                    <pre>{c.caption.slice(0, 400)}</pre>
                    <button className="ghost sm" onClick={() => copy(c.caption)}>کپی کپشن</button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};
