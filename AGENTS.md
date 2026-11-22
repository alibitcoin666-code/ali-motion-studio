# AGENTS.md — instructions for any AI assistant editing this repo

Ali Motion Studio (v3) is a free, browser-first app for making Persian (RTL) piano-education motion-graphics videos for YouTube and Shorts. The teacher character is the ALi Piano.IR logo (vectorised in `src/v3/mascot/paths.ts`). Read `docs/ARCHITECTURE.md` first.

## Commands
- `npm ci` then `npm run dev` (app at http://localhost:5173)
- `npx tsc --noEmit -p .` must pass, then `npm run build` (static app → `dist/`, GitHub Pages)
- Preview a frame: `npx remotion still remotion/index.ts <TemplateId> out.png --frame=120 --props='{"format":"9:16","theme":"neon"}'`
- Render with real narration + mastering + SRT: `node scripts/render-job.mjs --local <TemplateId> [props.json] [out.mp4]` (needs `pip install edge-tts` + ffmpeg)
- Rebuild the sample voices after editing sample scripts in `src/v3/registry.ts`: `node scripts/render-job.mjs --samples`
- Rebuild the bundled course: `bash scripts/course.sh <folder|zip> pianova`

## Add a template
1. Write `src/v3/templates/MyTemplate.tsx` (props extend `CommonProps` from `src/v3/theme.ts`; use `Background`, `KineticText`, `SceneShell` from `components/core.tsx`).
   A scripted (narrated) video should reuse `ScriptVideo` with a new scene list — add new scene *kinds* in `templates/scenes.tsx` (`Kind`, `KIND_FA`, `DEFAULT_POSE`, `MIN`, `SceneView`) and the editor inputs in `src/app/ScenesEditor.tsx` (`USES`).
2. Register it in `src/v3/registry.ts` (fields → auto-generated form, `defaultProps`, `duration`, `scripted`).
3. Add the id to `TEMPLATES` (and `SCRIPTED` if narrated) in `worker/index.js`.
4. Add a thumbnail `public/thumbs/<id>.webp` (480×270).

## Rules
- Persian text: `dir="rtl"`; animate per word, never per letter (keeps Persian letters joined). Adjacent inline spans need a real space between them or letters join across words. Fonts come from `src/v3/fonts.ts` (`F.head` Estedad, `F.body` Vazirmatn FD, `F.hook` Lalezar, `F.slogan` Mirza, `F.latin` Outfit, `F.music` Bravura). Digits → Persian via `toFa()`.
- `*word*` = highlighted word (accent colour + underline swipe).
- Timing is audio-first (`src/v3/timeline.ts`): scene length = max(min, voice + lead + tail + notes). Never hard-code frame counts for narrated scenes.
- Keep brands separate: `ali` (ALi Piano.IR, mascot), `pianova` (@Pianovali), `mr69` (Music Radio 69, no mascot). Never mix logos or handles.
- No secrets in the repo. Cloud secrets live in GitHub Actions secrets and Cloudflare Worker secrets only.
- Nothing publishes to YouTube or public Telegram channels automatically. Exports are files for the human to upload. `@Alibaghbani1hand` is frozen.
- Output: H.264 yuv420p, CRF 18, AAC 320k, 30 fps, −14 LUFS (YouTube).
- Audio assets: piano = Salamander Grand (CC-BY, credit Alexander Holm); beds and SFX are synthesised by `scripts/audio/build-audio.mjs` (no copyright).

## CLI (`ams`)
`node scripts/ams.mjs <doctor|templates|sample|course|still|render|cloud|status|qa>`. The Muse installer is at `muse/install.sh` and the skill at `muse/skill/ali-motion-studio/`. Env vars: FFMPEG, FFPROBE, PYTHON, AMS_BROWSER, AMS_CONCURRENCY, AMS_DRAFT, AMS_API.
