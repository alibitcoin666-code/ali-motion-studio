# Quality playbook: what actually improves the output

Only changes that have been measured or documented are listed here. Sources are next to each item.

## 1. Render settings (already in the studio)
| Setting | Value | Why |
|---|---|---|
| JPEG frame quality | 95 by default, 100 with `--hq` | In Remotion's tests, moving from JPEG 80 to 95 raised VMAF from 95.4 to 97.1 on small UI text, and from 90.3 to 91.5 on text over colour. On text-heavy work this costs about 0 to 20% more time. https://github.com/remotion-dev/remotion/issues/11441 |
| CRF | 18 by default, 15 with `--hq`, 26 for draft | CRF is the main quality setting. https://www.remotion.dev/docs/quality |
| Colour | `bt709` | It gives more accurate colour and will become the default in Remotion 5. YouTube also asks for BT.709 on SDR uploads. https://www.remotion.dev/docs/quality · https://support.google.com/youtube/answer/1722171 |
| Container and codec | MP4, H.264 High, 4:2:0, faststart | YouTube's recommended upload settings. https://support.google.com/youtube/answer/1722171 |
| Audio | AAC 384k, 48 kHz, −14 LUFS, true peak ≤ −1 | YouTube recommends 384 kbps for stereo audio at 48 kHz. https://support.google.com/youtube/answer/1722171 |
| GPU effects | Avoid heavy blur, shadows and WebGL | The Muse VM has no GPU, and these effects become the bottleneck on cloud machines. https://www.remotion.dev/docs/performance |
| Concurrency | Use the default. Use `AMS_CONCURRENCY=1` only if RAM runs out | `npx remotion benchmark` finds the best value. https://www.remotion.dev/docs/performance |

## 2. Script (what holds retention)
- The hook goes in the first 2 seconds, as a question or a pain point the viewer recognises ("دستت زود خسته می‌شود؟").
- One idea per scene, and an on-screen title of no more than 7 words.
- Show a wrong way next to the right way (the `compare` / `wrong` / `right` scene kinds). It is the clearest teaching pattern.
- Keep the narration speed between 2.0 and 2.4 words per second. `narration.md` shows the speed of the current video.
- Write numbers and note names the way they are spoken. Mark ezafe where it could be misread (وزنِ آزادِ دست). Persian TTS guidance says correct ezafe and the right question/statement intonation are what make a voice sound natural. https://zharf.ai/en/blog/persian-text-to-speech-guide

## 3. Voice (the biggest quality jump)
- The free default is edge-tts. Microsoft blocks custom SSML in it, so it has no fine emotional control. https://github.com/rany2/edge-tts
- To make the voice more natural, use the narration prompt in `<file>.narration.md`:
  - **Gemini TTS**: give it an audio profile, scene and director's notes, then the transcript with inline [tags]. https://aistudio.google.com/learn/gemini-tts-prompt-guide-with-tags
  - **ElevenLabs v3**: use audio tags such as [excited], [curious] and [softly]. Use "..." and line breaks for pauses. Pick a voice with a wide emotional range. https://elevenlabs.io/blog/v3-audiotags
  - **The user's own voice**: follow the recording sheet. Record one file per scene, and keep each file under the scene's maximum seconds.
- Test any new voice on the same Persian paragraph, and listen on both a phone speaker and headphones. https://zharf.ai/en/blog/persian-text-to-speech-guide

## 4. Ten-point self-review (score each 0 or 1, deliver only at 9 or more)
1. The hook is clear and lands within the first 2 seconds.
2. The Persian text joins correctly. No letters are split and nothing is clipped at the edges.
3. Captions are in sync and stay out of the way of the keyboard and the mascot.
4. The keyboard or staff shows exactly the notes the narration names.
5. The fingering numbers are correct.
6. Only one brand appears: its logo, colours and handle.
7. `ams qa` reports −14 ±1.5 LUFS and no black segments.
8. No scene holds without motion for more than 3 seconds.
9. The ending has a clear call to action, such as subscribe or the next lesson.
10. `narration.md` exists and every scene's voice fits within its maximum seconds.

Revise at most 2 times. If the score still stays below 9, report what is wrong instead of looping.
