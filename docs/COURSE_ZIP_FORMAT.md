# Course ZIP format (importer spec)

The importer (`src/course/parse.ts`) accepts a ZIP with any top folder. Recognised files:

| Path | Content |
|---|---|
| `lessons/L01.md` … `L99.md` | One lesson. Sections: `## ۱. مشخصات` (bullets: شمارهٔ جلسه، عنوان، تاریخ انتشار `۱۴۰۵/۰۸/۲۳ (2026-11-14)، شنبه`، ساعت انتشار، هدف یادگیری، پیش‌نیاز), caption in a code block, card data in a ```` ```json ```` block, motion table `| ۰–۳ ثانیه | visual | on-screen text | effect |`, narration segments `[۰:۰۰–۰:۱۵]` followed by text (pause markers `[مکث ۰٫۵ ثانیه]`), `## پرامپت ... TTS`, `## ۶. تمرین` with `**تمرین ...:**`, `**معیار موفقیت:**`, `- سؤال:` and options `- ۱. ... ✅`. |
| `lessons/L01_caption.txt` | Telegram caption (overrides the code-block caption). |
| `captions/C01_caption.txt`, `F01_caption.txt` | Captions for curiosity / Friday posts. |
| `images/*_card.png` | Card images, matched by id (`L01_card.png`). |
| `*curiosity*.md` | `## C01 — date · time` blocks with `**قلاب:**`, `**واقعیت:**`, `**چرا جالب است:**`, `**پل به تمرین:**`, `**منبع:**`. |
| `*friday*.md` | `## F01 — date · time · قالب: ...` with `**کپشن:**`. |
| `*calendar*.csv` | Columns: روز, تاریخ شمسی, تاریخ میلادی, روز هفته, ساعت, نوع پست, عنوان, فایل کپشن, فایل تصویر, فایل ویدیو/صدا, هشتگ‌ها, وضعیت. |

Card JSON `hero`: `keyboard` (`highlights`: white-key indices from C4, or `bN` for black keys), `staff` (`notes`: `[[pos, label]]`, pos 0 = C4), `hand` (`hand_side`).

`lessonToScript()` turns a lesson into Whiteboard/Stickman scenes: one scene per narration segment (segment length = minimum scene length), on-screen text from overlapping motion rows, the hero drawing from the card, plus a quiz scene before the outro.

Build the bundled demo course: `bash scripts/course.sh <folder|zip> pianova`.
