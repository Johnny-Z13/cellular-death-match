# Plan 01 — Solvable Open Lab Studies

Date: 2026-08-28
Status: Implementation plan signed off by primary and adversarial reviewers

## Objective

Make procedural Study selection deterministic and feasible for the actual saved
loadout/tool budget, including safe recovery from an old impossible checkpoint.

## Work sequence

1. **Introduce a pure capability model.**
   - Add `StudyCapabilities` and `ToolBudget` beside `objectivePool.ts`.
   - Include globally stabilized/known breeds, actual seedable lifeforms, tool
     IDs with post-Method charge budgets, epoch index, and seed.
   - Add content-derived helpers for compatible reaction routes and exact
     undecoded hybrid parent routes.
2. **Make every pool predicate explicit.**
   - Replace `available(ctx)` with a result that includes `available`, a compact
     `uses` string, and a reason for diagnostics.
   - Encode the signed-off minimum seed/tool/distinct-lifeform/timing rules.
   - Correct Mega-Culture and Extinction Reversal copy to match scoring.
3. **Pass current-run access, not global access.**
   - Update `run.getObjectiveChoices` and the `main.ts` objective-pick path.
   - Treat `objective_pick` as loadout-constrained in current lifeform resolution;
     foundational lab stock remains available through existing progression.
   - Derive budgets from `run.getPlayerConfig()` and canonical tool tuning after
     the selected Method is applied.
4. **Revalidate restored procedural objectives.**
   - Add a pure `isObjectiveFeasible` lookup.
   - After checkpoint sanitation and loadout restore, return an infeasible saved
     objective to `objective_pick`, clear only `chosenObjective`, persist the
     repaired checkpoint, and show one non-blocking explanation.
5. **Expose requirements on cards.**
   - Extend the screen choice view with `Uses: ...` without leaking unavailable
     Studies or changing `ObjectiveDef` scoring ownership.

## Tests first / alongside

- Expand `tests/game/objectivePool.test.ts` across hybrid parent loadout pairs,
  tool budgets, distinct-lifeform thresholds, reaction routes, and many seeds.
- Add deterministic completion fixtures for every enabled requirement class,
  using the arena/objective scorer rather than only testing copy.
- Extend `tests/game/run.test.ts` for capability plumbing/determinism.
- Extend `tests/game/runCheckpoint.test.ts` for infeasible saved objectives and
  preserved loadout/progression.
- Add Playwright coverage that a globally decoded but unequipped hybrid parent
  cannot produce a Cross-Breed card, then equip both and verify it can.

## Guardrails

- No UI/save dependency enters `src/sim/` or objective scoring.
- Availability is conservative: a false negative reduces variety; a false
  positive strands a player.
- Two safe general Studies must remain feasible for every legal Open Lab start.
- Changing seed may reorder feasible cards but never change the feasible set.

## Done when

All predicate/property/scenario tests pass, cards show truthful requirements,
legacy invalid restore falls back safely, and the complete journey harness never
enters an unseedable Study.
