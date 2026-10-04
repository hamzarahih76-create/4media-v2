# Recipe: ghita01 - beat-for-beat copy of the El Khanssaa toys reel (insp03 == insp05)

Source: release `media_3` -> `7.mp4` (Ghita, dentist, 1080x1920 59.94fps, 42.5s). Inspiration:
`default.insipiration` (same file as media/refs/insp03.mp4). User rule from now on: copy the inspiration
EXACTLY (structure, design, animations); replace AI photos (no Higgsfield credits) with 3D renders.

## Reference structure -> Ghita mapping
| reference | Ghita |
|---|---|
| hook jump zooms, laugh | punch-in 0-1.4s |
| tilted glass window with photo behind the speaker (3.5-5.8) | window 0.9-5.15 with 3D render (toothbrush + tooth), behind her via masks |
| "sme3 had / LHEDRA / darouri" + 3D warning icon on the chest | "tkhayel / L'AI / f snanek" + glossy 3D tooth icon (1.25-3.25) |
| word-by-word white Arabic captions | same, Cairo 700 60px, y 1190 |
| white flash -> full-screen AI photo + "lo3ba katkhli wldk / YSKOT" | flash 7.6 -> 3D toothbrush on blue + "Dyson daba dkhlat l / SNAN" |
| swipe with dark motion bars -> 2nd photo "YTF3EL" | swipe -> 3D tooth scanned + brush water jet "chita dial snan / DKIYA" |
| glowing 3D toy train near hands | glowing 3D toothbrush near hands (12.6-15) |
| tilted teal glass pills one by one near hands | 24.1-28.9: كاميرا صغيرة / ذكاء اصطناعي / كتنقي بالماء / 28 صورة فالثانية |
| two photo cards top | 3D renders: lens close-up, tooth with tartar + scan ring |
| white flash -> stacked dark pills top | flash 29.0 -> الكالكير / بداية السوسة / قبل الطبيب |
| giant metallic "SECRET 01" | giant 3D "28" + blue "PHOTOS / S" label (16.55-18) |
| blue 2-line pill, final "لعبة" pill | "واش هادي هي مستقبل الوقاية؟", final "رأيكم؟" |

## Tech
- Portrait-mode blur: `scripts/masks.py` (rembg human seg, 30fps 360x640) -> masks converted to white RGBA
  alpha 720x1280 + 2px blur -> CSS mask-image on a sharp copy over a blurred (16px) copy.
- 3D: `Toothbrush` (camera lens glows, water jet) + `Tooth` (plaque spots, scan ring) in objects.tsx;
  stills via `GhitaShots` composition (`--props '{"shot":"window"}'`), `flat` canvas for clean whites.
- 30fps render (masks at 30fps).

## Feedback log
- 2026-10-04: v1 rendered (ghita01.mp4).
- 2026-10-04: user on v1: remove the blur behind her (mask halo looked bad); captions must follow exactly
  what she says; cut the dead pieces; add transitions; text should "write itself" in 2D, Apple-like (3D not
  needed for text). -> v2 `Ghita02.tsx`: no portrait blur; silences > 0.3s cut via an EDL (`cuts` in
  data/ghita02.ts, output->source time mapping, 2-frame audio fades); alternating framing 1.04/1.13 per
  segment + punch (and whip-zoom on long cuts); Apple write-on captions (IBM Plex Sans Arabic 700, per-word
  RTL clip wipe + blur + rise, key words with white->blue gradient); hook and full-screen words in Inter 800
  with tracking tightening; "28" as 2D count-up gradient number. Whisper large-v3 added (better than turbo
  on Darija but still imperfect) -> scripts from the user are still the best source for exact captions.
