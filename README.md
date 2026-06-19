# Cellular Death Match

Mobile-first cellular ecosystem roguelike in a Petri dish. Seed lifeforms, feed them with nutrients, steer them with toxins, discover breeds through reagent combos, cross-breed hybrids, and nurture your ecosystem toward homeostasis — or watch it collapse under escalating pressure.

The simulation is a TypeScript/Canvas port inspired by James Simon's cellular Potts model work, with a game layer built around evolving lineages, archetype eggs, lab tools, objectives, upgrades, and responsive touch-friendly play.

## Influences

This project sits in the lineage of Conway's Game of Life, cellular automata, and the wider maths of emergence: simple local rules, repeated many times, producing surprising global behavior. Cellular Death Match uses a cellular Potts-style model rather than Life's exact birth/survival rules, but the fascination is the same: watching order, competition, blooms, collapse, and apparent intention emerge from tiny stochastic updates.

The per-breed energy profile system — where each lifeform has distinct CPM physics coefficients that determine its shape, compactness, and movement texture — was inspired by James Simon's [cell-fight](https://github.com/james-simon/cell-fight), a Python/Pygame multiplayer cell combat game built on the Cellular Potts Model. cell-fight demonstrated how simple energy-term tuning can produce visually rich, emergent cell morphology without explicit shape logic.

The game layer leans into that by asking the player to cultivate conditions instead of directly puppeteering every cell. Eggs, nutrients, toxins, mutation, reseeding, and objectives are all meant to make the dish feel like a living system that can be nudged, never fully commanded.

## Current Gameplay

- **Roguelike runs** — open-ended, no fixed epoch count. Runs end when the ecosystem collapses (fail) or reaches homeostasis (win).
- **Guided onboarding** — Epoch 1 is a 3-beat auto-advancing tutorial (~30 seconds). Epochs 2-3 teach ecology and breeding.
- **Procedural mid-game** — from Epoch 4+, choose between 2 objectives each epoch. Pressure escalates: crises come faster, outbreaks hit harder, mutations grow wilder.
- **Homeostasis win state** — when 3+ breeds coexist in stable equilibrium for 20 seconds, the game recognizes it as a living ecosystem. No popup — just a subtle glow and the label "Equilibrium."
- **Strain library** — discovered breeds are banked across runs. Before each run, pick an egg loadout from your collection.
- **CPM energy profiles** — each breed has distinct physics coefficients (Ising surface tension, volume preservation, movement responsiveness). Bruisers are compact blobs; swarmlets spread thin with pseudopods; bloom mass flows like an amorphous film.
- **Reagent energy shifts** — reagents modify CPM coefficients within their field. Salt hardens cells, acid fragments them, nutrient loosens them. Combos produce emergent visual behaviors.
- Tools:
  - Egg: choose a lifeform strain, then seed it into the dish.
  - Nutrient: attracts nearby lifeforms and strongly catalyzes growth.
  - Toxin: repels lifeforms and can be used to push colonies around the dish.
  - Water, Salt, Acid: research-unlocked reagents that drive deeper reactions.
  - Agitate: shakes active fields together and can chain reactions.
- Egg strains:
  - Swarmlet: small, quick, fragile colonies.
  - Bruiser: large, slow feeders.
  - Splitter: midweight cells that shed swarmlets when destroyed.
  - Sniper: lean ranged cells.
  - Mirror: adaptive imitators.
  - Boss: huge anchor organisms.
- Between epochs, pick one upgrade from a small research set.

## Discovery And Breeding

Reagents combine into **catalytic reactions** when their fields overlap near the right cultures. Some reactions reveal **rare breeds** — distinct lifeforms with their own traits, colors, and behavior — logged in the discoverer's notebook.

Once you have discovered two different breeds, you can **cross-breed** them: bring a cell of each together inside a nutrient (or conduit/bloom) field and they hybridize into a new offspring breed. Current hybrids:

- **Quill Bloom** — Needle Swarm × Bloom Mass: a swelling propagator that keeps firing.
- **Vitric Anchor** — Glass Antibody × Folded Anchor: a brittle, toxin-proof fortress.
- **Mire Lattice** — Static Lattice × Bloom Mass: a self-copying pattern mass.

Every culture's pixels glow in their own color: the dish renders with a bloom pass (blurred glow under the crisp Potts pixels plus a faint additive layer), so colonies read as living, bioluminescent masses rather than flat blobs.

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
