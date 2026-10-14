# Merge census: what it found, and the v1 forms

The census (`scripts/merge-census.ts`, raw output in `merge-census-raw.md` and `merge-census.json`) watched 7 dishes × 12 seeds × 180 game seconds. Every 10 ticks it recorded which groups of 2–4 living cultures were touching, and how long each exact arrangement held.

## What it found

- **The trials almost never hold a shape.** In Trials 2–5 the median hold is 0.2–1 s, and holds of 4 s are rare (Trial 2: 20 in 36 dish-minutes). These dishes run the death-match life cycle, so hunters eat what they touch.
- **The open lab holds shapes constantly, but never apart.** Open lab and title dishes run the kin-sparing life cycle and pile into clusters. They log 15,309 and 7,578 holds of 4 s, but the group is isolated about 0% of the time: every pair sits inside a bigger crowd.
- **Natural affinities, strongest first:**
  - Swarmlet pairs and triangles.
  - Splitter + Swarmlet, Bruiser + Swarmlet, Mirror + Swarmlet, Sniper + Swarmlet.
  - Bruiser pairs.
  - Bloom Mass + Swarmlet.
- **Johnny's "two red around a green" is a title-dish effect.** The version that holds is a chain of Sniper, Sniper and Splitter: 5 holds of 8 s and one of 79.5 s, in 3 of 12 seeds, always inside a larger cluster. The true sandwich, a Splitter between two Snipers, held for 4 s only once.
- **Cost:** building the contact graph takes 0.06–0.15 ms per scan, and splitting it into touching groups (components) takes under 0.01 ms. Canonical naming of every subset is what overruns the budget (up to 7.5 ms in a crowded dish). Live detection therefore names only isolated groups, never every subset.

## The rule this sets

A "hold a shape for 4 s" rule alone would never fire in the trials and would fire constantly in the open lab. So a form locks only when all three of these are true:

1. **Isolated:** its cultures form a whole group that touches no other living culture.
2. **Fed together:** every member overlaps a Nutrient field (Paste trails count) or, for some forms, a named reagent field.
3. **Held:** the group keeps the form's exact arrangement for the lock window. The default is 4 s of dish time (`MERGE_DETECTION.lockSeconds`).

Merging becomes a deliberate act: separate a few cultures from the crowd (Toxin, Paste), bring the right ones together, and feed them. While a group qualifies, a ring fills round it and the cultures start to stick, with the bond strength rising with progress, so the player can feel the merge taking hold and protect it. Losing any condition resets the ring.

## The v1 rare forms

The order runs from natural affinities (easy) to arrangements the dishes resist (hard). Shapes list strains, then touching pairs; the code computes each shape's canonical name.

| # | Name | Cultures | Touching | Fed with | Why |
| --- | --- | --- | --- | --- | --- |
| 015 | Bloom Buddy | Bloom Mass, Swarmlet | both | Nutrient | The Trial 2 "First Merge" friend; holds well in the calm onboarding dish |
| 016 | Puddle Pals | Swarmlet, Swarmlet | both | Nutrient | The strongest natural pair |
| 017 | Split Pea | Splitter, Swarmlet | both | Nutrient | Strong natural pair |
| 018 | Big Spoon | Bruiser, Swarmlet | both | Nutrient | Strong natural pair, a hunter sparing a grazer |
| 019 | Tri-Puff | three Swarmlets | all three | Nutrient | The most common triangle |
| 020 | Daisy Chain | Splitter, Swarmlet, Swarmlet | a chain, Splitter at one end | Nutrient | Common chain, needs shaping with Paste |
| 021 | Looking Glass | Mirror, Swarmlet | both | Water | Natural pair, made special by Water |
| 022 | Lookout | Sniper, Swarmlet | both | Water | Natural pair; the Sniper must hold fire |
| 023 | Heavyweights | Bruiser, Bruiser | both | Salt | Bruiser pairs hold; Salt hardens them |
| 024 | Mortar and Pestle | Bruiser, Splitter | both | Salt | Holds in the open lab |
| 025 | Four Square | four Swarmlets | a ring | Nutrient | A 4-ring is far rarer than a clump; needs careful Paste |
| 026 | The Sandwich | Sniper, Splitter, Sniper | Splitter touches both Snipers, Snipers apart | Nutrient | Johnny's shape: two reds fused round the green. The hardest rare |

## Very rare leads (slice I)

These are behaviours of locked forms over time, so they only appear in long play:

- **027 Glider:** a locked form whose centre travels a long way in a steady direction.
- **028 Blinker:** a locked form whose volume pulses with a steady period.
- **029 Compound:** two locked forms touching and fed together bond into one.
- **030 Rainbow:** a locked form of four different strains.
- **031 Old Timer:** a locked form that survives three minutes of dish time.
