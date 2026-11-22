# مرحله ۱۱: انتقال استودیو به Muse (Meta)

## وضعیت
انجام و تست شد. کامیت روی main است.

## کارهای انجام‌شده
- `muse/install.sh`، نصب‌کنندهٔ یک‌خطی و idempotent. همه‌چیز را در `~/.local` نصب می‌کند و بعد از ری‌استارت VM باقی می‌ماند. شامل این موارد است:
  - Node 24
  - npm ci
  - ffmpeg استاتیک (BtbN)
  - edge-tts در venv
  - Chrome headless
  - wrapper دستور `ams`
  - کپی اسکیل
- `muse/boot.sh`، که بعد از ری‌استارت کتابخانه‌های Chrome را برمی‌گرداند.
- `scripts/ams.mjs`، ابزار CLI با دستورهای doctor, templates, sample, course, still, render [--draft], cloud, status, qa.
- `muse/skill/ali-motion-studio/`، شامل SKILL.md و references (script-format و youtube-checklist).
- `muse/INSTALL_PROMPT.md`، پیام آماده برای کپی در Muse.
- `muse/README.md`، راهنمای فارسی.

## نتیجهٔ تست
تست روی ماشینی با همان مشخصات Muse انجام شد: ۲ vCPU و ۷.۸ گیگ رم، با HOME خالی و بدون node یا python سیستمی.
- نصب کامل حدود ۲ دقیقه طول کشید و doctor همهٔ موارد را true نشان داد.
- smoke still ساخته شد.
- `render TipShort --draft`: ۶۶ ثانیه، بلندی صدا ‎-14 LUFS، true peak ‎-1.4، بدون فریم سیاه.
- `course 1 --short` ساخته شد: ۹ صحنه.
- `cloud KineticQuote` در صف ابری ثبت شد.

## ادامه در هوش مصنوعی دیگر
- متن INSTALL_PROMPT را در Muse بفرست.
- اگر خطا داد، خروجی `ams doctor` را بررسی کن و بخش «رفع مشکل» در muse/README.md را ببین.
