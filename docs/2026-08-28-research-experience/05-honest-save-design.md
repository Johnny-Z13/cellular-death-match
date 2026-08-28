# Design 05 — Honest Lightweight Saving

Date: 2026-08-28
Status: Design signed off by primary and adversarial reviewers

## Problem

The checkpoint intentionally stores macro run state, not the cellular Potts
grid. That is a good technical boundary, but `Continue Case` can imply an exact
mid-dish resume. The implementation can also report an in-memory checkpoint
even when a storage write was denied, making any “saved” indicator potentially
false.

## Decision

Keep lightweight checkpoints and make their promise explicit:

> Research progress saves automatically. Active cultures restart cleanly on
> return.

Do not serialize the live dish. A clean restart is safer, smaller, and more
predictable than restoring a time-sensitive ecosystem without its exact clock,
effect, event, and audio state.

## Checkpoint boundaries

Persist and verify at:

- the start of a Trial/Study, so interruption restarts the same assignment;
- completion before leaving for genome/Method/Study presentation;
- Method selection;
- Study selection;
- progression transitions already saved during a dish.

Do not claim to save cell positions, reagent fields, remaining per-dish charges,
coach step, active reaction effects, or elapsed observation time.

## Verified storage result

Saving must return a discriminated result:

- `saved`: the value was written and can be read back as a valid canonical
  checkpoint;
- `unavailable`: storage threw, was denied, or readback did not match the saved
  checkpoint identity.

Only a verified `saved` result may populate the runtime resume pointer or render
`Research saved`. An unavailable save never stops live play; the title/options
surface instead says `Saving unavailable in this browser` without repeated
toasts or alarming error language.

This checkpoint result is distinct from the multi-store Bank commit in Design
03. Checkpoint writes verify assignment position. Bank commits additionally
verify discovery progression, strain ownership, Case record, research archive,
and the target checkpoint before claiming a result was preserved. Partial Bank
commits are journaled and replayed idempotently on startup.

## Return copy

The title action reflects checkpoint phase:

| Saved phase | Action | Supporting copy |
| --- | --- | --- |
| Active dish | Restart Trial / Restart Study | Assignment saved; active cultures restart. |
| Method choice | Continue Case / Continue Study | Last result saved; choose a Method. |
| Study choice | Continue Study | Loadout and research saved; choose a Study. |
| No checkpoint | Run Trial / Enter Open Lab | Research saves automatically between boundaries. |

The persistent Case record, discoveries, Notebook evidence, strain library, and
research archive keep their current independent save ownership.

## Onboarding behavior

Quitting during Trials 1–2 restarts the same dish with full exact guidance and
full charges. The UI must say `Restart`, not imply resuming from the last tap.
Sealed Trial records remain sealed. Quitting during a genome reveal or Method
choice returns to that safe boundary without losing the pending reveal/choice.

## Acceptance criteria

- Reload at multiple points in Trials 1–2 restarts the correct assignment with
  full charges and correct guidance.
- Reload during a pending genome reveal, Method choice, or Study choice restores
  that safe boundary exactly once.
- Reload during Open Lab restarts the chosen Study with the same loadout and
  objective.
- No UI copy promises live-culture persistence.
- A throwing or no-op storage implementation produces `unavailable`, no false
  runtime checkpoint, and no crash.
- Verified saves survive sanitation and contain only canonical objectives,
  upgrades, lifeforms, and phases.
- Existing old checkpoint data either migrates through sanitation or fails
  closed to a fresh Lab without corrupting other progression.

## Non-goals

- No service worker, account, cloud save, or cross-device synchronization.
- No background simulation while the page is closed.
- No storage of audio/UI animation state.
- No modal “save successful” interruption.
