# Discovery Progression Implementation Plan

## Goal

Make discovery the onboarding spine: start with a small kit, guide the player toward one new lifeform, unlock tools and species from real dish events, and make objectives easier to read.

## Success Criteria

- The default UI only exposes starter lifeforms and starter reagents.
- Creating Bloom Mass unlocks Water and completes the first objective after a short showcase.
- Debug reveal all and clear discoveries work immediately in the current runtime.
- Objective HUD copy has a bold objective and a readable hint.
- Automated tests cover unlocks and the first discovery objective.
- `npm test` and `npm run build` pass.

## Steps

1. Add progression tests.
   - Verify starter unlocks.
   - Verify Bloom Mass unlocks Water.
   - Verify reveal all and clear reset.
   - Verify first recipe and first objective in Arena.

2. Implement a runtime progression module.
   - Track discovered breeds and notes independent of persistence.
   - Derive unlocked tools and lifeforms from discovered evidence.
   - Support reveal all and clear.

3. Wire progression into the app.
   - Seed runtime progression from saved discoveries when persistence is enabled.
   - Apply arena discoveries every tick.
   - Persist runtime discoveries only when persistence is enabled.
   - Update debug status from runtime progression.

4. Filter UI racks.
   - Hide locked reagent buttons.
   - Hide locked lifeforms and locked egg choices.
   - Fall back to a starter egg or tool if the selected item becomes locked.

5. Add first objective and hint copy.
   - Add `discover_breed` objective kind.
   - Add `hint` to objectives and HUD.
   - Make objective typography stronger.
   - Add a short showcase delay after breed discovery.

6. Add first Bloom Mass recipe.
   - Discover Bloom Mass when Swarmlet and Splitter are close in a nutrient field.
   - Emit "NEW LIFEFORM CREATED" signal and dish marker.

7. Verify.
   - Run focused tests during development.
   - Run full `npm test`.
   - Run `npm run build`.
   - Browser-check desktop and mobile readability.
