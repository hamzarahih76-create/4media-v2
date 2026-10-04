#!/usr/bin/env python3
"""Person alpha masks (grayscale PNG) for a whole video, for background blur / depth effects.
Usage: python3 scripts/masks.py <frames_dir> <out_dir>   (rembg u2net_human_seg)"""
import sys
from pathlib import Path

from PIL import Image
from rembg import new_session, remove

src, out = Path(sys.argv[1]), Path(sys.argv[2])
out.mkdir(parents=True, exist_ok=True)
s = new_session("u2net_human_seg")
for p in sorted(src.glob("*.png")):
    m = remove(Image.open(p).convert("RGB"), session=s, only_mask=True, post_process_mask=True)
    m.save(out / p.name)
