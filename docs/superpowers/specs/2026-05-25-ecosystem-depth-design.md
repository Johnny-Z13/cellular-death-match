# Ecosystem Depth Design

## Goal

Make the game feel like a living Petri dish rather than a set of independent blobs. The player should read relationships, crises, mutations, and environmental fields, then intervene with eggs, nutrients, toxins, and agitation to steer the ecosystem.

## Desired Player Experience

The main feeling is "I am managing a volatile living system." The player should feel curious and tactical: the dish should surprise them, but not feel random. Good play should come from noticing patterns such as one lineage hunting another, a mutation changing a species role, or a crisis making a tool more valuable.

## Feature System

### Species Relationships

Each egg strain gets an ecological role in addition to its current stats:

- Swarmlet: grazer. Fast, fragile, spreads quickly, and feeds opportunistically.
- Bruiser: predator. Slow, large, and likely to dominate nearby prey.
- Splitter: propagator. Midweight organism that creates population bursts.
- Sniper: suppressor. Keeps distance and pressures crowded areas.
- Mirror: mimic. Adopts the red lineage profile and adapts to the current dish.
- Boss: anchor. Large ecosystem shaper that creates strong local pressure.

Relationships affect target choice. Lifeforms still use the same cellular Potts simulation, but target selection should no longer be purely nearest-neighbor. A predator should prefer vulnerable prey; fragile organisms should avoid major predators; suppressors should favor dominant or large targets.

### Named Mutations

Mutations should become readable traits instead of a hidden counter. A mutation can add one named trait to a lineage:

- Fleet: faster movement.
- Gelatinous: higher volume, slower movement.
- Toxin-resistant: weaker toxin shrink and flee response.
- Fragile: smaller but faster.
- Budding: more likely to produce viable reseeds.

The ticker should report trait emergence, and the HUD/ecology summary should expose recent traits so the player can understand why behavior changed.

### Environmental Gradients

Nutrients and toxins already persist as tool effects. The design formalizes them as environmental fields:

- Nutrient field: attracts and feeds nearby cells.
- Toxin field: repels and thins nearby cells.
- Fields can interact with eggs and agitation.

These fields should remain visually readable and should be the basis for tool synergies.

### Tool Synergies

Tools should combine into predictable outcomes:

- Egg in nutrient field: boosted hatch with Budding trait.
- Egg in toxin field: smaller hatch with Toxin-resistant trait.
- Agitate with nutrient fields active: spreads a mild nutrient mist across the dish.
- Agitate with toxin fields active: disperses toxin pressure, making it wider but weaker.

This makes the order of actions matter without adding more buttons.

### Crisis Events

Each epoch can develop a short-lived crisis. Crises should be legible and should change priorities:

- Heat spike: faster movement and higher volatility.
- Oxygen crash: large lineages are stressed.
- Contamination bloom: new swarm pressure appears if population is low.

Crises should be rare enough to feel like events, not noise. The first implementation should trigger at predictable intervals so it is testable and understandable.

### Ecology Signals

The game should report what the ecosystem is doing in plain language. Signals are short phrases produced by the arena and displayed by the ticker:

- "Bruisers are hunting swarmlets."
- "Splitter mutated: Budding."
- "Heat spike: movement is rising."
- "Agitation spread nutrient mist."

Signals bridge the gap between low-level simulation and player understanding.

### Strategic Upgrades

Upgrades should change decisions, not only counts. The first set should add:

- Centrifuge Rotor: +1 agitation charge.
- Selective Medium: nutrient boosts selected egg lineage hatches.
- Antibody Memory: toxin pressure is stronger against the current dominant lineage.
- Spore Bank: emergency egg refill grants the selected strain.

The first implementation will ship Centrifuge Rotor because it fits the current data model cleanly. The other upgrades are documented here as the next extension once selected strain data is stored in run/player config.

## Interaction Model

1. The player chooses an egg strain and places life.
2. Species relationships influence who competes with whom.
3. Nutrient and toxin fields create local environmental gradients.
4. Mutations alter visible traits.
5. Crises temporarily change ecosystem pressure.
6. Tool synergies let the player deliberately produce stronger outcomes.
7. Signals explain what changed.
8. Upgrades let the player specialize future interventions.

## Architecture

Keep the low-level simulation in `src/sim/` generic. Do not put game-specific ecosystem rules there beyond hard-wall boundary behavior.

Put ecological roles, traits, and crisis definitions in `src/content/ecology.ts`. This keeps tunable data beside enemies, objectives, and upgrades.

Keep orchestration in `src/game/arena.ts`. Arena owns relationships, mutations, crisis timing, tool synergies, signals, and per-tick ecosystem effects.

Keep UI rendering simple. `src/main.ts` reads `arena.getEcology().signals` and forwards new messages to the existing ticker.

## Testing Strategy

Use focused unit tests:

- Content tests prove all archetypes have ecology definitions.
- Arena tests prove relationship targeting changes intent.
- Arena tests prove named mutations appear and expose traits.
- Arena tests prove egg/tool synergies change spawned traits.
- Arena tests prove crisis events activate and affect ecology.
- Upgrade tests prove Centrifuge Rotor increases agitation charges.

Use full verification:

- `npm test`
- `npm run build`
- Browser smoke at desktop, mobile, and small mobile.

## Out of Scope For This Pass

- New art assets.
- New buttons beyond existing controls.
- A full graph visualization panel.
- Long-term save data.
- True fluid simulation for gradients.
