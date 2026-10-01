#!/usr/bin/env bash
# Usage: scripts/mix_sfx.sh <video_in> <video_out> <whoosh peak times...>
# Lays whooshes so their peak lands on each cut, an impact at 0s, then normalizes to -14 LUFS (social standard).
set -euo pipefail
IN=$1; OUT=$2; shift 2
inputs=(-i "$IN" -i media/sfx/impact.wav)
filters="[1:a]volume=0.55[s0];"
labels="[0:a][s0]"
k=1
for t in "$@"; do
  inputs+=(-i media/sfx/whoosh.wav)
  ms=$(python3 -c "print(max(0,int(($t-0.31)*1000)))")
  filters+="[$((k+1)):a]adelay=${ms}|${ms},volume=0.35[s$k];"
  labels+="[s$k]"
  k=$((k+1))
done
filters+="${labels}amix=inputs=$((k+1)):normalize=0,loudnorm=I=-14:TP=-1.0:LRA=9[a]"
ffmpeg -loglevel error -y "${inputs[@]}" -filter_complex "$filters" -map 0:v -map "[a]" -c:v copy -c:a aac -b:a 256k -movflags +faststart "$OUT"
echo "wrote $OUT"
