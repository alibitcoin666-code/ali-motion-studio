# AGENTS.md — instructions for any AI assistant editing this repo

Ali Motion Studio is a free, browser-first app for making Persian (RTL) motion-graphics videos for YouTube/Shorts, for a piano education niche. Read `docs/ARCHITECTURE.md` first.

## Commands
- `npm ci` then `npm run dev` (app at http://localhost:5173)
- `npx tsc --noEmit -p .` must pass, then `npm run build` (static app → `dist/`, GitHub Pages)
- Preview a frame: `npx remotion still remotion/index.ts <TemplateId> out.png --frame=120 --props='{"format":"9:16"}'`
- Render a video: `node scripts/render-job.mjs --local <TemplateId> props.json out/x.mp4`
  - with narration: `npx tsx scripts/plan.ts <TemplateId> props.json > plan.json` then `VOICE=farid PLAN=plan.json node scripts/render-job.mjs --local ...` (needs `pip install edge-tts` + ffmpeg)
- Rebuild the bundled course: `bash scripts/course.sh <folder|zip> pianova`

## Add a new template
1. Create `src/remotion/templates/MyTemplate.tsx` (props extend `BaseProps` from `theme.ts`; wrap in `<Stage tid="MyTemplate" ...>`).
2. Add its scene list to `RAW` in `src/narration/narration.ts` (designed frames + auto narration text per scene). Use `buildScenes()` inside the template for timing so the narration stays in sync.
3. Register it in `src/remotion/registry.ts` (fields → auto-generated form, `defaultProps`).
4. Add the id to `TEMPLATES` in `worker/index.js` (cloud queue allow-list).

## Rules
- Persian text: always `direction: 'rtl'`, fonts from `fonts.ts` (Vazirmatn FD for numbers). Use Persian digits via `fa()` in UI.
- Keep brands separate: `ali` (Ali Baghbani), `pianova` (Pianova course), `mr69` (Music Radio 69). Never mix logos or handles.
- No secrets in the repo. Cloud secrets live in GitHub Actions secrets and Cloudflare Worker secrets only.
- Nothing publishes to YouTube/Telegram automatically. Exports are files for the human to upload.
- Keep it light: the target user has a weak laptop. Heavy effects must respect `look: 'clean'`.
- Output: H.264 yuv420p, CRF 18, AAC, 30 fps (YouTube recommended settings).
