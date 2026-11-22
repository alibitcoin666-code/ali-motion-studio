#!/usr/bin/env bash
# Rebuild the bundled demo course from an unpacked folder or zip:  bash scripts/course.sh <folder|zip> [name]
set -e
NAME=${2:-pianova}
npx tsx scripts/build-course.ts "$1" "$NAME"
python3 - "$NAME" <<'PY'
import sys,glob,os
from PIL import Image
n=sys.argv[1]
for f in glob.glob(f'public/course/{n}/*.png'):
    im=Image.open(f).convert('RGB'); im.thumbnail((720,900)); im.save(f[:-4]+'.webp','WEBP',quality=80); os.remove(f)
p=f'public/course/{n}.json'; s=open(p).read().replace('_card.png','_card.webp'); open(p,'w').write(s)
PY
