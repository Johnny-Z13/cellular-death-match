# Onboarding Script and Event Contract

Date: 2026-08-29
Status: Canonical documentation of shipped onboarding

## Purpose

This document is the source of truth for Cellular Death Match onboarding presentation, copy, event triggers, responsive behavior, persistence, and ownership.

The onboarding has three primary Dr. E surfaces:

1. **Full-screen Dr. E** for theatrical first contact and between-Trial Method handoffs.
2. **The onboarding arrow** for the one exact control or dish location required now.
3. **The Dr. E message rail** for exact instructions, live study status, success, and recovery help.

The first two Trials teach interaction grammar exactly. Trials 3–5 withdraw recipe-by-recipe commands and use hypotheses. A one-time mobile tool-rack gesture lesson belongs at the start of Trial 3 because it teaches interface grammar, not the recipe.

## Status legend

- **Shipped**: represented in current code and covered by existing behavior or tests.
- **Conditional**: shown only when its viewport, progression, or idle condition applies.

## Presentation ownership

Only one surface owns the player's next action at a time.

| Surface | Job | May cover the dish? | Input behavior |
| --- | --- | --- | --- |
| Full-screen Dr. E | First welcome; explain the Method system at a safe boundary | Yes, only before active control or between Trials | Modal. Its continue button owns focus. Options remains available during the first welcome. |
| Onboarding arrow | Point to the exact current control, rack edge, or dish coordinate | No | Decorative and `pointer-events: none`; it never intercepts the target. |
| Exact Dr. E message | Give one imperative action during Trials 1–2 and the mobile rack lesson | No | Persistent until the matching semantic event; not dismissed by tapping elsewhere. |
| Dr. E dish-status message | State the Trial, hypothesis, evidence, and live progress during Trials 3–5 and Open Lab | No | Informational; the dish remains interactive. |
| Professor's note | Offer bounded recovery after inactivity | No permanent obstruction | Dismissible with `Got it`; also retracts after nine seconds. |

The exact coach and director rail must not issue competing instructions. Exact coaching owns Trials 1–2. The director owns hypothesis Trials and Open Lab. The mobile rack lesson temporarily owns only the tool-discovery interaction, then returns ownership to the Trial 3 director message.

## Responsive contract

### Mobile: viewport below 900px

- The full-screen welcome uses full-bleed Dr. E art with the copy card and primary action above the bottom safe area.
- The full-screen Method handoff also uses full-bleed Dr. E art; `Choose a Method` spans the available card width.
- Exact Dr. E messages sit at the top, directly below the telemetry strip and above the dish.
- On short mobile screens, the compact message may hide body and step detail when the title is sufficient. The rack lesson keeps its body visible because it explains both the drag and button paths.
- `Eggs` opens the specimen freezer as a blocking drawer.
- The reagent rack is a native horizontally scrollable strip with scroll snapping.
- A player can drag/swipe the rack horizontally or press its `›`/`‹` overflow control.
- The mobile rack lesson appears only when the required reagent is outside the initially visible rack window.
- The central Trial banner is suppressed; Dr. E's top rail is authoritative.
- Safe-area insets protect top messages, rack controls, and modal actions.

### Desktop: viewport 900px and wider

- The first welcome places Dr. E on the left and the welcome copy on the right.
- The Method handoff uses full-screen Dr. E art with its copy card toward the right.
- Exact Dr. E messages use the compact lower-left transmission rail.
- Trial telemetry and the director message remain in the top HUD.
- The reagent panel is exposed as a desktop control rail; there is no drag-to-reveal lesson.
- Specimen targets can point directly to the visible freezer card. Mobile instead points to `Eggs` until the drawer is open.
- The central Trial banner remains suppressed to avoid duplicating the director message.

### Reduced motion and accessibility

- Full-screen entrances, message slides, the arrow bob, and Method art breathing become static under reduced motion.
- Every required action has a semantic button or canvas target; motion and color are not the only cues.
- The onboarding arrow is decorative. The Dr. E title/body supplies the accessible instruction.
- The mobile rack lesson accepts both a touch drag and activation of the focusable `Show more reagents` button.
- Modal surfaces restore predictable focus to their primary action. Exact Trial starts focus the first required control.

## Core UI elements

### 1. Full-screen Dr. E

There are two full-screen Dr. E states.

#### A. First-run welcome — shipped

| Field | Script / behavior |
| --- | --- |
| Kicker | `Dr. E. Mergent · Trial director` |
| Title | `Welcome to my lab.` |
| Body | `Let me show you the ropes. We’ll start with one egg and one feed.` |
| Action | `Tap to continue` |
| Entry trigger | Trial 1 begins and Trial 1 onboarding has not been completed before. |
| Exit trigger | The player activates `Tap to continue`. The welcome slides out, then the first exact message appears. |
| Simulation | Authoritative culture time is held during the welcome and first untouched instruction. |
| Persistence | It is marked seen only when Trial 1 is genuinely completed and banked. Reloading an unfinished Trial starts a clean dish and repeats the welcome. |

#### B. Between-Trial Method handoff — shipped

| Field | Script / behavior |
| --- | --- |
| Kicker | `Dr. E. Mergent · Trial logged` |
| Title | `Well done.` |
| Body | `A Method is one lab adjustment that stays active for the rest of this Case.` |
| Action | `Choose a Method ›` |
| Entry trigger | A Trial ends with status `won`, the verified bank boundary succeeds, and any queued Genome Decoded presentation has finished. |
| Exit trigger | The player activates `Choose a Method ›`. The Method-choice screen then owns focus. |
| Reload | If the saved boundary restores directly to Method choice, the full-screen definition is not replayed. |

Genome Decoded is a separate safe-boundary reward screen. It may appear before the Method handoff, but it never shares the screen with Dr. E guidance or the onboarding arrow. Its exit remains opaque until the destination screen is staged, so the arena cannot flash between Genome Decoded and the Method handoff.

### 2. Onboarding arrow — shipped

The arrow is Dr. E's circular portrait, cyan stem, and cyan arrowhead. It is fixed above the current target and never takes input.

Supported target vocabulary:

| Target | Resolution |
| --- | --- |
| `dish` | An authored point in the dish; after egg placement, later dish pointers track beside the most recent egg. |
| `tool:<id>` | The matching reagent button, such as `tool:nutrient`. |
| `lifeform:<id>` | Desktop: the visible specimen card. Mobile: `Eggs` until the freezer is open, then the specimen card. |
| `rack:more` | The mobile rack overflow edge / `Show more reagents` control. Trial 3 uses it for the one-time mobile rack lesson. |
| `end` | The Bank result / End control after exact-coach success. |

Visibility rules:

- It is hidden during the full-screen welcome, Notebook, observation-only waiting, and non-arena screens.
- It is visible only while the exact coach has a current pointer target.
- It follows layout changes and reruns positioning after the mobile rack scrolls.
- Reduced motion removes the bob but leaves a static pointer.

Mobile gesture cue:

- For the Trial 3 rack lesson, reuse the onboarding arrow at `rack:more`.
- Add a short horizontal leftward gesture cue over the tool strip; do not introduce another character surface.
- Reduced motion uses a static left arrow and the same drag-or-tap instruction.
- The target remains clickable because the cue has no pointer events.

### 3. Dr. E message rail — shipped

The same portrait and message language has two owners.

#### Exact coach

- Used for Trials 1–2.
- Shows a kicker, title, body, and `step / total`.
- Persists until the exact semantic event for that beat occurs.
- Out-of-order unrelated actions do not advance it.
- A successful action can satisfy more than one semantic fact. For example, successfully placing an already-selected Egg reports both Egg selection and Egg use.
- Once all taught actions are complete, it changes to observation, then success.

#### Director / dish status

- Used for Trials 3–5 and Open Lab.
- On entry, briefly shows `Dr. E · New trial` or `Dr. E · New study` for 2.6 seconds.
- Then becomes `Dr. E · Dish status` with state `Live`.
- The title is the objective name; the body is live objective progress.
- Completion changes the body to `Complete — bank when ready`.
- It does not use a step counter or point to every recipe action.

## Event semantics

Onboarding advances from semantic game events, not raw pointer coordinates.

| Event | Emitted when | Notes |
| --- | --- | --- |
| `egg-selected` | The Egg tool is selected, a specimen is selected, or an armed Egg is successfully placed | Allows the already-selected default Egg to behave naturally for a novice. |
| `lifeform:<id>` | A specimen card is selected | Trial 2 listens for `lifeform:bloom_mass`. |
| `<tool>-selected` | An unlocked reagent button is activated | Examples: `nutrient-selected`, `toxin-selected`. |
| `<tool>-used` | The selected reagent is successfully applied to the dish | Invalid/no-op placement does not advance the beat. |
| `paste-drawn` | A valid Paste stroke is drawn | Available for future authored interaction lessons. |
| `toolbox-scrolled` | The mobile rack moves, or the overflow button is activated | During the Trial 3 lesson, the event advances only after Water is fully visible and no longer covered by the overflow control. |
| `bloom-discovered` | The opening dish first creates Bloom Mass | Feeds progression; current exact completion is owned by the objective event. |
| `objective-complete` | The authoritative arena objective first becomes complete | Remembered if it arrives before the final taught action. Exact success waits until both objective and taught sequence are complete. |
| `end-experiment` | The player activates the ready Bank result control | Retires exact coaching before the Genome/Method boundary. |

The coach compares the incoming event with the current beat's trigger. A match advances one beat and rerenders the message and arrow. When the last exact action matches, the coach enters `awaitingObjective`.

## Complete first-session script

### Trial 1 — Culture Shock

Guidance tier: exact

Trial promise: `A fed Swarmlet may produce a viable new specimen.`

#### Welcome

Use the full-screen first-run welcome defined above.

#### Exact beats

| Step | Kicker | Title | Body | Visible action | Trigger | Arrow target |
| ---: | --- | --- | --- | --- | --- | --- |
| 1 / 4 | `Dr. E · First instruction` | `I’m Dr. E. Press Egg.` | `Trial 1 — Culture Shock. Load one Swarmlet culture.` | `Press Egg` | `egg-selected` | `tool:egg` |
| 2 / 4 | `Dr. E · Next instruction` | `Place it here.` | `Tap the point inside the dish.` | `Tap the dish` | `egg-used` | `dish` |
| 3 / 4 | `Dr. E · Next instruction` | `Now press Nutrient.` | `One measured feed. Nothing else.` | `Press Nutrient` | `nutrient-selected` | `tool:nutrient` |
| 4 / 4 | `Dr. E · Next instruction` | `Feed it once.` | `Tap beside the egg.` | `Tap beside the egg` | `nutrient-used` | `dish` |

#### Observation and recovery

After step 4:

| Field | Script |
| --- | --- |
| Kicker | `Dr. E · Observe` |
| Title | `Watch the culture.` |
| Body | `The organism is changing. Keep it alive while the result stabilizes.` |
| State | `Goal in progress` |

If no authored result arrives after ten seconds, one exact recovery note may interrupt:

| Field | Script |
| --- | --- |
| Kicker | `Professor’s note` |
| Title | `No reaction yet` |
| Body | `Place a Swarmlet Egg, then place Nutrient beside it.` |
| Action | `Got it` |

#### Success

When the taught sequence and objective are both complete, the compact message retracts, leaves the dish unobstructed for 2.6 seconds, then returns:

| Field | Script |
| --- | --- |
| Kicker | `Trial 01 · Goal complete` |
| Title | `Experiment complete.` |
| Body | `You’ve met the goal. Bank the result whenever you’re ready — keep playing with your organisms as long as you like.` |
| State | `Result ready` |
| Arrow | `end` |

The player banks the result. Bloom Mass becomes a safe-boundary Genome Decoded reward, followed by the full-screen Method handoff and Method choice.

### Trial 2 — Bitter Medicine

Guidance tier: exact

Trial promise: `Toxin added after feeding may turn Bloom growth into a useful reaction.`

There is no repeated full-screen welcome. The exact Dr. E message opens with the dish visible.

| Step | Kicker | Title | Body | Visible action | Trigger | Arrow target |
| ---: | --- | --- | --- | --- | --- | --- |
| 1 / 6 | `Dr. E · Next instruction` | `Open Eggs. Choose Bloom Mass.` | `Trial 2 — Bitter Medicine. Use the specimen we stabilized.` | `Open Eggs · choose Bloom Mass` | `lifeform:bloom_mass` | `lifeform:bloom_mass` |
| 2 / 6 | `Dr. E · Next instruction` | `Place it here.` | `Tap the marked point.` | `Tap the dish` | `egg-used` | `dish` |
| 3 / 6 | `Dr. E · Next instruction` | `Press Nutrient.` | `Feed first. Order matters.` | `Press Nutrient` | `nutrient-selected` | `tool:nutrient` |
| 4 / 6 | `Dr. E · Next instruction` | `Feed the culture.` | `Tap beside the Bloom Mass.` | `Tap the dish` | `nutrient-used` | `dish` |
| 5 / 6 | `Dr. E · Next instruction` | `Now press Toxin.` | `Add pressure to the fed tissue.` | `Press Toxin` | `toxin-selected` | `tool:toxin` |
| 6 / 6 | `Dr. E · Next instruction` | `Test the fed field.` | `Tap the same spot.` | `Tap the same spot` | `toxin-used` | `dish` |

Observation copy is the same `Watch the culture` state as Trial 1.

If no result arrives after ten seconds:

| Field | Script |
| --- | --- |
| Kicker | `Professor’s note` |
| Title | `No reaction yet` |
| Body | `Place Bloom Mass, add Nutrient, then overlap it with Toxin.` |
| Action | `Got it` |

Success:

| Field | Script |
| --- | --- |
| Kicker | `Trial 02 · Goal complete` |
| Title | `Bitter Bloom. Logged.` |
| Body | `Feed, then pressure: a repeatable protocol. Bank it whenever you’re ready, or keep observing.` |
| State | `Result ready` |
| Arrow | `end` |

Banking the result understands the Bitter Bloom protocol and unlocks Bruiser. The Bruiser Genome Decoded reward is followed by the full-screen Method handoff and Method choice.

### Trial 3 — Carrier Medium

Guidance tier: hypothesis, with one conditional mobile interaction bridge

Trial promise: `Water may carry Nutrient through the same budding tissue without suppressing it.`

#### Mobile tool-rack lesson — shipped

Entry conditions:

- Viewport is below 900px.
- The tool rack actually overflows.
- Water is outside the initially visible rack window.
- The player has not previously demonstrated rack reveal on this device/profile.

Do not use the full-screen Dr. E surface. The compact top message temporarily owns the next action:

| Field | Script / behavior |
| --- | --- |
| Kicker | `Dr. E · Instrument tip` |
| Title | `More tools are in the rack.` |
| Body | `Drag tools left to reveal Water — or tap ›.` |
| Step | `New control` |
| Trigger | `toolbox-scrolled` |
| Arrow target | `rack:more`, with a leftward gesture cue over the tool row |

Completion accepts either:

- a native horizontal drag/swipe that reveals Water fully; or
- activation of the `Show more reagents` overflow button.

After completion:

- persist a one-time mobile rack competency flag;
- retract the exact message and arrow;
- reveal/focus Water if needed;
- return ownership to the Trial 3 director message;
- never replay this beat on desktop or when all required tools already fit.

#### Desktop start

Desktop skips the rack lesson. The director owns the Trial introduction immediately because Water is available in the exposed reagent panel.

#### Director script

For 2.6 seconds:

| Field | Script |
| --- | --- |
| Kicker | `Dr. E · New trial` |
| Title | `Carrier Medium` |
| Body | `Reproduce Nutrient Conduit by carrying food through a budding culture with Water.` |
| State | `Live` |

Then the rail changes to `Dr. E · Dish status` and shows live progress.

Idle recovery after approximately 22 seconds without meaningful action:

1. Principle: `Water can carry an existing food field through budding tissue.`
2. After another idle interval, exact method: `Place Bloom Mass, add Nutrient, then overlap the same field with Water.`

Objective completion changes the rail to `Complete — bank when ready` and shows the Result Ready notification. There is no sequential recipe pointer after the rack lesson.

Banking the result understands Nutrient Conduit and unlocks Splitter. Any Genome Decoded reward appears before the next full-screen Method handoff.

### Trial 4 — Storm in a Dish

Guidance tier: hypothesis

Trial promise: `An unstable Foam field may accept a second reagent and discharge.`

Director introduction:

| Field | Script |
| --- | --- |
| Kicker | `Dr. E · New trial` |
| Title | `Storm in a Dish` |
| Body | `Create unstable Foam, then strike it with Water near a quick culture.` |

Idle recovery:

1. Principle: `An unstable Foam signal can accept a second Water pulse before it fades.`
2. Exact method: `Near Swarmlet, overlap Toxin with Water to make Foam; then add Water there again.`

There is no automatic pointer trail. The director shows live progress and switches to `Complete — bank when ready` when Foam Lightning is understood. Banking may unlock Mirror before the next Method handoff.

### Trial 5 — The Cure-ish

Guidance tier: hypothesis

Trial promise: `A known channel reaction may support a diverse dish without one strain taking over.`

Director introduction:

| Field | Script |
| --- | --- |
| Kicker | `Dr. E · New trial` |
| Title | `The Cure-ish` |
| Body | `Apply Brine Channel while maintaining a diverse, living dish.` |

Idle recovery:

1. Principle: `A channel needs a boundary, food to carry, and Water—then a diverse dish must survive it.`
2. Exact method: `On Bloom Mass, overlap Salt, Nutrient, then Water; keep three cultures alive and dominance at 60% or less.`

The director shows Brine Channel, living-culture, and dominance progress. Completion changes the rail to `Complete — bank when ready`. Banking seals the five-Trial Case and transitions toward Open Lab.

## Idle and recovery rules

| Context | First recovery | Second recovery | Cap |
| --- | ---: | ---: | ---: |
| Exact sequence still waiting for a player action | None; the exact message remains visible | None | Persistent exact instruction |
| Exact sequence finished but the authored result has not appeared | About 10 seconds | None | One exact recovery note |
| Hypothesis Trial or Open Lab | About 22 seconds without meaningful action | Another full idle interval | Two notes per Trial/Study |

Player action resets the idle clock. Recovery does not accumulate while the document is hidden or a blocking overlay has paused the culture. An engaged player is not interrupted.

## Persistence and restart behavior

- Trial completion is persisted only after the verified bank boundary.
- Trials 1–2 replay their exact lesson on a clean restarted dish if interrupted before banking.
- Completed exact Trials do not replay their coach script.
- Trials 3–5 restart with hypothesis guidance rather than a recipe pointer trail.
- The mobile rack competency flag persists independently of Trial completion; once the player demonstrates the gesture, it does not nag on later runs.
- Active culture cells are not serialized. The title correctly explains that the assignment is saved while active cultures restart cleanly.
- Genome and Method boundaries are restored without replaying stale dish guidance.

## Mobile rack lesson acceptance criteria

- At 390×844 and 375×667, Trial 3 cannot begin with Water hidden and no explanation of how to reach it.
- The message title and required gesture remain visible above the dish without overlapping Settings.
- A real horizontal touch drag completes the lesson.
- Pressing `›` also completes the lesson.
- Partial movement that leaves Water hidden or covered does not complete it accidentally.
- The onboarding arrow or gesture cue never captures touch input.
- Water becomes visible after completion.
- The lesson does not reveal the Trial 3 recipe beyond naming the newly required tool.
- Desktop never displays the mobile rack lesson.
- Keyboard/focus users can complete the equivalent action through `Show more reagents`.
- Reduced motion shows a static cue.
- Reload before demonstrating the gesture shows the lesson again; reload after demonstrating it does not.
- The director message becomes authoritative immediately after the lesson completes.

## Implementation map

| Concern | Current source |
| --- | --- |
| Exact Trial scripts and pointer targets | `src/game/onboardingStage.ts` |
| Full-screen welcome, exact coach state, success, and recovery presentation | `src/ui/coach.ts` |
| Trial metadata, hypothesis, and recovery copy | `src/content/researchCases.ts` |
| Objective title, description, target, and hint | `src/content/objectives.ts` |
| Coach event emission, pointer resolution, idle timing, and phase boundaries | `src/main.ts` |
| Mobile rack scrolling, overflow button, and `toolbox-scrolled` callback | `src/ui/screens.ts` |
| Director/coach ownership at Trial start | `src/ui/studyIntroduction.ts` |
| Full-screen Dr. E, compact rail, pointer, rack, and responsive layout | `src/styles.css` and `index.html` |
| Exact-coach behavior tests | `tests/ui/coach.test.ts` and `tests/game/onboardingStage.test.ts` |
| First-session browser journeys | `e2e/onboarding.spec.ts`, `e2e/journeys.spec.ts`, `e2e/persistence.spec.ts`, and `e2e/mobile-toolbox-onboarding.spec.ts` |

## Mobile rack implementation note

The Trial 3 rack beat is intentionally separate from `TRIAL_ONBOARDING_BEATS`: Trials 3–5 remain hypothesis-led, while this conditional beat teaches only mobile interface grammar. It is offered at the start of Trial 3 when Water is obscured, stored under `cdm.coach.mobile-toolbox-seen.v1`, and completed only after Water is fully visible. The Trial 3 director introduction is deferred while the lesson owns the next action, then restored immediately afterward.
