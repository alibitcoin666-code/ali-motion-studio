# STEP 10 — v3 test, optimize, deploy (IN PROGRESS)

Date: 2026-11-22. Repo: https://github.com/alibitcoin666-code/ali-motion-studio (public)
Web app: https://ali-motion-studio.ali-bitcoin666.workers.dev · Pages: https://alibitcoin666-code.github.io/ali-motion-studio/

## Done in this step
- README rewritten for v3 (template table, output specs, licenses, roadmap).
- docs/COURSE_ZIP_FORMAT.md updated (LessonPro instead of Whiteboard/Stickman).
- Local render TipShort OK: out/v3_TipShort.mp4 (1080x1920, 29.7 s, 15.4 MB, -14 LUFS, .srt, .mp3).
- Local render LessonPro started: `node scripts/render-job.mjs --local LessonPro "" out/v3_LessonPro.mp4` (log /tmp/r_lesson.log, 3103 frames).

## Remaining checklist (continue here if credits run out)
1. [ ] Finish LessonPro render → contact sheet check: `ffmpeg -i out/X.mp4 -vf fps=1/6,scale=480:-1,tile=4x4 sheet.png`, `ffprobe`.
2. [ ] Re-bundle (`rm -rf /tmp/bundle && npx remotion bundle remotion/index.ts --out-dir /tmp/bundle`) and render FallingNotes, LogoIntro, ChordDay locally.
3. [ ] `npx tsc --noEmit && npm run build` → commit + push (Pages auto-deploys). Never commit secrets.
4. [ ] Redeploy Cloudflare Worker `worker/index.js` (bindings: KV JOBS, PAGES_ORIGIN; keep secret_text).
5. [ ] Cloud test: POST /api/jobs → `gh workflow run render-queue.yml` → check status.
6. [ ] `gh release upload renders out/sample_*.mp4 --clobber`; send to private Telegram chat; upload to Drive samples folder.
7. [ ] Final Persian reply with links.

## Known content notes
- Source typos in course L01 narration: «حر کن», «تمرین را نکن ولی دوستت را یادت نرود» — user should fix in course files.
