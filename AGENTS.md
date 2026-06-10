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

- `src/sim/` is the low-level cellular Potts simulation. Keep it mostly UI-agnostic and game-agnostic.
- `src/game/arena.ts` owns ecosystem rules, tool effects, objective progress, spawning, and per-tick orchestration.
- `src/content/` contains data and tuning for lifeforms, objectives, and upgrades.
- `src/ui/` owns DOM screens and canvas rendering.
- `src/main.ts` wires the run state, arena, UI, audio, and render loop.

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

This is currently an ecosystem-cultivation game rather than the older keyboard shooter described in early planning docs. Current play revolves around selecting egg strains, placing reagents, triggering catalytic reactions, discovering and cross-breeding rare breeds, and completing six ecology objectives.

Discovery/breeding content lives in `src/content/catalysis.ts` (recipes, breeds, hybrids, notes) and `src/content/lifeformIdentity.ts` (per-lifeform identity + `renderStyle`). Cross-breeding logic is in `src/game/arena.ts` (`evaluateBreedDiscoveries`/`hybridPairSource`). The dish renderer is `src/ui/render.ts`. Adding a breed means updating its `BreedDef`, identity, notebook list, and the progression lifeform list — the content tests enforce that these stay in sync.
