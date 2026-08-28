# Plan 02 — Research States Players Can Explain

Date: 2026-08-28
Status: Implementation plan signed off by primary and adversarial reviewers

## Objective

Translate the shared persisted stage enum into truthful category-specific
lifeform and protocol states, and repair legitimate historical split ownership.

## Work sequence

1. **Normalize category semantics.**
   - In `discoverySave.ts`, sanitize breed `understood` to `observed` and note
     `stabilized` to `understood` without altering valid dates.
   - Keep enum/schema compatibility and monotonic update behavior.
2. **Add startup ownership reconciliation.**
   - Add a pure reconciliation helper that unions valid stabilized rare breeds
     with valid saved strain ownership.
   - Follow the exact shared bootstrap order: onboarding reset; load/sanitize and
     replay any pending journal; load repaired stores/checkpoint; reconcile
     canonical ownership with verified persistence; reload repaired stores;
     establish progression/genome baselines; only then construct/restore the
     live run and UI.
   - Persist repaired stores through the verified mechanisms from Plans 03/05.
   - Skip ownership backfill when `revealAll` is the source of state; remove the
     current permanent strain-library mutation from debug reveal-all.
   - A failed replay/reconciliation leaves its journal pending, initializes a
     safe unavailable/retry Lab boundary, and never claims a banked transition.
3. **Model display state explicitly.**
   - Extend Notebook view entries with player-facing state label, next action,
     and category-specific accessible label.
   - Add pure `researchCollectionProgress` from canonical genomes and distinct
     `REACTION_RECIPES.discoveryNoteId` values.
4. **Preserve the controlled-Case exception.**
   - Continue allowing a successful named authored Trial to understand its
     supplied protocol hypothesis.
   - Keep unassigned discoveries observed until present at dish start and
     reproduced later.
5. **Route concise transition feedback.**
   - Update discovery announcements to `Signal observed`, `Protocol understood`,
     `Phenotype observed`, and `Genome decoded` semantics.
   - Coalesce duplicates and preserve safe-boundary genome presentation.
6. **Update Notebook rendering.**
   - Replace `OBS/HYP/STB` and generic stage labels with plain-language state and
     next action; make synthesis availability prominent.

## Tests first / alongside

- Extend discovery-save migration tests for invalid cross-category stages.
- Extend discovery-progression tests for authored replication, accidental first
  observation, later-dish promotion, and duplicate suppression.
- Add reconciliation tests for progression-only, library-only, both, malformed
  IDs, reveal-all, and no historical reveal events.
- Expand Notebook content tests for state labels, next actions, protocol totals,
  and screen-reader copy.
- Extend the existing Open Lab reaction journey to inspect observed then
  understood UI, not only localStorage.

## Guardrails

- Reconciliation only grants ownership already asserted by one canonical legacy
  authority; it does not infer discoveries from loadout text or debug state.
- No new save key or parallel discovery list for display state.
- Dates and fresh flags do not reset during migration.

## Done when

Both ladders are visibly distinct, old split state heals without celebrations,
wild and authored protocol paths behave differently by design, and all old-save
and discovery-soak tests remain monotonic.
