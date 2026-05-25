# Cellular Death Match

Mobile-first cellular ecosystem tactics in a Petri dish. Seed lifeforms, feed them with nutrients, steer them with toxins, and complete short ecology objectives before the deadline.

The simulation is a TypeScript/Canvas port inspired by James Simon's cellular Potts model work, with a game layer built around evolving lineages, archetype eggs, lab tools, objectives, upgrades, and responsive touch-friendly play.

## Influences

This project sits in the lineage of Conway's Game of Life, cellular automata, and the wider maths of emergence: simple local rules, repeated many times, producing surprising global behavior. Cellular Death Match uses a cellular Potts-style model rather than Life's exact birth/survival rules, but the fascination is the same: watching order, competition, blooms, collapse, and apparent intention emerge from tiny stochastic updates.

The game layer leans into that by asking the player to cultivate conditions instead of directly puppeteering every cell. Eggs, nutrients, toxins, mutation, reseeding, and objectives are all meant to make the dish feel like a living system that can be nudged, never fully commanded.

## Current Gameplay

- Five ecosystem epochs per run.
- Objectives include preserving blue lineages, culling the red invasive lineage, inducing blooms, sterilizing samples, and preventing monoculture.
- Tools:
  - Egg: choose a lifeform strain, then seed it into the dish.
  - Nutrient: attracts nearby lifeforms and strongly catalyzes growth.
  - Toxin: repels lifeforms and can be used to push colonies around the dish.
- Egg strains:
  - Swarmlet: small, quick, fragile colonies.
  - Bruiser: large, slow feeders.
  - Splitter: midweight cells that shed swarmlets when destroyed.
  - Sniper: lean ranged cells.
  - Mirror: adaptive imitators.
  - Boss: huge anchor organisms.
- Between epochs, pick one upgrade from a small research set.

## Run Locally

```bash
npm install
npm run dev
```

Open the local URL that Vite prints, usually:

```text
http://localhost:5173/
```

## Preview On An iPhone

Start Vite on your network:

```bash
npm run dev -- --host 0.0.0.0
```

Then open the `Network:` URL printed by Vite on your iPhone while it is on the same Wi-Fi as your computer, for example:

```text
http://192.168.1.144:5178/
```

## Scripts

```bash
npm test          # Run the Vitest suite
npm run build    # Typecheck and create a production build
npm run typecheck
npm run preview
```

## Project Structure

```text
src/
  audio/      Web Audio ecology sounds
  content/    Lifeform, objective, and upgrade data
  game/       Arena orchestration, run state, AI, geometry, input
  sim/        Cellular Potts simulation, grid, cells, bullets, RNG
  ui/         Canvas renderer, debug panel, screens
```

## Responsive UI

The game is designed mobile-first:

- Portrait phone: centered dish, compact HUD, lifeform egg picker, bottom tool sheet.
- Desktop: dish centered with tools and HUD on the left, lifeform guide and inspector on the right.

## Repository Readiness

Generated local files are ignored via `.gitignore`, including `dist/`, `node_modules/`, local browser artifacts, and local agent/tool state. Before publishing, run:

```bash
npm test
npm run build
git status --short
```

See [AGENTS.md](./AGENTS.md), [CLAUDE.md](./CLAUDE.md), [cloud.md](./cloud.md), and [docs/current-state.md](./docs/current-state.md) for contributor and deployment notes.
