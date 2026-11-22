# Architecture (v3)

```
src/
  app/              React UI (Vite): App.tsx (studio), ScenesEditor, NarrationPanel, CoursePanel, Docs, youtube.ts
  course/parse.ts   course ZIP → Course JSON → LessonPro / TipShort scene lists
  v3/
    theme.ts        THEMES (noir, midnight, neon, cream), BRANDS (ali, pianova, mr69), formats, CommonProps, VoicePack
    fonts.ts        font faces + assetUrl() (works in Player, web renderer and CLI)
    timeline.ts     audio-first timing: splitSay ([مکث N ثانیه]), clipKey, timeScenes, captionPages, toSrt, chapters, missingClips
    music.ts        note / chord parsing (Persian names), melody DSL, public-domain SONGS
    registry.ts     the 6 templates + sample scripts (+ public/voice/packs.json sample voices)
    components/     core (Background, KineticText, SceneShell, Glass, Particles…), Keyboard, Staff (Bravura), Captions, Sound
    mascot/         paths.ts (logo traced to SVG paths) + Mascot.tsx (poses, rubber-hose arms, talking keys)
    templates/      scenes.tsx (15 scene kinds), ScriptVideo (narrated videos), FallingNotes, LogoIntro
    node-entry.ts   timing helpers for scripts/render-job.mjs
remotion/           Remotion entry (Root.tsx, calculateMetadata per format)
scripts/            render-job.mjs (queue / local / samples), tts.py (edge-tts + word timings), audio/, logo/, build-course.ts
worker/index.js     Cloudflare Worker: serves the app, /api/jobs queue (KV; type render|tts), /api/render/:name proxy
.github/workflows   render-queue.yml (cloud renders every 5 min), pages.yml
```

## Timing model (audio-first)
1. Each scene has `say` (narration). `splitSay` cuts it at `[مکث N ثانیه]` into segments.
2. Each segment → `clipKey(voice|text)`. A voice pack maps keys → `{src, dur, words[]}` from edge-tts WordBoundary events.
3. `timeScenes` lays scenes out: `frames = max(min, LEAD + voice + TAIL + notes)`. Without a pack, words are estimated (2.05 words/s) so the preview still works.
4. The same timing drives karaoke/pop captions, mascot mouth (black keys bob on words), note playback (after the sentence), quiz countdown/reveal (second segment), SRT, chapters (≥ 10 s each) and music ducking.

## Rendering
- Browser: `@remotion/web-renderer` (WebCodecs) → MP4 H.264/AAC, includes the voice if a pack exists.
- Cloud: Worker stores a job in KV → GitHub Actions → `render-job.mjs`: TTS missing clips → Remotion CLI (CRF 18) → two-pass loudnorm −14 LUFS → release assets `renders/<id>_*.mp4/.srt/.mp3/.chapters.txt`.
- `type: 'tts'` jobs only create voice clips and return a pack with proxied URLs, so the browser preview can talk.
