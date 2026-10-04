#!/usr/bin/env python3
"""Mix background music under a rendered video: voice-ducked (sidechain), fades, -14 LUFS.

usage: python3 scripts/add_music.py <video.mp4> <music.wav> <out.mp4> [--start S] [--gain DB] [--duck RATIO]
  --start  offset (s) into the music track (pick a section from recipes/music-library.md)
  --gain   music level before ducking, dB (default -16)
  --duck   sidechain ratio while the speaker talks (default 6)
"""
import argparse
import subprocess

ap = argparse.ArgumentParser()
ap.add_argument("video")
ap.add_argument("music")
ap.add_argument("out")
ap.add_argument("--start", type=float, default=0.0)
ap.add_argument("--gain", type=float, default=-16.0)
ap.add_argument("--duck", type=float, default=6.0)
a = ap.parse_args()

dur = float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", a.video]).decode())
fo = max(0.0, dur - 1.8)
fc = (
    f"[1:a]atrim=start={a.start}:duration={dur},asetpts=PTS-STARTPTS,aresample=48000,"
    f"volume={a.gain}dB,afade=t=in:d=0.6,afade=t=out:st={fo}:d=1.8[m];"
    "[0:a]aresample=48000,asplit=2[v][sc];"
    f"[m][sc]sidechaincompress=threshold=0.015:ratio={a.duck}:attack=15:release=350:makeup=1[md];"
    "[v][md]amix=inputs=2:duration=first:normalize=0,loudnorm=I=-14:TP=-1.5:LRA=11[a]"
)
subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", a.video, "-i", a.music, "-filter_complex", fc,
                "-map", "0:v", "-map", "[a]", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", a.out], check=True)
print(a.out)
