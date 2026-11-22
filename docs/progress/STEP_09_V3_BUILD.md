# مرحله ۹ (v3) — ساخت موتور و اتصال اپ

تاریخ: ۲۰۲۶-۱۱-۲۲ · پروژه: `/home/user/workspace/ali-motion-studio` · مخزن: github.com/alibitcoin666-code/ali-motion-studio

## انجام شد
- `src/v3/registry.ts`: شش قالب ثابت — LessonPro (۱۶:۹)، TipShort (۹:۱۶)، FallingNotes، ChordDay، KineticQuote، LogoIntro. هر قالب: id, nameFa, descFa, category, defaultFormat, component, defaultProps, fields, duration, inspiration, scripted.
- `remotion/Root.tsx` از رجیستری v3 و `calculateMetadata` (ابعاد و مدت بر اساس قطع و نریشن).
- `scripts/tts.py`: edge-tts فارسی (fa-IR-FaridNeural / DilaraNeural) با زمان هر کلمه (WordBoundary)، زنجیرهٔ صدا (high-pass، EQ، کمپرسور، −16 LUFS)، بازگرداندن علائم نگارشی به کلمات.
- `scripts/render-job.mjs` (بازنویسی): صدا-اول → سرو محلی کلیپ‌ها → رندر → مسترینگ دو مرحله‌ای −14 LUFS → SRT کلمه‌ای + فصل‌ها + MP3. حالت‌ها: `--queue`، `--local`، `--job`، `--samples`، و نوع کار `tts` برای پیش‌نمایش با صدای واقعی در مرورگر.
- `src/v3/node-entry.ts`: همان کد زمان‌بندی اپ برای Node (با esbuild در لحظه بسته می‌شود).
- `public/voice/*.mp3` + `packs.json`: صدای از پیش ساخته‌شدهٔ نمونه‌ها (پیش‌نمایش وب از همان ابتدا حرف می‌زند).
- اپ: `App.tsx` (تم‌ها، تصویر کوچک قالب‌ها، تب‌های محتوا / صدا و نریشن / ظاهر / خروجی)، `ScenesEditor.tsx` (ورودی‌ها بر اساس نوع صحنه)، `NarrationPanel.tsx` (ساخت صدا در ابر، SRT، بستهٔ یوتیوب)، `youtube.ts`، `course/parse.ts` → صحنه‌های LessonPro.
- Worker: قالب‌های جدید، نوع کار `tts`، فقط URLهای https در voicePack، پسوند txt برای فصل‌ها.
- حذف کد v2: `src/remotion/*`، `src/narration/*`، `scripts/plan.ts`.
- رفع باگ: حروف آخر کلمه در زیرنویس کارائوکه به هم می‌چسبید (فاصله بین spanها اضافه شد)؛ علامت «،» جدا از کلمهٔ برجسته.
- تست: tsc بدون خطا؛ bundle سالم؛ استیل همهٔ قالب‌ها بررسی شد؛ رندر محلی TipShort با صدا: ۱۰۸۰×۱۹۲۰، ۲۹٫۷ ثانیه، ۱۵٫۴ مگابایت، −14 LUFS.

## قدم بعد (STEP_10)
رندر نمونه‌ها (LessonPro، FallingNotes، LogoIntro، ChordDay)، تست UI، build، commit/push، استقرار Worker، تست صف ابری، ارسال به تلگرام خصوصی و Drive، به‌روزرسانی مستندات.
