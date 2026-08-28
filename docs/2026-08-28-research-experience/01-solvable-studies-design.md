# Design 01 — Solvable Open Lab Studies

Date: 2026-08-28
Status: Design signed off by primary and adversarial reviewers

## Problem

The objective pool currently asks whether content was discovered globally, but
Open Lab rare specimens are constrained by the selected run loadout. A player
can therefore be offered Cross-Breed because both parent genomes exist in the
archive even when one or both parents cannot be seeded in this run. Balance and
symbiosis checks have a similar global-versus-current ambiguity.

An impossible Study breaks the laboratory fantasy: failure no longer teaches
anything about the dish because the required experiment was unavailable before
the dish opened.

## Decision

Every offered Study must satisfy a pure, inspectable feasibility contract built
from the capabilities available at the objective-choice boundary:

- seedable lifeform IDs for this run;
- unlocked reagent/tool IDs;
- relevant known/stabilized genomes and still-undecoded results;
- objective timing and runtime support;
- finite starting charges where an objective has a strict minimum action cost.

Global discovery remains useful for determining what research exists. It must
not stand in for current-run access.

## Capability rules

Each predicate consumes an inspectable requirement shape:

- `seedCount`: minimum Egg charges needed;
- `distinctLifeforms`: minimum distinct seedable IDs;
- `tools`: a reagent multiset with minimum charges per tool;
- `reactionRoute`: one canonical recipe whose reagent multiset and compatible
  archetype/trait context are both present;
- `hybridRoute`: exact seedable parent pair plus an undecoded child;
- `timing`: a pure epoch/crisis window predicate.

Tool budgets are derived from the post-Method player configuration and canonical
tool tuning at the choice boundary. Reaction feasibility selects at least one
specific canonical route; it never equates “tool unlocked” with “reaction
reachable.”

| Study | Required before offering |
| --- | --- |
| Cross-Breed | `seedCount: 2`; `tools: Nutrient ×1`; an undecoded child with both exact parents seedable. |
| Mega-Culture | `seedCount: 1`; `tools: Nutrient ×1`; one seedable lifeform; deterministic growth scenario reaches target. |
| Reaction Chain | One compatible canonical route repeated three times; available charges cover three copies of its exact reagent multiset. |
| Balance Keeper | `seedCount: 3`; three distinct seedable IDs so the measured <=40% dominance is mathematically possible. |
| Crisis Survivor | `seedCount: 3`; timing predicate proves a crisis can start and finish inside the epoch. |
| Acid Sculptor | One compatible canonical route containing Acid; charges cover that route's exact reagent multiset. |
| Colony Founder | `seedCount: 5`; one seedable lifeform. |
| Symbiosis | `seedCount: 2`; two distinct seedable IDs. |
| Extinction Reversal | `seedCount: 4`; epoch index >=4; recovery scorer has a deterministic low-then-four scenario. |
| Protector | Remains unavailable until fragile-culture survival evidence is implemented and verified. |

Where current scoring counts cultures rather than distinct lineages, the
feasibility rule mirrors the scoring truth. Copy must not promise a stronger
condition than the evaluator measures.

## Selection behavior

- Filter before shuffling so a seed never changes feasibility.
- Continue to offer two choices when at least two are feasible.
- Maintain a content-tested safe set of general Studies so every valid Open Lab
  loadout yields two options. Do not silently display an impossible second card.
- A chosen objective stored in a checkpoint remains canonical and resumable.
- On restore, a saved procedural objective is revalidated against its saved
  loadout and current canonical capabilities. If it is no longer feasible after
  migration, corruption repair, or a content update, restore returns to Study
  selection with one explanation instead of opening a stranded dish.
- A loadout cannot change after Study selection, so feasibility need not be
  reevaluated inside the dish.
- Debug “reveal all” uses the same predicate with its effective all-lifeform
  loadout.

## UX

Objective cards should contain a compact “Uses” line derived from requirements,
for example `Uses: Needle Swarm + Bloom Mass + Nutrient`. This explains why a
choice is available and lets players connect loadout planning to research.
Generic Studies may use `Uses: any culture` or `Uses: 3 egg charges`.

Before shipping, copy is reconciled with scoring truth. In particular,
Extinction Reversal must describe recovery of the dish's culture count rather
than implying identity tracking for one specific culture, and untimed Studies
must not say “before the deadline.”

Unavailable Studies are not shown. A disabled graveyard of impossible goals
would make the selection screen feel like a menu of punishments and reveal
future content without giving the player a decision.

## Acceptance criteria

- With both hybrid parents globally decoded but only one equipped, Cross-Breed
  is never offered across many seeds.
- With both exact parents seedable and the hybrid undecoded, Cross-Breed can be
  offered.
- With a decoded hybrid already complete, that same pair does not create a
  false “new hybrid” Study.
- No offered objective depends on a locked reagent, unseedable lifeform,
  unsupported runtime event, or impossible timing window.
- Every legal current-run capability set used by the game produces two choices.
- Objective selection remains deterministic for the same seed and capabilities.
- Checkpoint sanitation can restore every newly selectable objective.
- A legacy checkpoint with an infeasible selected objective safely returns to
  Study selection without changing its saved loadout or other progression.
- Every enabled procedural objective has a deterministic arena-level completion
  scenario for every accepted requirement class—not only a reveal-all loadout;
  theoretical availability alone is insufficient evidence.
- Existing objective scoring and simulation modules do not acquire UI or save
  dependencies.

## Non-goals

- No automatic loadout modification to make a desired Study possible.
- No promise that every feasible Study is easy or guaranteed to succeed.
- No full constraint solver over emergent CPM outcomes.
- No balancing rewrite of Study targets unless playtesting proves a target is
  practically unreachable with a capability set the predicate accepted.
