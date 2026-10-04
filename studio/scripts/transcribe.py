#!/usr/bin/env python3
"""Offline transcription: Silero VAD + Whisper turbo (sherpa-onnx), models from GitHub releases.
Setup (once per session):
  pip install sherpa-onnx soundfile
  mkdir -p /root/models && cd /root/models
  curl -L -o vad.onnx https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/silero_vad.onnx
  curl -L https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/sherpa-onnx-whisper-turbo.tar.bz2 | tar xj
Usage: python3 scripts/transcribe.py <video> <out.json> [lang=ar]
"""
import json
import subprocess
import sys

import numpy as np
import sherpa_onnx

src, out = sys.argv[1], sys.argv[2]
lang = sys.argv[3] if len(sys.argv) > 3 else "ar"
import os
M = os.environ.get("WHISPER", "/root/models/sherpa-onnx-whisper-turbo/turbo")
SR = 16000

pcm = subprocess.run(["ffmpeg", "-loglevel", "error", "-i", src, "-ac", "1", "-ar", str(SR), "-f", "s16le", "-"], capture_output=True, check=True).stdout
audio = np.frombuffer(pcm, np.int16).astype(np.float32) / 32768

rec = sherpa_onnx.OfflineRecognizer.from_whisper(
    encoder=f"{M}-encoder.int8.onnx", decoder=f"{M}-decoder.int8.onnx", tokens=f"{M}-tokens.txt",
    language=lang, task="transcribe", num_threads=8,
)
cfg = sherpa_onnx.VadModelConfig()
cfg.silero_vad.model = "/root/models/vad.onnx"
cfg.silero_vad.min_silence_duration = 0.25
cfg.silero_vad.min_speech_duration = 0.2
cfg.silero_vad.max_speech_duration = float(__import__("os").environ.get("MAXSEG", 8))
cfg.sample_rate = SR
vad = sherpa_onnx.VoiceActivityDetector(cfg, buffer_size_in_seconds=120)

segs = []
win = cfg.silero_vad.window_size
for i in range(0, len(audio), win):
    vad.accept_waveform(audio[i : i + win])
    while not vad.empty():
        s = vad.front
        st = rec.create_stream()
        st.accept_waveform(SR, s.samples)
        rec.decode_stream(st)
        segs.append({"start": round(s.start / SR, 2), "end": round((s.start + len(s.samples)) / SR, 2), "text": st.result.text.strip()})
        print(f"{segs[-1]['start']:6.2f}-{segs[-1]['end']:6.2f} {segs[-1]['text']}", flush=True)
        vad.pop()
vad.flush()
while not vad.empty():
    s = vad.front
    st = rec.create_stream()
    st.accept_waveform(SR, s.samples)
    rec.decode_stream(st)
    segs.append({"start": round(s.start / SR, 2), "end": round((s.start + len(s.samples)) / SR, 2), "text": st.result.text.strip()})
    print(f"{segs[-1]['start']:6.2f}-{segs[-1]['end']:6.2f} {segs[-1]['text']}", flush=True)
    vad.pop()
json.dump(segs, open(out, "w"), ensure_ascii=False, indent=1)
