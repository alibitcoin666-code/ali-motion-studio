# Architecture

```
src/
  app/            React UI (Vite). App.tsx = studio; CoursePanel, NarrationPanel, ScenesEditor, Docs, youtube.ts
  course/parse.ts course ZIP → Course JSON → video props
  narration/      narration plan: scenes, frame timing, captions, SRT, chapters, TTS prompt, cloud plan
  remotion/
    theme.ts      brands (ali / pianova / mr69 — never mix), formats, BaseProps
    fonts.ts      Vazirmatn FD, Estedad, Lalezar, Playfair, Playpen Sans Arabic (handwriting)
    registry.ts   template list: id, fields (form), defaults, duration
    components/   Stage (background, luxe FX, captions, audio), Keyboard, luxe FX, Captions
    templates/    PianoLesson, PianoTip, KineticQuote, ChordScale, BrandIntro, MusicRelease, EndScreen
    script/       Whiteboard + Stickman: layout.ts (pure layout + pen position), Board.tsx (marker ink drawing)
remotion/         Remotion entry (Root.tsx) used by the CLI / cloud renderer
scripts/          render-job.mjs (cloud + local render, edge-tts narration mix), build-course.ts
worker/index.js   Cloudflare Worker: serves the app, /api/jobs queue (KV), /api/files, /api/render/:name
.github/workflows render-queue.yml (renders queued jobs), pages.yml (GitHub Pages)
```

## Timing model

Every template exposes a scene list (`src/narration/narration.ts → RAW`). Each scene has a designed length and a narration text. With `syncNarration` (default) a scene lasts `max(designed, speech + lead + tail)`, where speech ≈ words / 2.15 words-per-second (measured on fa-IR edge voices) plus pauses. Captions are split into sentences inside each scene. The same plan drives:

- burned-in captions / stickman speech bubble,
- SRT and YouTube chapters,
- the cloud TTS: each caption is synthesised separately, time-stretched (≤1.4×) if needed and placed at its start time, so voice and text stay in sync.

## Rendering

- Browser: `@remotion/web-renderer` (WebCodecs) → MP4 H.264/AAC.
- Cloud: Worker stores a job in KV → GitHub Actions workflow picks it up → Remotion CLI renders (CRF 18) → edge-tts narration → FFmpeg mix → GitHub release asset `renders/<id>.mp4` (+ .mp3, .srt).
