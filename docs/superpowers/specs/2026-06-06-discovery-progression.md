# Discovery Progression Spec

## Intent

The player starts with a small readable lab kit, discovers lifeforms through dish behavior, and unlocks riskier reagents as evidence appears in the dish. The game should reward curiosity first and add jeopardy later.

## Product Rules

- The first run starts with three egg strains: Swarmlet, Bruiser, and Splitter.
- The first run starts with three reagents: Egg, Nutrient, and Toxin. Agitate and End remain visible utility actions.
- Salt, Acid, Water, Sniper, Mirror, Boss, and discovered breeds are hidden until progression unlocks them.
- Debug reveal all must immediately unlock everything in the current runtime, even when discovery persistence is disabled.
- Debug clear discoveries must return the current runtime to the starter kit and clear saved discovery data.
- Discovery persistence remains optional. When off, unlocks still work during the run but are not saved across reloads.
- New discovery language should use "NEW LIFEFORM CREATED" for breeds. "New breed" is too clinical for the first hook.
- The objective panel must show a bold objective plus a smaller hint line. The hint can be suggestive rather than a full recipe.

## First Objective

Name: Create a New Lifeform

Goal: Create Bloom Mass.

Hint: Plant Swarmlet and Splitter close together, then feed the area with Nutrient.

Completion behavior: The dish should visibly announce the new lifeform before the epoch ends. A short showcase delay after the discovery is preferable to an instant win transition.

## Unlock Ramp

| Trigger | Unlock |
| --- | --- |
| Starter state | Swarmlet, Bruiser, Splitter, Egg, Nutrient, Toxin |
| Bloom Mass discovered | Bloom Mass, Water |
| Nutrient Conduit discovered | Salt |
| Salt Water Crystal discovered | Acid |
| Acid Toxin Flare discovered | Sniper |
| Needle Swarm discovered | Needle Swarm, Mirror |
| Folding Fault discovered | Boss |
| Folded Anchor discovered | Folded Anchor |
| Glass Antibody discovered | Glass Antibody |
| Static Lattice discovered | Static Lattice |
| Reveal all debug | All base lifeforms, all discovered breeds, all reagents |

## Test Requirements

- Unit-test default progression unlocks.
- Unit-test progression after Bloom Mass discovery.
- Unit-test reveal all and clear behavior at the progression layer.
- Integration-test the first recipe: Swarmlet + Splitter + Nutrient can create Bloom Mass.
- Integration-test the first objective: creating Bloom Mass satisfies the discovery objective after the showcase delay.
- Existing objective copy tests must include hints and continue to reject color-team language.

## UI Requirements

- Hidden lifeforms and reagents should not occupy visible rack space.
- The tool summary should describe the currently selected starter reagent.
- The objective line should be visually stronger than other HUD rows.
- The hint should sit directly below the objective in the top monitor.
- Desktop layout should keep the dish centered with racks aligned left and right.
