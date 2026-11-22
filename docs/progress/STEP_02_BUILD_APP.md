# STEP 02 — ساخت اپ (کد قالب‌ها + رابط کاربری + بک‌اند ابری)

تاریخ: 2026-11-22 · وضعیت: کد کامل نوشته شد، در حال تست

## مسیر پروژه
`/home/user/workspace/ali-motion-studio/` (در GitHub: `alibitcoin666-code/ali-motion-studio` — عمومی)

## معماری نهایی
- فرانت: Vite + React 19 + Remotion 4.0.545 (`@remotion/player` پیش‌نمایش زنده، `@remotion/web-renderer` رندر MP4 داخل مرورگر با WebCodecs).
- رندر ابری رایگان بدون کلید: اپ → `POST /api/jobs` روی Cloudflare Worker (KV) → GitHub Actions هر ۵ دقیقه صف را می‌خواند (`scripts/render-job.mjs --queue`) → Remotion SSR (H.264, CRF 18, yuv420p, AAC 320k) → فایل در GitHub Release با تگ `renders` → لینک به Worker برمی‌گردد.
- میزبانی وب: GitHub Pages (`https://alibitcoin666-code.github.io/ali-motion-studio/`) + آینه روی Worker (`https://ali-motion-studio.ali-bitcoin666.workers.dev`).
  دلیل: محیط API کلادفلر اجازه fetch بیرونی ندارد و آپلود assetها با کد سخت بود؛ Worker از GitHub Pages پروکسی و کش می‌کند.

## فایل‌های کلیدی
| فایل | نقش |
|---|---|
| `src/remotion/theme.ts` | برندها: ali / pianova / mr69، ابعاد، FPS=30، `toFa` |
| `src/remotion/fonts.ts` | فونت‌ها: Vazirmatn FD، Estedad، Lalezar، Playfair؛ `ensureFonts` و `useFontsReady` |
| `src/remotion/components/core.tsx` | Stage، Backdrop، Words (تایپوگرافی متحرک RTL کلمه‌به‌کلمه، `*هایلایت*` چندکلمه‌ای)، Badge، SubscribeCTA، ... |
| `src/remotion/components/Keyboard.tsx` | کیبورد پیانو SVG با نام نت فارسی و شماره انگشت |
| `src/remotion/templates/*.tsx` | ۷ قالب: PianoLesson، PianoTip، ChordScale، KineticQuote، BrandIntro، MusicRelease، EndScreen |
| `src/remotion/registry.ts` | تعریف قالب‌ها (نام فارسی، فیلدهای فرم، props پیش‌فرض، محاسبه مدت) |
| `remotion/index.ts`, `remotion/Root.tsx` | ورودی Remotion CLI/SSR |
| `src/app/App.tsx`, `styles.css` | رابط فارسی RTL تیره |
| `worker/index.js` | API صف + آپلود فایل + آینه سایت |
| `scripts/render-job.mjs` | رندر سروری (`--queue`، `--local`، `--job`) |
| `.github/workflows/render-queue.yml` | cron هر ۵ دقیقه + اجرای دستی |

## اصلاحات انجام‌شده در تست‌ها
- هایلایت چندکلمه‌ای `*دو ماژور*` ستاره نشان می‌داد → `tokenizeMarked` اضافه شد.
- فرمول آکورد `1 – b3 – 5` در RTL جابه‌جا می‌شد → داخل `<bdi dir=ltr>` و تبدیل b به ♭.
- Player داخل صفحه RTL جابه‌جا می‌شد → wrapper با `dir="ltr"`.
- فونت FD اعداد لاتین ورودی نت‌ها را فارسی نشان می‌داد → ورودی‌های LTR با فونت monospace.
- مسیر فونت‌ها برای زیرمسیر GitHub Pages → `fontUrl()` نسبی + `base: './'`.

## قدم بعدی
STEP_03: تست رندر مرورگر و سرور، ساخت مخزن، دیپلوی Worker و Pages، تنظیم secret.
