# Recipe: insp01 - "explainer infographic" (style the user wants copied 1:1)

Reference: `media/refs/insp01.mp4` (720x1280, 86s, uploaded in chat; not in git - ask the user again if needed).
Speaker: man on orange armchair talking Darija about pricing. Applied to: media-01 -> `src/compositions/Insp01.tsx`.

## Measured
- 10 camera "shots" but really 2 layouts switching; avg 8.7s per layout, cuts mostly on phrase ends.
- Captions change every ~0.3-0.5s (1-2 words).

## Style breakdown (exact values in 1080x1920 = reference x1.5)
- **Canvas:** cream #FDF7EB, soft blue (#5AA8FF) light leaking from left/right edges, slowly drifting.
- **Layout A "card" (default ~75% of the time):**
  - white info card x93 y300 w894 h465, radius ~26, warm bottom edge shadow (0 8px 0 #E9E1D3).
  - speaker window 4:3 x159 y830 w762 h571, radius 22, gray bottom edge (0 10px 0 #D9D5CE) + soft drop shadow.
- **Layout B "full":** speaker 4:3 full width (1080x810), tighter crop, used on emphasis lines and b-roll.
  Layout changes are a spring (stiffness 170, damping 20), window position+size+crop all animate together.
- **Info card content is built live with the speech:** every number/icon/word pops in (spring) exactly when said.
  Vocabulary: small uppercase gray label with blue tag icon; big navy Poppins 700 numbers/words; blue accent words;
  blue pills (white text, 0 5px 0 dark shadow); A -> B arrows; bar charts growing; icon in beige circle;
  red X / strike for "no"; green check circle for "solution"; typing search bar; chat header with waveform.
- **Captions:** arabizi (Darija in Latin letters), Poppins 700 ~68px white, 1-2 words, the word being said in a
  blue (#3478D8) rounded box with dark bottom shadow; anchored on the bottom edge of the speaker window
  (overlapping it). Pop-in scale 0.8 -> 1.
- **Palette:** navy #14213D, blue #3478D8, light blue #E6F0FC, gray #8A93A3, red #E0453A.
- **Sound:** voice first; soft whoosh on layout changes.

## Applying it to an already-edited source (media-01)
- Burned-in title sits at y 455-555 and old captions below y 1130 (1080 basis): crops are taken between them
  (card crop x160 y558 760x570; full crop x180 y558 720x540), so neither shows.
- Captions were re-typed from the old Arabic captions and transliterated to arabizi (src/data/insp01.ts).
- End screen (phone mockups) shown in a portrait window, then our own CTA card (Réservez maintenant + 4media.ma).
- Uses public/media/src1440.mp4 (1440p proxy of the 4K rush) for sharper crops.

## Feedback log
- 2026-10-01: v1 rendered (insp01.mp4). User: "top". Asked: edge glow + all animation accents in light/open green instead of blue (cream background stays). -> glow #7FE38C, accent #34C759, soft #E3F7E7 (insp01_green.mp4).
