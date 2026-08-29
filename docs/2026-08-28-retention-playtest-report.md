# Retention and Interaction Playtest Report

Date: 2026-08-28
Build: `38340c7` baseline, followed by the repairs listed below
Goal: improve retention without displacing the Petri dish, indirect ecosystem engineering, or causal discovery.

## Experience contract

The test bar was the repository's signed-off experience statement:

> I changed a living dish, understood what answered, and chose what evidence to preserve for the next experiment.

The intrinsic behaviors to protect are experimentation, indirect engineering, recovery from mistakes, spectacular reactions, ecological balance, and discovering organisms or biomes. Collection and progression should support those behaviors rather than substitute for them.

## Evidence gathered

- Two fresh-start novice sessions at 390×844, plus interrupted-run recovery checks.
- Two curiosity-led sessions at 375×667 in isolated profiles, plus reload continuation and a late-game reagent pass.
- Three desktop strategy patterns at 1280×720: literal onboarding follower, deliberate Open Lab optimizer, and rapid-action optimizer.
- The complete browser harness: authored recipe, five-Trial journey, Open Lab discovery/resume, persistence failures and recovery, reduced motion, and responsive checks at phone, small phone, landscape phone, tablet, and desktop.
- Baseline static verification: 739 unit/integration tests passed and the production build succeeded.
- Screenshot review of title, onboarding, live dish, freezer, Notebook, Log, genome reveal, Method choice, loadout, objective choice, failure/recovery, and all five responsive layouts.
- Fresh-context adversarial review of every proposed repair.

These are simulated player models, not a substitute for cold human usability sessions. They are useful for deterministic interaction failures, cross-persona convergence, and forming hypotheses for real-player validation.

## What is already strong

- The title screen, Dr. E art, typography, and single CTA create a distinctive first impression on both phone sizes.
- The dish stays centered and playable; mobile controls are thumb-reachable and desktop's three-column composition is clear.
- The first genome reward and Method choice arrive in roughly 60–75 seconds and feel valuable.
- Tool microcopy, objective cards, live objective counts, Notebook/Atlas, save copy, and two-step abandon confirmation are unusually clear.
- Reload accurately promises that the assignment persists while the living culture restarts.
- No persona run produced browser console errors or warnings.

## Ranked findings

### P0 — authored Trial 2 can look permanently stalled

After following all six exact actions, both mobile personas remained at `Watch the culture / Goal in progress` for 30–55+ seconds. Unrelated mutations, crises, and accidents continued, but the coach supplied no result status or recovery action. The code confirmed that idle recovery was suppressed whenever exact coaching remained active, including its post-action observation state.

Retention risk: the strongest first reward is followed immediately by a state that reads as either user error or a broken game.

### P0 — knowledge surfaces allow unseen consequential simulation

Notebook and mobile Log obscure the live dish while authoritative time continues. During one 20-second reading pass the dish accumulated mutations, a sterility warning, equilibrium progress, research seals, and a genome result.

Retention risk: curiosity is punished, and the player cannot understand what caused a result that happened off-screen.

### P1 — tutorial semantics and completion can desynchronize

Egg is preselected. Tapping the dish before pressing Egg consumes a charge without advancing the coach. In the observed run, objective success later enabled `Bank result` while the coach still required the feed action.

Retention risk: the game appears to ignore valid actions and allows the lesson to be skipped accidentally.

### P1 — Trial 2 guidance points at the concept, not the visible control

`Press Bloom Mass` requires the player to infer `Eggs → Specimen freezer → Bloom Mass`. On small phones the freezer description truncates, and the pointer previously targeted the Egg tool rather than the Eggs drawer.

### P1 — the loadout promise is semantically false

The screen says `Egg Loadout`, but standard researched eggs remain available regardless of the selection; only archived rare specimens are constrained. Cards show names and art but no factual play behavior.

Retention risk: a visible meta-choice looks cosmetic, weakening the value of specimen unlocks.

### P1/P2 — strategy and failure teaching need a later content pass

- Some Open Lab objectives prescribe waiting and then executing a recipe rather than choosing an ecological strategy.
- Failed placements, starving cultures, and objective regressions lack causal diagnostics.
- Methods are dominated by capacity/radius arithmetic, limiting build identity.
- Objective-relevant late-game reagents can be buried in the mobile carousel.
- Ambient events can outrank actionable objective blockers.

These are real risks, but changing balance and build structure without production telemetry would be speculative.

### P2 — presentation polish

- The visible settings control was intercepted by the full-screen welcome.
- Early tutorial targets can be too small against the dark dish.
- Reloading an interrupted Trial repeats the welcome.
- The newest deliberate `Well done → Choose a Method` transition was missing from three end-to-end journeys, producing 13/16 passing browser tests despite the product behaving as currently designed.

## Adversarial decision

The reviewer rejected a generic “add more instructions” response. The selected repairs eliminate loss of trust and unseen state changes while keeping guidance bounded:

1. Detect the authored coach's post-action waiting state and allow one exact recovery cue after ten seconds without progress.
2. Treat successful Egg placement and freezer selection as semantic actions, while keeping placement and selection distinct.
3. Keep Trial 1 banking locked until the taught sequence reaches its success state, even if an emergent result completes early.
4. Stage the Trial 2 pointer through the actual Eggs drawer and then the Bloom Mass card.
5. Pause authoritative simulation behind Notebook, Options, and blocking mobile Eggs/Log drawers; reset the simulation clock so closing cannot cause catch-up deaths.
6. Rename loadout framing to archived specimens, state that lab-stock eggs remain supplied, and show a factual role/behavior line sourced from canonical lifeform identity data.
7. Preserve the deliberate Method introduction but update the stale journeys to verify it.

## Deferred improvement backlog

| Priority | Improvement hypothesis | Promotion criterion |
| --- | --- | --- |
| P1 | Suppress or tightly bound advanced accidents during exact authored lessons so early success remains causally legible. | Cold players attribute the first two results to accidents or cannot explain the taught cause. |
| P1 | Add objective-specific action failure diagnostics without a permanent panel. | Telemetry shows repeated no-op placements or progress regressions before abandon. |
| P1 | Rework objectives so each supports at least two viable strategies and avoids inactivity as the dominant opening. | Objective pick-to-first-action and approach-diversity data identifies passive/dominant solutions. |
| P1 | Add interaction-changing Methods with conditional reagent/lineage synergies. | Method pick entropy or repeat-run build diversity is low after initial collection novelty. |
| P2 | Prioritize objective-relevant tools in the mobile carousel and separate abandon from reagent paging. | Tool-page navigation or accidental abandon-confirm events cluster around explicit reagent objectives. |
| P2 | Add timestamps/causal grouping to the Log and raise blockers above ambient events. | Players cannot connect reactions or deaths to their last action in teach-back sessions. |
| P2 | Preserve the last completed tutorial beat across active-dish restart without serializing the dish. | Real mobile tab-eviction sessions show repeated welcome/tutorial abandonment. |
| P2 | Increase tutorial target salience and localized action feedback. | Cold players hunt for a missing placement target or cannot tell that a tap registered. |

## Implemented repair set

| Repair | Retention intent | Verification |
| --- | --- | --- |
| Trial 2 now sends the player through `Eggs → Bloom Mass`, with the mobile pointer on the actual drawer control. | Remove the first post-reward navigation trap. | Authored recipe, five-Trial journey, persistence, and pointer regressions. |
| The authored observation state permits one exact recovery cue after ten seconds without progress. | Turn an apparent soft lock into a bounded recovery path. | Unit regression for exact-coaching recovery plus authored-recipe browser journey. |
| Freezer selection and successful placement report the semantic Egg action; Trial 1 cannot bank before the taught sequence reaches success. | Keep instruction, input, and completion state trustworthy after a natural novice mistake. | Dedicated direct-placement browser regression and coach/unit checks. |
| Notebook, Options, and blocking phone drawers pause authoritative culture time and reset the clock before resuming. | Let players read and configure without invisible ecology changes or catch-up deaths. | Live Notebook freeze/resume browser regression and overlay coverage checks. |
| Loadout is reframed as `Archived Specimens`, explicitly preserves standard lab stock, and shows canonical role/behavior copy. | Make the meta-choice honest and strategically legible. | Loadout rendering tests and Open Lab select/reload journey. |
| Settings remains usable during the welcome; the pause state has a small nonblocking status badge. | Preserve accessibility and clearly communicate frozen state. | Responsive browser matrix and visual inspection. |
| End-to-end journeys now include the deliberate Method introduction and reload-restored picker state. | Protect the reward beat and stop test drift from masking regressions. | Complete browser suite. |

## Metrics for human validation

- Time to first intentional dish action and first Trial completion.
- Trial 2 stalled-observation duration, recovery-prompt exposure, recovery success, and abandonment.
- No-op Egg taps and tutorial event-order mismatches.
- Notebook/Log open time and post-close action latency.
- Loadout swap rate, archived-strain usage share, and unselected rare-strain availability.
- Objective select-to-first-meaningful-action, progress regression, and abandon-confirm rate.
- Method pick entropy and repeat-run build diversity.
- Teach-back: “What happened, what do you own now, and what would you do next?”

## Human follow-up gate

Run 5–8 uncoached sessions on this exact repaired build, split across desktop and real mobile devices. The release claim remains provisional until most players can explain the core loop, complete Trial 1 without intervention, recover from a missed Trial 2 reaction, and remember an unfinished experiment they want to return to.

## Final automated verification

- `npm test`: 97 files, 743 tests passed.
- `npm run build`: production TypeScript/Vite build passed.
- Playwright: 18/18 journeys passed across 390×844 phone, 375×667 small phone, landscape phone, tablet portrait, and 1280×720 desktop.
- Final responsive screenshots were visually inspected; the dish remains centered and unobstructed, with core controls inside each viewport.
