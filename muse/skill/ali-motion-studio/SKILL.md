---
name: ali-motion-studio
description: Make professional Persian piano motion-graphics videos (lessons 16:9, tips/chords/quotes Shorts 9:16, falling-notes, logo intro) for Ali Baghbani / Pianova / Music Radio 69 with the open-source Ali Motion Studio (Remotion) — logo mascot teacher, free Persian narration with word-synced captions, real piano sound, -14 LUFS master, SRT + chapters. Trigger phrases: "ویدیو موشن بساز", "ویدیوی آموزشی پیانو بساز", "شورتس نکته پیانو بساز", "آکورد روز بساز", "جلسه N دوره را ویدیو کن", "make a piano motion video", "render lesson N".
---

# Ali Motion Studio for Muse

## Purpose
Turn a topic, a course lesson or a short script into a YouTube-ready MP4 using the user's own studio
(repo `alibitcoin666-code/ali-motion-studio`, MIT). Muse writes the script, renders, checks quality and delivers;
the user decides what gets published. Web editor for humans: https://ali-motion-studio.ali-bitcoin666.workers.dev

## Setup (once; re-run to update)
1. If `command -v ams` fails, run:
   `curl -fsSL https://raw.githubusercontent.com/alibitcoin666-code/ali-motion-studio/main/muse/install.sh | bash`
   (~5 min; installs Node, ffmpeg, edge-tts and Chrome under `$HOME` because only `$HOME` survives a VM restart).
   Approve these destinations permanently when Sentinel asks: github.com, objects.githubusercontent.com, release-assets.githubusercontent.com,
   raw.githubusercontent.com, nodejs.org, registry.npmjs.org, pypi.org, files.pythonhosted.org,
   speech.platform.bing.com, ali-motion-studio.ali-bitcoin666.workers.dev.
2. `ams doctor` → every `*Ready` field must be `true`. Fix what `tips` says before continuing.
No API key or password is needed anywhere. Never ask the user for one.

## Workflow
1. **Pick the template** (`ams templates`):
   | Need | Template | Format | Where to render |
   |---|---|---|---|
   | Full lesson (60–180 s) | `LessonPro` | 16:9 | `ams cloud` (≈10–15 min, free) |
   | Tip / technique Short | `TipShort` | 9:16 | `ams render` locally (≈4–6 min) |
   | Chord of the day Short | `ChordDay` | 9:16 | local |
   | Motivational quote Short | `KineticQuote` | 9:16 | local |
   | Falling-notes song (Ode to Joy, Twinkle, Für Elise, Minuet) | `FallingNotes` | 16:9 / 9:16 | local |
   | Channel intro/outro sting | `LogoIntro` | 16:9 | local (≈1 min) |
   Measured on a 2 vCPU / 8 GB machine (same as the Muse VM): 103 s lesson = 13 min, 30 s Short = 4–5 min.
   The VM has 2 cores, so anything longer than ~60 s goes to `ams cloud`, which keeps Muse free for other work.
2. **Write the props**:
   - Sample to edit: `ams sample <Template> out/<name>.json`
   - Course lesson: `ams course <n>` (16:9) or `ams course <n> --short` (9:16). Lessons come from `public/course/pianova.json` (26 lessons, brand `pianova`).
   - Edit with the rules in `references/script-format.md`. The key points: every scene has `say` (the Persian narration, which also sets the scene length); the on-screen `title` is ≤ 7 words; mark accent words with `*star*`; use Persian digits.
3. **Look before rendering**: run `ams still <Template> <props> --frame 90` and view the PNG (about 1 min). Check that the Persian text joins correctly and nothing is clipped.
4. **Render**:
   - `ams render <Template> <props>` gives the final 1080p file.
   - Add `--draft` for a 540p preview (about 2× faster).
   - Or run `ams cloud <Template> <props> --title <ascii_name>`. It blocks until done (it polls every 20 s) and downloads mp4 + srt + chapters + mp3 into `out/`.
   - For long jobs, use `--no-wait` and then `ams status <id>`.
5. **QA**: run `ams qa out/<file>.mp4`.
   - It must say `youtubeReady: true`. Then view the `.sheet.png` contact sheet yourself.
   - If something fails, fix the props and re-render. Never deliver a file that failed QA.
6. **Deliver**: send the MP4 plus SRT and chapters to the user's Google Drive or the private Telegram bot chat, with a YouTube title, a description (with chapters) and tags drafted in Persian. Ask before any upload to YouTube (see Operating Rules).

## Output Contract
Reply in Persian, short:
- Template, brand, length, resolution, size, LUFS and the QA verdict
- Links or attachments: MP4, SRT, chapters, contact sheet
- A ready-to-paste YouTube title, description with chapters, and 10 tags
- What you would change next time (one line)

## Operating Rules
- **Never publish, edit or upload anything on YouTube channel @Alibaghbani1hand (HARD FREEZE).** Other channels:
  - upload only as a **private/unlisted draft**
  - only after the user explicitly says yes for that specific video
- Keep brands separate:
  - `ali` (ALi Piano.IR, alipiano.ir)
  - `pianova` (@Pianovali, course videos)
  - `mr69` (Music Radio 69, music only, no mascot)
  - Never mix a brand's logo, slogan or handle into another brand's video.
- No posting to public Telegram channels. The private bot chat is fine.
- Music must be public domain or self-made (the bundled songs and beds qualify). Never use copyrighted tracks.
- Never write secrets into files, props or the repo. The cloud API needs no key.
- Do not modify the repo's `main` branch from Muse. Put user-specific scripts in `~/workspace/ams-projects/`.
- If a render fails twice with the same error, stop and report the last 30 log lines. Do not loop.
- Check facts before narrating them (music theory, composer dates).

## References
- `references/script-format.md`: props and scene schema, with examples
- `references/youtube-checklist.md`: specs, retention rules and the metadata template
- Full docs in the repo: `README.md`, `AGENTS.md`, `docs/GUIDE_SIMPLE.md`, `docs/YOUTUBE_GROWTH.md`
