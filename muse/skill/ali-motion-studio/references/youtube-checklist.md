# YouTube checklist (checked by `ams qa`)

| Item | Target |
|---|---|
| Container / video | MP4, H.264 High, yuv420p, 30 fps, CRF 18 (Google's recommended upload settings) |
| Size | 1920×1080 (lessons) or 1080×1920 (Shorts). `--draft` output is 960×540 and is for preview only. |
| Audio | AAC 320 kbps 48 kHz, −14 LUFS integrated (±1.5), true peak ≤ −1 dBFS |
| Black frames | none |
| Shorts | vertical, ≤ 3 min (aim 20–45 s) |
| Side files | `.srt` (upload as Persian subtitles), `.chapters.txt` (paste into description), `.mp3` (podcast/Telegram) |

## Metadata template (Persian)
- **Title (≤ 60 chars):** keyword + promise, e.g. «آموزش پیانو از صفر — جلسهٔ ۱: نشستن درست و دوی میانی»
- **Description:**
  1. Line 1 is the promise.
  2. Then the chapters from `.chapters.txt`.
  3. Then the next lesson and playlist links.
  4. End with the site (alipiano.ir for brand `ali`, @Pianovali for `pianova`) and 3 hashtags.
- **Tags (10):** آموزش پیانو, پیانو از صفر, یادگیری پیانو, نت خوانی پیانو, piano tutorial persian, … (topic-specific).
- **Thumbnail:** use the hook frame (frame ~45) via `ams still … --frame 45`, then add 3–4 big words. Keep the mascot visible.

## Publishing (needs explicit user approval per video)
- @Alibaghbani1hand: **never** (hard freeze).
- @Pianovali / other channels: private or unlisted draft only. The user flips it to public.
