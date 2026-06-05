# Catalytic Discovery Design

## Goal

Add a playful mad-science discovery layer to the Petri dish ecosystem. The player should experiment with reagents, organisms, and timing, then see surprising but learnable catalytic reactions, hidden breeds, folding faults, and lab notes emerge from the dish.

## Design Pillars

### Curiosity Over Punishment

The player should be encouraged to try strange combinations. Violent reactions can damage colonies, scramble traits, consume space, trigger outbreaks, or make objectives harder, but they should also create opportunities: hidden breeds, faster objective progress, new lab notes, or dramatic population shifts. Avoid instant-loss outcomes caused only by curiosity.

### Fictional Biology

Use playful fictional lab language. The mood can borrow from comic-book science, absurdist sci-fi, and toy-lab chaos, but it should not name real diseases, real public-health events, or real-world medical claims. Good terms include "folding fault", "RNA-ish lattice", "antidote foam", "needle swarm", "unstable protein", "catalytic flare", "lab note", "strange attractor", and "Rule fault".

### Hybrid Discovery

Discovery should come from both player intent and emergent simulation state:

- The player creates conditions with tools, egg strains, and agitation.
- The ecosystem decides whether the conditions become harmless, useful, violent, or transformative.
- The dish log explains enough for the player to learn a pattern without fully solving the system.

This matches the Wolfram/Rule 30 inspiration: simple local rules can generate complex outcomes that are best understood by watching the system evolve. The design reference is Stephen Wolfram's discussion of computational irreducibility and Rule 30 in ["A 50-Year Quest: My Personal Journey with the Second Law of Thermodynamics"](https://writings.stephenwolfram.com/2023/02/a-50-year-quest-my-personal-journey-with-the-second-law-of-thermodynamics/#computational-irreducibility-and-rule-30).

### Cellular Automata Roots

The project should keep showing its love of Conway's Game of Life, cellular automata, and Wolfram-style local rules. The player does not need a lecture, but the feel should be: place simple inputs, watch local rules collide, then infer what happened from visible patterns. Folding faults, mutation bands, lattice growth, and reaction waves should make the dish feel like an automata toy box rather than a scripted spell list.

## Feature Scope

### Catalytic Reactions

The current tool reactions are simple pairwise fields. This pass turns them into named catalytic events with:

- A recipe family: which reagents, fields, traits, or breed contexts caused it.
- A caution level: `stable`, `volatile`, or `critical`.
- A visible field effect.
- A dish-log discovery event.
- Mechanical impact on cell volume, movement, traits, or spawning.

Initial reaction families:

- `nutrient_conduit`: water plus nutrient near budding or swarmlet colonies. Spreads nutrient pressure farther and may found a bloom-style breed.
- `acid_toxin_flare`: acid plus toxin near fragile or sniper-like colonies. Burns tissue hard, pulses mutation, and may discover a glassy survivor breed.
- `salt_water_crystal`: salt plus water near gelatinous or large colonies. Freezes movement, then shatters growth into smaller offspring or dead matter.
- `agitated_chain`: agitation while two or more active reaction fields overlap. Expands the field and raises caution, with a chance to produce a folding fault.
- `folding_fault`: a reaction-derived local rule that grows branching, asymmetric patterns across nearby living matter.

### Water Improvements

Water should become a high-interest reagent rather than only a soft spread field.

Water should:

- Carry nutrient fields farther.
- Dilute acid/toxin damage if used alone after a dangerous field.
- Spread acid/toxin if agitated while those fields are active.
- Amplify budding or folding traits.
- Enable crystallization when mixed with salt.
- Create readable log hints such as "water carried nutrient farther" or "water diluted the flare".

### Hidden Breeds

Hidden breeds are discovered variants, not new top-level archetypes. They keep a base `EnemyArchetype` for AI dispatch, with a `breedId` modifier for naming, color tint, stats, traits, and log identity.

Initial hidden breeds:

- `needle_swarm`: a swarmlet variant discovered when sniper/suppressor pressure and swarmlet movement overlap.
- `folded_anchor`: a boss or bruiser variant that survives a folding fault.
- `glass_antibody`: a toxin-resistant or fragile survivor of acid/toxin flare.
- `bloom_mass`: a budding strain created by water/nutrient overgrowth.
- `static_lattice`: a salt/water crystallization survivor.

Hidden breeds should affect the current run immediately. They may optionally persist to a saved collection only when debug persistence is enabled.

### Discovery Log

The dish log becomes a more important reward surface. It should feel like a retro VDU lab monitor on desktop, while staying compact on mobile. Green can be one color family, but the UI must not become all-green because event communication needs multiple readable tones.

Message types:

- `NEW BREED DISCOVERED: Needle Swarm`
- `CATALYTIC FLARE: acid/toxin chain`
- `FOLDING FAULT: local rule escaped containment`
- `LAB NOTE UPDATED: water carries nutrients farther`
- `CAUTION: volatile reagent field`

Desktop should show more log history. Mobile should show one or two concise lines and avoid covering the dish.

### Dish Event Signposting

When something important happens inside the dish, the player should see it in the dish, not only in text. Visible mutations, catalytic reactions, folding faults, hidden breed births, and caution states need short-lived markers that connect the event to a location.

Signposting should include:

- Color-coded pulse rings around the event origin.
- Brief flash or tint on affected cells.
- Palette-cycling mutation bands inspired by old Commodore 64 color cycling, used sparingly for mutations, folding faults, and critical catalytic events.
- Small non-blocking glyphs or tick marks near the event, if readable.
- Matching dish-log tone so the same event reads consistently across canvas and monitor UI.
- Different colors for discovery, caution, critical reaction, mutation, and stabilizing/water events.

The signposting should be informative without turning into noisy particle spam. It should decay quickly, avoid covering the player controls on mobile, and respect reduced-motion preferences by falling back to slower pulses or static tints.

### Runtime UI Space

The debug inspector is useful while building but should not permanently occupy prime game UI. FPS, tick, boundary, and static control reminders can move behind an Escape-driven menu or debug toggle. The default game view should reserve space for the dish, the active objective, the tool strip, the lifeform guide, and the dish log.

Escape behavior should be simple:

- Press Escape to open or close the menu/debug overlay.
- Put controls, debug status, persistence controls, and save-management actions in that overlay.
- Keep one tiny affordance in the main view, such as "Esc: menu", if needed.
- While the menu is open, catch keyboard controls so gameplay input does not leak through.

The lifeform guide can become denser and more useful. Lifeform icons can be small, translucent, and gently animated. Hover, focus, or selection should reveal a short info panel: name, role, traits, caution hints, and discovery status. The player only needs enough information to recognize "this lifeform is this" and make an experiment feel intentional.

### Lab Notes And Save Data

Add a small save-data layer for discoveries. Default behavior:

- Discoveries are run-local.
- Debug persistence can be toggled on.
- If persistence is enabled, discovered breeds and lab notes are saved to `localStorage`.
- Debug controls can clear saved discoveries and reveal all discoveries.

This gives us a progression foundation without committing to permanent meta-progression as the default game loop.

### UI Direction

Keep the Petri dish as the hero. UI panels should feel like retro lab monitors around the dish rather than decorative cards. Desktop can grow richer monitor panels. Mobile must stay thumb-friendly and avoid permanent panels over the dish.

For this pass:

- Upgrade Dish Log styling and size.
- Use VDU-inspired monitor styling with restrained green, amber, red, cyan, and violet event tones.
- Add canvas signposting for visible mutations, catalytic reactions, and discoveries.
- Move always-visible debug/control clutter into an Escape menu or debug overlay.
- Add compact lifeform icons with hover/focus/select info.
- Add a compact Lab Notes/debug area on desktop.
- Add persistence controls to the debug panel.
- Do not add a large permanent mobile panel.
- Do not add more always-visible reagent buttons.

### Tuning And Magic Numbers

The current arena file owns many timings, counts, radii, and damage constants. This pass should extract catalytic and ecology tuning into content-style modules so future balancing is straightforward.

Target split:

- `src/content/ecologyTuning.ts`: epoch timings, population caps, objective thresholds, agitation tuning, base tool tuning.
- `src/content/catalysis.ts`: reaction recipes, hidden breeds, discovery note definitions, reaction tuning.

Keep low-level `src/sim/` untouched unless a test proves a simulator-level change is unavoidable.

## Architecture

### Content

`src/content/catalysis.ts` defines reaction recipes, hidden breed definitions, caution labels, lab notes, and helper selectors. This keeps the creative/tunable layer out of `arena.ts`.

`src/content/ecologyTuning.ts` holds numeric tuning currently scattered through `arena.ts`.

### Arena

`src/game/arena.ts` remains the orchestrator. It applies tools, detects reactions, spawns hidden breeds, advances folding faults, records discoveries, and exposes ecology/discovery state to UI. If the file becomes unwieldy during implementation, extract helper modules under `src/game/ecology/` rather than expanding `arena.ts` indefinitely.

### Save

`src/game/discoverySave.ts` owns localStorage reading/writing with a small injectable storage interface for tests.

### UI

`src/ui/screens.ts` can expose new UI methods for lab notes and discovery/debug controls. `src/ui/debug.ts` can own desktop-only debug interactions. `src/main.ts` wires save state, arena discovery events, and UI controls.

## Testing Strategy

Use TDD for every subsystem.

- Content tests prove reaction recipes and hidden breeds are complete and internally consistent.
- Arena tests prove water behavior, catalytic reactions, hidden breed discovery, and folding faults.
- Save tests prove persistence toggle, clear, reveal, and corrupt-data fallback.
- UI tests remain light because the project has no DOM test framework; verify DOM wiring through typecheck/build and browser smoke.
- Full verification remains `npm test`, `npm run build`, and browser checks at `375x667`, `390x844`, and `1280x720`.

## Out Of Scope

- Real-world disease naming or medical claims.
- Permanent progression enabled by default.
- New raster art assets.
- A full encyclopedia screen.
- Full fluid simulation.
- Refactoring the low-level cellular Potts simulation.

## Success Criteria

- The player can discover at least five named catalytic or breed events in one run.
- Water has at least three distinct tactical uses.
- Violent reactions are visibly stronger than current reactions but do not cause immediate arbitrary run loss.
- Dish Log communicates discoveries clearly and feels more like a lab monitor.
- Discovery save data can be toggled, cleared, and revealed from debug controls.
- Numeric catalytic/ecology tuning is no longer buried only in `arena.ts`.
