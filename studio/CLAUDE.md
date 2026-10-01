# 4media Studio - instructions for Claude

This folder is the video-editing studio. It is fully separate from the website in the
repo root: never modify files outside `studio/` while doing editing work.

## The user
Speaks Moroccan Darija (Arabic script, with French/English tech words). Answer in Darija.
Goal: professional, signature-level edits that copy the style of reference edits they provide.

## Start of every session
1. `bash scripts/setup.sh` (container is fresh; installs Remotion + Python analysis libs).
2. Read `recipes/` to recall learned styles and past feedback.
3. Media is NOT in git. Ask the user to upload references/rushes; put them in
   `media/refs/` and `media/rushes/`. Footage used by a template goes in `public/media/`.

## Workflow
1. Analyze reference: `python3 scripts/analyze_reference.py media/refs/<file>.mp4`
   then look at `contact.jpg` / `frames/` to read the visual style.
2. Write/update a recipe in `recipes/<name>.md` (copy `_TEMPLATE.md`).
3. Build/extend a template in `src/compositions/`, reusable pieces in `src/components/`.
   Register it in `src/Root.tsx`.
4. Render:
   `npx remotion render <Id> media/out/<name>.mp4 --browser-executable=/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell`
   Check frames with ffmpeg before sending; send the mp4 to the user.
5. Log the user's feedback in the recipe's "Feedback log". Commit code + recipes.

## Tools
- Remotion 4 (React) = the editor. ffmpeg = cutting/grading/audio. librosa = beats.
  PySceneDetect = cuts. Higgsfield MCP = AI b-roll, upscale, reframe, bg removal.
- `npm run typecheck` before committing.
