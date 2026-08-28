# Shared Implementation Sequence

Date: 2026-08-28
Status: Implementation plan signed off by primary and adversarial reviewers

The seven plans share bootstrap, persistence, `main.ts`, and screen state. They
are integrated in this dependency order rather than implemented as seven
isolated patches.

## Phase 0 — Preserve and baseline

1. Record `git status --short` and the current diff/stat without resetting,
   stashing, or overwriting existing work.
2. Run the current `npm test`, `npm run build`, persistence harness, one complete
   Case journey, and responsive smoke suite before new implementation edits.
3. Record any existing failure separately; a new change cannot absorb an old
   failure without identifying it.

## Integration order

1. **Verified storage primitives (Plan 05 foundation).** Add canonical readback
   results while retaining compatible load helpers.
2. **Pure bank planner and journal engine (Plan 03 foundation).** No `main.ts`
   wiring until all store-failure and idempotence unit tests pass.
3. **Startup replay and ownership reconciliation (Plans 02/03/05).** Refactor
   bootstrap once, reload repaired snapshots, then establish live baselines.
4. **Study feasibility and legacy objective repair (Plan 01).** Use the now-
   canonical run/loadout/store state.
5. **Bank/abandon runtime UI (Plan 03 completion).** Wire the tested engine and
   verified checkpoint path into the dish boundary.
6. **Progressive guidance (Plan 04).** Remove later pointer scripts only after
   persistence/abandon reload behavior is stable.
7. **Collection north star (Plan 06).** Render from the reconciled canonical
   progression view.
8. **Dish-first Study presentation (Plan 07).** Make the final transition/focus
   change after objective, coach, and save flows are settled.
9. **CI cadence.** Add focused pull-request paths and a scheduled repeated soak
   only after the final local harness is green.

## Per-phase discipline

- Add or update focused tests with each phase and run them before moving on.
- Run the full unit suite after every persistence/bootstrap phase because those
  changes affect all later UX.
- Re-run build and the relevant Playwright journey after each `main.ts` phase.
- Inspect `git diff --check` and `git status --short`; preserve unrelated/user
  changes throughout.
- No plan is considered complete solely because its isolated unit tests pass;
  the shared verification matrix remains the final gate.
