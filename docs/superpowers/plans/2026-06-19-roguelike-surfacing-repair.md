# Roguelike Surfacing Repair Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the existing roguelike ecosystem systems visible, scoreable, and satisfying in the player journey before adding new mechanics.

**Architecture:** Treat this as a surfacing and correctness pass. First expose existing player-facing systems (loadout, objective choice, lab report, equilibrium), then make the game rules match those surfaces, then clean up the drift caused by the shooter-to-ecosystem pivot. Keep simulation code low-level and keep run orchestration out of UI where possible.

**Tech Stack:** Vite, TypeScript, Canvas 2D, DOM UI, Vitest, localStorage persistence.

---

## Current Problems This Plan Fixes

- Procedural objective choices exist but are not presented to the player.
- Procedural objective kinds are typed with `as any` and mostly score as balanced ecology.
- Strain library exists but there is no pre-run loadout flow.
- Lab report data and renderer exist but the run-end screen still uses old fixed-run summary copy.
- Homeostasis is counted by culture instances, not volume share, and immediately ends the run instead of surfacing equilibrium.
- Title, HUD, and end copy still imply a short fixed timer run.
- `src/main.ts` owns too much run, UI, persistence, audio, and telemetry flow.
- `src/sim/` imports game-specific breed profile ids through `Cell.breedProfileId`.
- Monte Carlo boundary sampling allocates an array every attempted step.
- Mobile/title visual polish has regressions: title chrome leaks through and coach overlaps the dish at small heights.
- `docs/current-state.md` has stale verification notes.

## File Structure

- Modify `index.html`
  - Add containers for loadout, objective pick, and lab report screens.
  - Update title copy so it matches open-ended ecosystem runs.

- Modify `src/content/objectives.ts`
  - Add real objective kinds for all procedural objectives.
  - Add small optional fields needed for sustain thresholds.

- Modify `src/game/objectivePool.ts`
  - Remove `as any`.
  - Draw only objectives that can be scored with current progression.

- Create `src/game/objectiveScoring.ts`
  - Own objective metrics, stateful objective counters, and `evaluateObjective`.
  - Remove scoring logic from `arena.ts`.

- Modify `src/game/arena.ts`
  - Delegate objective scoring to `objectiveScoring.ts`.
  - Track per-epoch objective runtime counters.
  - Expose run snapshot data needed by lab reports.
  - Latch equilibrium without immediately ending the simulation.

- Modify `src/game/homeostasis.ts`
  - Track volume-share stability over a rolling window.
  - Return biome classification data when equilibrium is achieved.

- Create `src/game/runTelemetry.ts`
  - Accumulate run duration, epoch count, discoveries, hybrids, reactions, final populations, stability streak, and newly banked strains.
  - Build `LabReportInput` from arena/run/progression state.

- Modify `src/game/run.ts`
  - Add an explicit `objective_pick` phase for mid-game epochs.
  - Keep upgrade selection and objective selection separate.
  - Represent open-ended runs without `totalFights: 0` leaking into UI.

- Modify `src/game/strainLibrary.ts`
  - Add helper methods for current loadout availability and newly banked strain reporting.

- Modify `src/ui/screens.ts`
  - Add APIs for loadout, objective pick, lab report, open-ended HUD labels, and equilibrium state.
  - Keep screen wiring consistent with existing DOM patterns.

- Modify `src/ui/loadoutScreen.ts`
  - Use display names/colors from lifeform identity/content, not raw ids.
  - Enforce selected loadout through callback.

- Modify `src/ui/labReportScreen.ts`
  - Render the actual end-of-run report inside the existing screen system.

- Modify `src/ui/render.ts`
  - No product changes required unless equilibrium visual state needs a dish border effect.

- Modify `src/styles.css`
  - Hide gameplay chrome behind the title.
  - Style loadout, objective pick, lab report, and equilibrium HUD state.
  - Fix small-mobile coach overlap.

- Modify `src/sim/types.ts`, `src/sim/monte-carlo.ts`, `src/sim/grid.ts`
  - Make simulation energy profiles generic.
  - Add low-allocation boundary sampling cache.

- Modify `docs/current-state.md`
  - Update verification baseline and current product behavior.

- Add or modify tests under:
  - `tests/game/objectiveScoring.test.ts`
  - `tests/game/run.test.ts`
  - `tests/game/homeostasis.test.ts`
  - `tests/game/strainLibrary.test.ts`
  - `tests/game/runTelemetry.test.ts`
  - `tests/ui/loadoutScreen.test.ts`
  - `tests/ui/labReportScreen.test.ts`
  - `tests/ui/mobileLayoutCss.test.ts`
  - `tests/ui/openEndedCopy.test.ts`
  - existing `tests/game/arena.test.ts`

---

## Task 1: Fix Open-Ended Copy And Phase Chrome

**Files:**
- Modify: `index.html`
- Modify: `src/ui/screens.ts`
- Modify: `src/styles.css`
- Test: `tests/ui/openEndedCopy.test.ts`
- Test: `tests/ui/mobileLayoutCss.test.ts`

- [ ] **Step 1: Write tests for open-ended copy**

Create `tests/ui/openEndedCopy.test.ts`:

```ts
import { readFileSync } from 'node:fs';

const html = readFileSync('index.html', 'utf8');
const screensSource = readFileSync('src/ui/screens.ts', 'utf8');

describe('open-ended run copy', () => {
  it('does not describe the game as ending when a dish clock expires', () => {
    expect(html).not.toContain('before the dish clock expires');
    expect(html).toContain('nurture the dish toward equilibrium');
  });

  it('does not format open-ended end summaries as x / 0 objectives', () => {
    expect(screensSource).toContain('info.totalFights === 0');
    expect(screensSource).not.toContain('ecosystem ${info.fightReached} / ${info.totalFights}');
  });
});
```

- [ ] **Step 2: Run the failing copy test**

Run:

```bash
npm test -- tests/ui/openEndedCopy.test.ts
```

Expected: fails on old title copy and old `x / totalFights` formatting.

- [ ] **Step 3: Update title and end summary copy**

In `index.html`, replace the title subtitle with:

```html
<p class="screen-sub">Run unstable ecosystem trials. Breed organisms, flood reagents, shake the dish, and nurture the dish toward equilibrium.</p>
```

In `src/ui/screens.ts`, update `updateEnd(info)` so open-ended runs use epoch/result language:

```ts
const fightStr = info.totalFights === 0
  ? info.outcome === 'won'
    ? `Stable ecosystem achieved after ${info.fightReached} ${info.fightReached === 1 ? 'epoch' : 'epochs'}. ${info.objectivesCompleted} objectives banked.`
    : `Ecosystem collapsed during epoch ${info.fightReached}. ${info.objectivesCompleted} objectives banked.`
  : info.outcome === 'won'
    ? info.objectivesCompleted >= info.totalFights
      ? `All ${info.totalFights} objectives achieved - a flawless trial.`
      : `Trial concluded: ${info.objectivesCompleted} of ${info.totalFights} objectives achieved.`
    : `Collapsed during ecosystem ${info.fightReached} / ${info.totalFights}.`;
```

- [ ] **Step 4: Hide gameplay chrome behind title**

In `src/ui/screens.ts`, add a layout phase data attribute inside `show(name)` / `hide(name)` flow:

```ts
function setVisibleScreen(name: ScreenName | null): void {
  layout.dataset.screen = name ?? 'arena';
}
```

Call `setVisibleScreen('title')` when showing title, `setVisibleScreen('pick')`, `setVisibleScreen('end')`, `setVisibleScreen('notebook')`, and `setVisibleScreen(null)` for arena HUD.

In `src/styles.css`, add:

```css
.layout[data-screen="title"] .toolbox,
.layout[data-screen="title"] .life-panel,
.layout[data-screen="title"] .ticker,
.layout[data-screen="title"] .mobile-shell,
.layout[data-screen="title"] .hud {
  opacity: 0;
  pointer-events: none;
}
```

- [ ] **Step 5: Run copy and mobile CSS tests**

Run:

```bash
npm test -- tests/ui/openEndedCopy.test.ts tests/ui/mobileLayoutCss.test.ts
```

Expected: pass.

---

## Task 2: Wire The Lab Report As The Real Run-End Surface

**Files:**
- Modify: `index.html`
- Create: `src/game/runTelemetry.ts`
- Modify: `src/game/labReport.ts`
- Modify: `src/ui/labReportScreen.ts`
- Modify: `src/ui/screens.ts`
- Modify: `src/main.ts`
- Test: `tests/game/runTelemetry.test.ts`
- Test: `tests/ui/labReportScreen.test.ts`

- [ ] **Step 1: Write telemetry tests**

Create `tests/game/runTelemetry.test.ts`:

```ts
import { createRunTelemetry } from '../../src/game/runTelemetry';

describe('run telemetry', () => {
  it('records discoveries, hybrids, reactions, and final populations for a lab report', () => {
    const telemetry = createRunTelemetry({ startedAtMs: 1_000, runNumber: 4 });
    telemetry.recordEpochCompleted();
    telemetry.recordDiscovery('bloom_mass', false);
    telemetry.recordDiscovery('quill_bloom', true);
    telemetry.recordReactionCount(3);
    telemetry.recordPeakBiodiversity(5);

    const input = telemetry.toLabReportInput({
      endedAtMs: 62_500,
      outcome: 'lost',
      epochCount: 2,
      biomeName: undefined,
      newBiome: false,
      finalBreedCounts: new Map([['swarmlet', 3], ['bloom_mass', 1]]),
      newStrainsBanked: ['bloom_mass', 'quill_bloom'],
      totalStrainsDiscovered: 3,
      totalStrainsAvailable: 14,
      newNotebookEntries: 2,
      notebookCompletion: 0.21,
      longestStabilityStreak: 180,
    });

    expect(input.runNumber).toBe(4);
    expect(input.discoveredBreeds).toEqual(['bloom_mass', 'quill_bloom']);
    expect(input.discoveredHybrids).toEqual(['quill_bloom']);
    expect(input.reactionsTriggered).toBe(3);
    expect(input.finalBreedCounts.get('swarmlet')).toBe(3);
  });
});
```

- [ ] **Step 2: Implement `createRunTelemetry`**

Create `src/game/runTelemetry.ts`:

```ts
import type { LabReportInput } from './labReport';

export interface RunTelemetryOpts {
  startedAtMs: number;
  runNumber: number;
}

export interface LabReportSnapshot {
  endedAtMs: number;
  outcome: 'won' | 'lost';
  biomeName?: string;
  epochCount: number;
  newBiome: boolean;
  finalBreedCounts: Map<string, number>;
  peakBiodiversity?: number;
  longestStabilityStreak: number;
  newStrainsBanked: string[];
  totalStrainsDiscovered: number;
  totalStrainsAvailable: number;
  newNotebookEntries: number;
  notebookCompletion: number;
}

export function createRunTelemetry(opts: RunTelemetryOpts) {
  const discoveredBreeds: string[] = [];
  const discoveredHybrids: string[] = [];
  let epochCount = 0;
  let reactionsTriggered = 0;
  let peakBiodiversity = 0;

  return {
    recordEpochCompleted(): void {
      epochCount += 1;
    },
    recordDiscovery(id: string, hybrid: boolean): void {
      if (!discoveredBreeds.includes(id)) discoveredBreeds.push(id);
      if (hybrid && !discoveredHybrids.includes(id)) discoveredHybrids.push(id);
    },
    recordReactionCount(count: number): void {
      reactionsTriggered = Math.max(reactionsTriggered, count);
    },
    recordPeakBiodiversity(count: number): void {
      peakBiodiversity = Math.max(peakBiodiversity, count);
    },
    toLabReportInput(snapshot: LabReportSnapshot): LabReportInput {
      return {
        runNumber: opts.runNumber,
        outcome: snapshot.outcome,
        biomeName: snapshot.biomeName,
        epochCount: snapshot.epochCount || epochCount,
        durationMs: Math.max(0, snapshot.endedAtMs - opts.startedAtMs),
        discoveredBreeds,
        discoveredHybrids,
        reactionsTriggered,
        newBiome: snapshot.newBiome,
        finalBreedCounts: snapshot.finalBreedCounts,
        peakBiodiversity: snapshot.peakBiodiversity ?? peakBiodiversity,
        longestStabilityStreak: snapshot.longestStabilityStreak,
        newStrainsBanked: snapshot.newStrainsBanked,
        totalStrainsDiscovered: snapshot.totalStrainsDiscovered,
        totalStrainsAvailable: snapshot.totalStrainsAvailable,
        newNotebookEntries: snapshot.newNotebookEntries,
        notebookCompletion: snapshot.notebookCompletion,
      };
    },
  };
}
```

- [ ] **Step 3: Add a lab report mount to the end screen**

In `index.html`, inside `#screen-end .end-card`, add:

```html
<div id="lab-report-mount" class="lab-report-mount"></div>
```

In `src/ui/screens.ts`, add to `Screens`:

```ts
updateLabReport(report: LabReport | null): void;
```

Import and use `renderLabReport`:

```ts
import type { LabReport } from '../game/labReport';
import { renderLabReport } from './labReportScreen';
```

Implement:

```ts
updateLabReport(report) {
  const mount = get('lab-report-mount');
  mount.replaceChildren();
  if (report) mount.append(renderLabReport(report));
}
```

- [ ] **Step 4: Wire report generation in `main.ts`**

Create telemetry when a run starts:

```ts
let runTelemetry = createRunTelemetry({
  startedAtMs: performance.now(),
  runNumber: strainLibrary.getRunCount() + 1,
});
```

When run ends, assemble and pass report:

```ts
const report = assembleLabReport(runTelemetry.toLabReportInput({
  endedAtMs: performance.now(),
  outcome: state.outcome ?? 'lost',
  epochCount: state.fightIndex + 1,
  biomeName: currentBiomeName,
  newBiome: didBankNewBiome,
  finalBreedCounts: finalBreedCountsFor(arena),
  newStrainsBanked,
  totalStrainsDiscovered: strainLibrary.getAvailableStrains().length,
  totalStrainsAvailable: Object.keys(BREED_DEFS).length + EGG_ARCHETYPES.length,
  newNotebookEntries,
  notebookCompletion: notebookCompletionFor(discoveryProgression),
  longestStabilityStreak,
}));
screens.updateLabReport(report);
```

Keep helpers private in `main.ts` for this task. Extract later only if they grow.

- [ ] **Step 5: Run report tests and full baseline**

Run:

```bash
npm test -- tests/game/runTelemetry.test.ts tests/game/labReport.test.ts
npm test
npm run build
```

Expected: all pass.

---

## Task 3: Wire Strain Loadout Before Runs

**Files:**
- Modify: `index.html`
- Modify: `src/game/strainLibrary.ts`
- Modify: `src/ui/loadoutScreen.ts`
- Modify: `src/ui/screens.ts`
- Modify: `src/main.ts`
- Test: `tests/game/strainLibrary.test.ts`
- Test: `tests/ui/loadoutScreen.test.ts`

- [ ] **Step 1: Add strain library helpers**

In `src/game/strainLibrary.ts`, add:

```ts
getPlayableLoadout(): string[];
```

Implement:

```ts
getPlayableLoadout(): string[] {
  const valid = state.loadout.filter((strain) => state.availableStrains.includes(strain));
  return valid.length > 0 ? [...valid] : [DEFAULT_STRAIN];
}
```

- [ ] **Step 2: Improve loadout rendering**

In `src/ui/loadoutScreen.ts`, render display labels from a passed label function:

```ts
export interface LoadoutScreenOptions {
  labelForStrain: (strain: string) => string;
  colorForStrain: (strain: string) => string;
}
```

Use:

```ts
style="--strain-color: ${options.colorForStrain(strain)}"
```

The selected state stays local until confirm.

- [ ] **Step 3: Add loadout screen API**

In `index.html`, add:

```html
<div id="screen-loadout" class="screen">
  <div id="loadout-mount" class="screen-card"></div>
</div>
```

In `src/ui/screens.ts`, add `loadout` to `ScreenName` and:

```ts
setLoadoutScreen(el: HTMLElement): void;
onLoadoutBack(handler: () => void): void;
```

Implement `setLoadoutScreen` by replacing `#loadout-mount` children.

- [ ] **Step 4: Route title start through loadout when useful**

In `main.ts`, change title start:

```ts
screens.onTitleStart(() => {
  uiAudio.unlock();
  uiAudio.play('ui_select');
  if (strainLibrary.getAvailableStrains().length > 1) {
    showLoadoutPhase();
    return;
  }
  beginRunWithCurrentLoadout();
});
```

`beginRunWithCurrentLoadout()` starts the run and applies `strainLibrary.getPlayableLoadout()` to current lifeform unlocks for the run.

- [ ] **Step 5: Make selected loadout affect egg choices**

Add a current run loadout set in `main.ts`:

```ts
let currentRunLoadout = new Set<string>(['swarmlet']);
```

When `currentLifeformUnlocks()` returns lifeforms, filter egg-selectable lifeforms by `currentRunLoadout` during a run while still showing discovered-but-not-equipped entries as locked/available in the notebook.

- [ ] **Step 6: Run targeted tests and visual check**

Run:

```bash
npm test -- tests/game/strainLibrary.test.ts tests/ui/loadoutScreen.test.ts
npm run build
```

Manual browser checks:

```bash
npm run dev -- --port 5199 --strictPort
```

Check `390x844`, `375x667`, and `1280x720`.

---

## Task 4: Make Procedural Objective Selection Real

**Files:**
- Modify: `src/content/objectives.ts`
- Modify: `src/game/objectivePool.ts`
- Create: `src/game/objectiveScoring.ts`
- Modify: `src/game/arena.ts`
- Modify: `src/game/run.ts`
- Modify: `src/ui/screens.ts`
- Modify: `src/main.ts`
- Test: `tests/game/objectivePool.test.ts`
- Test: `tests/game/objectiveScoring.test.ts`
- Test: `tests/game/run.test.ts`
- Test: `tests/game/arena.test.ts`

- [ ] **Step 1: Replace procedural `as any` objective kinds with real types**

In `src/content/objectives.ts`, extend `ObjectiveKind`:

```ts
export type ObjectiveKind =
  | 'discover_breed'
  | 'preserve_grazers'
  | 'breed_archetype'
  | 'controlled_reaction'
  | 'balanced_ecology'
  | 'dominant_archetype'
  | 'cross_breed'
  | 'mega_culture'
  | 'reaction_chain'
  | 'balance_keeper'
  | 'crisis_survivor'
  | 'protector'
  | 'acid_sculptor'
  | 'colony_founder'
  | 'symbiosis'
  | 'extinction_reversal';
```

Remove every `as any` from `src/game/objectivePool.ts`.

- [ ] **Step 2: Add objective scoring tests**

Create `tests/game/objectiveScoring.test.ts` with tests for:

```ts
it('scores mega_culture when any lifeform volume reaches 800', ...)
it('scores reaction_chain after 3 reactions in the current epoch', ...)
it('requires 30 seconds of balance for balance_keeper', ...)
it('scores colony_founder with 5 cultures of one archetype', ...)
it('scores cross_breed when a hybrid breed is discovered', ...)
it('scores extinction_reversal only after dropping to 1 and recovering to 4', ...)
```

Use small plain metric objects so these tests do not need a full arena simulation.

- [ ] **Step 3: Create `objectiveScoring.ts`**

The module should export:

```ts
export interface ObjectiveRuntime {
  balanceTicks: number;
  symbiosisTicks: number;
  sawExtinctionLow: boolean;
  survivedCrisis: boolean;
  protectedFragile: boolean;
  acidReactionTriggered: boolean;
}

export function createObjectiveRuntime(): ObjectiveRuntime {
  return {
    balanceTicks: 0,
    symbiosisTicks: 0,
    sawExtinctionLow: false,
    survivedCrisis: false,
    protectedFragile: false,
    acidReactionTriggered: false,
  };
}
```

Move `evaluateObjective` and `dishMetrics` out of `arena.ts`, then extend them to handle all objective kinds. Keep the return type `ObjectiveProgress`.

- [ ] **Step 4: Track runtime signals in arena**

In `arena.ts`, create:

```ts
const objectiveRuntime = createObjectiveRuntime();
```

Update it during `tick()`:

- `balanceTicks`: increments while no breed exceeds objective dominance threshold and at least 3 breeds are alive.
- `symbiosisTicks`: increments while any two different breed ids are within 20 grid units.
- `sawExtinctionLow`: becomes true when living lifeforms are `<= 1`.
- `survivedCrisis`: becomes true when a crisis ends and 3+ cultures are alive.
- `protectedFragile`: becomes true when an outbreak has occurred and a fragile culture survives 20 seconds afterward.
- `acidReactionTriggered`: becomes true when an acid-created reaction increments `reactionCount`.

- [ ] **Step 5: Add objective pick phase**

In `src/game/run.ts`, extend:

```ts
export type RunPhase = 'title' | 'loadout' | 'arena' | 'upgrade_pick' | 'objective_pick' | 'run_end';
```

After upgrade pick for mid-game epochs, set `phase = 'objective_pick'` and provide `getObjectiveChoices(...)`. After the player chooses, set `chosenObjective` and then `phase = 'arena'`.

- [ ] **Step 6: Add objective pick UI**

In `index.html`, add:

```html
<div id="screen-objective" class="screen">
  <div class="screen-card">
    <h2 class="screen-title">Choose the next trial</h2>
    <div id="objective-choices" class="pick-choices"></div>
  </div>
</div>
```

In `src/ui/screens.ts`, add:

```ts
setObjectiveChoices(choices: ObjectiveDef[], onPick: (objective: ObjectiveDef) => void): void;
```

Render objective name, description, target, and hint.

- [ ] **Step 7: Wire `main.ts` phase routing**

In `showPhase()`, add:

```ts
} else if (state.phase === 'objective_pick') {
  const choices = run.getObjectiveChoices(
    new Set(discoveryProgression.discoveredBreedIds),
    currentToolUnlocks(),
  );
  screens.setObjectiveChoices(choices, (objective) => {
    run.setChosenObjective(objective);
    startNewFight();
  });
  screens.show('objective');
}
```

- [ ] **Step 8: Run objective tests and one mid-game browser check**

Run:

```bash
npm test -- tests/game/objectivePool.test.ts tests/game/objectiveScoring.test.ts tests/game/run.test.ts tests/game/arena.test.ts
npm run build
```

Manual: use debug reveal discoveries, complete/skip to epoch 4, verify objective choice screen appears before arena.

---

## Task 5: Turn Homeostasis Into A Visible Equilibrium State

**Files:**
- Modify: `src/game/homeostasis.ts`
- Modify: `src/game/arena.ts`
- Modify: `src/game/run.ts`
- Modify: `src/ui/screens.ts`
- Modify: `src/styles.css`
- Modify: `src/main.ts`
- Test: `tests/game/homeostasis.test.ts`
- Test: `tests/game/arena.test.ts`

- [ ] **Step 1: Change homeostasis snapshots to volume shares**

In `src/game/homeostasis.ts`, change:

```ts
export interface PopulationSnapshot {
  breedVolumes: Map<string, number>;
  totalVolume: number;
}
```

Track a rolling window of shares, not only the previous tick:

```ts
const WINDOW_TICKS = 60 * 20;
const MAX_SHARE_SWING = 0.10;
let samples: Array<Map<string, number>> = [];
```

Achievement requires:

- 3+ breeds alive.
- all breeds in the window remain present.
- max share swing per breed over the window is <= 0.10.

- [ ] **Step 2: Update arena snapshot feeding**

In `arena.ts`, replace culture counts with summed volumes:

```ts
const breedVolumes = new Map<string, number>();
let totalVolume = 0;
for (const [cellId, cell] of state.cells) {
  if (cell.vol <= 0) continue;
  const spawn = archetypes.get(cellId);
  if (!spawn) continue;
  const breed = spawn.breedId ?? spawn.archetype;
  breedVolumes.set(breed, (breedVolumes.get(breed) ?? 0) + cell.vol);
  totalVolume += cell.vol;
}
homeostasisTracker.tick({ breedVolumes, totalVolume });
```

- [ ] **Step 3: Latch equilibrium without ending immediately**

In `Arena`, add:

```ts
getEquilibrium(): { achieved: boolean; progress: number; biomeName: string | null };
```

When achieved, suppress future hazards in `tick()`:

```ts
const pressurePaused = homeostasisTracker.isAchieved();
if (!pressurePaused && tickNo >= HAZARD_GRACE_TICKS && tickNo % effectiveOutbreakInterval === 0) {
  ...
}
```

- [ ] **Step 4: Change main flow**

Remove immediate `run.achieveHomeostasis()` from the loop. Instead:

```ts
const equilibrium = arena.getEquilibrium();
screens.setEquilibrium(equilibrium);
if (equilibrium.achieved && !didAnnounceEquilibrium) {
  didAnnounceEquilibrium = true;
  uiAudio.play('epoch_win');
  fx.showToast('discovery', 'Stable Ecosystem', equilibrium.biomeName ?? 'Equilibrium');
  screens.addTicker('Equilibrium reached: pressure paused. End when ready, or keep observing.', 'discovery');
}
```

End button after equilibrium should call `run.achieveHomeostasis()` and show the lab report.

- [ ] **Step 5: Add HUD state**

In `src/ui/screens.ts`, add:

```ts
setEquilibrium(info: { achieved: boolean; progress: number; biomeName: string | null }): void;
```

Display:

- before achieved: `Equilibrium 42%`
- achieved: `Equilibrium: Glass Reef`

Style `.hud-equilibrium` in `styles.css` with a calm bio glow.

- [ ] **Step 6: Run tests**

Run:

```bash
npm test -- tests/game/homeostasis.test.ts tests/game/arena.test.ts
npm run build
```

---

## Task 6: Reduce `main.ts` Responsibility Without A Big Rewrite

**Files:**
- Create: `src/game/runFlow.ts`
- Create: `src/game/runSnapshot.ts`
- Modify: `src/main.ts`
- Test: existing full suite

- [ ] **Step 1: Extract pure snapshot helpers**

Create `src/game/runSnapshot.ts`:

```ts
import type { Arena } from './arena';

export function finalBreedCountsFor(arena: Arena | null): Map<string, number> {
  const counts = new Map<string, number>();
  if (!arena) return counts;
  for (const [cellId, cell] of arena.state.cells) {
    if (cell.vol <= 0) continue;
    const spawn = arena.archetypes.get(cellId);
    if (!spawn) continue;
    const id = spawn.breedId ?? spawn.archetype;
    counts.set(id, (counts.get(id) ?? 0) + cell.vol);
  }
  return counts;
}
```

- [ ] **Step 2: Extract run-end report assembly**

Create `src/game/runFlow.ts` with a pure `createRunEndReportInput(...)` that receives plain arguments and returns `LabReportInput`.

Keep DOM, audio, and screen calls in `main.ts`.

- [ ] **Step 3: Replace duplicated inline loops in `main.ts`**

Use `finalBreedCountsFor(arena)` for lab report and biome classification.

- [ ] **Step 4: Run full baseline**

Run:

```bash
npm test
npm run build
```

Expected: all pass.

---

## Task 7: Repair Simulation Boundaries And Monte Carlo Allocation

**Files:**
- Modify: `src/sim/types.ts`
- Modify: `src/sim/monte-carlo.ts`
- Modify: `src/sim/grid.ts`
- Modify: `src/game/arena.ts`
- Test: `tests/sim/monte-carlo.test.ts`
- Test: `tests/sim/grid.test.ts`
- Test: `tests/sim/breedProfiles.test.ts`

- [ ] **Step 1: Make cells hold generic energy profiles**

In `src/sim/types.ts`, replace:

```ts
breedProfileId?: import('./breedProfiles').BreedProfileId;
```

with:

```ts
energyProfile?: {
  isingMul: number;
  volMul: number;
  movMul: number;
  engulfMul: number;
};
```

In `src/sim/monte-carlo.ts`, use:

```ts
const profile = sourceCell?.energyProfile ?? DEFAULT_PROFILE;
```

Keep `DEFAULT_PROFILE` import from `breedProfiles.ts` or move the default into a small sim-neutral `energyProfile.ts`.

- [ ] **Step 2: Resolve game ids in arena only**

In `arena.spawnEnemy`, replace:

```ts
cell.breedProfileId = profileId;
```

with:

```ts
cell.energyProfile = getBreedProfile(profileId);
```

Now `src/sim/types.ts` no longer imports a game-specific id union.

- [ ] **Step 3: Add a boundary cache**

In `src/sim/types.ts`, extend `Grid`:

```ts
boundaryCache: number[];
boundaryCacheDirty: boolean;
```

In `src/sim/grid.ts`, initialize these fields and set `boundaryCacheDirty = true` wherever `boundary` is mutated.

In `src/sim/monte-carlo.ts`, replace:

```ts
const boundaryArr = Array.from(grid.boundary);
```

with:

```ts
if (grid.boundaryCacheDirty) {
  grid.boundaryCache = Array.from(grid.boundary);
  grid.boundaryCacheDirty = false;
}
const boundaryArr = grid.boundaryCache;
```

- [ ] **Step 4: Run sim tests**

Run:

```bash
npm test -- tests/sim/grid.test.ts tests/sim/monte-carlo.test.ts tests/sim/breedProfiles.test.ts
npm run build
```

Expected: all pass.

---

## Task 8: Mobile And Visual Surfacing Polish

**Files:**
- Modify: `src/styles.css`
- Modify: `src/ui/screens.ts`
- Test: `tests/ui/mobileLayoutCss.test.ts`
- Browser verification required.

- [x] **Step 1: Add CSS tests for small-mobile coach placement**

Extend `tests/ui/mobileLayoutCss.test.ts` to assert the small-height media query moves the coach clear of the top of the dish:

```ts
expect(styles).toContain('@media (max-width: 899px) and (max-height: 700px)');
expect(styles).toContain('.coach');
expect(styles).toContain('top: calc(74px + env(safe-area-inset-top))');
```

- [x] **Step 2: Tune coach and banner on short screens**

In `src/styles.css`, under `@media (max-width: 899px) and (max-height: 700px)`, add:

```css
.coach {
  top: calc(74px + env(safe-area-inset-top));
  padding: 9px 11px;
}

.coach-body {
  margin: 4px 0 0;
}

.fx-banner-title {
  font-size: clamp(22px, 8vw, 34px);
}
```

- [x] **Step 3: Browser verification**

Run:

```bash
npm run dev -- --port 5199 --strictPort
```

Check:

- `390x844`: title, first arena, loadout if unlocked, objective pick, lab report.
- `375x667`: coach does not cover the egg placement area after banner fades.
- `1280x720`: desktop side panels do not overlap dish, lab report fits.

Stop the server after verification.

---

## Task 9: Update Docs And Verification Baseline

**Files:**
- Modify: `docs/current-state.md`
- Modify: `README.md`
- Modify: `AGENTS.md` only if verification commands or product shape changed.

- [x] **Step 1: Update current state**

In `docs/current-state.md`, update:

```md
npm test      # 61 files, 554 tests passing
npm run build # clean
```

Remove the note about 4 pre-existing CSS failures.

- [x] **Step 2: Update gameplay loop**

Document the actual player flow:

1. Title.
2. Optional strain loadout.
3. Guided onboarding.
4. Fixed early epochs.
5. Mid-game objective choice.
6. Upgrade pick.
7. Equilibrium state.
8. Lab report.

- [x] **Step 3: Final verification**

Run:

```bash
git status --short
npm test
npm run build
npm run dev -- --port 5199 --strictPort
```

Browser check:

- title is `Cellular Death Match`.
- mobile portrait `390x844`.
- small mobile portrait `375x667`.
- desktop `1280x720`.

Stop the dev server.

---

## Definition Of Done

- The title and HUD no longer describe a fixed five-epoch clocked game.
- Players can see and choose their strain loadout once they have more than one strain.
- Players choose procedural objectives in mid-game and every offered objective has real scoring.
- Runs end in a lab report that explains discoveries, hybrids, banked strains, populations, and notebook progress.
- Homeostasis becomes a visible equilibrium state; pressure pauses and the player can end when ready.
- `src/main.ts` is smaller and no longer owns report construction details.
- `src/sim/types.ts` no longer imports game-specific breed id types.
- Monte Carlo boundary sampling avoids per-step `Array.from` allocation when the boundary has not changed.
- Mobile title/onboarding/lab report flows are verified at `390x844` and `375x667`.
- `npm test` and `npm run build` pass.

## Suggested Commit Sequence

1. `fix: align open-ended run copy and title chrome`
2. `feat: surface lab report at run end`
3. `feat: add strain loadout flow`
4. `feat: wire procedural objective selection`
5. `feat: make equilibrium a playable state`
6. `refactor: extract run telemetry and snapshots`
7. `perf: cache simulation boundary sampling`
8. `fix: polish mobile surfacing layouts`
9. `docs: update current state after surfacing repair`

## Execution Recommendation

Use Subagent-Driven execution for Tasks 1-5 because they touch independent surfaces and have clear review points. Use Inline Execution for Tasks 6-9 after the product flow is stable, because those tasks benefit from continuous context and final browser verification.
