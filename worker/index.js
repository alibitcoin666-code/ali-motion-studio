/**
 * Ali Motion Studio — Cloudflare Worker
 *  - /api/*  : free cloud-render queue (KV) consumed by a GitHub Actions cron job
 *  - else    : mirror of the static app hosted on GitHub Pages (cached at the edge)
 *
 * Bindings: JOBS (KV namespace), QUEUE_SECRET (secret), PAGES_ORIGIN (plain text)
 * No user secrets are ever stored in this file.
 */
const TEMPLATES = ['PianoLesson', 'PianoTip', 'ChordScale', 'KineticQuote', 'BrandIntro', 'MusicRelease', 'EndScreen', 'Whiteboard', 'Stickman'];
const VOICES = ['none', 'farid', 'dilara'];
const REPO = 'alibitcoin666-code/ali-motion-studio';
const MAX_FILE = 20 * 1024 * 1024;
const JOB_TTL = 60 * 60 * 24 * 14; // 14 days
const FILE_TTL = 60 * 60 * 24 * 3; // 3 days
const PER_IP_HOURLY = 6;

const cors = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET,POST,OPTIONS',
  'access-control-allow-headers': 'content-type,authorization',
  'access-control-max-age': '86400',
};
const json = (data, status = 200, extra = {}) =>
  new Response(JSON.stringify(data), {status, headers: {'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...cors, ...extra}});
const rid = (n = 12) => [...crypto.getRandomValues(new Uint8Array(n))].map((b) => 'abcdefghijkmnpqrstuvwxyz23456789'[b % 32]).join('');

function authed(req, env) {
  const h = req.headers.get('authorization') || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : '';
  if (!env.QUEUE_SECRET || token.length !== env.QUEUE_SECRET.length) return false;
  let diff = 0;
  for (let i = 0; i < token.length; i++) diff |= token.charCodeAt(i) ^ env.QUEUE_SECRET.charCodeAt(i);
  return diff === 0;
}

async function queuedIds(env) {
  const list = await env.JOBS.list({prefix: 'q:'});
  return list.keys.map((k) => k.name.split(':')[2]);
}

async function api(req, env, url) {
  const p = url.pathname;
  const m = req.method;
  if (m === 'OPTIONS') return new Response(null, {headers: cors});

  /* ---- proxy finished renders (for Telegram / direct links, same-origin download) */
  let rr = p.match(/^\/api\/render\/([A-Za-z0-9._-]{3,120}\.(mp4|mp3|srt))$/);
  if (rr && (m === 'GET' || m === 'HEAD')) {
    const r = await fetch(`https://github.com/${REPO}/releases/download/renders/${rr[1]}`, {redirect: 'follow', cf: {cacheTtl: 3600}});
    if (!r.ok) return json({error: 'not found'}, 404);
    const type = {mp4: 'video/mp4', mp3: 'audio/mpeg', srt: 'application/x-subrip; charset=utf-8'}[rr[2]];
    const h = {'content-type': type, 'cache-control': 'public, max-age=3600', 'content-disposition': `inline; filename="${rr[1]}"`, ...cors};
    const len = r.headers.get('content-length'); if (len) h['content-length'] = len;
    return new Response(m === 'HEAD' ? null : r.body, {headers: h});
  }

  if (p === '/api/health') return json({ok: true, service: 'ali-motion-studio', time: new Date().toISOString()});

  /* ---- uploads (audio / cover) */
  if (p === '/api/files' && m === 'POST') {
    const len = +(req.headers.get('content-length') || 0);
    if (len > MAX_FILE) return json({error: 'حجم فایل بیش از ۲۰ مگابایت است'}, 413);
    const type = (req.headers.get('content-type') || 'application/octet-stream').split(';')[0];
    if (!/^(audio|image)\//.test(type)) return json({error: 'فقط فایل صوتی یا تصویری مجاز است'}, 415);
    const buf = await req.arrayBuffer();
    if (buf.byteLength > MAX_FILE) return json({error: 'حجم فایل بیش از ۲۰ مگابایت است'}, 413);
    const id = rid(16);
    await env.JOBS.put(`file:${id}`, buf, {expirationTtl: FILE_TTL, metadata: {type, size: buf.byteLength}});
    return json({id, url: `/api/files/${id}`});
  }
  let mm = p.match(/^\/api\/files\/([a-z0-9]{16})$/);
  if (mm && m === 'GET') {
    const {value, metadata} = await env.JOBS.getWithMetadata(`file:${mm[1]}`, {type: 'arrayBuffer'});
    if (!value) return json({error: 'not found'}, 404);
    return new Response(value, {headers: {'content-type': metadata?.type || 'application/octet-stream', 'cache-control': 'public, max-age=86400', ...cors}});
  }

  /* ---- create job */
  if (p === '/api/jobs' && m === 'POST') {
    const ip = req.headers.get('cf-connecting-ip') || 'x';
    const hour = Math.floor(Date.now() / 3.6e6);
    const rk = `rl:${ip}:${hour}`;
    const used = +((await env.JOBS.get(rk)) || 0);
    if (used >= PER_IP_HOURLY) return json({error: 'تعداد درخواست‌ها در این ساعت زیاد است؛ کمی بعد دوباره امتحان کنید'}, 429);
    const raw = await req.text();
    if (raw.length > 400_000) return json({error: 'داده پروژه بیش از حد بزرگ است'}, 413);
    let body;
    try { body = JSON.parse(raw); } catch { return json({error: 'JSON نامعتبر'}, 400); }
    if (!TEMPLATES.includes(body.template)) return json({error: 'قالب نامعتبر'}, 400);
    if (typeof body.props !== 'object' || !body.props) return json({error: 'props نامعتبر'}, 400);
    for (const k of ['audioUrl', 'coverUrl']) {
      const v = body.props[k];
      if (v && !/^https:\/\//.test(v)) body.props[k] = '';
    }
    const id = rid(12);
    const now = Date.now();
    const title = String(body.title || `${body.template}.mp4`).replace(/[^A-Za-z0-9._-]/g, '_').slice(0, 80);
    const voice = VOICES.includes(body.voice) ? body.voice : 'none';
    const narrationPlan = Array.isArray(body.narrationPlan)
      ? body.narrationPlan.slice(0, 300).map((c) => ({start: +c.start || 0, end: +c.end || 0, text: String(c.text || '').slice(0, 600)})).filter((c) => c.text && c.end > c.start)
      : [];
    const scale = [1, 4 / 3, 2].find((x) => Math.abs(x - (+body.scale || 1)) < 0.01) || 1;
    const job = {id, status: 'queued', template: body.template, props: body.props, title, voice, narrationPlan, scale, createdAt: now};
    await env.JOBS.put(`job:${id}`, JSON.stringify(job), {expirationTtl: JOB_TTL});
    await env.JOBS.put(`q:${String(now).padStart(14, '0')}:${id}`, '1', {expirationTtl: JOB_TTL});
    await env.JOBS.put(rk, String(used + 1), {expirationTtl: 3700});
    return json({id, status: 'queued'}, 201);
  }

  /* ---- job status (public, by unguessable id) */
  mm = p.match(/^\/api\/jobs\/([a-z0-9]{12})$/);
  if (mm && m === 'GET') {
    const j = await env.JOBS.get(`job:${mm[1]}`, {type: 'json'});
    if (!j) return json({error: 'not found'}, 404);
    let position;
    if (j.status === 'queued') position = (await queuedIds(env)).indexOf(j.id) + 1 || undefined;
    return json({id: j.id, status: j.status, url: j.url, files: j.files, error: j.error, createdAt: j.createdAt, updatedAt: j.updatedAt, position});
  }

  /* ---- worker side (GitHub Actions) */
  if (p === '/api/queue' && m === 'GET') {
    if (!authed(req, env)) return json({error: 'unauthorized'}, 401);
    const ids = (await queuedIds(env)).slice(0, +(url.searchParams.get('limit') || 5));
    const jobs = (await Promise.all(ids.map((id) => env.JOBS.get(`job:${id}`, {type: 'json'})))).filter(Boolean);
    return json({jobs});
  }
  mm = p.match(/^\/api\/jobs\/([a-z0-9]{12})\/status$/);
  if (mm && m === 'POST') {
    if (!authed(req, env)) return json({error: 'unauthorized'}, 401);
    const j = await env.JOBS.get(`job:${mm[1]}`, {type: 'json'});
    if (!j) return json({error: 'not found'}, 404);
    const b = await req.json();
    if (!['rendering', 'done', 'error', 'queued'].includes(b.status)) return json({error: 'bad status'}, 400);
    Object.assign(j, {status: b.status, url: b.url ?? j.url, files: b.files ?? j.files, error: b.error ? String(b.error).slice(0, 500) : undefined, updatedAt: Date.now()});
    await env.JOBS.put(`job:${j.id}`, JSON.stringify(j), {expirationTtl: JOB_TTL});
    if (b.status !== 'queued') {
      const list = await env.JOBS.list({prefix: 'q:'});
      await Promise.all(list.keys.filter((k) => k.name.endsWith(`:${j.id}`)).map((k) => env.JOBS.delete(k.name)));
    }
    return json({ok: true});
  }
  return json({error: 'not found'}, 404);
}

async function site(req, env, url, ctx) {
  const origin = (env.PAGES_ORIGIN || '').replace(/\/$/, '');
  if (!origin) return new Response('PAGES_ORIGIN not configured', {status: 500});
  let path = url.pathname;
  if (path.endsWith('/')) path += 'index.html';
  const target = origin + path;
  const cache = caches.default;
  const key = new Request(target, {method: 'GET'});
  const immutable = path.startsWith('/assets/') || path.startsWith('/fonts/');
  if (immutable) {
    const hit = await cache.match(key);
    if (hit) return hit;
  }
  let res = await fetch(target, {cf: {cacheTtl: immutable ? 86400 : 60}});
  if (res.status === 404 && !path.includes('.')) res = await fetch(origin + '/index.html');
  const h = new Headers(res.headers);
  h.set('cache-control', immutable ? 'public, max-age=31536000, immutable' : 'public, max-age=60');
  h.set('x-content-type-options', 'nosniff');
  h.set('referrer-policy', 'strict-origin-when-cross-origin');
  h.delete('x-github-request-id');
  const out = new Response(res.body, {status: res.status, headers: h});
  if (immutable && res.ok) ctx.waitUntil(cache.put(key, out.clone()));
  return out;
}

export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url);
    try {
      if (url.pathname.startsWith('/api/')) return await api(req, env, url);
      return await site(req, env, url, ctx);
    } catch (e) {
      return json({error: 'server error', detail: String(e && e.message || e).slice(0, 200)}, 500);
    }
  },
};
