# Current State

Last updated: 2026-05-25

## Summary

Cellular Death Match is now a mobile-first Petri dish ecosystem game. The original implementation plans targeted an 8-fight keyboard shooter. The current branch has moved toward touch-friendly ecology control:

- Five objective-driven epochs.
- Selectable egg strains.
- Nutrient and toxin tools.
- Mobile portrait layout with bottom tool controls.
- Desktop layout with side panels, lifeform guide, inspector, and dish log.

## Main Systems

- Simulation: cellular Potts model in `src/sim/`.
- Arena: ecosystem tick loop, objective evaluation, tool effects, mutation, reseeding, and resupply in `src/game/arena.ts`.
- Run state: title, arena, upgrade pick, run end in `src/game/run.ts`.
- Lifeform data: archetypes, colors, egg metadata, and schedules in `src/content/enemies.ts`.
- Objectives: epoch objective definitions in `src/content/objectives.ts`.
- UI: DOM overlays in `src/ui/screens.ts`, canvas renderer in `src/ui/render.ts`, responsive CSS in `src/styles.css`.

## Gameplay Loop

1. Enter ecosystem.
2. Read the current objective and deadline.
3. Select an egg strain or lab tool.
4. Tap the dish to seed life, feed growth, or repel colonies.
5. Survive or satisfy the objective.
6. Pick an upgrade between epochs.
7. Complete all five epochs or collapse.

## Current Lifeforms

- Swarmlet: quick, small, fragile.
- Bruiser: large and slow.
- Splitter: can shed swarmlets on death.
- Sniper: ranged pressure.
- Mirror: imitates the red lineage profile.
- Boss: large anchor organism.

## Current Tools

- Egg: places the selected lifeform strain.
- Nutrient: attracts nearby lifeforms and strongly increases their target volume.
- Toxin: pushes nearby lifeforms away, shrinking and eroding matter in its radius.

## Verification Baseline

As of this update:

```bash
npm test
npm run build
```

Both commands are expected to pass.

Responsive smoke checks should include:

- `390x844` mobile portrait.
- `375x667` small mobile portrait.
- `1280x720` desktop.

## Historical Docs

The files under `docs/superpowers/plans/` and the original spec are retained as historical implementation records. They are useful for understanding how the project got here, but `README.md`, `AGENTS.md`, `CLAUDE.md`, `cloud.md`, and this file describe the current product shape.
