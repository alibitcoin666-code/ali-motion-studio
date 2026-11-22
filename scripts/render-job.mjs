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

export async function renderOne(template, props, outFile) {
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
      await renderOne(job.template, job.props, out);
      const url = upload(out);
      await setStatus(job.id, {status: 'done', url});
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
    await renderOne(template, props, out);
    return;
  }
  console.log('usage: --queue | --local <Template> [props.json] [out.mp4] | --job <json>');
}

main().catch((e) => { console.error(e); process.exit(1); });
