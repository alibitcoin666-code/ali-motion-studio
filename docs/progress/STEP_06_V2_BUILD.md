# STEP 06 — v2 build status (2026-11-22)

Project: /home/user/workspace/ali-motion-studio (repo alibitcoin666-code/ali-motion-studio, public, MIT)

## Done
- Narration engine `src/narration/narration.ts`: every template has a scene list, so scene length = max(design, speech). It outputs captions, SRT, chapters, a TTS prompt and the cloud plan.
- New templates in `src/remotion/script/`: Whiteboard (marker hand, cork board, eraser) and Stickman (teacher with pointer and speech bubble). Both support 16:9, 9:16 and 1:1.
- Course ZIP import (`src/course/parse.ts`, in-browser with fflate). The bundled course `public/course/pianova.json` has 26 lessons, 17 curiosity posts, 8 Friday posts and 60 calendar rows.
- UI: nav (studio / course / guide / growth), Narration tab, Course page, simple guide, growth doc.
- Cloud: the Worker accepts voice, narrationPlan and scale; serves `/api/render/<file>` as a proxy for release assets; supports Whiteboard and Stickman. `render-job.mjs` runs edge-tts per caption, applies atempo of 1.4 or less, then adelay and amix, and uploads mp4, mp3 and srt.
- Docs: GUIDE_SIMPLE, YOUTUBE_GROWTH, COURSE_ZIP_FORMAT, ARCHITECTURE, AGENTS.md, CONTRIBUTING, LICENSE.
- Local test: out/whiteboard_lesson1.mp4 (1080p, 58.5 s, 6.7 MB, Farid voice, srt and mp3).

## Remaining, if continuing elsewhere
1. git commit and push (Pages deploys automatically).
2. Redeploy the Cloudflare Worker from worker/index.js (bindings: JOBS KV, QUEUE_SECRET, PAGES_ORIGIN).
3. Cloud test job with voice.
4. Send a Telegram test to the private chat with the bot.
5. Upload the samples to Drive.
