# STEP 01 — Research & Context (2026-11-22)
Project: **Ali Motion Studio** — free, cloud/browser-based motion graphics (and Remotion) video generator for Ali Baghbani's piano niche.

## User niche (from master archive)
- Ali Baghbani — one-handed (left-hand) pianist, composer, piano educator. Slogan: ONE HAND, ONE DREAM / یک دست، یک رویا.
- Brand look: premium, dark, cinematic, minimal. Palette: black #0B0B0C, charcoal #1A1A1D, restrained gold #C9A45C, deep orange #C8561E.
- Independent brands (never mix): Ali Baghbani artist (alipiano.ir), Pianova/@Pianovali (piano channel), Music Radio 69 ("Feel the Music", black/gold metallic).
- HARD FREEZE: never write/publish to youtube.com/@Alibaghbani1hand (OAC pending). App must never auto-publish there.
- Weak laptop (Win11, GeForce 840M) → everything browser/cloud-first, lightweight. Persian RTL UI, Vazirmatn font.

## Research findings (sources)
- Remotion: free for individuals & teams ≤3 (https://www.remotion.dev/docs/license/pricing). React-based video; renders with headless Chrome → perfect Persian shaping.
- @remotion/web-renderer: client-side MP4 render in browser, stable since v4.0.491 (https://www.remotion.dev/docs/client-side-rendering/). DOM is emulated onto canvas; limited CSS subset (no backdrop-filter, no perspective) (https://www.remotion.dev/docs/client-side-rendering/limitations).
- Remotion on GitHub Actions: workflow_dispatch with input props → MP4 artifact (https://www.remotion.dev/docs/ssr/).
- Remotion RTL/Persian guidance: dir="rtl", don't split Arabic letters without ZWJ, avoid letterSpacing (https://github.com/remotion-dev/skills/blob/main/skills/remotion-markup/arabic-text.md).
- Alternatives reviewed: Motion Canvas (MIT, explainer-style), Revideo (fork of Motion Canvas), HyperFrames (Apache-2.0 HTML→MP4), givemotion (MIT). Remotion chosen: best ecosystem + browser player + in-browser render + GitHub Actions render.
- Vazirmatn font: https://github.com/rastikerdar/vazirmatn (OFL).
- YouTube upload spec: MP4, H.264 High profile, AAC, progressive, 1080p ≈ 8 Mbps @30fps (https://support.google.com/youtube/answer/1722171).
- prompt-motion.com: gallery of AI/code motion graphics. Techniques adopted: kinetic type with per-glyph springs on a BPM grid, deterministic seek(t), mask wipes, oscilloscope style, beat-synced visuals, collision-driven notes, synced lyrics. Samples saved in research/prompt_motion_samples.md.

## Connected accounts (verified live)
- Cloudflare: account b5aeff1b1245234c658f112c6c2f09e7, workers subdomain ali-bitcoin666.workers.dev (API works).
- GitHub: gh CLI works. Google Drive: gws CLI. Telegram: bot connector (send video/text).

## Architecture decision
Vite + React + Remotion Player (preview) + @remotion/web-renderer (in-browser MP4) + GitHub Actions cloud render (server Chrome, YouTube-grade H.264). Hosted on Cloudflare Workers static assets.
