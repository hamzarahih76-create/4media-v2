# Recipe: insp02 - "cinematic red neon" (dentist reel, Dr. Rita Asry)

Reference: `media/refs/insp02.mp4` (720x1280, 24fps, 65s; uploaded in chat, not in git).
Applied to media-01 -> `src/compositions/Insp02.tsx`, components in `src/components/cine/Cine.tsx`, data `src/data/insp02.ts`.

## Structure of the reference
- 0-3s hook: huge red neon condensed title (3 lines) partly *behind* the speaker, 1-10 red scale on the left
  with a white cursor, glass name tag (avatar + name + role + blue verified badge).
- Numbered chapters 01/02/03: full black screen, thin red light lines falling and bending, small gray paragraph
  blurring in, big red pill with dark number circle + 2-line title. Voice continues under it. ~2-3s each.
- After each chapter: frosted-glass "app window" over the speaker's body (round buttons: back, clip, share, more),
  red neon header bar, red checkbox items that tick in one by one as she says them.
- Between ideas: 1-10 scale with cursor on the side (decorative "evaluation").
- Captions: Arabic, one short line on a flat coral-red strip, mid-chest, appears with a horizontal wipe.
  Hidden while a panel/chapter is on screen.
- Ending: yellow highlighter checkboxes + italic serif words on slate pills, then CTA line.
- Look: dark moody grade, strong vignette, speaker full frame, jump cuts with framing changes.

## Values (1080x1920)
- red #E24A5B, neon #FF3D55, chapter bg #0B0708, yellow #F2E400, slate rgba(38,48,58,.88).
- Fonts: Oswald 700 (title, scale digits), Inter 500/700/800 (UI), Lora italic (yellow list), Cairo 700 (Arabic).
- Title 190px, scale boxes 64x84, panel x160 y900 770x700, caption strip top 960 Cairo 54px.

## Tricks used on media-01 (already-edited source)
- Speaker in front of the title: `scripts/cutout.py` (rembg u2net_human_seg, model from GitHub releases into
  ~/.u2net) -> alpha PNGs in public/media/cutout for the first 3.4s. Cutout masked below y1050 so old captions
  on the body never come back on top.
- Burned title removed with a *curtain patch*: same footage shifted down 150px, masked to y445-552 - the curtain
  folds are vertical so it is seamless (much better than blur, which left a gray smudge).
- Old captions: blurred + darkened bottom band (y>1110) which also reads as a cinematic bottom fade.
- Plate (video + patches + cutout) is zoomed as one block so the jump zooms never reveal old text.
- B-roll shots are covered by the chapter cards.

## Feedback log
- 2026-10-01: v1 rendered (insp02.mp4).
