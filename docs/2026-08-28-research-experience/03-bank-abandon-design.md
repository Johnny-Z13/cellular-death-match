# Design 03 — Bank Versus Abandon

Date: 2026-08-28
Status: Design signed off by primary and adversarial reviewers

## Problem

The permanent bottom action says `End`, with changing subcopy such as `bank or
leave`. That combines two materially different outcomes: preserving a completed
result and walking away from an incomplete experiment. On touch screens it also
makes accidental loss too easy.

## Decision

The action names the consequence of pressing it now.

### Complete result

```text
Bank result
ready
```

One activation completes the Study/Trial, persists eligible stabilization and
protocol evidence, and advances through the existing result boundary.

“Bank” is a hard data-flow guarantee, not only celebratory copy. Every rare
specimen that becomes stabilized at this boundary must be written to the
strain library immediately, before the next Method/Study screen is shown.
Normal Open Lab Studies cannot defer that write until eventual collapse or
equilibrium: an endless successful run may be reloaded first. Run-count and
end-report bookkeeping remain separate from specimen banking.

Banking uses a small idempotent boundary commit, not a best-effort sequence of
unrelated calls:

1. Persist a canonical pending-commit record containing the objective result,
   discovery/stage deltas, rare strains, authored Trial seal (if any), research
   archive evidence, and target post-bank run/checkpoint state.
2. Apply each monotonic store update and verify it by canonical readback.
3. Advance presentation only after all critical reads match the commit.
4. Clear the pending record after success. If any write or verification fails,
   the completed dish remains on screen as `Save unavailable · retry`; it never
   claims to be banked or advances.
5. On startup, replay a valid pending commit before transition detection. Every
   operation is union/max based, so partial prior application is harmless and
   produces no duplicate reveal, Case seal, run count, or research record.

The commit is deliberately a boundary journal, not live-dish serialization.

### Incomplete authored Trial

```text
Abandon trial
unsealed
```

The first activation arms a confirmation without leaving the dish:

```text
Abandon trial?
tap again
```

The second activation inside a short window returns to the Lab. The current
Trial remains the next unsealed Trial; it does not silently advance the authored
Case. Already persisted observations remain research evidence, but no incomplete
specimen is stabilized or banked.

Inline confirmation explains this directly: `Leave without completing this
Trial? Logged observations remain; no result will be banked.`

### Incomplete Open Lab Study

```text
Abandon study
no result
```

The same confirmation returns to the Lab and discards the active run result.
Observed evidence that was already logged remains observed. Rare strains are not
banked merely because the dish was abandoned.

The Open Lab confirmation uses the parallel wording `Leave without completing
this Study? Logged observations remain; no result will be banked.`

### Equilibrium

Visible equilibrium is a complete result and uses `Bank result`. Existing run
conclusion/report behavior remains available after that boundary.

## Confirmation behavior

- Confirmation lasts roughly four seconds.
- Any successful dish action, objective completion, phase change, Escape/menu
  transition, or timeout disarms it.
- The armed state uses warning color, changed text, an `aria-live` explanation,
  and one warning haptic where supported.
- It never requires a hold gesture; two deliberate activations work for touch,
  keyboard, switch, and mouse input.
- Trial 1 remains unable to abandon before its taught sequence is complete.
- Repeated rapid events cannot invoke both abandon and bank.

## Case-flow integrity

Abandoning an incomplete authored Trial must not use the existing “lapsed and
advance” path. That behavior can create holes in a five-Trial Case and make
reload resume a different point from the current in-memory run. Abandon returns
to the title Lab, clears only the active run checkpoint, and reconstructs the
next authored Trial from the consecutive sealed Case record.

Timed objective failure may continue to use the lapsed behavior while the player
stays in an active run, but its result copy must say `Study lapsed`; it is not an
explicit abandon action.

Legacy split-state saves are reconciled before normal progression transitions:
stabilized rare genomes and canonical strain-library ownership repair one
another monotonically. Debug reveal-all is excluded so a presentation shortcut
does not become permanent ownership.

## Acceptance criteria

- The bottom action reads `Bank result` only when activating it will bank a
  completed result.
- One activation on an incomplete non-onboarding dish cannot leave it.
- A second timely activation abandons and returns to a deterministic Lab state.
- A meaningful action or objective completion cancels the armed abandon state.
- Abandoning a Case Trial leaves its slot unsealed and makes it the next Trial.
- Abandoning an Open Lab Study does not stabilize observed lifeforms or add rare
  strains to the saved loadout library.
- Completing and banking preserves all existing progression, genome reveal,
  Method choice, homeostasis, and report behavior.
- A rare specimen stabilized by an ordinary successful Open Lab Study is in the
  saved strain library before the next screen and remains loadout-eligible after
  reload, even if the run never reaches collapse or equilibrium.
- Injected partial writes are replayed to one consistent banked boundary without
  duplicate side effects; a failed verification cannot advance with “banked”
  copy.
- Labels and confirmation are legible at `375x667` and announced without color.

## Non-goals

- No rewind or restoration of the abandoned cellular state.
- No punitive confirmation dialog or typed confirmation.
- No deletion of research evidence that was legitimately observed and already
  persisted before abandonment.
- No redesign of automatic timeout/collapse outcomes beyond honest copy.
