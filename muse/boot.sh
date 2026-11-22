#!/usr/bin/env bash
# Re-creates the few things a Muse VM restart wipes (system libraries for Chrome live outside $HOME).
# Called automatically by the `ams` wrapper; fast no-op when everything is present.
Q=0; [ "${1:-}" = "--quiet" ] && Q=1
AMS_HOME="$(cd "$(dirname "$0")/.." && pwd)"
CH=$(ls -d "$AMS_HOME"/node_modules/.remotion/chrome-headless-shell/*/chrome-headless-shell-*/chrome-headless-shell 2>/dev/null | head -1)
[ -z "$CH" ] && exit 0
ldd "$CH" 2>/dev/null | grep -q 'not found' || { [ $Q = 1 ] || echo "[ams] browser libraries OK"; exit 0; }
command -v apt-get >/dev/null || { echo "[ams] Chrome libraries missing and no apt-get; set AMS_BROWSER" >&2; exit 0; }
echo "[ams] VM was restarted → re-installing Chrome system libraries (≈30 s)" >&2
(apt-get update -qq && apt-get install -y -qq libnss3 libdbus-1-3 libatk1.0-0 libgbm1 libasound2t64 libxrandr2 libxkbcommon0 libxfixes3 libxcomposite1 libxdamage1 libatk-bridge2.0-0 libpango-1.0-0 libcairo2 libcups2 >/dev/null 2>&1) || echo "[ams] apt failed" >&2
exit 0
