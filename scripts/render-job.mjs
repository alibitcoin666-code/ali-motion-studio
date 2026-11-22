#!/usr/bin/env node
/**
 * Ali Motion Studio — server-side renderer (GitHub Actions or any Linux/Mac/Win machine)
 *
 * Modes:
 *   node scripts/render-job.mjs --queue                 # pull jobs from the Worker queue (needs API_BASE + QUEUE_SECRET)
 *   node scripts/render-job.mjs --local <Template> [props.json] [out.mp4]   # render one video locally
 *   node scripts/render-job.mjs --job '<json>'          # {"template":"PianoTip","props":{...}} (workflow_dispatch)
 *
 * Output: MP4 · H.264 High · yuv420p · CRF 18 · AAC 320k · 30 fps — matches YouTube upload recommendations.
 */
import {bundle} from '@remotion/bundler';
import {renderMedia, selectComposition, ensureBrowser} from '@remotion/renderer';
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const API = (process.env.API_BASE || '').replace(/\/$/, '');
const SECRET = process.env.QUEUE_SECRET || '';
const REPO = process.env.GITHUB_REPOSITORY || '';
const TAG = process.env.RELEASE_TAG || 'renders';
const MAX_JOBS = +(process.env.MAX_JOBS || 4);

const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);

async function api(p, opts = {}) {
  const r = await fetch(API + p, {...opts, headers: {authorization: `Bearer ${SECRET}`, 'content-type': 'application/json', ...(opts.headers || {})}});
  if (!r.ok) throw new Error(`${opts.method || 'GET'} ${p} -> ${r.status} ${await r.text()}`);
  return r.json();
}
const setStatus = (id, body) => api(`/api/jobs/${id}/status`, {method: 'POST', body: JSON.stringify(body)}).catch((e) => log('status update failed', e.message));

let serveUrl;
async function getBundle() {
  if (serveUrl) return serveUrl;
  log('bundling…');
  serveUrl = await bundle({entryPoint: path.join(root, 'remotion/index.ts'), publicDir: path.join(root, 'public'), onProgress: () => {}});
  return serveUrl;
}

export async function renderOne(template, props, outFile, scale = 1) {
  await ensureBrowser();
  const url = await getBundle();
  const composition = await selectComposition({serveUrl: url, id: template, inputProps: props});
  log(`render ${template} ${composition.width}x${composition.height} ${composition.durationInFrames}f → ${outFile}`);
  let last = -1;
  await renderMedia({
    composition,
    serveUrl: url,
    codec: 'h264',
    crf: 18,
    pixelFormat: 'yuv420p',
    x264Preset: 'medium',
    audioCodec: 'aac',
    audioBitrate: '320k',
    colorSpace: 'bt709',
    outputLocation: outFile,
    scale,
    inputProps: props,
    concurrency: Math.max(1, Math.min(8, os.cpus().length)),
    chromiumOptions: {gl: 'swangle'},
    timeoutInMilliseconds: 120_000,
    onProgress: ({progress}) => {
      const pct = Math.floor(progress * 10) * 10;
      if (pct !== last) { last = pct; log(`  ${pct}%`); }
    },
  });
  return outFile;
}

/* ---------- narration (edge-tts, free Microsoft neural voices) */
const VOICE_IDS = {farid: 'fa-IR-FaridNeural', dilara: 'fa-IR-DilaraNeural'};
const sh = (cmd, a) => execFileSync(cmd, a, {stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8'}).trim();
const dur = (f) => +sh('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]);
const srtTime = (t) => {
  const ms = Math.max(0, Math.round(t * 1000));
  const p2 = (n, l = 2) => String(n).padStart(l, '0');
  return `${p2(Math.floor(ms / 3.6e6))}:${p2(Math.floor(ms / 6e4) % 60)}:${p2(Math.floor(ms / 1000) % 60)},${p2(ms % 1000, 3)}`;
};
const clean = (t) => t.replace(/\[[^\]]*\]/g, ' ').replace(/[*_#]/g, '').replace(/\s+/g, ' ').trim();

/** Synthesise every caption separately, fit it into its slot and mix with the video's own audio. */
export function addNarration(videoFile, plan, voice) {
  const v = VOICE_IDS[voice];
  if (!v || !plan?.length) return null;
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'nar-'));
  const clips = [];
  plan.forEach((c, i) => {
    const text = clean(c.text);
    if (!text) return;
    const f = path.join(tmp, `c${i}.mp3`);
    for (let k = 0; k < 3; k++) {
      try { sh('edge-tts', ['--voice', v, '--rate=+0%', '--text', text, '--write-media', f]); break; }
      catch (e) { if (k === 2) throw e; }
    }
    const next = plan[i + 1]?.start ?? c.end + 1.5;
    const slot = Math.max(0.6, next - c.start - 0.08);
    const d = dur(f);
    const tempo = d > slot ? Math.min(1.4, d / slot) : 1;
    clips.push({f, start: c.start, tempo, text, end: c.start + d / tempo});
  });
  if (!clips.length) return null;
  const total = dur(videoFile);
  const inputs = clips.flatMap((c) => ['-i', c.f]);
  const parts = clips.map((c, i) => `[${i + 1}:a]${c.tempo > 1.001 ? `atempo=${c.tempo.toFixed(3)},` : ''}aresample=48000,adelay=${Math.round(c.start * 1000)}:all=1[n${i}]`);
  const nar = `${clips.map((_, i) => `[n${i}]`).join('')}amix=inputs=${clips.length}:normalize=0:dropout_transition=0,volume=1.6,alimiter=limit=0.95[nar]`;
  const hasAudio = sh('ffprobe', ['-v', 'error', '-select_streams', 'a', '-show_entries', 'stream=index', '-of', 'csv=p=0', videoFile]).length > 0;
  const mix = hasAudio
    ? `[0:a]volume=0.35[bg];[bg][nar]amix=inputs=2:normalize=0:duration=first,alimiter=limit=0.97[out]`
    : `[nar]apad,atrim=0:${total.toFixed(3)}[out]`;
  const out = videoFile.replace(/\.mp4$/, '.voiced.mp4');
  sh('ffmpeg', ['-y', '-v', 'error', '-i', videoFile, ...inputs, '-filter_complex', [...parts, nar, mix].join(';'),
    '-map', '0:v', '-map', '[out]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '256k', '-ar', '48000', '-movflags', '+faststart', '-shortest', out]);
  fs.renameSync(out, videoFile);
  const base = videoFile.replace(/\.mp4$/, '');
  sh('ffmpeg', ['-y', '-v', 'error', '-i', videoFile, '-vn', '-c:a', 'libmp3lame', '-b:a', '192k', base + '.mp3']);
  fs.writeFileSync(base + '.srt', clips.map((c, i) => `${i + 1}\n${srtTime(c.start)} --> ${srtTime(c.end)}\n${c.text}\n`).join('\n'));
  fs.rmSync(tmp, {recursive: true, force: true});
  log(`narration: ${clips.length} clips, voice ${v}`);
  return {mp3: base + '.mp3', srt: base + '.srt'};
}

function gh(...a) {
  return execFileSync('gh', a, {stdio: ['ignore', 'pipe', 'inherit'], encoding: 'utf8'}).trim();
}
function ensureRelease() {
  try { gh('release', 'view', TAG, '--repo', REPO, '--json', 'tagName'); }
  catch { gh('release', 'create', TAG, '--repo', REPO, '--title', 'Cloud renders (auto)', '--notes', 'خروجی‌های رندر ابری Ali Motion Studio — فایل‌ها بعد از ۱۴ روز خودکار پاک می‌شوند.', '--latest=false'); }
}
function cleanupOldAssets(days = 14) {
  try {
    const assets = JSON.parse(gh('api', `repos/${REPO}/releases/tags/${TAG}`, '--jq', '[.assets[] | {id, created_at}]'));
    const cutoff = Date.now() - days * 864e5;
    for (const a of assets) if (Date.parse(a.created_at) < cutoff) gh('api', '-X', 'DELETE', `repos/${REPO}/releases/assets/${a.id}`);
  } catch (e) { log('cleanup skipped', e.message); }
}
function upload(file) {
  gh('release', 'upload', TAG, file, '--repo', REPO, '--clobber');
  return `https://github.com/${REPO}/releases/download/${TAG}/${path.basename(file)}`;
}

const proxied = (u) => (API ? `${API}/api/render/${path.basename(u)}` : u);

async function runQueue() {
  if (!API || !SECRET) throw new Error('API_BASE and QUEUE_SECRET are required');
  const {jobs} = await api(`/api/queue?limit=${MAX_JOBS}`);
  log(`queue: ${jobs.length} job(s)`);
  if (!jobs.length) return;
  ensureRelease();
  cleanupOldAssets();
  fs.mkdirSync(path.join(root, 'out'), {recursive: true});
  for (const job of jobs) {
    const out = path.join(root, 'out', `${job.id}_${job.title.endsWith('.mp4') ? job.title : job.title + '.mp4'}`);
    try {
      await setStatus(job.id, {status: 'rendering'});
      await renderOne(job.template, job.props, out, job.scale || 1);
      let extra = null;
      if (job.voice && job.voice !== 'none') {
        try { extra = addNarration(out, job.narrationPlan, job.voice); } catch (e) { log('narration failed (video kept silent)', e.message); }
      }
      const url = proxied(upload(out));
      const files = extra ? {mp3: proxied(upload(extra.mp3)), srt: proxied(upload(extra.srt))} : undefined;
      await setStatus(job.id, {status: 'done', url, files});
      log('done', url);
    } catch (e) {
      log('job failed', job.id, e.message);
      await setStatus(job.id, {status: 'error', error: e.message});
    }
  }
}

async function main() {
  if (args[0] === '--queue') return runQueue();
  if (args[0] === '--job') {
    const j = JSON.parse(args[1]);
    const out = path.join(root, 'out', `${j.template}_${Date.now()}.mp4`);
    fs.mkdirSync(path.dirname(out), {recursive: true});
    await renderOne(j.template, j.props || {}, out);
    if (REPO) { ensureRelease(); log('uploaded', upload(out)); }
    return;
  }
  if (args[0] === '--local') {
    const template = args[1] || 'PianoLesson';
    const props = args[2] ? JSON.parse(fs.readFileSync(args[2], 'utf8')) : {};
    const out = path.resolve(args[3] || path.join(root, 'out', `${template}.mp4`));
    fs.mkdirSync(path.dirname(out), {recursive: true});
    await renderOne(template, props, out, +(process.env.SCALE || 1));
    const voice = process.env.VOICE || 'none';
    if (voice !== 'none' && process.env.PLAN) addNarration(out, JSON.parse(fs.readFileSync(process.env.PLAN, 'utf8')), voice);
    return;
  }
  console.log('usage: --queue | --local <Template> [props.json] [out.mp4] | --job <json>');
}

main().catch((e) => { console.error(e); process.exit(1); });
