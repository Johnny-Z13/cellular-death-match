# Current State

Last updated: 2026-06-10

## Summary

Cellular Death Match is now a mobile-first Petri dish ecosystem game. The original implementation plans targeted an 8-fight keyboard shooter. The current branch has moved toward touch-friendly ecology control:

- Six objective-driven epochs, one per objective.
- Selectable egg strains.
- Five reagent tools (nutrient, toxin, water, salt, acid) plus agitation.
- Catalytic reactions, rare breed discovery, and cross-breeding of hybrids.
- Pixel-bloom dish rendering: every culture's own pixels glow in their color.
- Mobile portrait touch shell: Lifeforms/Log drawers, tool readout, bottom tool bar.
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
7. Complete all six epochs or collapse.

## Current Lifeforms

Base strains (egg-seedable):

- Swarmlet: quick, small, fragile.
- Bruiser: large and slow.
- Splitter: can shed swarmlets on death.
- Sniper: ranged pressure.
- Mirror: imitates the red lineage profile.
- Boss: large anchor organism.

Base breeds (discovered from reactions): needle_swarm, folded_anchor, glass_antibody, bloom_mass, static_lattice.

Hybrid breeds (cross-bred from two discovered base breeds under a nutrient field):

- Quill Bloom: needle_swarm × bloom_mass.
- Vitric Anchor: glass_antibody × folded_anchor.
- Mire Lattice: static_lattice × bloom_mass.

## Current Tools

- Egg: places the selected lifeform strain.
- Nutrient: attracts nearby lifeforms and strongly increases their target volume.
- Toxin: pushes nearby lifeforms away, shrinking and eroding matter in its radius.
- Water, Salt, Acid: research-unlocked reagents that drive further reactions.
- Agitate: spreads active fields and can fold overlapping reactions into a fault.

## Rendering

`src/ui/render.ts` draws the cellular Potts grid in three GPU-friendly layers: a blurred glow underlay (the same grid image, smoothed and blur-filtered, so light bleeds past each culture's edges), the crisp per-pixel layer on top (empty pixels are transparent so the halo shows through), and a faint additive pass for inner luminosity that keeps hues true. Every culture glows in its own palette color automatically. `renderStyle` still drives the lifeform swatches in the side panels. Dish-event markers, the dish flash, and bullets draw on top.

## Cross-Breeding

`evaluateBreedDiscoveries` in `src/game/arena.ts` checks, each ecosystem tick, every `BreedDef` that declares a `parents` pair. If both parents are already discovered and a cell of each sits within ~16px of the other inside a nutrient/conduit/bloom field, the hybrid is discovered and a hybrid cell spawns. Hybrid stats derive from the hybrid's own base archetype (not the runtime parent) so they do not compound.

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
