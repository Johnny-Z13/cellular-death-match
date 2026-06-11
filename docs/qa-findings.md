# QA Findings & Judgment Log

A running log from the autonomous accessibility/polish session. Each entry notes
what was observed, the call I made, and why — so you can review or revert.

Legend: **[shipped]** committed to main · **[note]** left for your judgment.

## Session goal
Make the first ~90 seconds genuinely fun and learnable; elevate accessibility
and first-time experience. Operating mode: decide & ship reasonable feel/balance
calls, document them here, push each finished piece.

---

## Prioritized summary (end of audit)

- **P0 (broken)** — none found. Two full harness runs (desktop + iPhone, coach
  live, every tool/breed/notebook path) with zero console/page errors.
- **P1 (fixed this session)** — end-of-run summary claimed "Completed all 6
  ecosystems" even when objectives lapsed (side-effect of the forgiving
  rebalance). Now tracks completed-vs-lapsed per epoch and reports honestly:
  "Trial concluded: X of 6 objectives achieved" (or "flawless trial" at 6/6).
- **P2 (your ears needed)** — audio density: paste-drag smears are rate-limited
  (150ms) and reverb is subtle, but I can't *hear* headless. Worth one real
  listen: draw a long trail while reactions fire and judge mud. Knobs:
  per-sound `cooldownMs` in `uiAudio.ts`, reverb wet 0.22.
- **P3 (taste notes)** — the visible-mutation splodge (amber speckle, ~12s
  cycles) can read murky-brown over black in a still; empirically the global
  tint is ≤ rgb(9,8,4) and decays in <3s, so I left it. If it bugs you, brighten
  the core in `colorForEffect('mutation')` or shorten the effect ttl. Also the
  coach teaches Paste before the objective (see judgment call below).

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
- **[shipped] Idle nudge tuning: 22s idle, max 2 per epoch, 9s auto-hide.**
  Your "too intrusive?" worry shaped this: it only fires when the objective is
  incomplete AND the tutorial isn't running, any dish action instantly hides
  it, and a second nudge needs another full idle stretch. Content is the
  objective's own authored hint, so it's contextual rather than generic.
  If it still feels naggy in play, the knobs are NUDGE_IDLE_TICKS /
  MAX_NUDGES_PER_EPOCH in main.ts.
