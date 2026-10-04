# Music library (user-provided background tracks)

Not in git (copyrighted, big). Source: chat uploads 2026-10-04 -> `media/music/*.wav`; instrumentals
(vocals removed with UVR-MDX-NET-Inst_HQ_3, model from github TRvlvr/model_repo releases, `audio-separator`)
in `media/music/stems/`. Re-upload needed in a fresh container.
Note to user (done): commercial songs can get muted/blocked on IG/TikTok; royalty-free is safer.

| file | bpm | mood | use for |
|---|---|---|---|
| thank_you_slowed | ~123 | emotional, slowed, builds from 20s | soft/medical explainers, testimonials, calm doctor talk |
| broke_in_a_minute (Tory Lanez) | ~123 | hype trap, energy rises after 20s | fast tech/product reveals, before/after, dynamic reels |
| not_like_us (Kendrick) | ~99 | aggressive West-coast beat, high energy from 10s | bold hooks, myths-busting, "comparison" reels |

Mix: `python3 scripts/add_music.py <video> media/music/stems/<instrumental>.wav <out> --start S --gain -16`
(always use the instrumental under speech; sidechain ducks it while the doctor talks).
