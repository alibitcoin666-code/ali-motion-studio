---
name: ali-motion-studio
description: Make professional Persian piano motion-graphics videos (lessons 16:9, tips/chords/quotes Shorts 9:16, falling-notes, logo intro) for Ali Baghbani / Pianova / Music Radio 69 with the open-source Ali Motion Studio (Remotion) — logo mascot teacher, free Persian narration with word-synced captions, real piano sound, -14 LUFS master, SRT + chapters, and a narration prompt pack (timed script + ready AI-voice prompts) next to every video. Trigger phrases: "ویدیو موشن بساز", "ویدیوی آموزشی پیانو بساز", "شورتس نکته پیانو بساز", "آکورد روز بساز", "جلسه N دوره را ویدیو کن", "make a piano motion video", "render lesson N".
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
   | Full lesson (60–180 s) | `LessonPro` | 16:9 | local if ≥ 4 vCPU, else `ams cloud --fallback-local` |
   | Tip / technique Short | `TipShort` | 9:16 | `ams render` locally (≈2–3 min) |
   | Chord of the day Short | `ChordDay` | 9:16 | local |
   | Motivational quote Short | `KineticQuote` | 9:16 | local |
   | Falling-notes song (Ode to Joy, Twinkle, Für Elise, Minuet) | `FallingNotes` | 16:9 / 9:16 | local |
   | Channel intro/outro sting | `LogoIntro` | 16:9 | local (≈1 min) |
   Measured times:
   - 2 vCPU: 30 s Short final 1080p = 3 min, draft = about 1 min; 103 s lesson = about 13 min.
   - The user's Muse VM has 4 vCPU (`ams doctor` shows `cpus`), so rendering is roughly 1.5–2× faster.
   - Rule: if `cpus` ≥ 4, render everything up to about 3 min **locally**, because it is the most reliable. Use `ams cloud --fallback-local` only for long lessons, or when Muse must stay free.
   - GitHub's free cron is best-effort and can be hours late. `ams cloud` therefore starts the runner itself when `gh` is logged in. Otherwise, trigger workflow `render-queue.yml` (workflow_dispatch) on `alibitcoin666-code/ali-motion-studio` with your GitHub connector right after queuing. With `--fallback-local`, it renders locally if the runner has not started within 12 min.
2. **Write the props**:
   - Sample to edit: `ams sample <Template> out/<name>.json`
   - Course lesson: `ams course <n>` (16:9) or `ams course <n> --short` (9:16). Lessons come from `public/course/pianova.json` (26 lessons, brand `pianova`).
   - Edit with the rules in `references/script-format.md`. The key points: every scene has `say` (the Persian narration, which also sets the scene length); the on-screen `title` is ≤ 7 words; mark accent words with `*star*`; use Persian digits.
3. **Look before rendering**: run `ams still <Template> <props> --frame 90` and view the PNG (about 1 min). Check that the Persian text joins correctly and nothing is clipped.
4. **Render**:
   - `ams render <Template> <props>` gives the final 1080p file.
   - Add `--draft` for a 540p preview (about 2× faster). Use this for every first look.
   - Add `--hq` for the final upload of an important video: JPEG 100, CRF 15 and x264 slow, so the sharpest Persian text. It takes about 1.5× longer.
   - Or run `ams cloud <Template> <props> --title <ascii_name>`. It blocks until done (it polls every 20 s) and downloads mp4 + srt + chapters + mp3 + narration.md/json into `out/`.
   - For long jobs, use `--no-wait` and then `ams status <id>`.
5. **QA**: run `ams qa out/<file>.mp4`, then score the contact sheet with `references/quality-playbook.md`.
   - Score it out of 10. If it is below 9, revise the props and re-render, at most 2 revisions. This stops endless loops and wasted tokens.
   - It must say `youtubeReady: true`. Then view the `.sheet.png` contact sheet yourself.
   - If something fails, fix the props and re-render. Never deliver a file that failed QA.
6. **Narration prompt (always)**: every render writes `<file>.narration.md` and `.narration.json` next to the MP4. It holds:
   - a timed scene-by-scene script, with the maximum seconds each scene's voice can take
   - a Gemini-TTS / ChatGPT-voice director prompt (audio profile → scene → director's notes → transcript)
   - an ElevenLabs v3 audio-tag version
   - plain TTS text
   - a self-recording sheet
   For a pack without rendering, run `ams narration <Template> <props>`. If you edit `say` lines, run it again.
7. **Deliver**: send the MP4, the SRT, the chapters **and the `.narration.md`** to the user's Google Drive or the private Telegram bot chat, with a YouTube title, a description (with chapters) and tags drafted in Persian. Ask before any upload to YouTube (see Operating Rules).

## Output Contract
Reply in Persian, short:
- Template, brand, length, resolution, size, LUFS and the QA verdict
- Links or attachments: MP4, SRT, chapters, contact sheet, **narration.md**
- **The narration prompt**: paste section ۲ of `<file>.narration.md` (the director prompt and transcript) into the reply inside a code block. That way the user can copy it straight into any AI voice tool.
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
- `references/quality-playbook.md`: what really improves the output (render settings, script, voice, design) and the 10-point self-review
- Full docs in the repo: `README.md`, `AGENTS.md`, `docs/GUIDE_SIMPLE.md`, `docs/YOUTUBE_GROWTH.md`
