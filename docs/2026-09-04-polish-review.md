# Cellular Death Match polish review — 4 September 2026

Review baseline: `ee9d2b6`. Verification below covers the local implementation;
deployment verification is separate.

## Review and changes

The opening flow, five authored Trials, discovery handoff and Open Lab continuation
work through the real controls. Preserve the existing dish-first presentation and
module boundaries. This pass addresses reproducible correctness and layout issues.

- **Timing:** normal play now runs at the authored 60 ticks/second. The previous
  default of 72 made a nominal 30-second interval last 25 seconds. Saved speed
  overrides apply only with `?physdebug`, where the control is visible.
- **Paste:** every new stroke pays its opening charge. The remaining path budget
  survives when stock reaches zero, resets between strokes, and accounts for
  movement that crosses charge boundaries. Lost capture, focus loss, tab hiding
  and tool changes end the stroke.
- **Reagent stability:** final combined energy shifts are bounded to -0.9…2 after
  both ordinary and trail fields accumulate. Effective forces remain positive
  (10%…300% of the breed coefficient), with field order preserved as irrelevant
  to the sum. This bounds extreme stacking without changing individual doses.
- **Preview:** Reveal all uses a shared memory storage snapshot for progression,
  archive, strain library, checkpoints and coach markers. Preview play and banking
  cannot overwrite the real save. Exit or reload returns to the saved assignment;
  active cultures restart according to the existing checkpoint contract. A visible
  Preview · Exit control and revised Options copy explain the behavior.
- **Compact windows:** windows below 900px wide and above 520px tall use the compact
  arena layout even when wider than tall. The 814×756 layout previously put the HUD
  over the dish and stacked the readout over tool controls. It now reserves space
  for each, including the preview exit control.

## Verification

- `npm test`: 100 files, 762 tests passed, including new clock, short-stroke,
  final-charge, overlapping-field and isolated-preview regressions.
- `npm run build`: TypeScript and Vite production build passed.
- Full Playwright suite before the compact-window CSS adjustment: 39 passed,
  31 intentional viewport skips. Includes full five-Trial journeys on both phone
  sizes and desktop, reload recovery, failed-bank retry, onboarding, reduced
  motion and preview exit.
- Final responsive/preview checks: 11 passed, 4 intentional skips. They cover
  390×844, 375×667, 844×390, 768×1024 and
  1280×720, plus the new 814×756 regression. Representative screenshots were
  inspected, including preview gameplay, Trial 5 and the compact window.
- Live in-app browser review entered Open Lab preview and returned to the existing
  saved assignment with its original archive count.

## Remaining review

Physical-device touch feel and audio mixing still need Johnny's playtest. Try a
short Paste dab, a continuous final-charge stroke, and a nutrient-heavy study at
the corrected pace before further balance changes. Existing saves previously
altered by the old Reveal all cannot be reconstructed automatically.

The attribution check still reports `releaseReady: false` and 51 release blockers;
this local polish pass does not resolve publishing provenance approvals.

Run locally with `npm run dev -- --port 5199 --strictPort`, then open
`http://localhost:5199/`. Recheck with `npm test`, `npm run build`, and
`npx playwright test --workers=2`.
