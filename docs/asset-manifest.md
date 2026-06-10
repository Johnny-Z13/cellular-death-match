# Asset Manifest

Generated assets and the scripts that produce them. Re-run a script to regenerate.

## Title key art (Nano Banana — `gemini-2.5-flash-image`)

Script: `scripts/generate-keyart.mjs` (`node scripts/generate-keyart.mjs --force` to regenerate).
The script generates, then recompresses to a 1024² web-friendly PNG via `sharp`.

| Asset | File | Prompt summary |
|---|---|---|
| Title background | `public/art/title-keyart-1024.png` | Bioluminescent colony blooming across a black petri dish, cyan filaments with amber/violet accents, dark center for title text, lens vignette. Style prefix: premium dark scientific macro, deep-sea bioluminescence, microscope view, no text. |

## Audio (ElevenLabs — `eleven_text_to_sound_v2`)

Script: `scripts/generate-audio-assets.mjs` (`--force` to regenerate, `--dry-run` to preview).
Output: `public/audio/generated/`. Note: ElevenLabs requires `duration_seconds >= 0.5`.

| ID | File | Role |
|---|---|---|
| hatch | hatch.mp3 | cell hatch pop |
| visible_mutation | visible_mutation.mp3 | mutation chirp |
| catalytic_flare | catalytic_flare.mp3 | catalytic reaction flare |
| water_stabilize | water_stabilize.mp3 | water reagent |
| salt_crystal | salt_crystal.mp3 | salt crystallization |
| folding_fault | folding_fault.mp3 | folding fault glitch |
| hidden_breed | hidden_breed.mp3 | breed discovery sting |
| objective_warning | objective_warning.mp3 | deadline warning |
| ui_tap | ui_tap.mp3 | soft UI tap (place tool, agitate, end) |
| ui_select | ui_select.mp3 | UI selection confirm (tool/strain/menu) |
| epoch_begin | epoch_begin.mp3 | epoch intro swell |
| epoch_win | epoch_win.mp3 | epoch success stinger |
| epoch_fail | epoch_fail.mp3 | epoch collapse stinger |
| experiment_ready | experiment_ready.mp3 | objective-complete ready chime |
| ambience_loop | ambience_loop.mp3 | looping lab ambience bed |
