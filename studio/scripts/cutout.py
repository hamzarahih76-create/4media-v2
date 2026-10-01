#!/usr/bin/env python3
"""Person cutout (alpha PNG sequence) for a frame range - used to put graphics *behind* the speaker.
Usage: python3 scripts/cutout.py <frames_dir> <out_dir>   (model: rembg u2net_human_seg)"""
import sys
from pathlib import Path

from PIL import Image
from rembg import new_session, remove

src, out = Path(sys.argv[1]), Path(sys.argv[2])
out.mkdir(parents=True, exist_ok=True)
session = new_session("u2net_human_seg")
for p in sorted(src.glob("*.png")):
    img = Image.open(p).convert("RGB")
    mask = remove(img, session=session, only_mask=True, post_process_mask=True)
    rgba = img.copy()
    rgba.putalpha(mask)
    rgba.save(out / p.name)
    print(p.name, flush=True)
