# Professor Trials: Case 1 Implementation Plan

Date: 2026-08-25  
Status: Proposed implementation sequence  
Depends on: `2026-08-25-professor-trials-progression-design.md`

## Objective

Build one playable five-Trial Common Cold Case that proves the new CrazyGames
structure while preserving the existing cellular simulation and art direction.

### First integrated slice (2026-08-25)

The initial implementation deliberately proves the route before building the
full save/mode architecture:

- the title becomes the Lab bench and Common Cold Case docket;
- the first five existing authored objectives become named Trials;
- tools reveal by Trial instead of appearing as one large unlock;
- the Method pick is framed as the between-Trial return to the Lab;
- Professor E. Mergent slides in for action-driven Trial 1 hypothesis beats;
- completed Trial seals are recorded locally as Lab history;
- the fifth Trial concludes the Case instead of dropping immediately into the
  procedural open mode.

The remaining milestone work—true current-Trial resume, per-Trial retry,
Research Seals, Case 2, and the separately routed Grand Experiment—stays
explicit rather than being simulated by misleading UI.

The slice is complete when a new player can begin within one click, finish a
real Trial inside one minute, complete the Case in roughly 8–12 minutes, unlock
durable content, and see the next research promise.

## Implementation principles

- Extend existing systems; do not fork a separate CrazyGames game.
- Keep `src/sim/` unaware of campaign concepts.
- Put authored trial data in `src/content/` and orchestration in `src/game/`.
- Keep the original open-ended mode intact behind the Grand Experiment route.
- Introduce one tool at the moment the current Trial needs it.
- Save permanent progress when awarded, not only at Case completion.
- Make campaign state versioned and migration-safe from its first commit.
- Add deterministic rule tests before browser presentation work.
- Do not add SDK, ads, currency, timers, or new simulation physics in this slice.

## Milestone 1 — Content model and campaign state

### Add

- `src/content/researchCases.ts`
- `src/game/campaignProgression.ts`
- `tests/content/researchCases.test.ts`
- `tests/game/campaignProgression.test.ts`

### Deliver

- `ResearchCaseDef`, `ResearchTrialDef`, reward, seal, and authored-crisis data.
- Complete Common Cold Case definitions.
- Versioned persistent campaign save.
- Trial completion, seal awarding, Case unlock, and result recording.
- Corrupt/old save fallback without erasing existing discovery/strain saves.

### Acceptance

- Every Trial has a unique id, resolvable objective, starting ecology, tool set,
  lifeform set, duration, reward, and result.
- Only the Hypothesis Seal is required for progression.
- Permanent rewards cannot be farmed by replaying a completed Trial.
- Saving after each award survives reload.
- Case 2 remains a visible locked definition/teaser, not playable content.

## Milestone 2 — Run state and authored arena setup

### Modify

- `src/game/run.ts`
- `src/game/arena.ts`
- `src/main.ts`
- relevant run/arena tests

### Deliver

- Explicit `campaign` and `grand_experiment` run modes.
- Case/Trial identity in run state.
- Authored starting ecology and available tools passed into the arena.
- Campaign failure retries the current Trial while retaining Case Methods.
- Trial completion moves to result, then Method choice/next Trial.
- Grand Experiment keeps current procedural/open-ended behaviour.

### Acceptance

- Existing simulation, catalysis, cross-breeding, and homeostasis tests remain
  unchanged unless a genuine interface boundary needs extending.
- Campaign Trial 1 cannot accidentally draw a procedural objective.
- Grand Experiment still draws procedural objectives from epoch four onward.
- Trial retry reaches active play in under five seconds in browser checks.

## Milestone 3 — Trial rules and Common Cold tuning

### Reuse

- Bloom Mass discovery
- dominance tracking
- Nutrient Conduit
- crisis survival
- homeostasis tracker

### Add only where required

- authored early-homeostasis threshold for The Cure-ish;
- seal evaluation for discovery/control conditions;
- scripted/telegraphed crisis start for Fever Dream;
- Trial-specific result identifiers.

### Acceptance

- Trial 1 reliably produces the intended Bloom opportunity without playing
  itself.
- Trial 2 introduces Toxin before dominance becomes unrecoverable.
- Trial 3's reaction is reachable with the provided charges and time.
- Trial 4's crisis can resolve before the deadline.
- Trial 5 is achievable across a bounded seed suite without being automatic.
- Monte Carlo/seed tests report reachability and completion windows rather than
  asserting one exact emergent shape.

## Milestone 4 — Campaign screens and Professor framing

### Add

- `src/ui/caseMapScreen.ts`
- `src/ui/trialResultScreen.ts`
- campaign screen tests

### Modify

- `src/ui/screens.ts`
- `index.html`
- `src/styles.css`
- `src/ui/coach.ts`
- `src/main.ts`

### Deliver

- New-save **Begin Experiment** route.
- Returning-save **Continue Research** route with next Trial label.
- Compact five-Trial workbench map.
- One-line hypothesis over a rendered dish.
- Contextual Trial 1 prompts that dismiss on demonstrated action.
- Result card with outcome, Professor line, permanent reward, seals, and
  immediately enabled Continue.
- Concept portrait used only after art approval and production resizing.

### Acceptance

- One click from title reaches player-controlled Trial 1.
- No loadout, options, Atlas, or story screen blocks first play.
- The Professor never obscures the live dish or core controls.
- Result/choice transitions average under eight seconds when used normally.
- Reduced-motion mode removes nonessential entrance animations.
- Desktop 1280×720, mobile 390×844, small mobile 375×667, and a realistic
  CrazyGames landscape iframe remain readable without page scroll.

## Milestone 5 — Unlock presentation and durable return promise

### Modify

- `src/game/discoveryProgression.ts`
- `src/game/strainLibrary.ts`
- `src/ui/loadoutScreen.ts`
- notebook/Atlas views
- title/resume copy

### Deliver

- Reward presentation distinguishes temporary Methods from permanent unlocks.
- Toxin, Water, Paste, Bloom Mass, and Case access follow the authored order.
- Atlas shows the next relevant silhouette/hint without revealing its answer.
- Case 1 completion shows Case 2 and Grand Experiment requirements.
- Existing saves receive a safe campaign starting point based on known progress,
  without relocking discovered strains or tools.

### Acceptance

- Reload immediately after any permanent reward restores it.
- Existing prototype saves remain playable.
- A replay cannot duplicate a one-time Protocol/strain/access reward.
- A returning player can reach the next Trial through one Continue action.
- The next durable possibility is visible before the player leaves the Case 1
  result.

## Milestone 6 — Validation build

### Automated checks

```bash
npm test
npm run build
```

Add player-route browser checks for:

- new save → first input;
- first Trial completion;
- first Method choice;
- Trial failure → retry;
- Case completion → durable unlock → reload;
- returning save → Continue Research;
- Grand Experiment entry after unlock;
- mobile and desktop overflow/obstruction;
- console/page errors;
- no Merge Lab route or query/hash branch.

### Human Gate A

Use one exact deployed build for 5–8 uncoached sessions, split across desktop
and every claimed mobile/device group.

Record:

- cover/title expectation;
- time to first intentional action;
- time to first Trial completion;
- whether the player can explain what changed the dish;
- time to first Method choice;
- first failure cause and retry behaviour;
- abandonment time and observed reason;
- Case completion;
- desire to continue immediately;
- remembered unfinished goal;
- willingness and reason to return tomorrow.

### Local product gates

- Median first intentional action under 10 seconds of play.
- At least 75% complete Trial 1 without coaching.
- At least 75% can explain the core loop in their own words.
- Median session at least 8 minutes; 10 minutes remains the target.
- At least 4 of 5 blind reviewers identify indirect living-ecosystem
  experimentation as the distinctive experience.
- No claimed device group passes from responsive automation alone.

## Suggested commit boundaries

1. `feat: add research case content model`
2. `feat: add persistent campaign progression`
3. `feat: run authored campaign trials`
4. `feat: add common cold case rules`
5. `feat: add professor case and result screens`
6. `feat: wire campaign unlock progression`
7. `test: add professor trials player journey`

Do not combine the entire slice into one opaque commit. Each boundary should
leave tests passing and should not publish, deploy, or alter live hosting.

## Stop rules

Pause implementation and revisit the design if any of these are true:

- Trial 1 requires more than two instructions before the player acts.
- Most test players describe the activity as passive watching.
- The five Trials do not feel mechanically different in blind play.
- Character/story screens consume more time than dish interaction.
- Existing players feel the CA simulation has become decorative.
- The Case cannot reliably complete near the 8–12 minute target without
  scripting away emergence.
- The nearest CrazyGames comparables make the experiential delta
  interchangeable.

If the structure works, build Case 2 primarily from existing Bruiser, Salt,
Glass Antibody, loadout, and Grand Experiment systems. Do not start a large new
content pipeline before Case 1 proves comprehension and desire.
