# مرحله ۳ — انتشار، تست و بهینه‌سازی (Ali Motion Studio)

تاریخ: ۲۰۲۶-۱۱-۲۲ — وضعیت: انجام شد

## آدرس‌ها
- نسخه وب اصلی (Cloudflare Worker + API): https://ali-motion-studio.ali-bitcoin666.workers.dev
- نسخه وب پشتیبان (GitHub Pages): https://alibitcoin666-code.github.io/ali-motion-studio/
- مخزن عمومی: https://github.com/alibitcoin666-code/ali-motion-studio
- رندرهای ابری و نمونه‌ها: Release با تگ `renders` در همان مخزن
- نمونه‌ها در Google Drive: https://drive.google.com/drive/folders/1utqGlDeHxFUfEWGNXpQUrkHDMn1KZWf2

## معماری انتشار
- فرانت‌اند: Vite + React + Remotion Player روی GitHub Pages (workflow `pages.yml`، با هر push خودکار منتشر می‌شود).
- Worker کلادفلر `ali-motion-studio`: فرانت را از Pages پروکسی/کش می‌کند و `/api` را سرو می‌کند.
  - KV: `ali-motion-studio-jobs` (id `1cc09c4396ef49a38f6b09689eab2217`)
  - secret: `QUEUE_SECRET` (در GitHub Secrets هم ست شده، در هیچ فایلی ذخیره نشده)
  - محدودیت: ۶ کار رندر برای هر IP در ساعت
- رندر ابری: workflow `render-queue.yml` (cron هر ۵ دقیقه + اجرای دستی) صف را از Worker می‌خواند، با Remotion رندر می‌کند (H.264، CRF 18، yuv420p، AAC 320k، BT.709) و خروجی را در Release `renders` آپلود می‌کند. فایل‌های قدیمی‌تر از ۱۴ روز پاک می‌شوند.
- Workerهای دیگر حساب (ali-automation، ali-motion-factory، hermes-ai-bot) دست نخورده‌اند.

## تست‌ها
| تست | نتیجه |
|---|---|
| TypeScript (`tsc --noEmit`) | بدون خطا |
| تست UI و سوییچ بین همه ۷ قالب روی نسخه زنده | بدون خطای کنسول |
| رندر داخل مرورگر (WebCodecs) BrandIntro، ۵ ثانیه، 1080p | موفق، حدود ۷۵ ثانیه روی CPU ضعیف، H.264 High معتبر |
| رندر ابری end-to-end (KineticQuote، 9:16) | موفق، حدود ۴۰ ثانیه رندر، 1080x1920، 2.3MB |
| چک بصری هر قالب در ۳ فرمت 16:9 / 9:16 / 1:1 | بعد از اصلاحات، بدون همپوشانی و بیرون‌زدگی |
| درستی متن فارسی (اتصال حروف، RTL، اعداد فارسی، اکورد و فرمول) | درست |

## اصلاحات این مرحله
- MusicRelease: صفحه وینیل روی متن نمی‌افتاد؛ کاور در حالت عمودی از کادر بیرون نمی‌زند.
- فرمت مربع (1:1): چیدمان ستونی با مقیاس ۰.۷۴ و کیبورد جمع‌وجورتر (حداکثر ۷۸٪ عرض).
- ChordScale در 16:9: کیبورد و پرتوها کوچک‌تر شد تا برچسب نت‌ها و نکته پایین بریده نشوند.

## نمونه خروجی‌ها (`out/`، Release و Drive)
sample_PianoLesson، sample_PianoTip، sample_ChordScale، sample_KineticQuote، sample_BrandIntro، sample_MusicRelease، sample_EndScreen — همه H.264 yuv420p، بین 0.5 تا 3.6MB.

## تلگرام
ربات هنوز هیچ پیامی دریافت نکرده بود و chat id پیدا نشد، پس ارسال انجام نشد. برای ارسال بعدی: یک بار به ربات `/start` بدهید، سپس chat id از getUpdates خوانده می‌شود. (به کانال‌های عمومی چیزی ارسال نمی‌شود.)

## ادامه کار در هوش مصنوعی دیگر
1. `git clone https://github.com/alibitcoin666-code/ali-motion-studio && npm ci`
2. توسعه: `npm run dev` — بیلد: `npm run build` — رندر محلی: `node scripts/render-job.mjs --local <Template> "<propsJSON>" out/x.mp4`
3. قالب جدید: فایل در `src/remotion/templates/` + ثبت در `src/remotion/registry.ts`.
4. Worker: کد در `worker/index.js`؛ برای استقرار مجدد از API کلادفلر (PUT scripts/ali-motion-studio با همان bindings) استفاده کنید.
5. قوانین: کانال یوتیوب @Alibaghbani1hand در Hard Freeze است؛ انتشار خودکار ممنوع؛ هیچ کلیدی در فایل یا مخزن نوشته نشود.
