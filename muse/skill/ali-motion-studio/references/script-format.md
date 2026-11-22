# Props and scene format (narrated templates: LessonPro, TipShort, ChordDay, KineticQuote)

```json
{
  "brand": "ali | pianova | mr69",
  "theme": "noir | midnight | neon | cream   (empty = brand default)",
  "format": "16:9 | 9:16 | 1:1",
  "variant": "lesson (16:9 lesson layout) | tip (Shorts layout, big word-by-word captions)",
  "voice": "farid (male) | dilara (female) | none",
  "music": "lesson | tip | luxe | none",  "musicVolume": 0.5,
  "captions": true, "sfx": true, "mascot": true,
  "courseTitle": "پیانو از صفر", "episode": "۱",
  "voicePack": null,
  "scenes": [ ... ]
}
```
Keep `voicePack: null` when you change any `say`. The renderer makes new narration only for the changed lines and reuses the rest.

## Scene kinds and their fields
| kind | Persian | fields used | notes |
|---|---|---|---|
| hook | قلاب شروع | title | first 2–3 s: a surprising number or a common mistake |
| title | عنوان | title, text | lesson name and one-line promise |
| explain | توضیح | title, items[], text | up to 4 bullets |
| keyboard | کیبورد | title, text, notes, fingers, mode | `notes: "C4 D4 E4"`, `fingers: "1 2 3"`; keys light up and play real piano |
| staff | حامل و نت | title, notes | treble staff + Persian note names |
| chord | آکورد | chord, title, text | `chord: "Am"`, `"C"`, `"G7"`, `"Dm"`, `"Fmaj7"`… arpeggio and then the block chord |
| compare | اشتباه / درست | title, wrong, right | red ✗ vs green ✓ cards |
| wrong / right | اشتباه / درست | title, text, notes(, fingers) | Shorts pair |
| steps | گام‌به‌گام | title, items[] | numbered steps |
| quiz | کوییز | text (question), items[4], answer (0-3) | 3 s countdown, then reveal |
| recap | جمع‌بندی | title, items[] | check-list |
| punch | جملهٔ طلایی | title | one strong sentence |
| cta | دعوت | title | follow / subscribe |
| outro | پایان | title, text | end screen with subscribe, playlist and next video |

Every scene also takes `say` (narration, required for timing), `label` (chapter name, 16:9 only), `pose` (optional: talk, point, present, wave, think, shrug, celebrate) and `min` (minimum seconds).

## Writing rules (Persian)
- `title` should be 7 words or fewer, with 1–2 accent words in `*stars*`. Use Persian digits (۱۲۳) and the half-space (‌) correctly: «می‌کنند», «جلسهٔ».
- Write `say` as natural spoken Persian, one idea per scene, 1–3 sentences, about 2.6 words per second for lessons. Do not read the title verbatim; expand on it.
- Note names: on screen use Persian (دو ر می فا سل لا سی). In `notes` fields use scientific pitch (C4 = middle C).
- Retention:
  - hook ≤ 3 s
  - change the visual every 4–8 s
  - quiz before recap in lessons
  - Shorts end on a loopable punch line plus a CTA of 3 s or less
- Shorts: 20–45 s total. Lessons: 90–240 s.

## Minimal TipShort example
```json
{"brand":"ali","theme":"midnight","format":"9:16","variant":"tip","voice":"farid","music":"tip","voicePack":null,
 "scenes":[
  {"kind":"hook","title":"چرا *ریتمت* می‌لنگد؟","say":"ریتمت موقع نواختن می‌لنگد؟ این یک ترفند ساده است."},
  {"kind":"wrong","title":"اشتباه","text":"شمردن *در ذهن*","notes":"C4 E4 G4","say":"بیشتر مبتدی‌ها فقط در ذهن می‌شمارند."},
  {"kind":"right","title":"درست","text":"شمردن *بلند* با مترونوم","notes":"C4 E4 G4","fingers":"1 3 5","say":"بلند بشمار و مترونوم را روی شصت بگذار."},
  {"kind":"punch","title":"*بلند* بشمار، *دقیق* بزن","say":"بلند بشمار، دقیق بزن."},
  {"kind":"cta","title":"برای نکته‌های بیشتر *دنبال* کن","say":"برای نکته‌های بیشتر دنبال کن."}]}
```

## FallingNotes / LogoIntro (not narrated)
- FallingNotes: `{"song":"ode|twinkle|elise|minuet","hands":"both|right","tempo":1,"speed":2.2,"showNames":true,"title":""}`
- LogoIntro: `{"seconds":5,"slogan":"","line":"جلسهٔ ۳ — اولین ملودی"}`
