#!/usr/bin/env node
/**
 * ams — Ali Motion Studio command line (built for AI agents such as Meta Muse, and for humans).
 *
 *   ams doctor                         check node / ffmpeg / python+edge-tts / browser / network / disk
 *   ams templates                      list templates (id, format, narrated?)
 *   ams sample <Template> [file.json]  write the template's sample props → edit this file
 *   ams course <n> [--short] [file]    course lesson n (public/course/pianova.json) → props file
 *   ams still <Template> [props] [--frame N] [--out f.png]   quick look (≈1 min)
 *   ams render <Template> [props] [--draft|--hq] [--out f.mp4]   render on this machine (voice, master, SRT, narration prompt)
 *   ams narration <Template> [props] [--out base]     narration prompt pack only (.narration.md/.json, no render)
 *   ams cloud <Template> [props] [--title t] [--no-wait]     free cloud render (GitHub Actions), download result
 *   ams status <jobId>                 cloud job status
 *   ams qa <file.mp4>                  YouTube spec check + loudness + black frames + contact sheet
 *
 * Every command prints a final JSON line (`{"ok":true,...}`) so an agent can parse the result.
 */
import {spawnSync, execFileSync} from 'node:child_process';
import esbuild from 'esbuild';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const API = (process.env.AMS_API || 'https://ali-motion-studio.ali-bitcoin666.workers.dev').replace(/\/$/, '');
const FFMPEG = process.env.FFMPEG || 'ffmpeg';
const FFPROBE = process.env.FFPROBE || 'ffprobe';
const PY = process.env.PYTHON || 'python3';
const OUT = path.join(root, 'out');
const [cmd, ...rest] = process.argv.slice(2);

const flag = (name) => { const i = rest.indexOf(name); if (i < 0) return undefined; const v = rest[i + 1]; rest.splice(i, v && !v.startsWith('--') ? 2 : 1); return v && !v.startsWith('--') ? v : true; };
const done = (o) => { console.log(JSON.stringify({ok: true, ...o})); process.exit(0); };
const fail = (msg, o = {}) => { console.log(JSON.stringify({ok: false, error: msg, ...o})); process.exit(1); };
const run = (c, a, o = {}) => spawnSync(c, a, {encoding: 'utf8', maxBuffer: 256 << 20, ...o});
const has = (c, a = ['-version']) => { try { return run(c, a).status === 0; } catch { return false; } };

let V3;
async function v3() {
  if (V3) return V3;
  const f = path.join(os.tmpdir(), `ams-cli-${process.pid}.mjs`);
  esbuild.buildSync({entryPoints: [path.join(root, 'src/v3/node-entry.ts')], bundle: true, platform: 'node', format: 'esm', outfile: f, jsx: 'automatic', loader: {'.png': 'file', '.woff2': 'file'}, logLevel: 'error'});
  V3 = await import(pathToFileURL(f).href);
  return V3;
}
async function tpl(id) {
  const m = await v3();
  const t = m.TEMPLATES.find((x) => x.id === id);
  if (!t) fail(`unknown template "${id}"`, {templates: m.TEMPLATES.map((x) => x.id)});
  return t;
}
const readProps = (f) => (f ? JSON.parse(fs.readFileSync(f, 'utf8')) : {});

/* ------------------------------------------------------------------ doctor */
async function doctor() {
  const r = {};
  r.node = process.versions.node; r.nodeOk = +r.node.split('.')[0] >= 20;
  r.cpus = os.cpus().length; r.ramGB = +(os.totalmem() / 2 ** 30).toFixed(1); r.freeRamGB = +(os.freemem() / 2 ** 30).toFixed(1);
  try { const df = run('df', ['-Pk', root]).stdout.trim().split('\n').pop().split(/\s+/); r.freeDiskGB = +(+df[3] / 2 ** 20).toFixed(1); } catch {}
  r.ffmpeg = has(FFMPEG); r.ffprobe = has(FFPROBE);
  if (r.ffmpeg) { const f = run(FFMPEG, ['-hide_banner', '-filters']).stdout; r.ffmpegFullChain = ['acompressor', 'equalizer', 'highpass', 'silenceremove', 'loudnorm'].every((x) => f.includes(' ' + x + ' ')); }
  r.python = has(PY, ['--version']); r.edgeTts = r.python && run(PY, ['-c', 'import edge_tts']).status === 0;
  r.deps = fs.existsSync(path.join(root, 'node_modules/@remotion/renderer'));
  const pw = path.join(os.homedir(), '.cache/ms-playwright');
  r.browser = process.env.AMS_BROWSER || (fs.existsSync(path.join(root, 'node_modules/.remotion/chrome-headless-shell')) ? 'remotion-chrome-headless-shell' : (fs.existsSync(pw) && fs.readdirSync(pw).find((d) => d.startsWith('chromium_headless_shell'))) || 'will-download-on-first-render');
  for (const [k, u] of [['cloudApi', API + '/api/health'], ['github', 'https://api.github.com'], ['npm', 'https://registry.npmjs.org/remotion']]) {
    try { const res = await fetch(u, {signal: AbortSignal.timeout(8000)}); r[k] = res.ok; } catch { r[k] = false; }
  }
  r.localRenderReady = r.nodeOk && r.deps && r.ffmpeg && r.ffprobe;
  r.voiceReady = r.edgeTts && r.ffmpeg;
  r.cloudReady = !!r.cloudApi;
  r.tips = [];
  if (!r.ffmpegFullChain && r.ffmpeg) r.tips.push('ffmpeg lacks the full voice-chain filters → run muse/install.sh (static ffmpeg) for the best voice sound');
  if (r.cpus <= 2) r.tips.push('2 vCPU machine: use `ams cloud` for long lessons, `ams render --draft` for quick local previews');
  if (r.freeRamGB < 2) r.tips.push('low free RAM: set AMS_CONCURRENCY=1');
  done({doctor: r});
}

/* ------------------------------------------------------------------ templates / sample / course */
async function templates() {
  const m = await v3();
  done({templates: m.TEMPLATES.map((t) => ({id: t.id, nameFa: t.nameFa, format: t.defaultFormat, narrated: !!t.scripted, fields: t.fields.map((f) => f.key)}))});
}
async function sample() {
  const [id, file] = rest; const t = await tpl(id);
  const f = path.resolve(file || path.join(OUT, `${id}.props.json`));
  fs.mkdirSync(path.dirname(f), {recursive: true});
  fs.writeFileSync(f, JSON.stringify(t.defaultProps, null, 2));
  done({props: f, hint: 'edit scenes[].say (narration) and on-screen fields, then: ams render|cloud ' + id + ' ' + f});
}
async function course() {
  const short = !!flag('--short');
  const [n, file] = rest; const m = await v3();
  const c = JSON.parse(fs.readFileSync(path.join(root, 'public/course/pianova.json'), 'utf8'));
  const l = c.lessons.find((x) => String(x.num) === String(n) || x.id === n) || c.lessons[(+n || 1) - 1];
  if (!l) fail('lesson not found', {count: c.lessons.length});
  const id = 'LessonPro'; const t = await tpl(id);
  const s = m.lessonToScript(l, c);
  const props = {...t.defaultProps, ...s, brand: 'pianova', voicePack: null, ...(short ? {variant: 'tip', format: '9:16'} : {})};
  const f = path.resolve(file || path.join(OUT, `lesson${l.num}${short ? '_short' : ''}.props.json`));
  fs.mkdirSync(path.dirname(f), {recursive: true});
  fs.writeFileSync(f, JSON.stringify(props, null, 2));
  done({template: id, props: f, lesson: {num: l.num, title: l.title}, scenes: props.scenes.length});
}

/* ------------------------------------------------------------------ still / render */
async function still() {
  const frame = flag('--frame') ?? 60; const out = flag('--out');
  const [id, propsFile] = rest; const t = await tpl(id);
  const props = {...t.defaultProps, ...readProps(propsFile)};
  const pf = path.join(os.tmpdir(), `ams-still-${Date.now()}.json`); fs.writeFileSync(pf, JSON.stringify(props));
  const o = path.resolve(out || path.join(OUT, `${id}_f${frame}.png`));
  const a = ['remotion', 'still', 'remotion/index.ts', id, o, `--props=${pf}`, `--frame=${frame}`, '--log=error'];
  if (process.env.AMS_BROWSER) a.push(`--browser-executable=${process.env.AMS_BROWSER}`);
  const r = run('npx', a, {cwd: root, stdio: ['ignore', 'inherit', 'inherit']});
  if (r.status !== 0 || !fs.existsSync(o)) fail('still failed');
  done({still: o});
}
async function render() {
  const draft = !!flag('--draft'); const hq = !!flag('--hq'); const out = flag('--out');
  const [id, propsFile] = rest; await tpl(id);
  const o = path.resolve(out || path.join(OUT, `${id}${draft ? '_draft' : ''}.mp4`));
  const a = [path.join(root, 'scripts/render-job.mjs'), '--local', id]; if (propsFile) a.push(path.resolve(propsFile)); else a.push('');
  a.push(o);
  const t0 = Date.now();
  const r = run(process.execPath, a, {cwd: root, stdio: ['ignore', 'inherit', 'inherit'], env: {...process.env, ...(draft ? {AMS_DRAFT: '1'} : {}), ...(hq ? {AMS_HQ: '1'} : {})}});
  if (r.status !== 0 || !fs.existsSync(o)) fail('render failed');
  const side = ['srt', 'chapters.txt', 'mp3', 'narration.md', 'narration.json'].map((x) => o.replace(/\.mp4$/, '.' + x)).filter((f) => fs.existsSync(f));
  done({video: o, files: side, seconds: Math.round((Date.now() - t0) / 1000), next: `ams qa ${o}`});
}

async function narration() {
  const out = flag('--out');
  const [id, propsFile] = rest; const t = await tpl(id);
  const props = {...t.defaultProps, ...readProps(propsFile)};
  const {narrationPack} = await import(pathToFileURL(path.join(root, 'scripts/narration.mjs')).href);
  const n = narrationPack(await v3(), id, props);
  const base = path.resolve(out || path.join(OUT, id)).replace(/\.(mp4|md)$/, '');
  fs.mkdirSync(path.dirname(base), {recursive: true});
  fs.writeFileSync(base + '.narration.md', n.md); fs.writeFileSync(base + '.narration.json', JSON.stringify(n.json, null, 1));
  done({narration: base + '.narration.md', json: base + '.narration.json', scenes: n.json.scenes.length, seconds: n.json.durationSec, timing: n.json.timing});
}

/* ------------------------------------------------------------------ cloud */
async function cloud() {
  const title = flag('--title'); const noWait = !!flag('--no-wait');
  const [id, propsFile] = rest; const t = await tpl(id);
  const props = {...t.defaultProps, ...readProps(propsFile)};
  // the cloud makes its own narration; local relative voice files can't be fetched from GitHub
  if (props.voicePack && !Object.values(props.voicePack.clips || {}).every((c) => /^https:/.test(c.src))) props.voicePack = null;
  const res = await fetch(API + '/api/jobs', {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({template: id, props, title: title || `${id}_${Date.now()}.mp4`, voice: props.voice})});
  const j = await res.json().catch(() => ({}));
  if (!res.ok || !j.id) fail('cloud job rejected', {status: res.status, body: j});
  console.error(`queued ${j.id} — the free cloud runner checks the queue every ~5 min; a 100 s lesson takes ≈10–15 min`);
  if (noWait) done({job: j.id, status: 'queued', check: `ams status ${j.id}`});
  const t0 = Date.now();
  for (;;) {
    await new Promise((r) => setTimeout(r, 20000));
    const s = await (await fetch(`${API}/api/jobs/${j.id}`)).json().catch(() => ({}));
    console.error(`${Math.round((Date.now() - t0) / 1000)}s ${s.status}${s.position ? ' #' + s.position : ''}`);
    if (s.status === 'error') fail('cloud render failed', {job: j.id, detail: s.error});
    if (s.status === 'done') {
      fs.mkdirSync(OUT, {recursive: true});
      const files = [];
      for (const u of [s.url, ...Object.values(s.files || {})].filter((x) => typeof x === 'string')) {
        const f = path.join(OUT, path.basename(new URL(u).pathname));
        const b = Buffer.from(await (await fetch(u)).arrayBuffer()); fs.writeFileSync(f, b); files.push(f);
      }
      done({job: j.id, video: files[0], files, url: s.url, next: `ams qa ${files[0]}`});
    }
    if (Date.now() - t0 > 50 * 60e3) fail('timeout waiting for cloud render', {job: j.id});
  }
}
async function status() {
  const s = await (await fetch(`${API}/api/jobs/${rest[0]}`)).json();
  done({status: s});
}

/* ------------------------------------------------------------------ qa */
async function qa() {
  const f = path.resolve(rest[0] || ''); if (!fs.existsSync(f)) fail('file not found');
  const p = JSON.parse(run(FFPROBE, ['-v', 'error', '-print_format', 'json', '-show_format', '-show_streams', f]).stdout);
  const v = p.streams.find((s) => s.codec_type === 'video'); const a = p.streams.find((s) => s.codec_type === 'audio');
  const [n, d] = (v?.r_frame_rate || '0/1').split('/'); const fps = +(n / d).toFixed(2);
  const info = {width: v?.width, height: v?.height, fps, codec: v?.codec_name, pix: v?.pix_fmt, audio: a?.codec_name, seconds: +(+p.format.duration).toFixed(2), MB: +(p.format.size / 2 ** 20).toFixed(1)};
  if (a) {
    const e = run(FFMPEG, ['-hide_banner', '-nostats', '-i', f, '-vn', '-af', 'ebur128=peak=true', '-f', 'null', '-']).stderr;
    const sum = e.slice(e.lastIndexOf('Summary:'));
    info.lufs = +(sum.match(/I:\s+(-?[\d.]+) LUFS/) || [])[1]; info.truePeak = +(sum.match(/Peak:\s+(-?[\d.]+) dBFS/) || [])[1];
  }
  const b = run(FFMPEG, ['-hide_banner', '-nostats', '-i', f, '-vf', 'blackdetect=d=0.5:pic_th=0.98', '-an', '-f', 'null', '-']).stderr;
  info.blackSegments = (b.match(/black_start/g) || []).length;
  const sheet = f.replace(/\.mp4$/, '.sheet.png');
  const every = Math.max(1, info.seconds / 16);
  run(FFMPEG, ['-v', 'error', '-y', '-i', f, '-vf', `fps=1/${every.toFixed(2)},scale=${info.width > info.height ? 480 : 270}:-1,tile=4x4`, '-frames:v', '1', sheet]);
  const problems = [];
  const vertical = info.height > info.width;
  if (!((info.width === 1920 && info.height === 1080) || (info.width === 1080 && info.height === 1920) || (info.width === 1080 && info.height === 1080) || info.width >= 3840 || info.height >= 3840)) problems.push(`unusual size ${info.width}x${info.height} (draft?)`);
  if (info.codec !== 'h264' || info.pix !== 'yuv420p') problems.push('not H.264 yuv420p');
  if (Math.abs(fps - 30) > 0.1 && Math.abs(fps - 60) > 0.1) problems.push(`fps ${fps}`);
  if (info.lufs !== undefined && Math.abs(info.lufs + 14) > 1.5) problems.push(`loudness ${info.lufs} LUFS (target -14)`);
  if (info.truePeak > -0.5) problems.push(`true peak ${info.truePeak} dBFS`);
  if (info.blackSegments) problems.push(`${info.blackSegments} black segment(s)`);
  if (vertical && info.seconds > 180) problems.push('vertical video over 3 min will not be a Short');
  const nar = f.replace(/\.mp4$/, '.narration.md'); info.narration = fs.existsSync(nar) ? nar : null;
  if (!info.narration) problems.push('narration prompt missing → run: ams narration <Template> <props> --out ' + f);
  done({qa: info, sheet: fs.existsSync(sheet) ? sheet : null, youtubeReady: problems.length === 0, problems});
}

const cmds = {doctor, templates, sample, course, still, render, narration, cloud, status, qa};
if (!cmds[cmd]) {
  console.log(fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('*/')[0].replace(/^#!.*\n\/\*\*/, '').replace(/^ \* ?/gm, ''));
  process.exit(cmd ? 1 : 0);
}
cmds[cmd]().catch((e) => fail(String(e?.message || e)));
