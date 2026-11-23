# Ali Motion Studio: Complete Project Handoff File

Last updated: 2026-11-23 (step 12: narration prompt and quality). Read this file first, then continue the work.

## 1. Who and what
- **User:** Ali Baghbani, piano teacher. Speaks Persian, with a weak laptop (Win11, GeForce 840M).
- **Goal:** A free Persian motion graphics video production system for piano lessons and tips, outputting YouTube quality, with nothing running on the user's own computer. Inspired by prompt-motion.com.
- **Separate brands, never to be mixed:**
  - Ali Baghbani / alipiano.ir (logo: "ALi Piano.IR")
  - Pianova / @Pianovali
  - Music Radio 69

## 2. Permanent rules (critical)
- Never publish, edit or upload anything on https://www.youtube.com/@Alibaghbani1hand (HARD FREEZE).
- No automatic publishing. Every upload needs explicit approval and goes out only as a private draft.
- No keys or secrets in files or the repository. The repository is public.
- Telegram: only the private bot chat. No public channel.
- Music: public domain only.
- Ask the user questions as four-option multiple choice. Answer in brief Persian with no emojis.
- After every step, save an md file in `docs/progress/STEP_XX_*.md`.
- The user's accounts (GitHub, Cloudflare, Google Drive, Telegram, Muse) are connected. Don't ask for keys again.

## 3. Addresses
| Item | Address |
|---|---|
| Repository (public) | https://github.com/alibitcoin666-code/ali-motion-studio |
| Web app (Cloudflare Worker) | https://ali-motion-studio.ali-bitcoin666.workers.dev |
| Web app (GitHub Pages) | https://alibitcoin666-code.github.io/ali-motion-studio/ |
| Cloud render queue | Worker `POST /api/jobs` (no key) → GitHub Actions `render-queue.yml` every 5 minutes → output in release `renders` |
| Download output | `GET /api/render/<name>` on the Worker |
| Samples on Drive | folder id `1utqGlDeHxFUfEWGNXpQUrkHDMn1KZWf2` |
| Telegram | private bot @onlineali666ila_bot, chatId 509026353; video upload via URL has a 20MB limit |

The Worker's QUEUE_SECRET is only a GitHub/Cloudflare secret. It must never be committed.

## 4. Technical stack
- Vite 8, React 19, Remotion 4.0.545 and TypeScript.
- Fonts: Vazirmatn plus Lalezar for headings, with correct RTL rendering.
- Voice: edge-tts, Persian voices farid and dilara. Voice chain: highpass → eq → compressor → loudnorm, mastered to -14 LUFS with true peak ≤ -1.
- Subtitles: SRT output for every video.
- Character: the user's logo (piano keys with hands) as an animated mascot, `src/v3/mascot/Mascot.tsx`, with poses idle, talk, point, present, wave, celebrate, think and shrug.
- Free cloud render: GitHub Actions. Local render: `scripts/render-job.mjs`.

## 5. Templates (v3, registry: `src/v3/registry.ts`)
| Template | Format | Use |
|---|---|---|
| LessonPro | 16:9 | full lesson, scene-based |
| TipShort | 9:16 | 30-second tip/technique |
| FallingNotes | 16:9/9:16 | falling notes (ode, twinkle, elise, minuet) |
| ChordDay | 9:16 | chord of the day |
| KineticQuote | 9:16 | kinetic typography motivational quote |
| LogoIntro | 16:9 | ALi Piano.IR logo intro |

Main props:
- `brand`: ali, pianova or mr69
- `theme`: noir, midnight, neon or cream
- `voice`: farid or dilara
- `music`: lesson, tip, luxe or none
- `scenes[]`, where each scene has a `say` field (narration) plus the display fields for its scene kind

Scene kinds: hook, title, explain, keyboard, staff, chord, compare, wrong, right, steps, quiz, recap, punch, cta, outro.

The full schema is in `muse/skill/ali-motion-studio/references/script-format.md`.

## 6. Version history
- **v1:** web app, fixed templates, Vazir font, cloud queue (STEP_01 to STEP_04).
- **v2:** simple guide, Telegram, ZIP import, whiteboard and stickman templates (STEP_05 to STEP_06).
- **v3:** complete rewrite of quality, animation, typography, voice and subtitles. The logo replaces the stickman. Commits 1b8fa78 and 056cf92 (STEP_08 to STEP_10).
- **v3.1 / Muse:** installer, `ams` CLI and Muse skill. Commits c75d953 and ffe5cd7 (STEP_11).
- **v3.2:** narration prompt pack next to every video (`scripts/narration.mjs`); JPEG 95 / `--hq` / 384k audio; quality playbook; `ams cloud` starts the runner immediately and supports `--fallback-local` (STEP_12).

## 7. Running inside Muse (Meta)
**Muse VM:**
- 2 to 4 vCPUs, about 7.7GB RAM, no GPU.
- Ubuntu 24.04.
- Only `/home/hatch` is persistent.
- Internet access goes through Sentinel, which requires domain approval.

**Chosen route:** Muse is the director (script, props, still, Shorts render, QA), and long lessons go to `ams cloud`.

**Install:** paste the text from `muse/INSTALL_PROMPT.md` into Muse. The installer:
- runs `curl -fsSL https://raw.githubusercontent.com/alibitcoin666-code/ali-motion-studio/main/muse/install.sh | bash`
- puts Node, ffmpeg, the edge-tts venv and Chrome into `~/.local`
- adds the `ams` wrapper
- copies the skill to `~/workspace/skills` or `~/workspace/custom-skills`

`muse/boot.sh` restores the Chrome libraries after a restart.

**Commands:**
```
ams doctor | templates | sample <T> | course <n> [--short] | still <T> [props]
ams render <T> [props] [--draft|--hq] [--out f.mp4] | narration <T> [props] | cloud <T> [props] [--title] [--no-wait] [--fallback-local]
ams status <job> | qa <file.mp4>
```
Environment variables: FFMPEG, FFPROBE, PYTHON, AMS_BROWSER, AMS_CONCURRENCY, AMS_DRAFT, AMS_API.

**Test times** (2-core / 7.8GB machine):

| Task | Time |
|---|---|
| Clean install | about 2 minutes |
| TipShort draft | 66 s |
| Full TipShort | 4 to 5 minutes |
| LogoIntro | about 1 minute |
| 103-second LessonPro | about 13 minutes (use cloud) |

### Muse's actual install result (from the user)
- doctor reported everything true: 4 CPUs, 134GB disk.
- The skill was saved to `~/workspace/custom-skills/ali-motion-studio/`.
- `ffmpegFullChain: false`. The full ffmpeg download didn't finish because Sentinel had not approved the `release-assets.githubusercontent.com` domain. That domain is now added to the list. Fix: approve the domain and run install.sh again.
- Muse stopped before the test render because its security check flagged SKILL.md as able to run code. This is a generic warning: the skill does contain commands, but the repository belongs to the user. The fix is for the user to approve it.

### Muse's second install result (from the user)
- ffmpegFullChain true and all Ready fields true. Muse has 4 CPUs.
- The skill is at `~/workspace/custom-skills/ali-motion-studio/`.
- TipShort --draft took 130 s on Muse. QA passed apart from the draft size.

### Step 12 (narration)
- Every render writes `<name>.narration.md` and `.narration.json` with these parts:
  - the timed scene table
  - a Gemini/ChatGPT director prompt
  - the ElevenLabs v3 audio-tag version
  - plain text
  - the self-recording sheet
- The skill puts section 2 into Muse's reply.
- In the cloud, md/json files are direct public GitHub release links, because the Worker only proxies mp4/mp3/srt/txt.
- Known issue: GitHub cron is unreliable and was once late for 3 hours. Fix: `ams cloud` runs `gh workflow run`, Muse can use its GitHub connector, and `--fallback-local` is available.

## 8. Next step (for the next AI)
1. Tell Muse to run `bash ~/workspace/ali-motion-studio/muse/install.sh` again for the update (step 12). Then render one TipShort and check that the narration.md file appears next to it.
2. With the user's approval, run:
   - `ams render TipShort --draft`
   - `ams qa` on the output, then review the contact sheet
3. Then run `ams course 1 --short` followed by `ams cloud LessonPro out/lesson1_short.props.json --title "جلسه ۱"`.
4. Suggestions not yet built:
   - Private YouTube draft for Pianova only, with approval
   - Weekly Muse cron: 3 Shorts, previews to the private Telegram bot
   - Muse's 10-second AI clips as B-roll for the hook
   - A teaser for each of the course's 20 sessions

## 9. Important files
- `src/v3/`: templates, scenes, mascot, theme, timeline and music (chord parser)
- `src/app/`: web UI (ScenesEditor and others)
- `scripts/render-job.mjs`: render
- `scripts/tts.py`: voice
- `scripts/ams.mjs`: CLI
- `muse/`: install.sh, boot.sh, INSTALL_PROMPT.md, README.md, skill/
- `.github/workflows/render-queue.yml`: cloud queue
- `docs/progress/STEP_01 … STEP_11`: step-by-step reports
- `AGENTS.md`: guide for coding AIs

Commit rule: author alibitcoin666-code, plus the trailer `Co-authored-by: Perplexity <noreply@perplexity.ai>`.
