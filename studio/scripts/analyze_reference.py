#!/usr/bin/env python3
"""Break down a reference edit into measurable facts.

Usage: python3 scripts/analyze_reference.py media/refs/<name>.mp4

Writes media/refs/<name>_analysis/:
  analysis.json  - cuts, shot lengths, tempo, beats, how many cuts land on a beat
  frames/        - one keyframe per shot (look at them to read the style)
  contact.jpg    - all keyframes on one sheet
"""
import json
import subprocess
import sys
from pathlib import Path

import librosa
import numpy as np
from scenedetect import ContentDetector, detect


def probe(path: Path) -> dict:
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration:stream=width,height,r_frame_rate,codec_type",
         "-of", "json", str(path)],
        capture_output=True, text=True, check=True,
    )
    return json.loads(out.stdout)


def main() -> None:
    src = Path(sys.argv[1])
    out_dir = src.with_name(src.stem + "_analysis")
    frames_dir = out_dir / "frames"
    frames_dir.mkdir(parents=True, exist_ok=True)

    info = probe(src)
    duration = float(info["format"]["duration"])

    scenes = detect(str(src), ContentDetector(threshold=27.0))
    cuts = [s[0].get_seconds() for s in scenes[1:]]
    bounds = [0.0] + cuts + [duration]
    shot_lengths = [round(b - a, 3) for a, b in zip(bounds, bounds[1:])]

    audio = src.with_suffix(".analysis.wav")
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", str(src), "-ac", "1", "-ar", "22050", str(audio)],
                   check=False)
    tempo, beats, on_beat = None, [], 0
    if audio.exists():
        y, sr = librosa.load(str(audio), sr=22050)
        tempo_arr, beat_frames = librosa.beat.beat_track(y=y, sr=sr)
        tempo = float(np.atleast_1d(tempo_arr)[0])
        beats = [round(float(b), 3) for b in librosa.frames_to_time(beat_frames, sr=sr)]
        on_beat = sum(1 for c in cuts if beats and min(abs(c - b) for b in beats) < 0.08)
        audio.unlink()

    for i, (a, b) in enumerate(zip(bounds, bounds[1:])):
        mid = (a + b) / 2
        subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-ss", f"{mid:.3f}", "-i", str(src),
                        "-frames:v", "1", "-vf", "scale=360:-2", str(frames_dir / f"shot_{i:03d}.jpg")], check=False)

    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-pattern_type", "glob", "-i", str(frames_dir / "shot_*.jpg"),
                    "-vf", "tile=6x0:padding=4", "-frames:v", "1", str(out_dir / "contact.jpg")], check=False)

    result = {
        "source": src.name,
        "duration_s": round(duration, 3),
        "streams": info.get("streams", []),
        "shot_count": len(shot_lengths),
        "cuts_s": [round(c, 3) for c in cuts],
        "shot_lengths_s": shot_lengths,
        "avg_shot_s": round(float(np.mean(shot_lengths)), 3),
        "cuts_per_second": round(len(cuts) / duration, 3) if duration else 0,
        "tempo_bpm": round(tempo, 1) if tempo else None,
        "beats_s": beats,
        "cuts_on_beat": f"{on_beat}/{len(cuts)}",
    }
    (out_dir / "analysis.json").write_text(json.dumps(result, indent=2))
    print(json.dumps({k: v for k, v in result.items() if k not in ("beats_s", "streams")}, indent=2))
    print(f"\nOutput: {out_dir}")


if __name__ == "__main__":
    main()
