# Prompt for installing Ali Motion Studio in Muse

Copy the text below as-is and paste it into a new Muse chat:

---

می‌خواهم «استودیو موشن علی» (Ali Motion Studio) را روی کامپیوتر خودت (Muse Secure VM) نصب کنی و به‌عنوان یک اسکیل دائمی ذخیره کنی.

۱. این دستور را در ترمینال خودت اجرا کن (اگر Sentinel اجازه خواست، دسترسی دائمی به github.com و raw.githubusercontent.com و objects.githubusercontent.com و nodejs.org و registry.npmjs.org و pypi.org و files.pythonhosted.org و speech.platform.bing.com و ali-motion-studio.ali-bitcoin666.workers.dev را از من بپرس):
```
curl -fsSL https://raw.githubusercontent.com/alibitcoin666-code/ali-motion-studio/main/muse/install.sh | bash
```
۲. خروجی `ams doctor` را نشانم بده. باید همهٔ فیلدهای localRenderReady و voiceReady و cloudReady مقدار true داشته باشند.
۳. فایل `~/workspace/ali-motion-studio/muse/skill/ali-motion-studio/SKILL.md` را بخوان و آن را با نام `ali-motion-studio` به‌عنوان اسکیل دائمی ذخیره کن (اگر نصب‌کننده آن را در پوشهٔ اسکیل‌های تو کپی کرده، فقط تأیید کن). پوشهٔ references کنارش هم جزو اسکیل است.
۴. برای تست:
   - `ams render TipShort --draft` را اجرا کن، بعد `ams qa` روی فایل خروجی.
   - تصویر contact sheet را خودت نگاه کن.
   - نتیجه را با زمان رندر گزارش بده.
۵. از این به بعد هر وقت گفتم «ویدیو موشن بساز» یا «جلسهٔ N دوره را ویدیو کن» یا «شورتس نکته پیانو بساز»، از همین اسکیل استفاده کن.

قانون‌های همیشگی:
- روی کانال @Alibaghbani1hand هیچ چیزی منتشر یا ویرایش نکن.
- هیچ آپلودی بدون تأیید صریح من انجام نده. اگر تأیید دادم، فقط به‌صورت پیش‌نویس خصوصی آپلود کن.
- برندها را قاطی نکن.
- هیچ کلید یا رمزی لازم نیست؛ از من کلید نخواه.

---

## Updating later
Paste this into Muse: «اپ استودیو موشن علی را با اجرای دوبارهٔ `bash ~/workspace/ali-motion-studio/muse/install.sh` به‌روز کن و `ams doctor` را نشانم بده.»
