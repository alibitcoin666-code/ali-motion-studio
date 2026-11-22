import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {Player, PlayerRef} from '@remotion/player';
import {TEMPLATES, getTemplate, compositionMeta, Field} from '../v3/registry';
import {BRANDS, BrandId, Format, THEMES, ThemeId, getTheme} from '../v3/theme';
import {ensureFonts} from '../v3/fonts';
import {NarrationPanel} from './NarrationPanel';
import {ScenesEditor} from './ScenesEditor';
import {CoursePanel} from './CoursePanel';
import {Markdown} from './Docs';
import guideMd from '../../docs/GUIDE_SIMPLE.md?raw';
import growthMd from '../../docs/YOUTUBE_GROWTH.md?raw';

const API = (import.meta as any).env?.VITE_API_BASE ?? '';
const LS_KEY = 'ams.projects.v3';
const LS_LAST = 'ams.last.v3';

type Project = {id: string; name: string; template: string; props: Record<string, any>; savedAt: number};
type Job = {id: string; status: string; url?: string; error?: string; createdAt?: number; position?: number};

const FORMATS: {v: Format; l: string; hint: string}[] = [
  {v: '16:9', l: 'افقی ۱۶:۹', hint: 'ویدیوی یوتیوب ۱۰۸۰p'},
  {v: '9:16', l: 'عمودی ۹:۱۶', hint: 'Shorts / ریلز'},
  {v: '1:1', l: 'مربع ۱:۱', hint: 'پست اینستاگرام'},
];

const QUALITIES = [
  {v: 'high', l: 'بالا (پیشنهادی یوتیوب)', bps: 8_000_000},
  {v: 'very-high', l: 'خیلی بالا (حجم بیشتر)', bps: 12_000_000},
  {v: 'medium', l: 'متوسط (سبک و سریع)', bps: 5_000_000},
];

const RESOLUTIONS = [
  {v: 1, l: '۱۰۸۰p (Full HD)'},
  {v: 4 / 3, l: '۱۴۴۰p (2K) — کیفیت بهتر در یوتیوب'},
  {v: 2, l: '۲۱۶۰p (4K) — حجم و زمان بیشتر'},
];

const fa = (n: number | string) => String(n).replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[+d]);
const fmtSize = (b: number) => (b > 1e6 ? `${fa((b / 1e6).toFixed(1))} مگابایت` : `${fa(Math.round(b / 1e3))} کیلوبایت`);
const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x));

function loadProjects(): Project[] {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]'); } catch { return []; }
}

export const App: React.FC = () => {
  const last = useMemo(() => { try { return JSON.parse(localStorage.getItem(LS_LAST) || 'null'); } catch { return null; } }, []);
  const valid = last && TEMPLATES.some((t) => t.id === last.template);
  const [tplId, setTplId] = useState<string>(valid ? last.template : 'LessonPro');
  const [props, setProps] = useState<Record<string, any>>(() => (valid ? last.props : clone(getTemplate('LessonPro').defaultProps)));
  const [tab, setTab] = useState<'content' | 'narration' | 'style' | 'export'>('content');
  const [view, setView] = useState<'studio' | 'course' | 'guide' | 'growth'>(() => (location.hash.replace('#', '') as any) || 'studio');
  const [scale, setScale] = useState(1);
  const [projects, setProjects] = useState<Project[]>(loadProjects);
  const [toast, setToast] = useState<string | null>(null);
  const [render, setRender] = useState<{state: 'idle' | 'running' | 'done' | 'error'; progress: number; url?: string; size?: number; msg?: string; ms?: number}>({state: 'idle', progress: 0});
  const [quality, setQuality] = useState('high');
  const [jobs, setJobs] = useState<Job[]>(() => { try { return JSON.parse(localStorage.getItem('ams.jobs.v1') || '[]'); } catch { return []; } });
  const abortRef = useRef<AbortController | null>(null);
  const playerRef = useRef<PlayerRef>(null);

  const tpl = getTemplate(tplId);
  const meta = compositionMeta(tplId, props);

  useEffect(() => { ensureFonts(); }, []);
  useEffect(() => {
    const t = setTimeout(() => {
      const clean = {...props};
      localStorage.setItem(LS_LAST, JSON.stringify({template: tplId, props: clean}));
    }, 400);
    return () => clearTimeout(t);
  }, [props, tplId]);
  useEffect(() => { localStorage.setItem('ams.jobs.v1', JSON.stringify(jobs.slice(0, 20))); }, [jobs]);

  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(null), 2600); };
  const set = (k: string, v: any) => setProps((p) => ({...p, [k]: v}));

  const pickTemplate = (id: string) => {
    const t = getTemplate(id);
    const keep = {brand: props.brand, voice: props.voice};
    setTplId(id);
    setProps({...clone(t.defaultProps), ...Object.fromEntries(Object.entries(keep).filter(([, v]) => v !== undefined && v !== ''))});
    setRender({state: 'idle', progress: 0});
  };

  /* ---------------- files (audio / cover) */
  const go = (v: typeof view) => { setView(v); history.replaceState(null, '', `#${v}`); window.scrollTo(0, 0); };
  const makeFromCourse = (id: string, p: Record<string, any>) => {
    const t = getTemplate(id);
    setTplId(id);
    setProps({...clone(t.defaultProps), ...p});
    setRender({state: 'idle', progress: 0});
    setTab('content');
    go('studio');
    flash('ویدیو از روی جلسه ساخته شد؛ نریشن هر صحنه در تب «صدا و نریشن» است');
  };

  /* ---------------- projects */
  const saveProject = () => {
    const name = prompt('نام پروژه:', `${tpl.nameFa} — ${new Date().toLocaleDateString('fa-IR')}`);
    if (!name) return;
    const clean = {...props};
    const p: Project = {id: Math.random().toString(36).slice(2, 10), name, template: tplId, props: clean, savedAt: Date.now()};
    const next = [p, ...projects].slice(0, 50);
    setProjects(next);
    localStorage.setItem(LS_KEY, JSON.stringify(next));
    flash('پروژه ذخیره شد');
  };
  const openProject = (p: Project) => { setTplId(p.template); setProps(clone(p.props)); setTab('content'); flash(`«${p.name}» باز شد`); };
  const delProject = (id: string) => { const next = projects.filter((p) => p.id !== id); setProjects(next); localStorage.setItem(LS_KEY, JSON.stringify(next)); };
  const exportJSON = () => {
    const blob = new Blob([JSON.stringify({template: tplId, props}, null, 2)], {type: 'application/json'});
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${tplId}.json`; a.click();
  };
  const importJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    f.text().then((t) => { const j = JSON.parse(t); if (j.template && j.props) { setTplId(j.template); setProps(j.props); flash('فایل پروژه وارد شد'); } }).catch(() => flash('فایل نامعتبر است'));
  };

  /* ---------------- render in browser */
  const fileName = `${tplId}_${props.brand}_${String(props.format).replace(':', 'x')}_${new Date().toISOString().slice(0, 10)}.mp4`;
  const renderInBrowser = async () => {
    setRender({state: 'running', progress: 0});
    playerRef.current?.pause();
    const ac = new AbortController();
    abortRef.current = ac;
    const t0 = performance.now();
    try {
      await ensureFonts();
      const {renderMediaOnWeb, canRenderMediaOnWeb} = await import('@remotion/web-renderer');
      const q = QUALITIES.find((x) => x.v === quality)!;
      try {
        const can = await (canRenderMediaOnWeb as any)({width: meta.width, height: meta.height, container: 'mp4', videoCodec: 'h264'});
        if (can && can.canRender === false) {
          throw new Error((can.issues || []).map((i: any) => i.message).join(' / ') || 'این مرورگر از رندر MP4 پشتیبانی نمی‌کند؛ از Chrome یا Edge جدید استفاده کنید یا «رندر ابری» را بزنید.');
        }
      } catch (e: any) { if (e?.message && !String(e.message).includes('is not a function')) throw e; }
      const res = await renderMediaOnWeb({
        composition: {id: tplId, component: tpl.component as any, ...meta},
        inputProps: props,
        container: 'mp4',
        videoCodec: 'h264',
        audioCodec: 'aac',
        videoBitrate: q.bps,
        audioBitrate: 192_000,
        keyframeIntervalInSeconds: 2,
        signal: ac.signal,
        licenseKey: 'free-license',
        isProduction: true,
        delayRenderTimeoutInMilliseconds: 60_000,
        onProgress: (p) => setRender((r) => ({...r, progress: p.progress})),
      } as any);
      const blob = await res.getBlob();
      setRender({state: 'done', progress: 1, url: URL.createObjectURL(blob), size: blob.size, ms: performance.now() - t0});
    } catch (e: any) {
      if (ac.signal.aborted) setRender({state: 'idle', progress: 0});
      else setRender({state: 'error', progress: 0, msg: e?.message || String(e)});
    }
  };

  /* ---------------- cloud render (GitHub Actions queue via Worker) */
  const cloudRender = async () => {
    try {
      const p = clone(props);
      // local sample clips (voice/…) are not reachable from the cloud runner as URLs: it re-creates missing ones
      if (p.voicePack) p.voicePack = {voice: p.voicePack.voice, clips: Object.fromEntries(Object.entries(p.voicePack.clips || {}).filter(([, c]: any) => /^https:/.test(c.src)))};
      const r = await fetch(`${API}/api/jobs`, {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({template: tplId, props: p, title: fileName, voice: p.voice ?? 'farid', scale})});
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'خطا در ثبت درخواست');
      setJobs((js) => [{id: j.id, status: 'queued', createdAt: Date.now()}, ...js]);
      flash('در صف رندر ابری ثبت شد (حدود ۵ تا ۱۵ دقیقه)');
    } catch (e: any) { flash(e.message || 'خطا'); }
  };
  const refreshJobs = useCallback(async () => {
    const pending = jobs.filter((j) => j.status !== 'done' && j.status !== 'error');
    if (!pending.length) return;
    const upd = await Promise.all(pending.map((j) => fetch(`${API}/api/jobs/${j.id}`).then((r) => (r.ok ? r.json() : null)).catch(() => null)));
    setJobs((js) => js.map((j) => { const u = upd.find((x) => x && x.id === j.id); return u ? {...j, ...u} : j; }));
  }, [jobs]);
  useEffect(() => { const t = setInterval(refreshJobs, 20_000); return () => clearInterval(t); }, [refreshJobs]);

  const theme = getTheme(props.theme, props.brand);
  const accent = theme.accent;
  const seconds = meta.durationInFrames / meta.fps;
  const estSize = (QUALITIES.find((x) => x.v === quality)!.bps + 192_000) * seconds / 8;

  return (
    <div className="app" style={{['--accent' as any]: accent}}>
      <header className="top">
        <div className="logo">
          <span className="dot" />
          <div>
            <b>استودیو موشن علی</b>
            <small>Ali Motion Studio · ساخت موشن‌گرافیک فارسی برای یوتیوب</small>
          </div>
        </div>
        <nav className="nav">
          {([['studio', 'استودیو'], ['course', 'دوره و تقویم'], ['guide', 'راهنمای ساده'], ['growth', 'رشد کانال']] as const).map(([v, l]) => (
            <button key={v} className={view === v ? 'on' : ''} onClick={() => go(v)}>{l}</button>
          ))}
        </nav>
        <div className="brands" role="tablist" aria-label="برند" style={{display: view === 'studio' ? undefined : 'none'}}>
          {(Object.keys(BRANDS) as BrandId[]).map((id) => (
            <button key={id} className={props.brand === id ? 'on' : ''} onClick={() => setProps((p) => ({...p, brand: id, theme: tpl.fields.some((f) => f.key === 'theme') ? '' : p.theme}))} style={{['--c' as any]: THEMES[BRANDS[id].defaultTheme].accent}}>
              <i />{BRANDS[id].nameFa}
            </button>
          ))}
        </div>
      </header>

      {view === 'course' && <main className="page"><CoursePanel onMake={makeFromCourse} flash={flash} /></main>}
      {view === 'guide' && <main className="page doc"><Markdown src={guideMd} /></main>}
      {view === 'growth' && <main className="page doc"><Markdown src={growthMd} /></main>}
      <main className="grid" style={{display: view === 'studio' ? undefined : 'none'}}>
        {/* -------- template gallery */}
        <aside className="panel gallery">
          <h3>قالب‌های ثابت</h3>
          {TEMPLATES.map((t) => (
            <button key={t.id} className={`tcard ${t.id === tplId ? 'on' : ''}`} onClick={() => pickTemplate(t.id)}>
              <img className="thumb" src={`thumbs/${t.id}.webp`} alt="" loading="lazy" />
              <span className="cat">{t.category} · {t.defaultFormat === '16:9' ? 'افقی یوتیوب' : 'عمودی Shorts'}</span>
              <b>{t.nameFa}</b>
              <small>{t.descFa}</small>
            </button>
          ))}
          {projects.length > 0 && <h3 style={{marginTop: 18}}>پروژه‌های من</h3>}
          {projects.map((p) => (
            <div key={p.id} className="proj">
              <button onClick={() => openProject(p)}>{p.name}</button>
              <button className="x" title="حذف" onClick={() => delProject(p.id)}>×</button>
            </div>
          ))}
        </aside>

        {/* -------- preview */}
        <section className="stage">
          <div dir="ltr" className={`playerWrap f${String(props.format).replace(':', '')}`}>
            <Player
              key={tplId}
              initialFrame={Math.min(75, meta.durationInFrames - 1)}
              ref={playerRef}
              component={tpl.component as any}
              inputProps={props}
              durationInFrames={meta.durationInFrames}
              fps={meta.fps}
              compositionWidth={meta.width}
              compositionHeight={meta.height}
              controls
              loop
              acknowledgeRemotionLicense
              style={{width: '100%', height: '100%'}}
              clickToPlay
              doubleClickToFullscreen
            />
          </div>
          <div className="metaRow">
            <bdi dir="ltr" className="pill">{fa(meta.width)} × {fa(meta.height)}</bdi>
            <span>{fa(seconds.toFixed(1))} ثانیه</span>
            <span>{fa(meta.fps)} فریم بر ثانیه</span>
            <span className="muted">الهام: {tpl.inspiration}</span>
          </div>
        </section>

        {/* -------- editor */}
        <aside className="panel editor">
          <div className="tabs">
            <button className={tab === 'content' ? 'on' : ''} onClick={() => setTab('content')}>محتوا</button>
            <button className={tab === 'narration' ? 'on' : ''} onClick={() => setTab('narration')}>صدا و نریشن</button>
            <button className={tab === 'style' ? 'on' : ''} onClick={() => setTab('style')}>ظاهر</button>
            <button className={tab === 'export' ? 'on' : ''} onClick={() => setTab('export')}>خروجی</button>
          </div>

          {tab === 'content' && (
            <div className="form">
              {tpl.fields.filter((f) => f.key !== 'theme' && f.key !== 'music').map((f) => <FieldEditor key={f.key} f={f} value={props[f.key]} onChange={(v) => set(f.key, v)} />)}
              <p className="hint">نکته: هر کلمه یا عبارتی را بین دو ستاره بنویسید (مثل <code>*دو ماژور*</code>) تا با رنگ برند برجسته شود. اعداد خودکار فارسی می‌شوند.</p>
            </div>
          )}

          {tab === 'narration' && (
            <>
              <NarrationPanel tid={tplId} props={props} set={set} flash={flash} api={API} />
              {tpl.fields.some((f) => f.key === 'music') && (
                <div className="form">
                  <FieldEditor f={tpl.fields.find((f) => f.key === 'music')!} value={props.music} onChange={(v) => set('music', v)} />
                  <label>بلندی موسیقی بستر: {fa(Math.round((props.musicVolume ?? 0.5) * 100))}٪ (زیر صدای گوینده خودکار کم می‌شود)</label>
                  <input type="range" min={0} max={1} step={0.05} value={props.musicVolume ?? 0.5} onChange={(e) => set('musicVolume', +e.target.value)} />
                </div>
              )}
              <div className="form"><label className="check"><input type="checkbox" checked={props.sfx !== false} onChange={(e) => set('sfx', e.target.checked)} /> افکت‌های صوتی (ووش، پاپ، دینگ) و صدای پیانو</label></div>
            </>
          )}

          {tab === 'style' && (
            <div className="form">
              <label>تم رنگی</label>
              <div className="themes">
                {(Object.keys(THEMES) as ThemeId[]).map((id) => {
                  const th = THEMES[id];
                  const on = theme.id === id;
                  return (
                    <button key={id} className={`theme ${on ? 'on' : ''}`} onClick={() => set('theme', id)} style={{background: `radial-gradient(circle at 70% 20%, ${th.blobs[0]}, ${th.bg} 70%)`, color: th.ink}}>
                      <i style={{background: `linear-gradient(90deg, ${th.accentGrad.join(',')})`}} />
                      <b>{th.nameFa}</b>
                    </button>
                  );
                })}
              </div>
              <label>قطع ویدیو</label>
              <div className="seg">
                {FORMATS.map((x) => <button key={x.v} className={props.format === x.v ? 'on' : ''} onClick={() => set('format', x.v)} title={x.hint}>{x.l}</button>)}
              </div>
              {tpl.scripted && (
                <>
                  <label className="check"><input type="checkbox" checked={props.mascot !== false && BRANDS[props.brand as BrandId]?.mascot !== false} onChange={(e) => set('mascot', e.target.checked)} /> معلم انیمیشنی (لوگوی ALi Piano.IR)</label>
                  <label className="check"><input type="checkbox" checked={props.showProgress !== false} onChange={(e) => set('showProgress', e.target.checked)} /> نوار پیشرفت و نام فصل</label>
                </>
              )}
              <p className="hint">فونت‌ها: تیتر «استعداد»، متن «وزیرمتن»، قلاب «لاله‌زار»، شعار «میرزا»، لاتین «Outfit» و نت‌ها «Bravura». اعداد خودکار فارسی می‌شوند.</p>
            </div>
          )}

          {tab === 'export' && (
            <div className="form">
              <label>کیفیت خروجی</label>
              <select value={quality} onChange={(e) => setQuality(e.target.value)}>
                {QUALITIES.map((q) => <option key={q.v} value={q.v}>{q.l}</option>)}
              </select>
              <p className="hint">MP4 · H.264 · AAC · {fa(meta.width)}×{fa(meta.height)} · {fa(meta.fps)}fps — حجم تقریبی {fmtSize(estSize)} (مطابق توصیه یوتیوب برای SDR 1080p)</p>

              <button className="primary" disabled={render.state === 'running'} onClick={renderInBrowser}>
                {render.state === 'running' ? `در حال رندر… ${fa(Math.round(render.progress * 100))}٪` : 'رندر در مرورگر (سریع، روی همین دستگاه)'}
              </button>
              {render.state === 'running' && (
                <>
                  <div className="bar"><i style={{width: `${render.progress * 100}%`}} /></div>
                  <button className="ghost" onClick={() => abortRef.current?.abort()}>لغو</button>
                </>
              )}
              {render.state === 'done' && render.url && (
                <div className="done">
                  <a className="primary" href={render.url} download={fileName}>دانلود MP4 ({fmtSize(render.size || 0)})</a>
                  <small>زمان رندر: {fa(Math.round((render.ms || 0) / 1000))} ثانیه</small>
                </div>
              )}
              {render.state === 'error' && <p className="err">خطا: {render.msg}<br />اگر مرورگر یا سیستم ضعیف است، از «رندر ابری» استفاده کنید.</p>}

              <hr />
              <label>وضوح رندر ابری</label>
              <select value={scale} onChange={(e) => setScale(+e.target.value)}>
                {RESOLUTIONS.map((r) => <option key={r.v} value={r.v}>{r.l}</option>)}
              </select>
              <p className="hint">رندر ابری صدای گوینده ({props.voice === 'none' ? 'خاموش' : props.voice === 'dilara' ? 'دلارا' : 'فرید'}) را می‌سازد، صحنه‌ها و زیرنویس را با آن هم‌زمان می‌کند، صدا را روی −۱۴ LUFS (استاندارد یوتیوب) تنظیم می‌کند و فایل‌های MP3، SRT و فصل‌ها را هم کنار ویدیو می‌گذارد.</p>
              <button className="secondary" onClick={cloudRender}>رندر ابری رایگان (بدون فشار به سیستم)</button>
              <p className="hint">ویدیو روی سرورهای GitHub با Chrome و FFmpeg رندر می‌شود (CRF ۱۸، کیفیت استودیویی). معمولاً ۵ تا ۱۵ دقیقه طول می‌کشد؛ می‌توانید صفحه را ببندید و بعداً برگردید.</p>
              {jobs.length > 0 && (
                <div className="jobs">
                  <div className="row between"><b>صف رندر ابری</b><button className="ghost sm" onClick={refreshJobs}>به‌روزرسانی</button></div>
                  {jobs.map((j) => (
                    <div key={j.id} className={`job ${j.status}`}>
                      <span>#{j.id.slice(0, 6)}</span>
                      <span>{({queued: 'در صف', rendering: 'در حال رندر', done: 'آماده', error: 'خطا'} as any)[j.status] ?? j.status}{j.position ? ` (نفر ${fa(j.position)})` : ''}</span>
                      {j.url ? <span className="row">
                        <a href={j.url} target="_blank" rel="noreferrer">ویدیو</a>
                        {(j as any).files?.mp3 && <a href={(j as any).files.mp3} target="_blank" rel="noreferrer">صدا</a>}
                        {(j as any).files?.srt && <a href={(j as any).files.srt} target="_blank" rel="noreferrer">زیرنویس</a>}
                        {(j as any).files?.chapters && <a href={(j as any).files.chapters} target="_blank" rel="noreferrer">فصل‌ها</a>}
                      </span> : j.error ? <small title={j.error}>جزئیات</small> : <span className="spin" />}
                    </div>
                  ))}
                  <button className="ghost sm" onClick={() => setJobs((js) => js.filter((j) => j.status !== 'done' && j.status !== 'error'))}>پاک‌کردن تمام‌شده‌ها</button>
                </div>
              )}

              <hr />
              <div className="row wrap">
                <button className="ghost" onClick={saveProject}>ذخیره پروژه</button>
                <button className="ghost" onClick={exportJSON}>خروجی JSON</button>
                <label className="ghost file">ورود JSON<input type="file" accept="application/json" onChange={importJSON} /></label>
                <button className="ghost" onClick={() => { setProps(clone(tpl.defaultProps)); flash('قالب به حالت اولیه برگشت'); }}>بازنشانی قالب</button>
              </div>
            </div>
          )}
        </aside>
      </main>

      <footer>
        متن‌باز (MIT) · <a href="https://github.com/alibitcoin666-code/ali-motion-studio" target="_blank" rel="noreferrer">کد در گیت‌هاب</a> · خروجی‌ها فقط دانلود می‌شوند و هیچ‌چیز به‌صورت خودکار منتشر نمی‌شود. کانال <bdi>@Alibaghbani1hand</bdi> تا تکمیل OAC در حالت توقف است.
        <span> · ساخته‌شده با Remotion (لایسنس رایگان فردی)، فونت‌های وزیرمتن، استعداد، لاله‌زار و میرزا و نمونه‌های پیانوی Salamander (CC-BY)</span>
      </footer>
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
};

/* ================================================================= field editor */
const FieldEditor: React.FC<{f: Field; value: any; onChange: (v: any) => void}> = ({f, value, onChange}) => {
  if (f.type === 'scenes') return <ScenesEditor value={value || []} onChange={onChange} label={f.label} />;
  if (f.type === 'check') return <label className="check"><input type="checkbox" checked={value !== false} onChange={(e) => onChange(e.target.checked)} /> {f.label}</label>;
  return (
    <div className="field">
      <label>{f.label}</label>
      {f.type === 'textarea' ? (
        <textarea rows={3} value={value ?? ''} onChange={(e) => onChange(e.target.value)} />
      ) : f.type === 'number' ? (
        <input type="number" min={f.min} max={f.max} step={f.step ?? 1} value={value ?? ''} onChange={(e) => onChange(e.target.value === '' ? '' : +e.target.value)} />
      ) : f.type === 'select' ? (
        <select value={value ?? ''} onChange={(e) => onChange(e.target.value)}>{f.options!.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
      ) : (
        <input value={value ?? ''} onChange={(e) => onChange(e.target.value)} />
      )}
      {f.help && <small className="hint">{f.help}</small>}
    </div>
  );
};
