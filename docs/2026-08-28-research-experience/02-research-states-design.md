# Design 02 — Research States Players Can Explain

Date: 2026-08-28
Status: Design signed off by primary and adversarial reviewers

## Problem

The implementation already distinguishes observed, understood, and stabilized
records, but the Notebook presents these generic words across different content
types. Players can see that something changed without learning what must happen
next or why an egg became available.

## Decision

Present category-specific state language while retaining the existing monotonic
save model.

### Lifeform cards

| Mechanical state | Player-facing state | Promise |
| --- | --- | --- |
| locked | Unknown genome | Find the phenotype by following the clue. |
| observed | Phenotype observed | Keep it alive through a completed result to decode it. |
| stabilized | Genome decoded | Egg synthesis available. |

Lifeforms do not need an “understood” middle state. Stabilization is the proof
that turns a sighting into a collectible genome.

### Reaction and note cards

| Mechanical state | Player-facing state | Promise |
| --- | --- | --- |
| locked | Unknown protocol | Produce the signature. |
| observed | Signal observed | Reproduce it in a fresh dish. |
| understood/stabilized | Protocol understood | The repeatable method and full notes are revealed. |

“Fresh dish” means a dish that began after the first observation was persisted.
Repeating a reaction several times in the same dish is useful activity, but it
does not prove cross-dish reproducibility.

The authored Case is the controlled-replication exception. Its brief represents
a signal Dr. E recorded before the player's Trial. Producing that named reaction
in the assigned Trial is the reproduction and may resolve it immediately.
Accidental or unassigned first observations still require a later dish.

## Transition feedback

First observation uses lightweight live-dish feedback:

> SIGNAL OBSERVED — BITTER BLOOM
> Reproduce this reaction in a fresh dish to understand its protocol.

Cross-dish reproduction uses a higher-priority but still non-blocking message:

> PROTOCOL UNDERSTOOD — BITTER BLOOM
> Repeatable method added to Findings.

Lifeform observation retains its suspense message. Stabilization continues to
use the safe-boundary Genome Decoded reveal.

Duplicate events in the same tick or frame coalesce. Hydrated historical state
does not replay announcements.

## Notebook information hierarchy

- The header reports two meaningful totals: genomes decoded and protocols
  understood. It does not aggregate unrelated stages into a single completion
  number.
- A card's state label is a plain-language phrase, not `OBS`, `HYP`, or `STB`.
- Observed cards put the next required action before flavor text.
- Decoded lifeforms say `Egg synthesis available` in the same visual group as
  the state, not buried in recipe copy.
- Understood protocols reveal the method and keep the first-observed date.
- Locked Atlas nodes retain cryptic clues without leaking canonical names.

## Persistence rules

- Stage changes are monotonic.
- Category normalization is fail-safe: a malformed or historical lifeform
  record at `understood` is treated as observed rather than granted synthesis,
  while a reaction record at `stabilized` is presented as understood.
- Existing saves migrate visually without rewriting dates or replaying events.
- Observation is saved immediately because it is notebook evidence.
- Genome ownership and rare-strain loadout ownership remain governed by their
  existing authorities; explanatory copy cannot unlock content.
- Reproduction eligibility is established from the note state captured at dish
  start, preserving the current later-dish behavior across reloads.
- Before any transition comparison, startup reconciliation takes the union of
  canonical known rare-strain ownership: a stabilized rare breed backfills a
  missing strain-library entry, and a valid historical strain-library entry
  repairs missing stabilized progression. The reconciliation is idempotent,
  filters to canonical rare IDs, and emits no historical reveal.
- Debug reveal-all state is excluded from ownership reconciliation and does not
  permanently insert all rare strains into the library.

## Acceptance criteria

- A reaction first triggered in a dish remains observed even if repeated again
  before that dish ends.
- The same reaction triggered in a later dish becomes understood independent of
  its assigned Study objective.
- A named authored Case protocol becomes understood when its assigned controlled
  reproduction succeeds, even when the player had no prior personal observation.
- An accidental first observation in an unrelated authored Trial remains only
  observed.
- An observed lifeform that dies or is abandoned does not gain egg synthesis.
- A lifeform kept alive through the completion boundary becomes decoded once.
- Notebook cards and live announcements use the correct ladder for their
  content category.
- No UI surface describes an observed reaction as a genome or an observed
  lifeform as an understood protocol.
- Reloading old and current saves preserves stages and produces no historical
  transition spam.
- Screen-reader text includes the state and next action without relying on
  color or abbreviated markers.
- Repeat promotions produce no duplicate reward or announcement.

## Non-goals

- No new research currency or manual “analyze” interaction.
- No requirement to assign a reaction as the active Study before reproducing it.
- No regression from immediate observation persistence.
- No claim that a fictional protocol is medically real.
