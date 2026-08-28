# Research Experience Quality Program

Date: 2026-08-28
Status: Design signed off by primary and adversarial reviewers
Scope: Seven connected progression, research, save, collection, and mobile-presentation repairs

## Product outcome

Cellular Death Match should feel like a laboratory of collectible discoveries,
not a checklist wrapped around a simulation. The player forms a hypothesis,
changes a living system, recognizes what happened, and deliberately preserves
the useful result. The finite Genome Archive makes the next mystery visible,
but the Petri dish remains the place where all meaning is created.

The seven designs in this program protect one experience statement:

> I changed a living dish, understood what answered, and chose what evidence to
> preserve for the next experiment.

## Protected priorities

In order:

1. The interactive Petri dish is the visual and mechanical star.
2. Every offered goal is possible with the capabilities in the current run.
3. Permanent progress has a readable causal relationship to dish events.
4. The player can distinguish seeing, proving, and preserving a result.
5. Guidance teaches a way of thinking, then recedes as mastery grows.
6. Save behavior makes an honest, lightweight promise and keeps it.
7. Collection gives the laboratory a long-term north star without becoming a
   second game or a reward economy.

When two designs conflict, the earlier priority wins.

## Canonical research language

There are two related but deliberately different evidence ladders.

### Lifeform evidence

```text
unknown → phenotype observed → specimen stabilized → genome decoded
                                             └────→ egg synthesis available
```

Observation is evidence, not ownership. A lifeform is permanently collectible
only after it survives the relevant completion boundary. “Genome decoded” is
the player-facing reward language; “stabilized” may remain the mechanical and
scientific detail.

### Reaction evidence

```text
unknown → reaction signal observed → reproduced in a later dish
                                      └────→ protocol understood
```

A reaction can be observed in any relevant dish. Repeating it in a fresh dish
proves that the method, rather than an accident, caused the result. Protocols do
not grant eggs and should never use genome language.

An authored Case brief is a controlled-replication exception: Dr. E supplies a
previously recorded laboratory signal as the hypothesis, so successfully
producing its named reaction in the assigned Trial is already a reproduction and
may resolve the protocol. An unassigned reaction encountered accidentally still
begins at observed and requires a later dish.

The generic persistence type may retain `observed`, `understood`, and
`stabilized`, but UI copy must translate those states by content category.

## Shared interaction contract

- The live dish never receives a blocking collection or Study-introduction
  modal while it expects player input.
- “Bank” is used only when the current result is complete and preservation will
  occur. “Abandon” is used when leaving an incomplete dish without a result.
- An active dish is restartable, not serializable. Cellular state is not part of
  the lightweight checkpoint promise.
- Collection totals are derived from content. The current `14` is presented as
  a concrete goal but never hard-coded into progression logic.
- Foundational genomes remain lab stock. Rare specimens remain subject to the
  strain-library loadout. No design may create a parallel inventory.
- Dr. E provides orientation and interpretation. He does not narrate every tap
  once the player has learned the interaction grammar.

## Program success criteria

The program is accepted only if all of the following are true:

- Every Open Lab choice passes a current-run feasibility predicate, with tests
  for mismatched global discovery and equipped loadout state.
- UI copy, state labels, and next-action prompts make the two evidence ladders
  explicit and pass the structural accessibility checks in this program.
- The primary exit action always predicts whether evidence will be banked or
  discarded; incomplete abandonment needs deliberate confirmation.
- Trials 1–2 remain fully guided, while later Trials can be completed without a
  tap-by-tap rail and still offer layered recovery help.
- Return UI says what was saved and that the active culture restarts.
- Genome progress is visible before entering a dish and inside the Notebook,
  including an enticing next unknown.
- On mobile, an ordinary Study begins with the dish visible and interactive;
  its introduction lives in Dr. E's status rail.
- Existing saves, genome unlocks, research records, loadouts, simulation
  boundaries, reduced-motion behavior, and keyboard/touch controls regress
  neither functionally nor visually.

## Explicit non-goals

- No CPM or lifeform balance rewrite.
- No exact active-dish serialization.
- No DNA currency, duplicate collection, rarity, trading, gacha, or claim flow.
- No new top-level meta screen.
- No increase to the current genome roster in this program.
- No attempt to turn the authored Case into a speedrun or scoring ladder.
- No analytics or external service dependency is required to ship the repair.

## Delivery gate

Each numbered design must be adversarially accepted before its implementation
plan is written. Plans must then be reviewed against repository boundaries and
testability before code changes begin. Verification findings reopen the design
or plan when they expose a false assumption; passing tests alone are not a
sign-off.

Actual novice comprehension remains a bounded release-validation question, not
something automated copy inspection can prove. A future moderated teach-back
uses at least three players unfamiliar with the project and asks, after each
first observation, “What happened, what do you own now, and what would you do
next?” A majority must distinguish reaction reproduction from lifeform
stabilization without prompting before the wording is considered validated.
