# Plan 05 — Honest Lightweight Saving

Date: 2026-08-28
Status: Implementation plan signed off by primary and adversarial reviewers

## Objective

Verify checkpoint persistence, expose the precise restart promise, and fail
safely when storage is missing, denied, corrupt, stale, or a no-op.

## Work sequence

1. **Return an honest checkpoint result.**
   - Change `saveRunCheckpoint` to return `saved` with canonical readback or
     `unavailable` with a reason; no successful runtime pointer on failure.
   - Validate `savedAt` and include a stable checkpoint identity/version in
     equality checks.
2. **Update all checkpoint call sites.**
   - Only assign `activeRunCheckpoint` on verified success.
   - Keep live play running on failure and expose one quiet runtime save status.
   - Coordinate with the bank journal so boundary commits verify their target
     checkpoint rather than calling the unverified legacy helper.
   - Refactor bootstrap in the shared order: onboarding reset → pending-journal
     replay → repaired store/checkpoint load → verified two-way reconciliation →
     repaired reload → transition baselines → run construction/restoration/UI.
     Failed replay keeps the journal and enters a retry/unavailable Lab boundary.
3. **Model title resume truthfully.**
   - Extend `CaseProgressInfo` with resume phase and save availability.
   - Active arena checkpoint: `Restart Trial/Study` plus `Assignment saved;
     active cultures restart.`
   - Choice boundary: `Continue Case/Study` plus last-result/choice copy.
   - No checkpoint: `Research saves automatically between boundaries.`
   - Unavailable: `Saving unavailable in this browser` without repeated toast.
4. **Keep macro boundary small.**
   - Preserve run, objective, Method choices, loadout, and pending genome IDs.
   - Explicitly exclude grid/effects/charges/elapsed time/coach step.
5. **Document and test checkpoint version behavior.**
   - Canonical old v1 values still sanitize; invalid phases/objectives fail closed.

## Tests first / alongside

- Extend `runCheckpoint.test.ts` with throwing, no-op, stale readback, invalid
  date/version, and successful canonical identity cases.
- Unit-test title copy for arena/Method/Study/no-save/unavailable states.
- Extend persistence E2E at opening, partial, ready, reveal, Method, Study choice,
  Open Lab, and repeated reload points; assert Restart vs Continue wording.
- Add corrupted checkpoint and storage-denied browser paths with no crash or
  false `saved` message.

## Guardrails

- No CPM serialization, unload-time async dependency, service worker, or cloud.
- Save failure does not stop experimentation; bank failure does stop boundary
  advance until retry because its promise is stronger.
- Avoid wall-clock-sensitive assertions in copy tests.

## Done when

Every return action tells the truth, failed writes cannot masquerade as saved,
all safe boundaries resume, active dishes restart cleanly, and the persistence
soak remains duplicate-free.
