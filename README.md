# Cellular Death Match

Mobile-first cellular ecosystem roguelike in a Petri dish. Seed lifeforms, feed them with nutrients, steer them with toxins, discover breeds through reagent combos, cross-breed hybrids, and nurture your ecosystem toward homeostasis — or watch it collapse under escalating pressure.

The simulation is a TypeScript/Canvas port inspired by James Simon's cellular Potts model work, with a game layer built around evolving lineages, archetype eggs, lab tools, objectives, upgrades, and responsive touch-friendly play.

## Release Name And Positioning

The planned CrazyGames release name is **Cellular Death Match**. Keep "Death Match" as two words: the spacing preserves the double reading of *cellular death* and *death match* while avoiding an even stronger promise of conventional PvP.

The name is memorable and preliminarily distinctive, but its combat framing must be balanced by accurate store copy and cover imagery. The release description should lead with ecosystem cultivation, strain breeding, reagent combinations, and collapse pressure. The CrazyGames cover should show visibly different cultures competing inside the dish, with lab intervention evident in the scene.

See [CrazyGames Naming And Release Positioning](./docs/crazygames/2026-08-28-naming-and-positioning.md) for the research, alternatives, collision screen, metadata copy, and pre-release clearance checklist.

## Influences

This project sits in the lineage of Conway's Game of Life, cellular automata, and the wider maths of emergence: simple local rules, repeated many times, producing surprising global behavior. Cellular Death Match uses a cellular Potts-style model rather than Life's exact birth/survival rules, but the fascination is the same: watching order, competition, blooms, collapse, and apparent intention emerge from tiny stochastic updates.

The per-breed energy profile system — where each lifeform has distinct CPM physics coefficients that determine its shape, compactness, and movement texture — was inspired by James Simon's [cell-fight](https://github.com/james-simon/cell-fight), a Python/Pygame multiplayer cell combat game built on the Cellular Potts Model. cell-fight demonstrated how simple energy-term tuning can produce visually rich, emergent cell morphology without explicit shape logic.

The game layer leans into that by asking the player to cultivate conditions instead of directly puppeteering every cell. Eggs, nutrients, toxins, mutation, reseeding, and objectives are all meant to make the dish feel like a living system that can be nudged, never fully commanded.

## Current Gameplay

- **Roguelike runs** — open-ended, no fixed epoch count. Runs fail when the ecosystem collapses; homeostasis becomes a visible equilibrium state the player can observe before ending the trial.
- **Guided Case** — five authored Trials teach placement, catalysis, reaction chaining, and equilibrium without turning the dish into a speed run.
- **Procedural Open Lab** — after the Case is sealed, choose between 2 field studies each epoch. Pressure escalates: crises come faster, outbreaks hit harder, mutations grow wilder.
- **Homeostasis win state** — when 3+ breeds hold stable volume share for 20 seconds, the HUD recognizes a living ecosystem, pauses pressure, and marks the dish "Equilibrium."
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
npx playwright install chromium
npm run dev -- --port 5199 --strictPort
```

Open the local URL that Vite prints:

```text
http://localhost:5199/
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
npm test             # Run the Vitest unit/integration suite
npm run test:e2e     # Start Vite and run the Playwright browser harness
npm run test:e2e:journey # Play all 5 Case Trials, enter Open Lab, reload, resume
npm run test:e2e:save    # Exercise Case/Open Lab save checkpoints
npm run test:e2e:soak    # Repeat the critical save/discovery paths 3 times
npm run qa:mobile    # Run the five-layout responsive Playwright suite
npm run test:all     # Vitest + Playwright + production build
npm run build        # Typecheck and create a production build
npm run typecheck
npm run preview
```

The Playwright harness uses isolated browser contexts. It verifies the five
supported viewport classes, runtime errors, core dish interactions, reduced
motion, the full five-Trial Case, and Open Lab loadout/discovery paths. Save
tests reload a fresh Trial, a partially played dish, a ready-to-bank dish, a
genome reveal, a Method choice, Trial 2, and an active Open Lab Study. The soak
command repeats the critical save and catalysis paths three times. Failure
screenshots, video, and traces are written to the ignored `test-results/`
directory; the HTML report is written to ignored `playwright-report/`.

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

- Portrait phone: centered dish, compact HUD, lifeform egg picker, and bottom tool sheet.
- Landscape phone: centered dish with HUD/coach and controls moved into side rails.
- Tablet portrait: a deliberately scaled instrument layout with more breathing room.
- Desktop: centered dish, richer side panels, lab log, inspector, and a compact run HUD above the culture.

Mobile notifications use one priority-directed attention channel, so a major
discovery replaces or queues minor messages instead of stacking over the dish.
The viewport honors device safe areas and dynamically follows browser chrome.
Presentation quality scales on constrained mobile hardware while fixed-tick
simulation behavior remains unchanged.

## Repository Readiness

Generated local files are ignored via `.gitignore`, including `dist/`, `node_modules/`, local browser artifacts, and local agent/tool state. Before publishing, run:

```bash
npm run test:all
git status --short
```

See [AGENTS.md](./AGENTS.md), [CLAUDE.md](./CLAUDE.md), [cloud.md](./cloud.md), [docs/current-state.md](./docs/current-state.md), and the [CrazyGames naming decision](./docs/crazygames/2026-08-28-naming-and-positioning.md) for contributor, deployment, and release-positioning notes.
