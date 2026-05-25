# Ecosystem Depth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a first complete pass of readable ecosystem depth: species relationships, named mutations, tool synergies, crisis events, ecology signals, and one strategic agitation upgrade.

**Architecture:** Tunable ecology content lives in `src/content/ecology.ts`. `src/game/arena.ts` owns runtime state, target selection, mutations, crises, tool synergies, and signals. `src/main.ts` forwards arena signals into the existing ticker. Existing low-level simulation remains generic.

**Tech Stack:** Vite, TypeScript, Vitest, browser canvas UI.

---

### Task 1: Ecology Content

**Files:**
- Create: `src/content/ecology.ts`
- Create: `tests/content/ecology.test.ts`

- [ ] **Step 1: Write tests for role, trait, and crisis content**

Create `tests/content/ecology.test.ts` with tests that assert every enemy archetype has an ecology profile, every mutation trait has display text and numeric modifiers, and every crisis has a display name and duration.

- [ ] **Step 2: Run tests to verify red**

Run: `npm test -- tests/content/ecology.test.ts`

Expected: FAIL because `src/content/ecology.ts` does not exist.

- [ ] **Step 3: Implement ecology content**

Create `src/content/ecology.ts` exporting:

- `TraitId`
- `CrisisId`
- `ArchetypeEcology`
- `MUTATION_TRAITS`
- `CRISES`
- `ARCHETYPE_ECOLOGY`
- `pickMutationTrait(existing, roll)`

- [ ] **Step 4: Verify**

Run: `npm test -- tests/content/ecology.test.ts`

Expected: PASS.

### Task 2: Strategic Upgrade

**Files:**
- Modify: `src/content/upgrades.ts`
- Modify: `tests/content/upgrades.test.ts`
- Modify: `src/game/arena.ts`
- Modify: `tests/game/arena.test.ts`

- [ ] **Step 1: Write tests**

Add tests proving `centrifuge_1` adds one agitation charge and that `createArena` uses `player.agitationCharges` for `getAgitationState().maxCharges`.

- [ ] **Step 2: Run tests to verify red**

Run: `npm test -- tests/content/upgrades.test.ts tests/game/arena.test.ts`

Expected: FAIL because the modifier is not implemented.

- [ ] **Step 3: Implement**

Add `agitationCharges?: number` to `PlayerConfig`, `addAgitationCharges?: number` to upgrade modifiers, a `Centrifuge Rotor` upgrade, apply logic in `applyUpgrades`, and use `opts.player.agitationCharges ?? 2` in arena agitation state.

- [ ] **Step 4: Verify**

Run: `npm test -- tests/content/upgrades.test.ts tests/game/arena.test.ts`

Expected: PASS.

### Task 3: Species Relationships

**Files:**
- Modify: `src/game/arena.ts`
- Modify: `tests/game/arena.test.ts`

- [ ] **Step 1: Write tests**

Add an arena test proving a splitter chooses a swarmlet target over a closer bruiser when predator/prey preference applies.

- [ ] **Step 2: Run tests to verify red**

Run: `npm test -- tests/game/arena.test.ts`

Expected: FAIL because target selection is nearest-only.

- [ ] **Step 3: Implement**

Import `ARCHETYPE_ECOLOGY` and update `chooseEcosystemTarget` to score candidates by distance plus relationship multipliers.

- [ ] **Step 4: Verify**

Run: `npm test -- tests/game/arena.test.ts`

Expected: PASS.

### Task 4: Named Mutations

**Files:**
- Modify: `src/content/enemies.ts`
- Modify: `src/game/arena.ts`
- Modify: `tests/game/arena.test.ts`

- [ ] **Step 1: Write tests**

Add an arena test proving a mutation assigns at least one named trait to a living lineage and exposes that trait in ecology signals.

- [ ] **Step 2: Run tests to verify red**

Run: `npm test -- tests/game/arena.test.ts`

Expected: FAIL because traits and signals are not implemented.

- [ ] **Step 3: Implement**

Add `traits?: TraitId[]` to `EnemySpawn`. Update `mutateEcology` to assign a trait via `pickMutationTrait`, apply trait modifiers, and push a signal.

- [ ] **Step 4: Verify**

Run: `npm test -- tests/game/arena.test.ts`

Expected: PASS.

### Task 5: Tool Synergies

**Files:**
- Modify: `src/game/arena.ts`
- Modify: `tests/game/arena.test.ts`

- [ ] **Step 1: Write tests**

Add tests for egg in nutrient field adding `budding`, egg in toxin field adding `toxin_resistant`, and agitate with active nutrient field producing a signal.

- [ ] **Step 2: Run tests to verify red**

Run: `npm test -- tests/game/arena.test.ts`

Expected: FAIL because synergies do not exist.

- [ ] **Step 3: Implement**

Detect active nearby tool effects during egg spawn. Add trait and size modifiers to spawned eggs. In `agitate`, inspect active effects and push nutrient/toxin synergy signals with mild global impact.

- [ ] **Step 4: Verify**

Run: `npm test -- tests/game/arena.test.ts`

Expected: PASS.

### Task 6: Crisis Events And Signals

**Files:**
- Modify: `src/game/arena.ts`
- Modify: `src/main.ts`
- Modify: `src/ui/screens.ts`
- Modify: `tests/game/arena.test.ts`

- [ ] **Step 1: Write tests**

Add tests proving a crisis activates at the interval and `getEcology()` exposes both `crisis` and `signals`.

- [ ] **Step 2: Run tests to verify red**

Run: `npm test -- tests/game/arena.test.ts`

Expected: FAIL because crisis and signals are not exposed.

- [ ] **Step 3: Implement**

Add arena signal queue and crisis state. Add `signals: string[]` and `crisis: string` to `EcologyInfo`. Update `main.ts` ticker to display new unique signals. Update HUD ecology text to include crisis when active.

- [ ] **Step 4: Verify**

Run: `npm test -- tests/game/arena.test.ts`

Expected: PASS.

### Task 7: Full Verification

**Files:**
- No new files.

- [ ] **Step 1: Run full tests**

Run: `npm test`

Expected: PASS.

- [ ] **Step 2: Run build**

Run: `npm run build`

Expected: PASS.

- [ ] **Step 3: Browser smoke**

Run the dev server and check:

- Desktop `1280x720`
- Mobile `390x844`
- Small mobile `375x667`

Expected: title loads, arena starts, HUD/ticker render, no toolbox overlap with dish.

## Self Review

The plan covers the design doc requirements: species relationships, named mutations, environmental tool synergies, crisis events, ecology signals, and one strategic upgrade. The remaining listed upgrades are intentionally documented but not implemented in this pass because they require selected-strain persistence in player config. No placeholders remain.
