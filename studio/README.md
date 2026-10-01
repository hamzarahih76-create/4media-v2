# 4media Studio

Video editing studio (separate from the website). Edits are built in code with
[Remotion](https://www.remotion.dev), styles are learned from reference edits.

```
studio/
  CLAUDE.md            how Claude works here (read first)
  recipes/             written DNA of each learned edit style + feedback
  scripts/setup.sh     install everything (run each session)
  scripts/analyze_reference.py   cuts, rhythm, beats, keyframes of a reference
  src/components/      reusable effects (PunchZoom, FlashCut, WordCaptions, ...)
  src/compositions/    templates, one per style
  media/               refs / rushes / out - local only, never committed
```

```bash
bash scripts/setup.sh
npm run studio                      # preview in browser
npx remotion render Demo media/out/demo.mp4
```
