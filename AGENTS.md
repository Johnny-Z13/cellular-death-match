# Agent Guide

This repository is a Vite + TypeScript browser game. Agents should keep changes small, tested, and sympathetic to the existing module boundaries.

## Quick Start

```bash
npm install
npm test
npm run build
npm run dev -- --port 5199 --strictPort
```

Note: port `5173` is currently occupied by an unrelated project ("Death Match Pool"). Use a free port (e.g. `5199`) and confirm the page title reads "Cellular Death Match" before trusting any browser check. Add `--host 0.0.0.0` to expose it to a phone on the same network.

## Expected Verification

Before saying a task is complete:

```bash
npm test
npm run build
```

For UI or gameplay changes, also check the app in a browser at:

- Mobile portrait: `390x844` or close.
- Small mobile portrait: `375x667` or close.
- Desktop: `1280x720` or larger.

## Important Boundaries

- `src/sim/` is the low-level cellular Potts simulation. Keep it mostly UI-agnostic and game-agnostic. `breedProfiles.ts` defines per-breed CPM energy coefficients and reagent energy shifts.
- `src/game/arena.ts` owns ecosystem rules, tool effects, objective progress, spawning, homeostasis tracking, escalation, and per-tick orchestration.
- `src/game/run.ts` is an open-ended run state machine (no fixed epoch cap) with homeostasis win state and collapse fail state.
- `src/game/homeostasis.ts` detects equilibrium (20s sustain, 3+ breeds, <10% share swing) and classifies biomes.
- `src/game/escalation.ts` scales hazard pressure per epoch past the onboarding phase.
- `src/game/strainLibrary.ts` persists discovered strains and egg loadouts across runs.
- `src/game/objectivePool.ts` draws procedural objectives for mid-game epochs.
- `src/content/` contains data and tuning for lifeforms, objectives, and upgrades.
- `src/ui/` owns DOM screens, canvas rendering, lab report, and loadout selection.
- `src/main.ts` wires the run state, arena, UI, audio, strain library, and render loop.

## Responsive Design Expectations

The game is mobile-first:

- Keep the dish centered and playable in portrait.
- Keep core controls under the thumb on phones.
- Avoid adding permanent mobile panels that cover the dish.
- Desktop can expose richer inspector/log panels.

## Git And Repo Hygiene

Do not commit generated or local-tool artifacts:

- `node_modules/`
- `dist/`
- `.playwright-cli/`
- `.superpowers/`
- `.claude/`
- `test-results/`
- `playwright-report/`

Before publishing or opening a PR:

```bash
git status --short
npm test
npm run build
```

## Known Product Shape

This is a roguelike ecosystem-cultivation game. Runs are open-ended: 3 fixed onboarding epochs, then procedural mid-game epochs with escalating pressure until homeostasis (win) or collapse (fail). Each breed has a CPM energy profile (Ising/volume/movement/engulf multipliers) that gives it distinct physics. Reagents shift energy coefficients within their field radius. Discovered strains are banked to a persistent strain library for loadout selection on future runs.

Discovery/breeding content lives in `src/content/catalysis.ts` (recipes, breeds, hybrids, notes) and `src/content/lifeformIdentity.ts` (per-lifeform identity + `renderStyle`). Breed energy profiles live in `src/sim/breedProfiles.ts`. Cross-breeding logic is in `src/game/arena.ts` (`evaluateBreedDiscoveries`/`hybridPairSource`). The dish renderer is `src/ui/render.ts`. Adding a breed means updating its `BreedDef`, identity, breed profile, notebook list, and the progression lifeform list — the content tests enforce that these stay in sync.
