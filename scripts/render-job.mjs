#!/usr/bin/env node
/**
 * Ali Motion Studio v3 — server-side renderer (GitHub Actions or any Linux/Mac/Win machine)
 *
 * Audio-first pipeline:
 *   1. missing narration clips → edge-tts (scripts/tts.py, word timings) → served on a local http port
 *   2. voice pack injected into props → scene lengths, captions and the talking mascot follow the real voice
 *   3. Remotion render (H.264 High, CRF 18, AAC 320k, 30 fps)
 *   4. two-pass loudnorm → -14 LUFS / -1 dBTP (YouTube), video stream copied
 *   5. word-accurate .srt + chapters .txt + .mp3 uploaded next to the .mp4
 *
 * Modes:
 *   node scripts/render-job.mjs --queue                                 # Worker queue (API_BASE + QUEUE_SECRET)
 *   node scripts/render-job.mjs --local <Template> [props.json] [out.mp4]
 *   node scripts/render-job.mjs --job '<json>'                          # {"template":"LessonPro","props":{...}}
 *   node scripts/render-job.mjs --samples                               # pre-build voices of the sample scripts → public/voice
 */
import {bundle} from '@remotion/bundler';
import {renderMedia, selectComposition, ensureBrowser} from '@remotion/renderer';
import {execFileSync, spawnSync} from 'node:child_process';
const require_spawn = (cmd, a) => spawnSync(cmd, a, {encoding: 'utf8', maxBuffer: 64 << 20}).stderr || '';
import esbuild from 'esbuild';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const API = (process.env.API_BASE || '').replace(/\/$/, '');
const SECRET = process.env.QUEUE_SECRET || '';
const REPO = process.env.GITHUB_REPOSITORY || '';
const TAG = process.env.RELEASE_TAG || 'renders';
const MAX_JOBS = +(process.env.MAX_JOBS || 4);
const PY = process.env.PYTHON || 'python3';
// Portable tool paths (Muse VM / any Linux box): env overrides, else PATH
const FFMPEG = process.env.FFMPEG || 'ffmpeg';
const FFPROBE = process.env.FFPROBE || 'ffprobe';
// Draft = half resolution + fast encode, for quick previews on a 2-vCPU machine
const DRAFT = process.env.AMS_DRAFT === '1';
const HQ = !DRAFT && process.env.AMS_HQ === '1'; // slower, best text sharpness (VMAF-tested settings)
const CONCURRENCY = +(process.env.AMS_CONCURRENCY || 0) || Math.max(1, Math.min(8, os.cpus().length));
/** Reuse a Chrome Headless Shell already on the machine (Playwright cache) so nothing big has to download. */
function findBrowser() {
  if (process.env.AMS_BROWSER) return process.env.AMS_BROWSER;
  if (fs.existsSync(path.join(root, 'node_modules/.remotion/chrome-headless-shell'))) return null; // Remotion's own, already downloaded
  const base = path.join(os.homedir(), '.cache/ms-playwright');
  try {
    for (const d of fs.readdirSync(base).filter((x) => x.startsWith('chromium_headless_shell')).sort().reverse()) {
      for (const sub of ['chrome-headless-shell-linux64/chrome-headless-shell', 'chrome-linux/headless_shell']) {
        const f = path.join(base, d, sub);
        if (fs.existsSync(f)) return f;
      }
    }
  } catch {}
  return null;
}
const BROWSER = findBrowser();

const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);
const sh = (cmd, a, opts = {}) => execFileSync(cmd, a, {stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8', maxBuffer: 64 << 20, ...opts}).trim();

/* ---------- the same timing code the app uses (src/v3/node-entry.ts, bundled on the fly) */
let V3;
async function v3() {
  if (V3) return V3;
  const out = path.join(os.tmpdir(), `ams-v3-${process.pid}.mjs`);
  esbuild.buildSync({entryPoints: [path.join(root, 'src/v3/node-entry.ts')], bundle: true, platform: 'node', format: 'esm', outfile: out, jsx: 'automatic', loader: {'.png': 'file', '.woff2': 'file'}, logLevel: 'error'});
  V3 = await import(pathToFileURL(out).href);
  return V3;
}

async function api(p, opts = {}) {
  const r = await fetch(API + p, {...opts, headers: {authorization: `Bearer ${SECRET}`, 'content-type': 'application/json', ...(opts.headers || {})}});
  if (!r.ok) throw new Error(`${opts.method || 'GET'} ${p} -> ${r.status} ${await r.text()}`);
  return r.json();
}
const setStatus = (id, body) => api(`/api/jobs/${id}/status`, {method: 'POST', body: JSON.stringify(body)}).catch((e) => log('status update failed', e.message));

/* ---------- voice: tts.py → clips dir, served over http so Remotion can fetch them */
const VOICE_DIR = path.join(os.tmpdir(), 'ams-voice');
let voiceServer;
async function voiceBase() {
  if (voiceServer) return voiceServer;
  fs.mkdirSync(VOICE_DIR, {recursive: true});
  const srv = http.createServer((req, res) => {
    const f = path.join(VOICE_DIR, path.basename(decodeURIComponent(req.url.split('?')[0])));
    if (!fs.existsSync(f)) { res.writeHead(404); return res.end(); }
    res.writeHead(200, {'content-type': 'audio/mpeg', 'access-control-allow-origin': '*', 'content-length': fs.statSync(f).size});
    fs.createReadStream(f).pipe(res);
  });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  srv.unref();
  voiceServer = `http://127.0.0.1:${srv.address().port}/`;
  return voiceServer;
}

/** Create missing clips for these scenes. Returns a pack (existing clips kept). srcOf(file) builds the clip URL. */
async function buildVoice(scenes, pack, voice, dir, srcOf) {
  const m = await v3();
  const missing = m.missingClips(scenes, pack, voice);
  const out = {voice, clips: {...(pack?.voice === voice ? pack.clips : {})}};
  if (!missing.length) return out;
  fs.mkdirSync(dir, {recursive: true});
  const list = path.join(os.tmpdir(), `clips-${Date.now()}.json`);
  fs.writeFileSync(list, JSON.stringify(missing));
  log(`tts: ${missing.length} clip(s), voice ${voice}`);
  const res = JSON.parse(sh(PY, [path.join(root, 'scripts/tts.py'), list, dir, voice], {stdio: ['ignore', 'pipe', 'inherit']}));
  for (const [k, c] of Object.entries(res)) out.clips[k] = {src: srcOf(c.file), dur: c.dur, words: c.words};
  return out;
}

async function withVoice(template, props) {
  const m = await v3();
  const t = m.TEMPLATES.find((x) => x.id === template);
  const voice = props.voice ?? 'farid';
  if (!t?.scripted || voice === 'none' || !props.scenes?.length) return props;
  const base = await voiceBase();
  const pack = await buildVoice(props.scenes, props.voicePack, voice, VOICE_DIR, (f) => base + f);
  return {...props, voicePack: pack};
}

/* ---------- render */
let serveUrl;
async function getBundle() {
  if (serveUrl) return serveUrl;
  log('bundling…');
  serveUrl = await bundle({entryPoint: path.join(root, 'remotion/index.ts'), publicDir: path.join(root, 'public'), onProgress: () => {}});
  return serveUrl;
}

export async function renderOne(template, props, outFile, scale = 1) {
  if (!BROWSER) await ensureBrowser();
  const url = await getBundle();
  const composition = await selectComposition({serveUrl: url, id: template, inputProps: props, browserExecutable: BROWSER});
  if (DRAFT) scale = Math.min(scale, 0.5);
  log(`render ${template} ${composition.width}x${composition.height} ${composition.durationInFrames}f${DRAFT ? ' (draft)' : HQ ? ' (HQ)' : ''} concurrency ${CONCURRENCY} → ${outFile}`);
  let last = -1;
  await renderMedia({
    composition, serveUrl: url, codec: 'h264', crf: DRAFT ? 26 : HQ ? 15 : 18, pixelFormat: 'yuv420p', x264Preset: DRAFT ? 'veryfast' : HQ ? 'slow' : 'medium',
    // JPEG 80 → 95 lifts VMAF on Persian text/fine lines by ~1.2–1.7 for ~0–20% time (remotion-dev/remotion#11441)
    jpegQuality: DRAFT ? 80 : HQ ? 100 : 95,
    audioCodec: 'aac', audioBitrate: DRAFT ? '160k' : '320k', browserExecutable: BROWSER, colorSpace: 'bt709', outputLocation: outFile, scale, inputProps: props,
    concurrency: CONCURRENCY, chromiumOptions: {gl: 'swangle'}, timeoutInMilliseconds: 120_000,
    onProgress: ({progress}) => { const pct = Math.floor(progress * 10) * 10; if (pct !== last) { last = pct; log(`  ${pct}%`); } },
  });
  return outFile;
}

/** Two-pass EBU R128 loudness normalisation to YouTube's -14 LUFS, video copied untouched. */
function master(file) {
  const has = sh(FFPROBE, ['-v', 'error', '-select_streams', 'a', '-show_entries', 'stream=index', '-of', 'csv=p=0', file]);
  if (!has) return null;
  const tgt = 'I=-14:TP=-1:LRA=11';
  let info;
  try {
    const r = require_spawn(FFMPEG, ['-hide_banner', '-nostats', '-i', file, '-vn', '-af', `loudnorm=${tgt}:print_format=json`, '-f', 'null', '-']);
    info = JSON.parse(r.slice(r.lastIndexOf('{'), r.lastIndexOf('}') + 1));
  } catch { info = null; }
  const af = info
    ? `loudnorm=${tgt}:measured_I=${info.input_i}:measured_TP=${info.input_tp}:measured_LRA=${info.input_lra}:measured_thresh=${info.input_thresh}:offset=${info.target_offset}:linear=true,aresample=48000`
    : `loudnorm=${tgt},aresample=48000`;
  const tmp = file.replace(/\.mp4$/, '.m.mp4');
  sh(FFMPEG, ['-y', '-v', 'error', '-i', file, '-map', '0:v', '-map', '0:a', '-c:v', 'copy', '-af', af, '-c:a', 'aac', '-b:a', '384k', '-ar', '48000', '-movflags', '+faststart', tmp]);
  fs.renameSync(tmp, file);
  log(`mastered: input ${info?.input_i ?? '?'} LUFS → -14 LUFS`);
  return info;
}

/** Side files for YouTube: word-accurate .srt, chapters .txt, audio-only .mp3. */
async function sideFiles(template, props, file) {
  const m = await v3();
  const t = m.TEMPLATES.find((x) => x.id === template);
  const base = file.replace(/\.mp4$/, '');
  const out = {};
  if (t?.scripted && props.scenes?.length) {
    const ts = m.timeScript(props);
    const lessons = (props.variant || 'lesson') === 'lesson';
    fs.writeFileSync(base + '.srt', m.toSrt(m.captionPages(m.allWords(ts), lessons ? 42 : 30, lessons ? 2 : 1)));
    out.srt = base + '.srt';
    const ch = m.chapters(ts, (s) => s.label || '');
    if (ch.split('\n').length >= 3) { fs.writeFileSync(base + '.chapters.txt', ch); out.chapters = base + '.chapters.txt'; }
  }
  if (sh(FFPROBE, ['-v', 'error', '-select_streams', 'a', '-show_entries', 'stream=index', '-of', 'csv=p=0', file])) {
    sh(FFMPEG, ['-y', '-v', 'error', '-i', file, '-vn', '-c:a', 'libmp3lame', '-b:a', '192k', base + '.mp3']);
    out.mp3 = base + '.mp3';
  }
  // narration prompt pack (timed script + AI-voice prompts + self-recording sheet)
  try {
    const {narrationPack} = await import('./narration.mjs');
    const n = narrationPack(m, template, props);
    fs.writeFileSync(base + '.narration.md', n.md); out.narration = base + '.narration.md';
    fs.writeFileSync(base + '.narration.json', JSON.stringify(n.json, null, 1)); out.narrationJson = base + '.narration.json';
  } catch (e) { log('narration pack skipped:', e.message); }
  return out;
}

async function fullRender(template, props, out, scale = 1) {
  const p = await withVoice(template, props || {});
  await renderOne(template, p, out, scale);
  master(out);
  return sideFiles(template, p, out);
}

/* ---------- GitHub release storage */
function gh(...a) { return execFileSync('gh', a, {stdio: ['ignore', 'pipe', 'inherit'], encoding: 'utf8'}).trim(); }
function ensureRelease() {
  try { gh('release', 'view', TAG, '--repo', REPO, '--json', 'tagName'); }
  catch { gh('release', 'create', TAG, '--repo', REPO, '--title', 'Cloud renders (auto)', '--notes', 'خروجی‌های رندر ابری Ali Motion Studio — فایل‌ها بعد از ۱۴ روز خودکار پاک می‌شوند.', '--latest=false'); }
}
function cleanupOldAssets(days = 14) {
  try {
    const assets = JSON.parse(gh('api', `repos/${REPO}/releases/tags/${TAG}`, '--jq', '[.assets[] | {id, created_at, name}]'));
    const cutoff = Date.now() - days * 864e5;
    for (const a of assets) if (!a.name.startsWith('sample_') && Date.parse(a.created_at) < cutoff) gh('api', '-X', 'DELETE', `repos/${REPO}/releases/assets/${a.id}`);
  } catch (e) { log('cleanup skipped', e.message); }
}
function upload(file) {
  gh('release', 'upload', TAG, file, '--repo', REPO, '--clobber');
  return `https://github.com/${REPO}/releases/download/${TAG}/${path.basename(file)}`;
}
// the Worker proxies media types only; .md/.json stay as direct public release links
const proxied = (u) => (API && /\.(mp4|mp3|srt|txt)$/.test(u) ? `${API}/api/render/${path.basename(u)}` : u);

/* ---------- queue */
async function runQueue() {
  if (!API || !SECRET) throw new Error('API_BASE and QUEUE_SECRET are required');
  const {jobs} = await api(`/api/queue?limit=${MAX_JOBS}`);
  log(`queue: ${jobs.length} job(s)`);
  if (!jobs.length) return;
  ensureRelease();
  cleanupOldAssets();
  fs.mkdirSync(path.join(root, 'out'), {recursive: true});
  for (const job of jobs) {
    try {
      await setStatus(job.id, {status: 'rendering'});
      if (job.type === 'tts') {
        // voice only: the browser gets a pack with proxied clip URLs and can preview/render with real narration
        const dir = path.join(root, 'out', `tts_${job.id}`);
        const pack = await buildVoice(job.props.scenes || [], null, job.props.voice || 'farid', dir, (f) => f);
        for (const c of Object.values(pack.clips)) {
          const named = path.join(dir, `tts_${c.src}`);
          fs.renameSync(path.join(dir, c.src), named);
          c.src = proxied(upload(named));
        }
        await setStatus(job.id, {status: 'done', files: {pack}});
        log('tts done', Object.keys(pack.clips).length);
        continue;
      }
      const out = path.join(root, 'out', `${job.id}_${job.title.endsWith('.mp4') ? job.title : job.title + '.mp4'}`);
      const side = await fullRender(job.template, job.props, out, job.scale || 1);
      const url = proxied(upload(out));
      const files = {};
      for (const [k, f] of Object.entries(side)) files[k] = proxied(upload(f));
      await setStatus(job.id, {status: 'done', url, files});
      log('done', url);
    } catch (e) {
      log('job failed', job.id, e.message);
      await setStatus(job.id, {status: 'error', error: e.message});
    }
  }
}

/* ---------- sample voices committed to public/voice (so the web preview talks out of the box) */
async function samples() {
  const m = await v3();
  const dir = path.join(root, 'public/voice');
  const packsFile = path.join(dir, 'packs.json');
  const packs = fs.existsSync(packsFile) ? JSON.parse(fs.readFileSync(packsFile, 'utf8')) : {};
  for (const t of m.TEMPLATES.filter((x) => x.scripted)) {
    const p = t.defaultProps;
    packs[t.id] = await buildVoice(p.scenes, packs[t.id], p.voice || 'farid', dir, (f) => `voice/${f}`);
  }
  fs.writeFileSync(packsFile, JSON.stringify(packs));
  log('packs written', Object.keys(packs).join(', '));
}

async function main() {
  if (args[0] === '--queue') return runQueue();
  if (args[0] === '--samples') return samples();
  if (args[0] === '--job') {
    const j = JSON.parse(args[1]);
    const out = path.join(root, 'out', `${j.template}_${Date.now()}.mp4`);
    fs.mkdirSync(path.dirname(out), {recursive: true});
    const side = await fullRender(j.template, j.props || {}, out);
    if (REPO) { ensureRelease(); log('uploaded', upload(out)); for (const f of Object.values(side)) upload(f); }
    return;
  }
  if (args[0] === '--local') {
    const template = args[1] || 'LessonPro';
    const m = await v3();
    const t = m.TEMPLATES.find((x) => x.id === template);
    const props = args[2] ? {...t?.defaultProps, ...JSON.parse(fs.readFileSync(args[2], 'utf8'))} : (t?.defaultProps ?? {});
    const out = path.resolve(args[3] || path.join(root, 'out', `${template}.mp4`));
    fs.mkdirSync(path.dirname(out), {recursive: true});
    const side = await fullRender(template, props, out, +(process.env.SCALE || 1));
    log('files', out, side);
    return;
  }
  console.log('usage: --queue | --samples | --local <Template> [props.json] [out.mp4] | --job <json>');
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
