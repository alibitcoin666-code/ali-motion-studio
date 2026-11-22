#!/usr/bin/env python3
"""
Free Persian narration with word timings (edge-tts, Microsoft neural voices) + broadcast-style voice chain.

usage: python3 scripts/tts.py <clips.json> <out_dir> [voice] [> pack.json]
  clips.json = [{"key": "a1b2c3d4", "text": "..."}]   (keys come from src/v3/timeline.ts clipKey)
  writes <out_dir>/<key>.mp3 and prints {"<key>": {"file", "dur", "words": [{"w","t","d"}]}} to stdout.

Voice chain (ffmpeg): high-pass 80 Hz, de-mud 300 Hz, presence +2.5 dB @ 3.2 kHz, gentle compressor,
loudness-normalised to -16 LUFS (the final mix is mastered to -14 LUFS for YouTube).
"""
import asyncio, json, os, subprocess, sys, tempfile

FFMPEG = os.environ.get("FFMPEG", "ffmpeg")
FFPROBE = os.environ.get("FFPROBE", "ffprobe")

import edge_tts

VOICES = {"farid": "fa-IR-FaridNeural", "dilara": "fa-IR-DilaraNeural"}
RATE = {"farid": "-4%", "dilara": "-2%"}
CHAIN = ("highpass=f=80,equalizer=f=300:t=q:w=1.2:g=-2,equalizer=f=3200:t=q:w=1.5:g=2.5,"
         "acompressor=threshold=-20dB:ratio=3:attack=8:release=120:makeup=2,"
         "loudnorm=I=-16:TP=-1.5:LRA=9,aresample=48000")


def probe(f):
    out = subprocess.run([FFPROBE, "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f],
                         capture_output=True, text=True).stdout.strip()
    return float(out or 0)


PUNCT = "،؛؟!?.,:«»()\"'…-–—"


def attach_punct(words, text):
    """edge-tts boundaries drop punctuation; restore it from the source text (captions break on . ؟ !)."""
    toks = text.split()
    j = 0
    for w in words:
        for k in range(j, min(j + 4, len(toks))):
            if toks[k].strip(PUNCT) == w["w"].strip(PUNCT):
                w["w"] = toks[k]
                j = k + 1
                break
    return words


async def synth(text, voice, raw):
    words = []
    comm = edge_tts.Communicate(text, VOICES.get(voice, voice), rate=RATE.get(voice, "-3%"), boundary="WordBoundary")
    with open(raw, "wb") as fh:
        async for ch in comm.stream():
            if ch["type"] == "audio":
                fh.write(ch["data"])
            elif ch["type"] == "WordBoundary":
                words.append({"w": ch["text"], "t": round(ch["offset"] / 1e7, 3), "d": round(ch["duration"] / 1e7, 3)})
    return words


async def main():
    clips = json.load(open(sys.argv[1], encoding="utf8"))
    out_dir = sys.argv[2]
    voice = sys.argv[3] if len(sys.argv) > 3 else "farid"
    os.makedirs(out_dir, exist_ok=True)
    res = {}
    tmp = tempfile.mkdtemp()
    for c in clips:
        raw = os.path.join(tmp, c["key"] + ".raw.mp3")
        for attempt in range(4):
            try:
                words = await synth(c["text"], voice, raw)
                if os.path.getsize(raw) > 1000:
                    break
            except Exception as e:  # network hiccups → retry
                print(f"retry {c['key']}: {e}", file=sys.stderr)
                await asyncio.sleep(1.5 * (attempt + 1))
        else:
            raise SystemExit(f"TTS failed for {c['key']}")
        dst = os.path.join(out_dir, c["key"] + ".mp3")
        # 60 ms lead-in so the first consonant is never clipped; trim long trailing silence
        full = "adelay=60:all=1," + CHAIN + ",areverse,silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.15,areverse"
        try:
            subprocess.run([FFMPEG, "-y", "-v", "error", "-i", raw, "-af", full, "-c:a", "libmp3lame", "-b:a", "192k", dst], check=True)
        except subprocess.CalledProcessError:
            # minimal ffmpeg builds (e.g. Remotion's) lack some filters → simple, still broadcast-level chain
            print("voice chain unavailable, using loudnorm only", file=sys.stderr)
            subprocess.run([FFMPEG, "-y", "-v", "error", "-i", raw, "-af", "adelay=60:all=1,loudnorm=I=-16:TP=-1.5",
                            "-c:a", "libmp3lame", "-b:a", "192k", dst], check=True)
        words = attach_punct(words, c["text"])
        for w in words:
            w["t"] = round(w["t"] + 0.06, 3)
        res[c["key"]] = {"file": os.path.basename(dst), "dur": round(probe(dst), 3), "words": words}
        print(f"tts {c['key']} {res[c['key']]['dur']}s {len(words)} words", file=sys.stderr)
    json.dump(res, sys.stdout, ensure_ascii=False)


asyncio.run(main())
