#!/usr/bin/env bash
# Ali Motion Studio — one-command installer for Meta Muse (Secure VM) and any Ubuntu/Debian box.
#
#   curl -fsSL https://raw.githubusercontent.com/alibitcoin666-code/ali-motion-studio/main/muse/install.sh | bash
#
# Why it looks like this (Muse VM facts, Nov 2026):
#   * only $HOME (/home/hatch, 100 GB) survives restarts — /, /tmp, /etc, apt packages are wiped
#     → everything (Node, ffmpeg, Python packages, Chrome) is installed under $HOME, no sudo needed
#   * 2 vCPU / ~8 GB RAM / no swap → renders use concurrency 2, long lessons go to the free cloud queue
#   * outbound network passes through Muse's Sentinel: approve github.com, nodejs.org,
#     registry.npmjs.org, pypi.org, speech.platform.bing.com and *.workers.dev once (permanent)
# Re-running is safe (idempotent) and also updates the app.
set -euo pipefail

REPO_URL="${AMS_REPO:-https://github.com/alibitcoin666-code/ali-motion-studio.git}"
AMS_HOME="${AMS_HOME:-$HOME/workspace/ali-motion-studio}"
LOCAL="$HOME/.local"; BIN="$LOCAL/bin"; mkdir -p "$BIN" "$(dirname "$AMS_HOME")"
export PATH="$BIN:$LOCAL/node/bin:$PATH"
say() { printf '\033[1;33m[ams]\033[0m %s\n' "$*"; }
need() { command -v "$1" >/dev/null 2>&1; }

# ---------------------------------------------------------------- 1. Node.js (≥ 20; installs latest v24 LTS into ~/.local/node)
node_ok() { need node && [ "$(node -p 'process.versions.node.split(".")[0]')" -ge 20 ]; }
if ! node_ok; then
  V=$(curl -fsSL https://nodejs.org/dist/index.json | python3 -c "import json,sys;print(next(x['version'] for x in json.load(sys.stdin) if x['version'].startswith('v24.') and x['lts']))")
  ARCH=$(uname -m); case "$ARCH" in x86_64) A=x64;; aarch64|arm64) A=arm64;; *) echo "unsupported arch $ARCH"; exit 1;; esac
  say "installing Node $V ($A) → $LOCAL/node"
  rm -rf "$LOCAL/node" && mkdir -p "$LOCAL/node"
  curl -fsSL "https://nodejs.org/dist/$V/node-$V-linux-$A.tar.xz" | tar -xJ --strip-components=1 -C "$LOCAL/node"
fi
say "node $(node -v)"

# ---------------------------------------------------------------- 2. the app (public repo, no keys)
if [ -d "$AMS_HOME/.git" ]; then
  say "updating $AMS_HOME"; git -C "$AMS_HOME" pull --ff-only -q
else
  say "cloning → $AMS_HOME"; git clone -q --depth 1 "$REPO_URL" "$AMS_HOME"
fi
cd "$AMS_HOME"
say "npm ci (≈1 GB, first time 2–4 min)"
npm ci --no-audit --no-fund --loglevel=error

# ---------------------------------------------------------------- 3. ffmpeg with the full audio filter set (voice chain + loudnorm)
ff_full() { "$1" -hide_banner -filters 2>/dev/null | grep -q ' acompressor ' && "$1" -hide_banner -filters 2>/dev/null | grep -q ' silenceremove '; }
FF=""; FP=""
if need ffmpeg && ff_full ffmpeg && need ffprobe; then FF=$(command -v ffmpeg); FP=$(command -v ffprobe)
elif [ -x "$LOCAL/ffmpeg/bin/ffmpeg" ]; then FF="$LOCAL/ffmpeg/bin/ffmpeg"; FP="$LOCAL/ffmpeg/bin/ffprobe"
else
  say "installing static ffmpeg (GitHub BtbN build) → $LOCAL/ffmpeg"
  rm -rf "$LOCAL/ffmpeg" && mkdir -p "$LOCAL/ffmpeg"
  if curl -fsSL https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-linux64-gpl.tar.xz | tar -xJ --strip-components=1 -C "$LOCAL/ffmpeg"; then
    FF="$LOCAL/ffmpeg/bin/ffmpeg"; FP="$LOCAL/ffmpeg/bin/ffprobe"
  else
    say "static ffmpeg download failed → using Remotion's bundled ffmpeg (voice chain falls back to loudnorm only)"
    C="$AMS_HOME/node_modules/@remotion/compositor-linux-x64-gnu"
    for t in ffmpeg ffprobe; do printf '#!/bin/sh\nLD_LIBRARY_PATH="%s" exec "%s/%s" "$@"\n' "$C" "$C" "$t" > "$LOCAL/ffmpeg/$t"; chmod +x "$LOCAL/ffmpeg/$t"; done
    FF="$LOCAL/ffmpeg/ffmpeg"; FP="$LOCAL/ffmpeg/ffprobe"
  fi
fi
say "ffmpeg: $FF"

# ---------------------------------------------------------------- 4. Python + edge-tts (free Persian neural voices) in a venv under $HOME
PYV="$LOCAL/ams-venv"
if [ ! -x "$PYV/bin/python" ] || ! "$PYV/bin/python" -c 'import edge_tts' 2>/dev/null; then
  say "installing edge-tts"
  if python3 -m venv "$PYV" 2>/dev/null; then "$PYV/bin/pip" install -q --upgrade edge-tts
  else
    # no python3-venv on this image → user site-packages (survives in $HOME)
    python3 -m pip install -q --user --break-system-packages edge-tts 2>/dev/null || python3 -m pip install -q --user edge-tts
    PYV=""
  fi
fi
PY="${PYV:+$PYV/bin/python}"; PY="${PY:-python3}"

# ---------------------------------------------------------------- 5. Chrome Headless Shell (lives in node_modules → persistent)
say "checking render browser"
npx --yes remotion browser ensure >/dev/null 2>&1 || say "Remotion Chrome download failed — will reuse a Playwright headless shell if present"
CH=$(ls -d "$AMS_HOME"/node_modules/.remotion/chrome-headless-shell/*/chrome-headless-shell-*/chrome-headless-shell 2>/dev/null | head -1 || true)
if [ -n "$CH" ] && ldd "$CH" 2>/dev/null | grep -q 'not found'; then
  MISSING=$(ldd "$CH" | awk '/not found/{print $1}' | tr '\n' ' ')
  say "Chrome needs system libraries: $MISSING"
  if need apt-get; then
    say "installing them with apt (they live outside \$HOME, so muse/boot.sh re-installs them after a VM restart)"
    (apt-get update -qq && apt-get install -y -qq libnss3 libdbus-1-3 libatk1.0-0 libgbm1 libasound2t64 libxrandr2 libxkbcommon0 libxfixes3 libxcomposite1 libxdamage1 libatk-bridge2.0-0 libpango-1.0-0 libcairo2 libcups2 >/dev/null) || say "apt failed — set AMS_BROWSER to a working Chrome"
  fi
fi

# ---------------------------------------------------------------- 6. `ams` command
cat > "$BIN/ams" <<EOF
#!/usr/bin/env bash
# Ali Motion Studio CLI wrapper (generated by muse/install.sh)
export PATH="$BIN:$LOCAL/node/bin:\$PATH"
export FFMPEG="\${FFMPEG:-$FF}" FFPROBE="\${FFPROBE:-$FP}" PYTHON="\${PYTHON:-$PY}"
[ -x "$AMS_HOME/muse/boot.sh" ] && "$AMS_HOME/muse/boot.sh" --quiet || true
exec node "$AMS_HOME/scripts/ams.mjs" "\$@"
EOF
chmod +x "$BIN/ams"
grep -q '.local/bin' "$HOME/.bashrc" 2>/dev/null || echo 'export PATH="$HOME/.local/bin:$HOME/.local/node/bin:$PATH"' >> "$HOME/.bashrc"

# ---------------------------------------------------------------- 7. Muse skill (copied where Muse looks for custom skills)
SKILL_SRC="$AMS_HOME/muse/skill/ali-motion-studio"
DIRS=()
if [ -n "${AMS_SKILL_DIR:-}" ]; then DIRS=("$AMS_SKILL_DIR")
else
  for D in "$HOME/workspace/skills" "$HOME/workspace/custom-skills"; do [ -d "$D" ] && DIRS+=("$D"); done
  [ ${#DIRS[@]} -eq 0 ] && DIRS=("$HOME/workspace/skills")
fi
for D in "${DIRS[@]}"; do
  mkdir -p "$D" && rm -rf "$D/ali-motion-studio" && cp -r "$SKILL_SRC" "$D/" && say "skill installed → $D/ali-motion-studio"
done

# ---------------------------------------------------------------- 8. self-test
say "doctor:"
"$BIN/ams" doctor
if [ "${AMS_SMOKE:-1}" = "1" ]; then
  say "smoke test: one still frame of the logo intro"
  "$BIN/ams" still LogoIntro --frame 100 --out "$AMS_HOME/out/smoke_logo.png" | tail -1
fi
say "done. Try:  ams templates   |   ams sample TipShort   |   ams render TipShort --draft   |   ams cloud LessonPro"
