# Recipe: montage01 - "upgrade pass" on an already-edited talking-head ad

Source: GitHub release `media-01` -> `0608.2.mov` (4K 2160x3840, 30fps, 63s).
Download: `curl -L -o media/rushes/0608.2.mov https://github.com/hamzarahih76-create/4media-v2/releases/download/media-01/0608.2.mov`
Proxy: `ffmpeg -i media/rushes/0608.2.mov -vf scale=1080:1920:flags=lanczos -c:v libx264 -crf 14 -g 15 -c:a aac -b:a 256k public/media/src.mp4`

Content: 4media ad for doctors ("Consultation médicale"). Already edited by a human:
burned-in Darija captions, fixed top title, 3 AI b-rolls, phone-mockup end screen + "Réservez maintenant" CTA,
music bed at 123 BPM under the voice (no silences -> no dead-air cutting possible).

## Measured
- Shots: talk 0-12.07 | broll 12.07-13.30 | talk 13.30-27.73 | broll 27.73-29.00 (dissolve)
  | talk 29.00-42.93 | broll 42.93-44.60 | talk 44.60-54.13 | end screen 54.13-63.15 (CTA at 59.53)
- Original pace: avg shot ~10s on the talking head -> static, that is what we fix.

## What the upgrade adds (src/compositions/Montage01.tsx, src/lib/camera.ts)
- **Virtual 2-camera jump zooms**: 1.00 <-> 1.12, switching every 8 beats (~3.9s), on the beat.
- **Slow push-in** (+3%) inside every block so the frame is never static.
- **Locked title band**: the burned-in title is re-composited unzoomed (feathered mask 8.5%-15.5% of height)
  so zooms never crop it. Works because the background behind it is a uniform dark curtain.
- **Punch transitions** on every shot change: 1.14 -> 1.0 over 7 frames + 6px blur + 22% white flash.
  (55% flash looked washed-out/cheap - keep it low.)
- **Hook**: first 14 frames zoom 1.3 -> 1.0 with blur + low "impact" hit.
- **CTA pulse**: +3.5% scale on each beat after 59.53s.
- Grade: contrast 1.06 / saturate 1.08 + vignette 0.4. Brand progress bar (#5BE34B, from the logo dot).
- Sound: synthesized whoosh peaking on each cut (scripts/make_sfx.py + scripts/mix_sfx.sh), loudnorm -14 LUFS.

## Feedback log
- 2026-10-01: v1 delivered (montage01.mp4). Waiting for user notes.
