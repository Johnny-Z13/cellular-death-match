# Legibility Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every viewport answer at a glance three questions: what each culture is, what just happened and where, and what the goal is and how far along it is. Leave the CPM automata core untouched.

**Architecture:** One new pure planning module (`src/ui/dishLabels.ts`) decides which tags and callouts to show, and a thin DOM overlay renders them over the canvas. Objective progress gains a numeric `fraction` and a generated imperative goal line (`src/content/goalCopy.ts`). The HUD becomes a persistent goal bar that the coach docks beneath instead of hiding. Copy, type scale and layout changes are CSS/text passes verified by screenshot.

**Tech Stack:** Vite 5, TypeScript 5.6 (strict), Vitest 2, Playwright 1.60, plain DOM + Canvas 2D.

**Spec:** `docs/superpowers/specs/2026-10-09-legibility-overhaul-design.md`

**Execution mode:** Native (Claude implements in-session; Johnny is asleep and asked for autonomous execution). An independent adversarial game-design reviewer runs after Task 10, and again after its fixes if needed.

## Global Constraints

- Do not modify `src/sim/**`, `src/sim/breedProfiles.ts`, ecology tuning, or objective *rules* (only add a `fraction` output).
- Do not rename internal ids, storage keys, types or CSS hooks used by tests unless the test is updated in the same commit.
- Per-frame UI state is module-level, never re-rendered wholesale: the label overlay reuses DOM nodes keyed by id and moves them with `transform`.
- Rendered text minimum is 11px on all viewports.
- Tunables go in named config objects (`DISH_LABEL_TUNING`, type tokens in `:root`), not literals scattered through the code.
- Bump `?v=` on `src/styles.css` / `src/arena-layout.css` links in `index.html` when they change (house rule).
- Verify with `npm test`, `npm run build`, the relevant Playwright specs, and screenshots at 390×844, 375×667, 844×390, 768×1024 and 1280×720.
- Commit per task with a heredoc message ending in `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Never push.

## Review Focus

1. **Dense dish (10+ cultures, many strains).** Tags must not pile into an unreadable stack. Expect at most the cap, with the lowest-priority tags dropped on overlap. Pinned by `planDishLabels` cap/collision tests (Task 3).
2. **Culture at the dish edge.** Tags must stay inside the dish rectangle (clamped), never clipped off-canvas. Pinned by an edge-clamp test (Task 3).
3. **Culture dies while tagged.** The tag disappears on the next plan, and no orphan DOM nodes remain. Pinned by a planner test (dead culture → no plan) plus overlay node reuse (Task 4).
4. **Guided Trial 1 / small phone 375×667.** The goal bar and coach card together must not push the dish below the tool rack or overlap it. Pinned by an e2e geometry check in `e2e/director-rail.spec.ts` / `responsive.spec.ts` (Tasks 2 and 8).
5. **Hover inspect on touch devices.** It must never appear from a touch tap (it is desktop-only, `pointerType === 'mouse'`). Pinned in the overlay wiring (Task 4) and checked in the phone e2e run.

---

### Task 1: Objective fraction + imperative goal line

**Files:**
- Modify: `src/game/objectiveScoring.ts` (add `fraction` to `ObjectiveProgress`, compute per kind)
- Create: `src/content/goalCopy.ts`
- Test: `tests/game/objectiveScoring.test.ts`, `tests/content/goalCopy.test.ts`

**Interfaces — Produces:**
- `ObjectiveProgress.fraction: number | null` (0..1; `null` for pure yes/no objectives that have no measurable quantity)
- `goalLineFor(def: ObjectiveDef): string`, imperative and at most 48 chars for authored trials

- [ ] Step 1: Write the failing tests. Cover `fraction` for count kinds (`breed_archetype`, `reaction_chain`, `mega_culture`, `balance_keeper`, `symbiosis`, `preserve_grazers`, `colony_founder`), `null` for flag kinds (`cross_breed`, `protector`, `acid_sculptor`, `understand_recipe`), and `1` whenever `met`. Cover `goalLineFor` for every `ObjectiveKind`: non-empty, no retired nouns, at most 48 chars for `OBJECTIVES` entries.
- [ ] Step 2: `npx vitest run tests/game/objectiveScoring.test.ts tests/content/goalCopy.test.ts` → FAIL.
- [ ] Step 3: Add the `fraction` parameter to `progress()`, then pass a clamped ratio from each case. Write `goalLineFor` as an exhaustive switch over `ObjectiveKind`, using `BREED_DEFS`, `REACTION_RECIPES` and `ARCHETYPE_INFO` names.
- [ ] Step 4: Re-run → PASS. Run `npm test` to check no other consumer breaks.
- [ ] Step 5: Commit `feat: objective progress fraction and imperative goal copy`.

### Task 2: Persistent goal bar; coach docks beneath it

**Files:**
- Modify: `index.html` (HUD markup: kicker, goal line, status line, meter, balance chip)
- Modify: `src/ui/screens.ts` (`HudInfo` gains `goalLine`, `fraction`, `kicker`; `updateHud` renders them)
- Modify: `src/main.ts` (feed `goalLineFor(objective.def)` and `objective.fraction`)
- Modify: `src/arena-layout.css` (remove `.coach-active .hud { opacity:0 }`; dock the coach under the bar on desktop and phone)
- Create: `src/legibility.css` (new components only), linked after `arena-layout.css`
- Test: `e2e/director-rail.spec.ts` (goal bar visible while the coach is active; no overlap with the coach or the dish)

- [ ] Step 1: e2e assertion first. During Trial 1 with the coach showing `Press Egg.`, `#hud-goal-line` is visible and non-empty, and the `#hud` and `#coach` rects don't intersect → FAIL.
- [ ] Step 2: Implement markup, `updateHud` fields and CSS.
- [ ] Step 3: Run `npx playwright test e2e/director-rail.spec.ts e2e/onboarding.spec.ts --project=phone` and `--project=desktop` → PASS. Check screenshots at 375×667 and 1280×720.
- [ ] Step 4: Commit `feat: persistent goal bar with progress meter`.

### Task 3: Dish label planner (pure)

**Files:**
- Create: `src/ui/dishLabels.ts` (pure planner + `DISH_LABEL_TUNING` + `humanEventLabel`)
- Test: `tests/ui/dishLabels.test.ts`

**Interfaces — Produces:**
```ts
export interface LabelCulture { id: number; strainKey: string; name: string; color: [number, number, number]; center: [number, number]; vol: number; isControl: boolean; isGoal: boolean; firstSeenMs: number; }
export interface LabelEvent { id: number; kind: DishEventKind; label: string; pos: [number, number]; ageMs: number; }
export interface PlannedLabel { key: string; kind: 'strain' | 'control' | 'goal' | 'new' | 'ping' | 'event'; text: string; icon: string; color: string; xPct: number; yPct: number; }
export function planDishLabels(input: { cultures: readonly LabelCulture[]; events: readonly LabelEvent[]; nowMs: number; gridSize: number; dishPx: number; pingId: number | null; compact: boolean }): PlannedLabel[];
export function humanEventLabel(raw: string): string | null; // null = suppressed duplicate (FLASH/SPARK)
```

- [ ] Step 1: Failing tests:
  - one tag per strain, on its largest culture;
  - the control tag;
  - `◎` prefix for goal strains;
  - `NEW · ` while within `newStrainMs`;
  - cap 5 when compact, 7 otherwise;
  - collision drop order (event > ping > goal > new > control > strain);
  - edge clamping inside 2%–98%;
  - dead cultures (vol ≤ 0) are ignored;
  - `humanEventLabel('PREDATOR OUTBREAK') === 'Predator outbreak'`;
  - `humanEventLabel('X FLASH') === null`;
  - `NEW LIFEFORM: Bloom Mass` → `New strain: Bloom Mass`.
- [ ] Step 2: Run → FAIL. Step 3: implement. Step 4: run → PASS.
- [ ] Step 5: Commit `feat: dish label planner`.

### Task 4: Dish label overlay, goal rings, tap ping, hover inspect

**Files:**
- Create: `src/ui/dishLabelOverlay.ts` (DOM: reuse nodes by `key`, position with `left/top %` + `transform`, apply `kind` classes; inspect card)
- Modify: `index.html` (`<div id="dish-labels" class="dish-labels" aria-hidden="true">` inside `.dish-stage`; Options toggle button `#labels-button`)
- Modify: `src/main.ts`:
  - build `LabelCulture[]` from `arena.state.cells` + `arena.archetypes` + `lifeformIdentityForSpawn`;
  - add a goal predicate from the objective def;
  - throttle to `DISH_LABEL_TUNING.updateMs`;
  - pointerdown ping (any pointer);
  - hover inspect on `pointermove` when `pointerType === 'mouse'` and no buttons are held;
  - persist the labels toggle.
- Modify: `src/ui/render.ts` (accept `goalCellIds` and draw a dashed ring per goal culture; the ring is a shape, not just a colour)
- Modify: `src/legibility.css`
- Test: `e2e/dish-labels.spec.ts`:
  - after the first egg, a tag with text `Swarmlet` is visible inside the dish rect;
  - on desktop, hovering a culture shows `#dish-inspect` with its name;
  - on phone, a tap never shows `#dish-inspect`;
  - the Options toggle hides tags.

- [ ] Steps: write the e2e (FAIL) → implement → run `--project=phone` and `--project=desktop` (PASS) → screenshot a busy Open Lab dish → commit `feat: self-labelling dish with hover inspect`.

### Task 5: Events where they happen; quiet guided trials; Log sheet

**Files:**
- Modify: `src/main.ts` (pass `getDishEvents()` into the planner; events become callouts)
- Investigate, then modify: `src/game/arena.ts` / `src/game/escalation.ts` world-event gating for guided trial beats (trace why the Trial 2 lesson saw outbreaks and a crisis before changing anything)
- Modify: `src/styles.css` (mobile Log becomes a solid scrollable sheet)
- Test:
  - unit test in `tests/game/arena.test.ts` for the gating rule, once its location is known;
  - e2e: the phone log sheet has an opaque background and does not exceed 45% of the viewport height.

- [ ] Steps: reproduce the Trial-2 crisis in a unit test → fix → callouts e2e → commit `feat: in-dish event callouts and calmer guided trials`.

### Task 6: One vocabulary

**Files:**
- Modify: player-facing strings in `index.html`, `src/ui/*.ts`, `src/content/*.ts` (names/descriptions/notes), `src/game/labReport.ts`, `src/game/researchNotebook.ts`, `src/content/notebook.ts`, `src/content/researchCases.ts`, `src/ui/coach.ts` / `src/game/onboardingStage.ts` copy
- Create: `src/content/glossary.ts` (`RETIRED_PLAYER_NOUNS` list plus the canonical terms, with a short rationale comment)
- Test:
  - `tests/content/glossary.test.ts` scans `index.html` visible text and the authored copy exported from content modules (objective names/descriptions/hints, research cases, onboarding beats, upgrade names) for retired nouns;
  - update the e2e string expectations that change.

- [ ] Steps: inventory (an Explore agent lists every rendered string containing a retired noun with file:line) → write the glossary test (FAIL) → rewrite copy → update the e2e strings → full `npm test` + Playwright → commit `feat: single player-facing vocabulary`.

### Task 7: Type floor and desktop composition

**Files:**
- Modify: `src/styles.css`, `src/arena-layout.css` (`:root` tokens `--fs-min: 11px; --fs-small: 12px; --fs-body: 13px; --fs-body-lg: 14px`; replace sub-11px literals)
- Modify: the desktop grid (dish size from available height; panel widths)
- Test: e2e `responsive.spec.ts` gains a check that every visible text node's computed font-size is ≥ 11px at 1280×720 and 390×844.

- [ ] Steps: add the font-floor e2e (FAIL) → token pass → fix overflow found by screenshot at all 5 viewports → PASS → commit `style: 11px type floor and larger desktop dish`.

### Task 8: Phone layout — bigger dish, full tool rack, Leave trial in Options

**Files:**
- Modify: `src/styles.css` (portrait dish sizing; `.toolbox` wraps as a grid with no horizontal scroll; step counter and pointer-bubble overlap fixes)
- Modify: `index.html` + `src/ui/screens.ts` + `src/main.ts` (a `#options-leave-trial` button in Options drives the existing two-step abandon confirm; the rack's `#end-epoch-button` shows only when finishable)
- Modify: `src/game/dishExitAction.ts` + `tests/game/dishExitAction.test.ts` if the state mapping changes
- Test: `responsive.spec.ts`:
  - `.toolbox` `scrollWidth <= clientWidth` at 375×667 and 390×844 with all tools unlocked (preview);
  - the dish is at least 92% of the viewport width in portrait.

  Also update the abandon e2e flows.

- [ ] Steps: failing geometry e2e → CSS/markup → update the abandon tests → PASS on all 5 projects → commit `feat: phone layout shows every tool and a larger dish`.

### Task 9: Tool radius preview + upgrade gating

**Files:**
- Modify: `src/main.ts` (desktop hover ghost ring through the existing `renderToolEffects` canvas pass, using `TOOL_TUNING` radii × player config radius multipliers)
- Modify: the upgrade-choice generator (find via `setPickChoices`) to filter by unlocked tools; add a map `UPGRADE_REQUIRED_TOOL` in `src/content/upgrades.ts`
- Test: unit — choices never include `toxin_1`/`toxin_radius_1` when Toxin is locked, and never `water_1`/`salt_1`/`acid_1`/`volatile_reagents_1` when those tools are locked.

- [ ] Steps: failing unit test → implement → hover screenshot on desktop → commit `feat: tool radius preview and unlock-aware upgrades`.

### Task 10: Agar substrate

**Files:**
- Modify: `src/ui/render.ts` (replace `fillStyle '#000'` with a cached, pre-rendered agar canvas, rebuilt only when the canvas size changes; low-power profile keeps a cheap gradient)
- Test: render unit test, if the existing render tests cover the background; otherwise visual check plus an FPS comparison on the Open Lab dish (`debug` FPS before/after reported).

- [ ] Steps: implement → screenshots → FPS numbers → commit `style: agar substrate behind the dish`.

### Task 11 (stretch): One click to play

- [ ] Fold the welcome copy into the first instruction, so `#title-start` lands directly on `Press Egg.`. Update `startFirstTrial` and the onboarding specs. Ship only if `onboarding*.spec.ts`, `journeys.spec.ts` and `mobile-toolbox-onboarding.spec.ts` are green; otherwise revert and document.

### Task 12: Adversarial review, fixes, docs

- [ ] Capture `after` shots (`CDM_UX_SHOTS=after`).
- [ ] Dispatch an independent adversarial game-design reviewer with the spec, both shot sets, and instructions to play the build itself via Playwright.
- [ ] Triage its findings: fix, or decline with a reason in `docs/ux-legibility/REVIEW.md`. Re-review if the fixes are substantial.
- [ ] Update `docs/current-state.md` and write `docs/ux-legibility/README.md` (what changed, before/after, how to verify, open questions for Johnny).
- [ ] Final: `npm test`, `npm run build`, `npx playwright test` all green; `git status --porcelain` clean.
