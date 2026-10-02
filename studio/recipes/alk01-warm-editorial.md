# Recipe: alk01 - "Warm Editorial 3D" (original design, inspired by insp03 but not copied)

Source: GitHub release `media-02` -> `alkhansaa.mp4` (1080x1920, 59.94fps, 68.8s, single take, raw).
Speaker: orthophoniste (uniform reads "El Khanss..."), same set as insp03 (wood wall, plant, black outfit).
Topic: how to take the phone away from a child by offering an alternative - 3 steps.
Inspiration: `media/refs/insp03.mp4` (same speaker, previous edit: 3D toys, glass keyword pills,
AI full-screen images, "SECRET 01" 3D numbers). User asked: NOT a copy - new design adapted to the
video, keeping the After-Effects feel (smooth, dynamic, premium).

## Transcript
- `scripts/transcribe.py` (Silero VAD + Whisper turbo via sherpa-onnx, models from GitHub releases -
  HuggingFace is blocked). Raw output: `src/data/alk01-transcript-whisper.json` (MSA-ish, noisy).
- Darija captions in `src/data/alk01.ts` are a manual reconstruction -> user must review.
- Structure: hook (phone + book in hand) | step 1 at 8.0 "visible alternative" | objects 17-23 |
  step 2 at 23.2 "share the first 5 minutes" | "what's this? where does it go?" 34-36 |
  step 3 at 40.9 "screen-free zones/routine" | meal time / 30 min before sleep | reading corner |
  screen = quick pleasure vs books = balanced brain | outro 64.

## Design system
- Palette from the set: cream #FFF4E6, terracotta #E8743B (wood), green #2E6B4F (plant), gold #E9B44C, ink.
- Type: Cairo 900 (Arabic), Playfair Display 800 italic (numbers, name, "vs"), Inter 700 (small caps).
- Warm glass: gradient cream 30%->10%, 2px cream border, blur 22 + saturate, long soft shadow.
- Motion: expo-out bezier(.16,1,.3,1) entrances, inout bezier(.65,0,.35,1) exits, 3D perspective 1600
  (cards flip in on rotateX, tiles turn in on rotateY), gentle sine float, blur-in/blur-out (AE look),
  warm light leaks (screen blend) on section changes, film grain 7%, 60fps render.
- Hook: giant gradient word behind the speaker (rembg cutout, public/media/alkcut, 177 frames @60fps).
- Camera: intro pull-back 1.12->1.0, slow drift, smooth +10% punch-in on each step card.
- Layout: graphics in the top 30% (plant/wood), captions on the chest (y 1180), name tag over the hands.

## Feedback log
- 2026-10-02: v1 rendered (alk01.mp4).
