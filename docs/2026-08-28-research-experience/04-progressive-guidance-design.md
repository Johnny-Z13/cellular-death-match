# Design 04 — Guidance That Recedes With Mastery

Date: 2026-08-28
Status: Design signed off by primary and adversarial reviewers

## Problem

All five authored Trials currently use the same tap-by-tap transmission rail.
That guarantees completion, but it teaches recipe obedience rather than
experimental reasoning. The player reaches the Open Lab having followed every
input without necessarily understanding how to form or test a hypothesis.

Removing guidance outright would create the opposite failure: later recipes
have ordering, placement, cooldown, and mobile-rack requirements that are not
fully legible from the simulation alone.

## Decision

Use three guidance layers with deliberate fade-out and recovery.

### Layer 1 — Interaction grammar, Trials 1–2

Keep persistent exact guidance and pointers for:

- selecting a lifeform;
- placing an egg in the dish;
- selecting and placing a reagent;
- understanding that reagent order and shared location matter;
- recognizing completion and banking the result.

Trial 1 teaches the controls. Trial 2 proves the basic experimental grammar by
asking the player to reproduce a reaction with a newly decoded specimen.

### Layer 2 — Hypothesis-led practice, Trials 3–5

Dr. E's persistent status rail gives:

- a question or desired outcome;
- the relevant biological principle;
- live evidence/progress;
- no step counter and no pointer to every next control.

The authored hints become graduated rather than full recipes:

- Trial 3 identifies the specimen and carrier principle; the player chooses the
  learned feed-then-modify sequence.
- Trial 4 identifies quick tissue, unstable Foam, and a second pulse; the player
  constructs the sequence.
- Trial 5 identifies Bloom tissue, Brine Channel, and coexistence; the player
  combines earlier lessons while watching ecology.

The one-time Method handoff after Trial 2 explicitly tells the player that Dr. E
will now offer hypotheses rather than commands.

### Layer 3 — Recovery help

If no meaningful action occurs for about 22 seconds, Dr. E offers the next
principle-level clue. A second idle interval may reveal the exact authored
method. Recovery messages never interrupt active input and are capped.

The Notebook Study page always retains the hypothesis and evidence. It is a
player-pulled source of help, not a required detour. No content needed to finish
a Trial is hidden behind unreadable flavor text.

## Guidance state

- Exact onboarding completion is persisted only after the corresponding Trial
  result is banked.
- Reloading midway through Trials 1–2 restarts the dish and full exact lesson.
- Reloading Trials 3–5 restarts the dish with hypothesis guidance, not the old
  tap-by-tap script.
- Returning players who have already sealed a Trial do not replay its lesson.
- Player actions reset the idle timer. Opening options or backgrounding the page
  does not count as experimental activity and does not accumulate idle time.

## Copy principles

- Explain causality before naming controls: “Water can carry food through living
  tissue,” then mention the relevant materials.
- Use the imperative only for interaction grammar or an explicit requested hint.
- Avoid pretending emergence is deterministic when timing and spatial overlap
  matter: use “may,” “test,” and “watch the boundary.”
- Completion copy says what the dish demonstrated, not merely “good work.”

## Acceptance criteria

- Trials 1 and 2 remain completable by a first-time touch player through exact,
  persistent visual guidance.
- Trials 3–5 display no sequential `1 / N` tap script and no automatic pointer
  trail across the recipe.
- Each later Trial has enough hypothesis-level information to infer a valid
  method from mechanics already taught.
- A deliberately idle player receives layered recovery help and can reveal the
  exact method without restarting.
- An engaged player is not interrupted by recovery messages.
- Reload tests prove Trials 1–2 restore full guidance and Trials 3–5 restore the
  lighter state.
- Keyboard and touch users can access the same recovery information.
- Journey tests solve later Trials through outcome-driven helpers rather than
  asserting old coach sentences step by step.

## Non-goals

- No difficulty selector or permanent “expert mode” in this slice.
- No removal of the objective hint from the Notebook.
- No attempt to make simulation causality perfectly deterministic.
- No increase in Case length or pressure to complete quickly.
