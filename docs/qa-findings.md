# QA Findings & Judgment Log

A running log from the autonomous accessibility/polish session. Each entry notes
what was observed, the call I made, and why — so you can review or revert.

Legend: **[shipped]** committed to main · **[note]** left for your judgment.

## Session goal
Make the first ~90 seconds genuinely fun and learnable; elevate accessibility
and first-time experience. Operating mode: decide & ship reasonable feel/balance
calls, document them here, push each finished piece.

---

## Automated audit baseline (pre-onboarding)
- Full harness run (`scripts/qa-audit.mjs`) at 1280×720 and 390×844: **0 console
  errors**, all tools/breeds/notebook paths work, 8 chimera portraits load,
  Vitric Anchor deploys violet-blue (icon↔dish colour match holds).
- After the difficulty rebalance, mashing End walks through epochs on a healthy
  dish instead of collapsing at epoch 1.

## Judgment calls

- **[shipped] Onboarding coach placement.** Bottom-centre on desktop (floats over
  the dish-log zone, which is pointer-events:none) instead of a corner — corners
  collide with the reagent/lifeform racks at 1280×720. On phones it sits under
  the HUD rather than near the bottom, where the shell/toolbar/drawers live.
- **[shipped] Coach is event-driven, not timed.** Steps only advance when the
  player actually performs the action (egg → nutrient → paste → objective), so
  it can't run ahead of a slow reader. Skippable; first run only.
- **[note] Coach copy teaches Paste before the objective.** Deliberate: Paste is
  the most distinctive verb and worth teaching early, but it means the coach
  asks for one action that epoch 1's objective doesn't strictly need. Felt
  right; flag if you'd rather go straight from feeding to the objective.
