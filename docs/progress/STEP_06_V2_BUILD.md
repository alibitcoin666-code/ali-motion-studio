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

## Verified (all done, 2026-11-22)
- Commit 326ae0a pushed; Pages deploy succeeded; live UI test passed with 0 errors (templates, narration tab, ZIP import, guide, growth).
- Worker redeployed (secret kept via keep_bindings). /api/render proxy works.
- Cloud job g79hpak8mnu4 (Whiteboard with Farid voice) was done in about 5 minutes and returned mp4, mp3 and srt.
- Telegram private chat 509026353: text, whiteboard sample and stickman Shorts sample all delivered.
- Drive samples folder 1utqGlDeHxFUfEWGNXpQUrkHDMn1KZWf2: pianova_whiteboard_L01.mp4/.srt, pianova_stickman_L01_shorts.mp4, the simple guide.
- Fix: the importer now prefers `L01_card.png` over `mobile_L01_card.png` (the source mobile_L01 image actually shows lesson 3).

## Ideas for next steps
- Content typos in source L01 narration: "حر کن" and "تمرین را نکن ولی دوستت را یادت نرود".
- Per-word karaoke captions; thumbnail template; batch render of all 26 lessons via the queue (6 jobs per hour per IP).
