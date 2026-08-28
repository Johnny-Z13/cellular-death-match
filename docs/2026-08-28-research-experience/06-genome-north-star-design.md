# Design 06 — The Genome Archive North Star

Date: 2026-08-28
Status: Design signed off by primary and adversarial reviewers

## Problem

All fourteen current lifeforms have character reconstructions and Atlas nodes,
but collection progress is largely buried inside the Notebook. The prominent
in-dish lifeform count describes what is seedable in the current run, not global
genome ownership. Conflating those numbers would make the collection promise
more visible but untrue.

## Decision

Create a separate, globally derived Genome Archive progress model and surface it
at the Lab and Notebook:

> 4 / 14 genomes decoded

The denominator comes from the lifeform content registry. A decoded genome is a
foundational lab-stock genome or a rare lifeform in stabilized state. Merely
observed lifeforms do not increment it.

## Lab/title surface

Add one compact Archive strip inside the existing Case docket, never a new
screen:

- decoded / total genomes;
- a segmented or cell-based progress track;
- one next lead chosen from a locked or observed lifeform;
- observed state takes priority over a fully unknown lead because it gives the
  player an actionable unfinished promise.

Example:

> GENOME ARCHIVE · 4 / 14 DECODED
> Next lead: a budding propagator overfed through a nutrient conduit.

Locked leads show a cryptic discovery clue and silhouette, not the canonical
name. Observed leads may reveal the name and say `Stabilize it alive`.

The in-dish freezer remains explicitly local: `N specimens available in this
Study`. Where space permits its header may also include the global decoded total,
but those values have separate labels and never share a fraction.

## Notebook surface

- Header: `X / Y genomes decoded · A / B protocols understood`.
- Atlas opens with the lifeform group and its decoded total clearly legible.
- Lifeform tiles retain locked silhouettes, incomplete observed
  reconstructions, and full decoded portraits.
- Findings and research records remain available but do not compete with the
  Genome Archive total.

The Atlas remains the existing Notebook tab. The title strip is a doorway and
motivation cue, not a duplicate collection browser.

## Progress model

Add a pure view derived from progression and existing content:

- `decoded`, `total`;
- `observed` lifeform count;
- next lead ID/state/clue without unlocking identity;
- understood/total protocol count for Notebook context.

The protocol denominator is the set of distinct `discoveryNoteId` values from
canonical `REACTION_RECIPES`. Only those recipe-backed notes at understood or
stabilized stage count in the numerator. Breed notes, water/paste lab notes, and
other prose without a reproducible recipe are excluded.

The current-run `life-count` remains labeled as available specimens and is
tested not to equal the Archive count accidentally.

Lead choice is deterministic and stable between visits until its state changes.
Prefer observed lifeforms, then the first locked lifeform in authored content
order. Future content can define explicit lead priority later without changing
the UI contract.

## Reward cadence

- First session starts at the Swarmlet reference genome: `1 / 14`.
- A newly decoded genome updates the strip after its safe-boundary reveal.
- The safe-boundary reveal includes the new Archive position (for example
  `2 / 14 genomes decoded`) after the organism name and synthesis promise.
- Archive completion uses the existing bounded summary presentation; no claim
  screen or currency payout is added.
- Expansion automatically changes the denominator and locked Atlas without UI
  redesign.

## Acceptance criteria

- A fresh save shows exactly the starter reference genome as decoded.
- Observing a rare phenotype changes the next lead state but not decoded count.
- Stabilizing it increments decoded count once and survives reload.
- Unlocking a foundational lab-stock genome increments the same count through
  its existing research transition.
- `X / Y` is consistent on title and Notebook across normal, old-save, reveal-
  all, and clear-data paths.
- Current-run seedable/loadout count remains distinct and accurately labeled.
- Locked leads expose no canonical name through visible or accessibility text.
- The title remains usable without scrolling at `375x667`.

## Non-goals

- No additional organism art or new genomes in this program.
- No collection percentage reward, badge economy, duplicates, or rarity.
- No random “featured genome” rotation.
- No permanent collection panel beside the live dish.
