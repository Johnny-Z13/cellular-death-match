# Plan 03 — Bank Versus Abandon

Date: 2026-08-28
Status: Implementation plan signed off by primary and adversarial reviewers

## Objective

Make the bottom action predict and safely execute either a verified banked
boundary or a deliberate abandon, including recovery from partial multi-store
writes.

## Work sequence

1. **Make completion planning pure and serializable.**
   - Add a run-state transition planner that derives target `RunState`, including
     Method choices, from serialized state and a deterministic seed without
     mutating the live run or consuming hidden RNG state. Existing mutating run
     methods apply that planned state so normal and journal paths cannot diverge.
   - Split discovery and research-archive logic into pure target-state planners
     plus separate persistence/presentation adapters. Planning cannot write,
     emit audio/haptics/toasts, change fresh flags, or alter runtime sets.
   - Add one pure `planResearchBank` that consumes canonical snapshots and dish
     evidence, and returns the complete target stores, post-bank run/checkpoint,
     and queued presentation deltas without side effects.
2. **Create a boundary bank journal.**
   - Add `src/game/researchBank.ts` with a versioned key, canonical sanitizer,
     deterministic commit ID, pending-commit load/save/clear, and replay helpers.
   - Commit payload contains only monotonic evidence: breed/note target stages,
     rare strain IDs, optional authored Trial ID, target research archive state,
     canonical target run/checkpoint state, and terminal-only target `runCount`
     and `biomeCount` values. Ordinary Study commits copy the existing counters
     unchanged.
   - Never include cell grid, effects, charges, elapsed dish time, or transient UI.
3. **Verify every critical store.**
   - Add verified write/readback helpers to discovery, strain-library, Case
     record, research archive, and run checkpoint APIs without making UI code
     parse raw storage.
   - Journal first, apply idempotent union/max updates, read all stores back,
     then clear journal. A partial result remains replayable. Journal removal is
     itself verified; a stale already-applied journal is safe to replay.
   - Replay before progression-transition baselines on startup; suppress
     historical notifications and counters during repair.
   - Release queued announcements, reveals, audio, haptics, runtime-set changes,
     and screen transitions only after all verification succeeds.
4. **Separate specimen banking from run finalization.**
   - Add `bankStabilizedSpecimens` that updates availability without incrementing
     run count or closing telemetry.
   - Keep existing terminal banking as an idempotent fallback and run-count
     operation by applying the journal's absolute target counters with verified
     monotonic `max(current, target)`, never `+= 1`. A new biome similarly uses
     its prepared absolute target. Replaying the same commit or failing to clear
     its journal therefore cannot duplicate either counter.
5. **Replace End semantics with a pure action state.**
   - Add a small `dishExitAction` state helper: `locked`, `abandon`,
     `confirm-abandon`, `bank`, `retry-save`.
   - Feed explicit labels/descriptions into `screens`, rather than deriving copy
     from a boolean only.
6. **Implement inline abandon confirmation.**
   - First incomplete activation arms for four seconds and announces consequences.
   - Successful dish action, objective completion, phase/menu change, or timeout
     cancels it.
   - Trial 1 stays locked while incomplete.
7. **Implement deterministic abandon flows.**
   - Authored Trial: persist legitimate observations, clear active checkpoint,
     restart run state to title, and let consecutive sealed Case state select the
     same unsealed Trial.
   - Open Lab: preserve observed evidence, bank nothing, clear active run, and
     return to title/loadout flow.
8. **Wire bank retry UX.**
   - If the journal or any readback fails, keep the completed dish and offer
     `Retry save`; do not show Method/Study/reveal or `Banked` copy.

## Tests first / alongside

- New `tests/game/researchBank.test.ts`: sanitation, idempotence, partial writes
  at journal preparation, every target store, checkpoint write, readback
  mismatch, journal removal, startup replay, and no duplicate side effects.
- Run transition tests prove planning is deterministic from serialized inputs,
  does not mutate the source state, and matches the applied transition exactly.
- New exit-state unit tests for confirm, timeout, cancel, bank, retry, and Trial 1.
- Strain-library tests prove ordinary Study banking persists without run-count
  increment and is loadout-eligible after reload.
- Terminal journal tests inject partial archive, strain-library, checkpoint, and
  journal-clear failures, then reload/replay and assert exactly one run-count and
  biome-count increment.
- Browser tests cover touch/keyboard two-step abandon, cancel-on-action, authored
  return point, Open Lab no-bank, ordinary Study bank/reload/equip, and injected
  storage failure/retry.

## Guardrails

- No destructive rollback of monotonic research data after a partial write.
- No confirmation modal over the dish.
- Pending commit payload is sanitized against current content and bounded in
  size; malformed journals fail closed without corrupting other stores.
- Announcements occur only after verified completion, never during replay.

## Done when

The labels always predict outcomes, accidental single-tap loss is impossible,
ordinary Study specimens survive reload immediately, partial writes converge,
and end-of-run telemetry/counts remain correct.
