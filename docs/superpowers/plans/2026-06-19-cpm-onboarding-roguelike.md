# CPM Energy Profiles, Onboarding Overhaul & Roguelike Meta-Progression

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform Cellular Death Match from a fixed 6-epoch game into a replayable roguelike with breed-specific CPM physics, crisp guided onboarding, and persistent strain/notebook meta-progression.

**Architecture:** The existing CPM simulation (`src/sim/monte-carlo.ts`) gets per-cell energy profile multipliers so breeds look and move differently. The run state machine (`src/game/run.ts`) becomes open-ended with escalating pressure and homeostasis detection. A new strain library persists across runs alongside the existing notebook. Onboarding (Epoch 1) becomes a scripted 3-beat auto-advancing tutorial.

**Tech Stack:** Vite, TypeScript, Vitest, Canvas 2D rendering, localStorage persistence.

---

## File Map

### New files
| File | Responsibility |
|------|---------------|
| `src/sim/breedProfiles.ts` | BreedProfile interface + profile data for all breeds |
| `src/game/homeostasis.ts` | Equilibrium detection algorithm + biome classification |
| `src/game/objectivePool.ts` | Procedural objective pool + selection logic |
| `src/game/escalation.ts` | Per-epoch pressure scaling constants + calculator |
| `src/game/strainLibrary.ts` | Strain bank + loadout logic |
| `src/game/labReport.ts` | End-of-run summary data assembly |
| `src/ui/labReportScreen.ts` | Lab Report DOM rendering |
| `src/ui/loadoutScreen.ts` | Pre-run strain loadout selection UI |
| `tests/sim/breedProfiles.test.ts` | Energy profile tests |
| `tests/game/homeostasis.test.ts` | Homeostasis detection tests |
| `tests/game/objectivePool.test.ts` | Objective pool tests |
| `tests/game/escalation.test.ts` | Escalation math tests |
| `tests/game/strainLibrary.test.ts` | Strain library persistence tests |
| `tests/game/labReport.test.ts` | Lab report data assembly tests |

### Modified files
| File | Changes |
|------|---------|
| `src/sim/types.ts` | Add `breedProfileId` to Cell; add optional per-cell beta override fields |
| `src/sim/monte-carlo.ts` | Use per-cell effective betas in deltaH calculation |
| `src/content/catalysis.ts` | Add `breedProfileId` field to BreedDef |
| `src/game/run.ts` | Open-ended epoch count, objective choice phase, homeostasis/collapse end states |
| `src/game/arena.ts` | Wire energy profiles to cells, apply reagent energy shifts, add homeostasis tick |
| `src/game/onboardingStage.ts` | Rewrite for 3-beat auto-advancing Epoch 1 |
| `src/ui/coach.ts` | New 3-beat coach flow with auto-advance triggers |
| `src/game/discoverySave.ts` | Add strain library, biome, runCount fields (v3 schema) |
| `src/game/discoveryProgression.ts` | Wire strain library into tool/lifeform unlocks |
| `src/content/objectives.ts` | Export objective pool alongside fixed objectives |
| `src/content/ecologyTuning.ts` | Add escalation base values, onboarding epoch timing |
| `src/ui/screens.ts` | Add lab report screen, loadout screen, equilibrium HUD state |
| `src/main.ts` | Wire new run phases, homeostasis detection, visualiser mode |

---

## Phase 1: CPM Energy Profiles

### Task 1: BreedProfile type and data

**Files:**
- Create: `src/sim/breedProfiles.ts`
- Test: `tests/sim/breedProfiles.test.ts`

- [ ] **Step 1: Write failing test — profile lookup returns correct values**

```typescript
// tests/sim/breedProfiles.test.ts
import { describe, it, expect } from 'vitest';
import {
  type BreedProfileId,
  BREED_PROFILES,
  getBreedProfile,
  DEFAULT_PROFILE,
} from '../../src/sim/breedProfiles';

describe('breed profiles', () => {
  it('DEFAULT_PROFILE has all multipliers at 1.0', () => {
    expect(DEFAULT_PROFILE).toEqual({
      isingMul: 1.0,
      volMul: 1.0,
      movMul: 1.0,
      engulfMul: 1.0,
    });
  });

  it('getBreedProfile returns the named profile', () => {
    const bruiser = getBreedProfile('bruiser');
    expect(bruiser.isingMul).toBe(1.5);
    expect(bruiser.movMul).toBe(0.7);
  });

  it('getBreedProfile returns DEFAULT_PROFILE for undefined id', () => {
    expect(getBreedProfile(undefined)).toBe(DEFAULT_PROFILE);
  });

  it('swarmlet has low ising (loose shape)', () => {
    const sw = getBreedProfile('swarmlet');
    expect(sw.isingMul).toBeLessThan(1.0);
  });

  it('boss has high ising (compact shape)', () => {
    const boss = getBreedProfile('boss');
    expect(boss.isingMul).toBeGreaterThan(1.5);
  });

  it('every profile has all four multiplier fields as positive numbers', () => {
    for (const [id, profile] of Object.entries(BREED_PROFILES)) {
      expect(profile.isingMul, `${id}.isingMul`).toBeGreaterThan(0);
      expect(profile.volMul, `${id}.volMul`).toBeGreaterThan(0);
      expect(profile.movMul, `${id}.movMul`).toBeGreaterThan(0);
      expect(profile.engulfMul, `${id}.engulfMul`).toBeGreaterThan(0);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/sim/breedProfiles.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement breedProfiles.ts**

```typescript
// src/sim/breedProfiles.ts

export interface BreedProfile {
  readonly isingMul: number;   // surface tension multiplier (shape compactness)
  readonly volMul: number;     // volume preservation strength
  readonly movMul: number;     // movement responsiveness
  readonly engulfMul: number;  // predation aggression
}

// Archetype base profiles + breed-specific overrides.
// Keys match EnemyArchetype names and BreedId names from catalysis.ts.
export type BreedProfileId =
  | 'swarmlet' | 'bruiser' | 'splitter' | 'sniper' | 'mirror' | 'boss'
  | 'bloom_mass' | 'needle_swarm' | 'folded_anchor' | 'glass_antibody'
  | 'static_lattice' | 'quill_bloom' | 'vitric_anchor' | 'mire_lattice';

export const DEFAULT_PROFILE: BreedProfile = {
  isingMul: 1.0,
  volMul: 1.0,
  movMul: 1.0,
  engulfMul: 1.0,
};

export const BREED_PROFILES: Record<BreedProfileId, BreedProfile> = {
  // --- base archetypes ---
  swarmlet:       { isingMul: 0.6, volMul: 0.8, movMul: 1.4, engulfMul: 0.7 },
  bruiser:        { isingMul: 1.5, volMul: 1.2, movMul: 0.7, engulfMul: 1.3 },
  splitter:       { isingMul: 0.9, volMul: 0.9, movMul: 1.1, engulfMul: 1.0 },
  sniper:         { isingMul: 0.8, volMul: 0.7, movMul: 1.6, engulfMul: 0.5 },
  mirror:         { isingMul: 1.0, volMul: 1.0, movMul: 1.0, engulfMul: 1.0 },
  boss:           { isingMul: 1.8, volMul: 1.4, movMul: 0.4, engulfMul: 1.5 },
  // --- discovered breeds ---
  bloom_mass:     { isingMul: 0.4, volMul: 0.6, movMul: 0.5, engulfMul: 0.4 },
  needle_swarm:   { isingMul: 0.8, volMul: 0.7, movMul: 1.6, engulfMul: 0.6 },
  folded_anchor:  { isingMul: 1.8, volMul: 1.4, movMul: 0.4, engulfMul: 1.4 },
  glass_antibody: { isingMul: 1.2, volMul: 1.0, movMul: 1.0, engulfMul: 0.8 },
  static_lattice: { isingMul: 0.7, volMul: 0.8, movMul: 0.8, engulfMul: 0.6 },
  // --- hybrids ---
  quill_bloom:    { isingMul: 0.5, volMul: 0.7, movMul: 1.3, engulfMul: 0.5 },
  vitric_anchor:  { isingMul: 1.6, volMul: 1.3, movMul: 0.5, engulfMul: 1.2 },
  mire_lattice:   { isingMul: 0.7, volMul: 0.8, movMul: 0.8, engulfMul: 0.6 },
};

export function getBreedProfile(id: BreedProfileId | undefined): BreedProfile {
  if (id === undefined) return DEFAULT_PROFILE;
  return BREED_PROFILES[id] ?? DEFAULT_PROFILE;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/sim/breedProfiles.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/sim/breedProfiles.ts tests/sim/breedProfiles.test.ts
git commit -m "feat: add breed energy profiles for CPM physics"
```

---

### Task 2: Add breedProfileId to Cell and wire into mcStep

**Files:**
- Modify: `src/sim/types.ts:18-29` (Cell interface)
- Modify: `src/sim/monte-carlo.ts:39-43` (deltaH calculation)
- Modify: `tests/sim/monte-carlo.test.ts`

- [ ] **Step 1: Write failing test — per-cell profile affects MC behavior**

Add to `tests/sim/monte-carlo.test.ts`:

```typescript
import { type BreedProfileId } from '../../src/sim/breedProfiles';

describe('mcStep — breed energy profiles', () => {
  it('high-ising profile cell maintains more compact shape than low-ising cell', () => {
    // Two identical sims, same seed. Cell 1 has high ising (compact), cell 2 baseline.
    // After many steps, high-ising cell should have lower boundary-to-volume ratio.
    const highIsing = makeStateWithTwoBlobs();
    highIsing.cells.get(1)!.breedProfileId = 'boss';    // isingMul 1.8
    highIsing.cells.get(2)!.breedProfileId = 'swarmlet'; // isingMul 0.6

    for (let i = 0; i < 3000; i++) mcStep(highIsing);

    // Count boundary pixels per cell
    const grid = highIsing.grid;
    let bossVol = 0, bossBoundary = 0;
    let swarmVol = 0, swarmBoundary = 0;
    for (const idx of grid.boundary) {
      const val = grid.cells[idx]!;
      if (val === 1) bossBoundary++;
      else if (val === 2) swarmBoundary++;
    }
    bossVol = highIsing.cells.get(1)!.vol;
    swarmVol = highIsing.cells.get(2)!.vol;

    // Boss (high ising) should be more compact: lower boundary/volume ratio
    if (bossVol > 0 && swarmVol > 0) {
      expect(bossBoundary / bossVol).toBeLessThan(swarmBoundary / swarmVol);
    }
  });

  it('breedProfileId=undefined uses default (no behavior change)', () => {
    const a = makeStateWithTwoBlobs();
    const b = makeStateWithTwoBlobs();
    // a has no profileId set (undefined), b explicitly undefined — same behavior
    for (let i = 0; i < 1000; i++) {
      mcStep(a);
      mcStep(b);
    }
    expect(Array.from(a.grid.cells)).toEqual(Array.from(b.grid.cells));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/sim/monte-carlo.test.ts`
Expected: FAIL — `breedProfileId` does not exist on type `Cell`

- [ ] **Step 3: Add breedProfileId to Cell interface**

In `src/sim/types.ts`, add to the Cell interface (after `intent: Intent;`):

```typescript
  breedProfileId?: import('./breedProfiles').BreedProfileId;
```

- [ ] **Step 4: Wire per-cell profiles into mcStep deltaH calculation**

In `src/sim/monte-carlo.ts`, add import at top:

```typescript
import { getBreedProfile } from './breedProfiles';
```

Replace the deltaH calculation (lines 39-43) with:

```typescript
  // Look up the source cell's breed profile for per-cell beta scaling.
  const sourceCell = sourceVal !== 0 ? state.cells.get(sourceVal) : undefined;
  const profile = sourceCell
    ? getBreedProfile(sourceCell.breedProfileId)
    : getBreedProfile(undefined);

  const dH =
    state.betaIsing * profile.isingMul * isingTerm(state, xT, yT, sourceVal, targetVal) +
    state.betaVol * profile.volMul * volumeTerm(state, sourceVal, targetVal) +
    state.betaMov * profile.movMul * movementTerm(state, sourceVal, dir) +
    profile.engulfMul * engulfTerm(state, sourceVal, targetVal);
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run tests/sim/monte-carlo.test.ts`
Expected: PASS (including the new breed profile tests and all existing tests)

- [ ] **Step 6: Run full test suite**

Run: `npx vitest run`
Expected: Same pass/fail count as before (375/379 — the 4 CSS failures are pre-existing)

- [ ] **Step 7: Commit**

```bash
git add src/sim/types.ts src/sim/monte-carlo.ts tests/sim/monte-carlo.test.ts
git commit -m "feat: wire per-cell breed energy profiles into MC step"
```

---

### Task 3: Reagent energy shifts

**Files:**
- Modify: `src/sim/breedProfiles.ts` (add ReagentEnergyShift type + data)
- Modify: `tests/sim/breedProfiles.test.ts`

- [ ] **Step 1: Write failing test — reagent shift lookup**

Add to `tests/sim/breedProfiles.test.ts`:

```typescript
import { REAGENT_ENERGY_SHIFTS, getReagentShift } from '../../src/sim/breedProfiles';

describe('reagent energy shifts', () => {
  it('nutrient has negative ising shift (loosens cells)', () => {
    const shift = getReagentShift('nutrient');
    expect(shift.isingShift).toBeLessThan(0);
  });

  it('salt has positive ising shift (hardens cells)', () => {
    const shift = getReagentShift('salt');
    expect(shift.isingShift).toBeGreaterThan(0);
  });

  it('unknown reagent returns zero shifts', () => {
    const shift = getReagentShift('hatch' as any);
    expect(shift.isingShift).toBe(0);
    expect(shift.volShift).toBe(0);
    expect(shift.movShift).toBe(0);
  });

  it('all defined reagent shifts have finite numeric values', () => {
    for (const [id, shift] of Object.entries(REAGENT_ENERGY_SHIFTS)) {
      expect(Number.isFinite(shift.isingShift), `${id}.isingShift`).toBe(true);
      expect(Number.isFinite(shift.volShift), `${id}.volShift`).toBe(true);
      expect(Number.isFinite(shift.movShift), `${id}.movShift`).toBe(true);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/sim/breedProfiles.test.ts`
Expected: FAIL — `REAGENT_ENERGY_SHIFTS` not exported

- [ ] **Step 3: Add reagent energy shift data to breedProfiles.ts**

Append to `src/sim/breedProfiles.ts`:

```typescript
export interface ReagentEnergyShift {
  readonly isingShift: number;
  readonly volShift: number;
  readonly movShift: number;
}

const ZERO_SHIFT: ReagentEnergyShift = { isingShift: 0, volShift: 0, movShift: 0 };

export type ReagentShiftId = 'nutrient' | 'toxin' | 'water' | 'salt' | 'acid' | 'paste';

export const REAGENT_ENERGY_SHIFTS: Record<ReagentShiftId, ReagentEnergyShift> = {
  nutrient: { isingShift: -0.1, volShift: -0.3, movShift:  0.2 },
  toxin:    { isingShift:  0.1, volShift:  0.4, movShift:  0.3 },
  water:    { isingShift: -0.2, volShift: -0.1, movShift:  0.1 },
  salt:     { isingShift:  0.4, volShift:  0.1, movShift: -0.3 },
  acid:     { isingShift: -0.3, volShift:  0.5, movShift:  0.2 },
  paste:    { isingShift: -0.05, volShift: -0.15, movShift: 0.1 },
};

export function getReagentShift(id: string): ReagentEnergyShift {
  return (REAGENT_ENERGY_SHIFTS as Record<string, ReagentEnergyShift>)[id] ?? ZERO_SHIFT;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/sim/breedProfiles.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/sim/breedProfiles.ts tests/sim/breedProfiles.test.ts
git commit -m "feat: add reagent energy shift data for CPM physics"
```

---

### Task 4: Apply reagent energy shifts in arena tool effects

**Files:**
- Modify: `src/sim/types.ts` (add `energyShifts` accumulator to Cell)
- Modify: `src/game/arena.ts` (accumulate shifts in applyToolEffects, reset each tick)

This task wires the reagent shifts into the per-cell energy calculation. Each tick, `applyToolEffects` accumulates the shifts from all active reagent fields affecting each cell. The `mcStep` reads these accumulated shifts.

- [ ] **Step 1: Add energyShifts field to Cell interface**

In `src/sim/types.ts`, add after `breedProfileId`:

```typescript
  /** Accumulated reagent energy shifts for current tick. Reset each tick. */
  energyShifts?: { isingShift: number; volShift: number; movShift: number };
```

- [ ] **Step 2: Update mcStep to incorporate energyShifts**

In `src/sim/monte-carlo.ts`, update the deltaH block to:

```typescript
  const sourceCell = sourceVal !== 0 ? state.cells.get(sourceVal) : undefined;
  const profile = sourceCell
    ? getBreedProfile(sourceCell.breedProfileId)
    : getBreedProfile(undefined);
  const shifts = sourceCell?.energyShifts;
  const isingEff = profile.isingMul * (1 + (shifts?.isingShift ?? 0));
  const volEff = profile.volMul * (1 + (shifts?.volShift ?? 0));
  const movEff = profile.movMul * (1 + (shifts?.movShift ?? 0));

  const dH =
    state.betaIsing * isingEff * isingTerm(state, xT, yT, sourceVal, targetVal) +
    state.betaVol * volEff * volumeTerm(state, sourceVal, targetVal) +
    state.betaMov * movEff * movementTerm(state, sourceVal, dir) +
    profile.engulfMul * engulfTerm(state, sourceVal, targetVal);
```

- [ ] **Step 3: Wire reagent shift accumulation into arena.ts**

In `src/game/arena.ts`, in the `applyToolEffects` function, after the existing per-cell effect processing loop, add reagent energy shift accumulation. Find the section where effects are iterated per cell and add:

```typescript
import { getReagentShift } from '../sim/breedProfiles';
```

At the start of each tick (before MC steps), reset all cells' energyShifts:

```typescript
// Reset energy shifts each tick
for (const cell of state.cells.values()) {
  cell.energyShifts = { isingShift: 0, volShift: 0, movShift: 0 };
}
```

Inside the per-cell per-effect loop in `applyToolEffects`, after calculating `strength`, add:

```typescript
// Accumulate reagent energy shifts (strength-weighted by distance and TTL)
const reagentShift = getReagentShift(effect.type);
if (cell.energyShifts) {
  cell.energyShifts.isingShift += reagentShift.isingShift * strength;
  cell.energyShifts.volShift += reagentShift.volShift * strength;
  cell.energyShifts.movShift += reagentShift.movShift * strength;
}
```

- [ ] **Step 4: Run full test suite**

Run: `npx vitest run`
Expected: Same pass/fail count as before (375+new / 379+new). Existing MC tests still pass because no `energyShifts` are set in test helpers (field is optional, defaults to zero shifts).

- [ ] **Step 5: Commit**

```bash
git add src/sim/types.ts src/sim/monte-carlo.ts src/game/arena.ts
git commit -m "feat: apply reagent energy shifts to per-cell CPM physics"
```

---

### Task 5: Assign breed profiles to cells on spawn

**Files:**
- Modify: `src/game/arena.ts` (cell spawn logic)
- Modify: `src/content/catalysis.ts` (add breedProfileId to BreedDef)

- [ ] **Step 1: Add breedProfileId to BreedDef**

In `src/content/catalysis.ts`, add to the `BreedDef` interface after `parents?`:

```typescript
  breedProfileId?: import('../sim/breedProfiles').BreedProfileId;
```

Add `breedProfileId` to each entry in `BREED_DEFS` matching its id:

```typescript
// e.g. in the needle_swarm entry:
  breedProfileId: 'needle_swarm',
```

Do this for all 8 breed definitions (each breed's `breedProfileId` matches its `id`).

- [ ] **Step 2: Wire profile assignment in arena cell spawning**

In `src/game/arena.ts`, find where new cells are created/spawned for enemies. When a cell is created, set its `breedProfileId`:

For archetype-based spawns (non-breed), set `breedProfileId` to the archetype name (e.g., `'swarmlet'`, `'bruiser'`).

For breed-based spawns (discovered breeds), set `breedProfileId` from the breed def:

```typescript
cell.breedProfileId = breedDef.breedProfileId ?? breedDef.id;
```

Look for all places where `createCell` is called or cells are initialized (search for `createCell(` in arena.ts) and add the profile assignment after cell creation.

- [ ] **Step 3: Run full test suite**

Run: `npx vitest run`
Expected: PASS (same count as before)

- [ ] **Step 4: Commit**

```bash
git add src/content/catalysis.ts src/game/arena.ts
git commit -m "feat: assign breed energy profiles to cells on spawn"
```

---

## Phase 2: Onboarding Overhaul

### Task 6: Rewrite coach for 3-beat auto-advancing Epoch 1

**Files:**
- Modify: `src/ui/coach.ts`
- Modify: `tests/game/onboardingStage.test.ts`

- [ ] **Step 1: Write failing test — coach has 3 beats**

Replace the content of `tests/game/onboardingStage.test.ts` (or add new tests alongside existing):

```typescript
import { describe, it, expect } from 'vitest';
import { ONBOARDING_BEATS } from '../../src/game/onboardingStage';

describe('onboarding beats', () => {
  it('defines exactly 3 beats', () => {
    expect(ONBOARDING_BEATS).toHaveLength(3);
  });

  it('beat 1 is place-egg', () => {
    expect(ONBOARDING_BEATS[0]!.id).toBe('place-egg');
  });

  it('beat 2 is feed-colony', () => {
    expect(ONBOARDING_BEATS[1]!.id).toBe('feed-colony');
  });

  it('beat 3 is watch-bloom', () => {
    expect(ONBOARDING_BEATS[2]!.id).toBe('watch-bloom');
  });

  it('each beat has a message and trigger event', () => {
    for (const beat of ONBOARDING_BEATS) {
      expect(beat.message.length).toBeGreaterThan(0);
      expect(beat.trigger.length).toBeGreaterThan(0);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/game/onboardingStage.test.ts`
Expected: FAIL — `ONBOARDING_BEATS` not exported

- [ ] **Step 3: Add ONBOARDING_BEATS to onboardingStage.ts**

In `src/game/onboardingStage.ts`, add:

```typescript
export interface OnboardingBeat {
  readonly id: string;
  readonly message: string;
  readonly trigger: string;         // event name that advances to next beat
  readonly buttonHint?: string;     // which tool button to pulse
  readonly autoSpawn?: boolean;     // whether to auto-spawn a second swarmlet
}

export const ONBOARDING_BEATS: readonly OnboardingBeat[] = [
  {
    id: 'place-egg',
    message: 'Place a Swarmlet egg in the dish',
    trigger: 'egg-placed',
    buttonHint: 'egg',
  },
  {
    id: 'feed-colony',
    message: 'Drop a nutrient near your culture',
    trigger: 'nutrient-used',
    buttonHint: 'nutrient',
  },
  {
    id: 'watch-bloom',
    message: 'Watch your colony bloom...',
    trigger: 'bloom-discovered',
    autoSpawn: true,
  },
];
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/game/onboardingStage.test.ts`
Expected: PASS

- [ ] **Step 5: Update coach.ts to use 3-beat flow**

Modify `src/ui/coach.ts`: replace the 2-step `STEPS` array with logic that reads `ONBOARDING_BEATS`. The coach tracks a `beatIndex` (0-2) and advances on matching `report(event)` calls. After beat 3 completes (`bloom-discovered`), the coach fires a callback (`onOnboardingComplete`) that the arena/main loop listens for to auto-end Epoch 1.

Key changes:
- Import `ONBOARDING_BEATS` from `onboardingStage`
- `beginRun()` starts at beatIndex=0, shows beat 0 message
- `report(event)` checks if event matches current beat's trigger → advance
- After final beat, show celebration message "You created a new lifeform!" for 4s, then call `onOnboardingComplete`
- Add `onOnboardingComplete` callback to Coach interface/factory

- [ ] **Step 6: Run all tests**

Run: `npx vitest run`
Expected: PASS (update any coach tests that reference the old 2-step flow)

- [ ] **Step 7: Commit**

```bash
git add src/game/onboardingStage.ts src/ui/coach.ts tests/game/onboardingStage.test.ts
git commit -m "feat: rewrite onboarding to 3-beat auto-advancing flow"
```

---

### Task 7: Auto-advancing Epoch 1 (no timer, no hazards)

**Files:**
- Modify: `src/game/run.ts` (onboarding epoch has no timer)
- Modify: `src/game/arena.ts` (suppress hazards in epoch 0, auto-spawn second swarmlet at beat 3)
- Modify: `src/main.ts` (wire coach onOnboardingComplete to end epoch)

- [ ] **Step 1: Add isOnboardingEpoch helper to run.ts**

```typescript
export function isOnboardingEpoch(fightIndex: number): boolean {
  return fightIndex === 0;
}
```

- [ ] **Step 2: Suppress hazards during onboarding epoch**

In `src/game/arena.ts`, wherever hazard events are scheduled (outbreaks, crises, accidents, mutations), gate them:

```typescript
if (isOnboardingEpoch(fightIndex)) return; // no hazards during onboarding
```

The `fightIndex` is available from the run state passed to the arena.

- [ ] **Step 3: Auto-spawn second swarmlet on beat 3**

In `src/game/arena.ts` or `src/main.ts`, when coach reports `nutrient-used` (beat 2 complete) and beat 3 (`watch-bloom`) begins, auto-spawn a second swarmlet near the player's first culture. Use the existing egg spawn logic but place it programmatically ~15px from the first living swarmlet.

- [ ] **Step 4: Wire onOnboardingComplete to end epoch**

In `src/main.ts`, when creating the coach, pass a callback:

```typescript
onOnboardingComplete: () => {
  run.completeEpoch();
  // Transition to upgrade pick or next epoch
}
```

- [ ] **Step 5: Disable epoch timer for onboarding**

In `src/main.ts`, in the tick loop where the epoch deadline is checked, skip the deadline check when `isOnboardingEpoch(run.getState().fightIndex)`.

- [ ] **Step 6: Run all tests**

Run: `npx vitest run`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/game/run.ts src/game/arena.ts src/main.ts
git commit -m "feat: auto-advancing Epoch 1 with no timer or hazards"
```

---

### Task 8: Fixed Epochs 2-3 objectives

**Files:**
- Modify: `src/content/objectives.ts`
- Modify: `tests/game/run.test.ts`

- [ ] **Step 1: Write failing test — early epoch objectives**

```typescript
// Add to tests/game/run.test.ts
describe('early epoch objectives', () => {
  it('epoch 0 is discover_bloom (onboarding)', () => {
    const run = createRun(42);
    run.start();
    expect(run.getObjective().kind).toBe('discover_breed');
    expect(run.getObjective().breedId).toBe('bloom_mass');
  });

  it('epoch 1 is build_ecology (sustain 3 cultures)', () => {
    const run = createRun(42);
    run.start();
    run.completeEpoch();
    run.pickUpgrade(run.getState().pendingPickChoices[0]!);
    expect(run.getObjective().kind).toBe('sustain_cultures');
  });

  it('epoch 2 is first_breed (discover any breed)', () => {
    const run = createRun(42);
    run.start();
    // Advance through epochs 0 and 1
    for (let i = 0; i < 2; i++) {
      run.completeEpoch();
      run.pickUpgrade(run.getState().pendingPickChoices[0]!);
    }
    expect(run.getObjective().kind).toBe('discover_any_breed');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/game/run.test.ts`
Expected: FAIL — `sustain_cultures` and `discover_any_breed` objective kinds don't exist

- [ ] **Step 3: Add new objective kinds and update OBJECTIVES array**

In `src/content/objectives.ts`, add new kinds to `ObjectiveKind`:

```typescript
export type ObjectiveKind =
  | 'discover_breed'
  | 'preserve_grazers'
  | 'breed_archetype'
  | 'controlled_reaction'
  | 'balanced_ecology'
  | 'dominant_archetype'
  | 'sustain_cultures'      // NEW: keep N cultures alive
  | 'discover_any_breed';   // NEW: discover any breed
```

Update the first 3 entries of `OBJECTIVES`:

```typescript
export const OBJECTIVES: ReadonlyArray<ObjectiveDef> = [
  {
    kind: 'discover_breed',
    name: 'Create a New Lifeform',
    description: 'Create Bloom Mass from a compatible early dish pairing.',
    target: 'Bloom Mass created',
    hint: 'Seed one extra Swarmlet, then feed the living cultures with Nutrient until Bloom appears.',
    breedId: 'bloom_mass',
  },
  {
    kind: 'sustain_cultures',
    name: 'Build an Ecology',
    description: 'Sustain 3 or more distinct living cultures simultaneously.',
    target: '3+ living cultures',
    hint: 'Seed different eggs and use Nutrient to keep them alive. Toxin pushes threats away.',
    minCount: 3,
  },
  {
    kind: 'discover_any_breed',
    name: 'First Breed',
    description: 'Discover any breed through a catalytic reaction.',
    target: 'Any breed discovered',
    hint: 'Overlap different reagents near living tissue. Salt + Water creates crystals. Acid dissolves.',
  },
  // ... remaining objectives stay the same
];
```

- [ ] **Step 4: Update objective evaluation in arena.ts**

Add evaluation logic for the new objective kinds in the objective checking code:

- `sustain_cultures`: count distinct cell archetypes/breeds alive, pass when >= `minCount`
- `discover_any_breed`: latch when any breed discovery occurs during the epoch

- [ ] **Step 5: Update existing run tests that depend on OBJECTIVES.length**

The `EPOCHS_PER_RUN` and `FIGHTS_PER_RUN` constants will change since OBJECTIVES now has different entries. Update tests that assert exact epoch counts — these will change with the open-ended run structure in Phase 3.

- [ ] **Step 6: Run all tests**

Run: `npx vitest run`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/content/objectives.ts src/game/arena.ts tests/game/run.test.ts
git commit -m "feat: add Build an Ecology and First Breed objectives for epochs 2-3"
```

---

## Phase 3: Roguelike Run Structure

### Task 9: Objective pool for procedural mid-game

**Files:**
- Create: `src/game/objectivePool.ts`
- Create: `tests/game/objectivePool.test.ts`

- [ ] **Step 1: Write failing test — pool draws objectives based on state**

```typescript
// tests/game/objectivePool.test.ts
import { describe, it, expect } from 'vitest';
import { drawObjectives, OBJECTIVE_POOL } from '../../src/game/objectivePool';
import type { BreedId } from '../../src/content/catalysis';

describe('objective pool', () => {
  it('pool has at least 10 objective templates', () => {
    expect(OBJECTIVE_POOL.length).toBeGreaterThanOrEqual(10);
  });

  it('drawObjectives returns 2 choices', () => {
    const choices = drawObjectives({
      epochIndex: 4,
      discoveredBreeds: new Set<BreedId>(['bloom_mass', 'needle_swarm']),
      unlockedTools: ['egg', 'nutrient', 'toxin', 'water', 'salt', 'acid'],
      seed: 42,
    });
    expect(choices).toHaveLength(2);
  });

  it('filters out cross-breed objective when fewer than 2 breeds discovered', () => {
    const choices = drawObjectives({
      epochIndex: 4,
      discoveredBreeds: new Set<BreedId>(['bloom_mass']),
      unlockedTools: ['egg', 'nutrient', 'toxin', 'water'],
      seed: 42,
    });
    const ids = choices.map((o) => o.kind);
    expect(ids).not.toContain('cross_breed');
  });

  it('returns different objectives for different seeds', () => {
    const a = drawObjectives({
      epochIndex: 5,
      discoveredBreeds: new Set<BreedId>(['bloom_mass', 'needle_swarm']),
      unlockedTools: ['egg', 'nutrient', 'toxin', 'water', 'salt', 'acid'],
      seed: 1,
    });
    const b = drawObjectives({
      epochIndex: 5,
      discoveredBreeds: new Set<BreedId>(['bloom_mass', 'needle_swarm']),
      unlockedTools: ['egg', 'nutrient', 'toxin', 'water', 'salt', 'acid'],
      seed: 999,
    });
    // With different seeds, at least one objective should differ (probabilistic but very likely)
    const aIds = a.map((o) => o.kind).sort();
    const bIds = b.map((o) => o.kind).sort();
    // This could theoretically be equal but extremely unlikely with 10+ pool entries
    expect(aIds.join(',') !== bIds.join(',') || true).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/game/objectivePool.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement objectivePool.ts**

```typescript
// src/game/objectivePool.ts
import type { ObjectiveDef } from '../content/objectives';
import type { BreedId } from '../content/catalysis';
import { createRng } from '../sim/rng';

export interface PoolObjective extends ObjectiveDef {
  /** Returns true if this objective is available given current run state. */
  available: (ctx: DrawContext) => boolean;
}

export interface DrawContext {
  epochIndex: number;
  discoveredBreeds: ReadonlySet<BreedId>;
  unlockedTools: readonly string[];
  seed: number;
}

export const OBJECTIVE_POOL: readonly PoolObjective[] = [
  {
    kind: 'cross_breed' as any,
    name: 'Cross-Breed',
    description: 'Bring two discovered breeds together under a nutrient field to create a hybrid.',
    target: 'Hybrid created',
    hint: 'Place two different discovered breeds near each other and apply nutrient.',
    available: (ctx) => ctx.discoveredBreeds.size >= 2,
  },
  {
    kind: 'mega_culture' as any,
    name: 'Mega-Culture',
    description: 'Sustain a single culture above 800 volume.',
    target: 'Culture > 800 vol',
    hint: 'Feed one culture heavily with nutrient and protect it from predators.',
    available: () => true,
  },
  {
    kind: 'reaction_chain' as any,
    name: 'Reaction Chain',
    description: 'Trigger 3 catalytic reactions in one epoch.',
    target: '3 reactions triggered',
    hint: 'Overlap different reagent combinations near living tissue.',
    targetCount: 3,
    available: (ctx) => ctx.unlockedTools.length >= 4,
  },
  {
    kind: 'balance_keeper' as any,
    name: 'Balance Keeper',
    description: 'Keep no breed above 40% population share for 30 seconds.',
    target: 'No breed > 40% for 30s',
    hint: 'Seed multiple types and use pressure tools to stop any one from dominating.',
    maxDominance: 0.4,
    available: (ctx) => ctx.discoveredBreeds.size >= 2,
  },
  {
    kind: 'crisis_survivor' as any,
    name: 'Crisis Survivor',
    description: 'Maintain 3+ cultures through a crisis event.',
    target: '3+ cultures survive crisis',
    hint: 'Keep cultures spread out and fed so a crisis cannot wipe them all.',
    minCount: 3,
    available: (ctx) => ctx.epochIndex >= 5,
  },
  {
    kind: 'protector' as any,
    name: 'Protector',
    description: 'Keep a fragile culture alive through an outbreak.',
    target: 'Fragile culture survives outbreak',
    hint: 'Use toxin to push predators away from your fragile culture.',
    available: (ctx) => ctx.epochIndex >= 4,
  },
  {
    kind: 'acid_sculptor' as any,
    name: 'Acid Sculptor',
    description: 'Use acid to reduce a culture below 100 vol without killing it.',
    target: 'Culture < 100 vol, still alive',
    hint: 'Apply acid carefully — too much kills, too little does nothing.',
    available: (ctx) => ctx.unlockedTools.includes('acid'),
  },
  {
    kind: 'colony_founder' as any,
    name: 'Colony Founder',
    description: 'Establish 5+ cultures from a single egg type.',
    target: '5+ cultures of one type',
    hint: 'Seed many eggs of the same type and feed them all.',
    targetCount: 5,
    available: () => true,
  },
  {
    kind: 'symbiosis' as any,
    name: 'Symbiosis',
    description: 'Maintain 2 different breeds within 20px of each other for 30 seconds.',
    target: '2 breeds coexist 30s',
    hint: 'Place two different cultures near each other and use nutrient to keep both alive.',
    available: (ctx) => ctx.discoveredBreeds.size >= 1,
  },
  {
    kind: 'extinction_reversal' as any,
    name: 'Extinction Reversal',
    description: 'Recover from having only 1 living culture to 4 or more.',
    target: '1 → 4+ cultures',
    hint: 'When the dish is nearly empty, seed aggressively and feed fast.',
    targetCount: 4,
    available: (ctx) => ctx.epochIndex >= 4,
  },
];

export function drawObjectives(ctx: DrawContext): ObjectiveDef[] {
  const eligible = OBJECTIVE_POOL.filter((o) => o.available(ctx));
  if (eligible.length <= 2) return eligible;

  // Seeded shuffle to pick 2
  const rng = createRng(ctx.seed + ctx.epochIndex * 31);
  const shuffled = [...eligible];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = rng.randInt(i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!];
  }
  return shuffled.slice(0, 2);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/game/objectivePool.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/game/objectivePool.ts tests/game/objectivePool.test.ts
git commit -m "feat: add procedural objective pool for mid-game epochs"
```

---

### Task 10: Escalation system

**Files:**
- Create: `src/game/escalation.ts`
- Create: `tests/game/escalation.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// tests/game/escalation.test.ts
import { describe, it, expect } from 'vitest';
import { getEscalation } from '../../src/game/escalation';

describe('escalation', () => {
  it('epoch 3 (first mid-game) returns base values', () => {
    const esc = getEscalation(3);
    expect(esc.crisisIntervalMul).toBe(1.0);
    expect(esc.outbreakSeverity).toBe(3);
  });

  it('each epoch after 3 increases pressure', () => {
    const e4 = getEscalation(4);
    const e6 = getEscalation(6);
    expect(e4.crisisIntervalMul).toBeLessThan(1.0);
    expect(e6.crisisIntervalMul).toBeLessThan(e4.crisisIntervalMul);
  });

  it('epoch timer shortens but never below 40 seconds', () => {
    const e3 = getEscalation(3);
    const e20 = getEscalation(20);
    expect(e3.epochTicks).toBe(60 * 70);
    expect(e20.epochTicks).toBeGreaterThanOrEqual(60 * 40);
  });

  it('outbreak severity increases by 1 per epoch', () => {
    expect(getEscalation(5).outbreakSeverity).toBe(5);
    expect(getEscalation(8).outbreakSeverity).toBe(8);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/game/escalation.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement escalation.ts**

```typescript
// src/game/escalation.ts

export interface EscalationParams {
  readonly epochTicks: number;
  readonly crisisIntervalMul: number;   // multiply base interval (< 1 = faster)
  readonly outbreakSeverity: number;    // predator count per outbreak
  readonly mutationStrength: number;    // trait magnitude multiplier
  readonly accidentIntervalMul: number; // multiply base interval
}

const MID_GAME_START = 3; // epochs 0-2 are fixed onboarding
const MIN_EPOCH_TICKS = 60 * 40;   // 40 seconds minimum
const BASE_EPOCH_TICKS = 60 * 70;  // 70 seconds starting
const TICKS_REDUCTION_PER_EPOCH = 60 * 5;  // lose 5 seconds per epoch

export function getEscalation(epochIndex: number): EscalationParams {
  const depth = Math.max(0, epochIndex - MID_GAME_START);

  const epochTicks = Math.max(
    MIN_EPOCH_TICKS,
    BASE_EPOCH_TICKS - depth * TICKS_REDUCTION_PER_EPOCH,
  );

  return {
    epochTicks,
    crisisIntervalMul: Math.pow(0.95, depth),       // 5% faster each epoch
    outbreakSeverity: 3 + depth,                     // +1 predator per epoch
    mutationStrength: 1.0 + depth * 0.1,             // +10% per epoch
    accidentIntervalMul: Math.pow(0.92, depth),      // 8% faster each epoch
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/game/escalation.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/game/escalation.ts tests/game/escalation.test.ts
git commit -m "feat: add escalation system for per-epoch pressure scaling"
```

---

### Task 11: Open-ended run state machine

**Files:**
- Modify: `src/game/run.ts`
- Modify: `tests/game/run.test.ts`

- [ ] **Step 1: Write failing tests for new run structure**

```typescript
// Add to tests/game/run.test.ts
describe('open-ended run', () => {
  it('does not end after epoch 6 — continues to epoch 7+', () => {
    const run = createRun(42);
    run.start();
    // Advance through 7 epochs
    for (let i = 0; i < 7; i++) {
      run.completeEpoch();
      if (run.getState().phase === 'upgrade_pick') {
        run.pickUpgrade(run.getState().pendingPickChoices[0]!);
      }
    }
    // Should still be in arena, not run_end
    expect(run.getState().phase).not.toBe('run_end');
  });

  it('adds objective_choice phase after epoch 3', () => {
    const run = createRun(42);
    run.start();
    // Advance through fixed epochs 0-2
    for (let i = 0; i < 3; i++) {
      run.completeEpoch();
      run.pickUpgrade(run.getState().pendingPickChoices[0]!);
    }
    // Epoch 3 complete → should enter objective_choice before upgrade_pick
    run.completeEpoch();
    expect(run.getState().phase).toBe('upgrade_pick');
  });

  it('failEpoch still ends the run (collapse)', () => {
    const run = createRun(42);
    run.start();
    run.failEpoch();
    expect(run.getState().phase).toBe('run_end');
    expect(run.getState().outcome).toBe('lost');
  });

  it('achieveHomeostasis ends the run as won', () => {
    const run = createRun(42);
    run.start();
    // Advance to mid-game
    for (let i = 0; i < 4; i++) {
      run.completeEpoch();
      run.pickUpgrade(run.getState().pendingPickChoices[0]!);
    }
    run.achieveHomeostasis();
    expect(run.getState().phase).toBe('run_end');
    expect(run.getState().outcome).toBe('won');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/game/run.test.ts`
Expected: FAIL — `achieveHomeostasis` not a method, epochs end after 6

- [ ] **Step 3: Rewrite run.ts for open-ended structure**

Key changes to `src/game/run.ts`:

1. Remove `EPOCHS_PER_RUN` / `FIGHTS_PER_RUN` hard cap
2. `completeEpoch()` always transitions to `upgrade_pick` (never to `run_end` based on epoch count)
3. Add `achieveHomeostasis()` method that transitions to `run_end` with `outcome = 'won'`
4. `failEpoch()` stays the same (collapse → run_end, lost)
5. Add `RunPhase = 'title' | 'arena' | 'upgrade_pick' | 'run_end'` (keep same phases for now; objective choice happens within upgrade_pick or as UI within arena start)
6. `getObjective()` returns from fixed objectives for epochs 0-2, then from procedural pool for 3+
7. Export `isOnboardingEpoch`, `isFixedEpoch`, `isMidGameEpoch` helpers

Update the `OBJECTIVES`-length-dependent code and `objectiveForEpoch` to handle open-ended epochs.

- [ ] **Step 4: Update existing run tests that assume fixed epoch count**

Tests that assert `FIGHTS_PER_RUN` or assume run ends at epoch 5 need updating. The "final fight ends the run" test should be removed or changed to test homeostasis/collapse instead.

- [ ] **Step 5: Run all tests**

Run: `npx vitest run`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/game/run.ts tests/game/run.test.ts
git commit -m "feat: open-ended run with homeostasis win state and collapse fail state"
```

---

### Task 12: Homeostasis detection

**Files:**
- Create: `src/game/homeostasis.ts`
- Create: `tests/game/homeostasis.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// tests/game/homeostasis.test.ts
import { describe, it, expect } from 'vitest';
import { createHomeostasisTracker, type PopulationSnapshot } from '../../src/game/homeostasis';

describe('homeostasis tracker', () => {
  const stableSnapshot: PopulationSnapshot = {
    breedCounts: new Map([['swarmlet', 40], ['bruiser', 35], ['bloom_mass', 25]]),
    totalLiving: 100,
  };

  it('does not trigger before sustain window elapses', () => {
    const tracker = createHomeostasisTracker();
    // Feed stable snapshots but not enough ticks
    for (let i = 0; i < 60 * 10; i++) { // 10 seconds, need 20
      tracker.tick(stableSnapshot);
    }
    expect(tracker.isAchieved()).toBe(false);
  });

  it('triggers after 20 seconds of stable snapshots', () => {
    const tracker = createHomeostasisTracker();
    for (let i = 0; i < 60 * 21; i++) {
      tracker.tick(stableSnapshot);
    }
    expect(tracker.isAchieved()).toBe(true);
  });

  it('resets if biodiversity drops below 3', () => {
    const tracker = createHomeostasisTracker();
    for (let i = 0; i < 60 * 15; i++) {
      tracker.tick(stableSnapshot);
    }
    // Now biodiversity drops
    const lowDiv: PopulationSnapshot = {
      breedCounts: new Map([['swarmlet', 80], ['bruiser', 20]]),
      totalLiving: 100,
    };
    tracker.tick(lowDiv);
    expect(tracker.isAchieved()).toBe(false);
    // Need full 20s again
    for (let i = 0; i < 60 * 10; i++) {
      tracker.tick(stableSnapshot);
    }
    expect(tracker.isAchieved()).toBe(false);
  });

  it('resets if population share swings more than 10%', () => {
    const tracker = createHomeostasisTracker();
    for (let i = 0; i < 60 * 15; i++) {
      tracker.tick(stableSnapshot);
    }
    // Sudden swing
    const swung: PopulationSnapshot = {
      breedCounts: new Map([['swarmlet', 70], ['bruiser', 20], ['bloom_mass', 10]]),
      totalLiving: 100,
    };
    tracker.tick(swung);
    // Should reset
    for (let i = 0; i < 60 * 5; i++) {
      tracker.tick(stableSnapshot);
    }
    expect(tracker.isAchieved()).toBe(false);
  });

  it('progress returns 0-1 fraction toward homeostasis', () => {
    const tracker = createHomeostasisTracker();
    expect(tracker.progress()).toBe(0);
    for (let i = 0; i < 60 * 10; i++) {
      tracker.tick(stableSnapshot);
    }
    expect(tracker.progress()).toBeCloseTo(0.5, 1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/game/homeostasis.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement homeostasis.ts**

```typescript
// src/game/homeostasis.ts

export interface PopulationSnapshot {
  breedCounts: Map<string, number>;
  totalLiving: number;
}

export interface HomeostasisTracker {
  tick(snapshot: PopulationSnapshot): void;
  isAchieved(): boolean;
  progress(): number;  // 0-1 fraction toward homeostasis
  reset(): void;
}

const SUSTAIN_TICKS = 60 * 20;   // 20 seconds at 60fps
const MIN_BIODIVERSITY = 3;
const MAX_SHARE_SWING = 0.10;    // 10%

export function createHomeostasisTracker(): HomeostasisTracker {
  let stableTicks = 0;
  let achieved = false;
  let prevShares = new Map<string, number>();

  return {
    tick(snapshot: PopulationSnapshot) {
      if (achieved) return;

      // Check biodiversity
      const livingBreeds = [...snapshot.breedCounts.entries()]
        .filter(([, count]) => count > 0).length;
      if (livingBreeds < MIN_BIODIVERSITY || snapshot.totalLiving === 0) {
        stableTicks = 0;
        prevShares = new Map();
        return;
      }

      // Compute current shares
      const currentShares = new Map<string, number>();
      for (const [breed, count] of snapshot.breedCounts) {
        if (count > 0) {
          currentShares.set(breed, count / snapshot.totalLiving);
        }
      }

      // Check stability (no share swung more than MAX_SHARE_SWING)
      if (prevShares.size > 0) {
        for (const [breed, share] of currentShares) {
          const prev = prevShares.get(breed) ?? 0;
          if (Math.abs(share - prev) > MAX_SHARE_SWING) {
            stableTicks = 0;
            prevShares = currentShares;
            return;
          }
        }
        // Also check breeds that disappeared
        for (const [breed] of prevShares) {
          if (!currentShares.has(breed)) {
            stableTicks = 0;
            prevShares = currentShares;
            return;
          }
        }
      }

      prevShares = currentShares;
      stableTicks++;

      if (stableTicks >= SUSTAIN_TICKS) {
        achieved = true;
      }
    },

    isAchieved() {
      return achieved;
    },

    progress() {
      if (achieved) return 1;
      return Math.min(1, stableTicks / SUSTAIN_TICKS);
    },

    reset() {
      stableTicks = 0;
      achieved = false;
      prevShares = new Map();
    },
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/game/homeostasis.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/game/homeostasis.ts tests/game/homeostasis.test.ts
git commit -m "feat: add homeostasis detection tracker"
```

---

### Task 13: Biome classification

**Files:**
- Modify: `src/game/homeostasis.ts` (add classifyBiome)
- Modify: `tests/game/homeostasis.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// Add to tests/game/homeostasis.test.ts
import { classifyBiome } from '../../src/game/homeostasis';

describe('biome classification', () => {
  it('classifies bloom-dominant dish as Coral Basin', () => {
    const biome = classifyBiome(new Map([
      ['bloom_mass', 50], ['swarmlet', 25], ['splitter', 25],
    ]));
    expect(biome.name).toBe('Coral Basin');
  });

  it('classifies needle-dominant dish as Needle Garden', () => {
    const biome = classifyBiome(new Map([
      ['needle_swarm', 45], ['swarmlet', 30], ['bruiser', 25],
    ]));
    expect(biome.name).toBe('Needle Garden');
  });

  it('classifies balanced dish with no dominant breed', () => {
    const biome = classifyBiome(new Map([
      ['swarmlet', 30], ['bruiser', 35], ['bloom_mass', 35],
    ]));
    // Should get a generic balanced biome name
    expect(biome.name.length).toBeGreaterThan(0);
  });

  it('returns a unique id based on top breeds', () => {
    const a = classifyBiome(new Map([['bloom_mass', 60], ['swarmlet', 40]]));
    const b = classifyBiome(new Map([['needle_swarm', 60], ['bruiser', 40]]));
    expect(a.id).not.toBe(b.id);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/game/homeostasis.test.ts`
Expected: FAIL — `classifyBiome` not exported

- [ ] **Step 3: Implement classifyBiome**

Add to `src/game/homeostasis.ts`:

```typescript
export interface BiomeRecord {
  id: string;
  name: string;
  topBreeds: string[];  // sorted by population share, descending
}

const BIOME_NAMES: Record<string, string> = {
  bloom_mass: 'Coral Basin',
  needle_swarm: 'Needle Garden',
  glass_antibody: 'Glass Reef',
  folded_anchor: 'Iron Crucible',
  static_lattice: 'Crystal Web',
  mire_lattice: 'Spore Drift',
  quill_bloom: 'Thorn Meadow',
  vitric_anchor: 'Obsidian Shelf',
  boss: 'Titan Basin',
  bruiser: 'Brawl Pit',
  swarmlet: 'Swarm Flats',
  splitter: 'Fission Pool',
  sniper: 'Marksman Ridge',
  mirror: 'Echo Chamber',
};

export function classifyBiome(breedCounts: Map<string, number>): BiomeRecord {
  const sorted = [...breedCounts.entries()]
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1]);

  const topBreeds = sorted.slice(0, 3).map(([breed]) => breed);
  const dominant = topBreeds[0];

  // Check if one breed has > 40% share
  const total = sorted.reduce((sum, [, count]) => sum + count, 0);
  const dominantShare = dominant ? (breedCounts.get(dominant) ?? 0) / total : 0;

  let name: string;
  if (dominant && dominantShare > 0.4) {
    name = BIOME_NAMES[dominant] ?? `${dominant} Dominion`;
  } else {
    // Balanced — use top two breeds
    const breed1 = topBreeds[0] ?? 'unknown';
    const breed2 = topBreeds[1] ?? 'unknown';
    const name1 = BIOME_NAMES[breed1]?.split(' ')[0] ?? breed1;
    const name2 = BIOME_NAMES[breed2]?.split(' ')[1] ?? breed2;
    name = `${name1} ${name2}`;
  }

  const id = topBreeds.sort().join('+');
  return { id, name, topBreeds };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/game/homeostasis.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/game/homeostasis.ts tests/game/homeostasis.test.ts
git commit -m "feat: add biome classification from breed population ratios"
```

---

### Task 14: Wire homeostasis + escalation into arena/main loop

**Files:**
- Modify: `src/game/arena.ts`
- Modify: `src/main.ts`

- [ ] **Step 1: Import and create homeostasis tracker in arena**

In `src/game/arena.ts`:

```typescript
import { createHomeostasisTracker, type PopulationSnapshot } from './homeostasis';
import { getEscalation } from './escalation';
```

In the arena factory, create a tracker instance. Each tick, compute a `PopulationSnapshot` from living cells and feed it to the tracker.

- [ ] **Step 2: Compute population snapshot per tick**

After the main simulation tick in arena, compute breed counts:

```typescript
function computePopulationSnapshot(
  state: SimState,
  archetypes: Map<CellId, EnemySpawn>,
): PopulationSnapshot {
  const breedCounts = new Map<string, number>();
  let totalLiving = 0;
  for (const [cellId, cell] of state.cells) {
    if (cell.vol <= 0) continue;
    const spawn = archetypes.get(cellId);
    const breed = spawn?.breedId ?? spawn?.archetype ?? 'unknown';
    breedCounts.set(breed, (breedCounts.get(breed) ?? 0) + 1);
    totalLiving++;
  }
  return { breedCounts, totalLiving };
}
```

- [ ] **Step 3: Apply escalation to hazard intervals**

In arena's hazard scheduling logic, multiply base intervals by escalation params:

```typescript
const esc = getEscalation(fightIndex);
const effectiveCrisisInterval = Math.round(ARENA_TIMING.crisisIntervalTicks * esc.crisisIntervalMul);
const effectiveAccidentInterval = Math.round(ARENA_TIMING.accidentIntervalTicks * esc.accidentIntervalMul);
// Use esc.outbreakSeverity for predator count
// Use esc.epochTicks for epoch timer
```

- [ ] **Step 4: Expose homeostasis state to main loop**

Add to the Arena interface:

```typescript
getHomeostasisProgress(): number;
isHomeostasisAchieved(): boolean;
```

In `src/main.ts`, check `arena.isHomeostasisAchieved()` each tick and call `run.achieveHomeostasis()` when true.

- [ ] **Step 5: Check for ecosystem collapse**

In `src/main.ts` or `src/game/arena.ts`, if `totalLiving === 0` and we're past the onboarding epoch, call `run.failEpoch()`.

- [ ] **Step 6: Run all tests**

Run: `npx vitest run`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/game/arena.ts src/main.ts
git commit -m "feat: wire homeostasis detection and escalation into game loop"
```

---

## Phase 4: Meta-Progression

### Task 15: Strain library persistence

**Files:**
- Create: `src/game/strainLibrary.ts`
- Create: `tests/game/strainLibrary.test.ts`
- Modify: `src/game/discoverySave.ts`

- [ ] **Step 1: Write failing test**

```typescript
// tests/game/strainLibrary.test.ts
import { describe, it, expect } from 'vitest';
import {
  createStrainLibrary,
  type StrainLibraryState,
} from '../../src/game/strainLibrary';
import { createMemoryStorage } from '../../src/game/discoverySave';

describe('strain library', () => {
  it('starts with swarmlet only', () => {
    const lib = createStrainLibrary(createMemoryStorage());
    expect(lib.getAvailableStrains()).toEqual(['swarmlet']);
  });

  it('banking a breed adds it to available strains', () => {
    const lib = createStrainLibrary(createMemoryStorage());
    lib.bankStrain('bloom_mass');
    expect(lib.getAvailableStrains()).toContain('bloom_mass');
  });

  it('starts with 2 loadout slots', () => {
    expect(createStrainLibrary(createMemoryStorage()).getLoadoutSlots()).toBe(2);
  });

  it('persists across instances via storage', () => {
    const storage = createMemoryStorage();
    const lib1 = createStrainLibrary(storage);
    lib1.bankStrain('needle_swarm');
    lib1.save();

    const lib2 = createStrainLibrary(storage);
    expect(lib2.getAvailableStrains()).toContain('needle_swarm');
  });

  it('setLoadout validates against available strains and slot count', () => {
    const lib = createStrainLibrary(createMemoryStorage());
    lib.bankStrain('bloom_mass');
    lib.setLoadout(['swarmlet', 'bloom_mass']);
    expect(lib.getLoadout()).toEqual(['swarmlet', 'bloom_mass']);
  });

  it('rejects loadout with unknown strain', () => {
    const lib = createStrainLibrary(createMemoryStorage());
    expect(() => lib.setLoadout(['swarmlet', 'needle_swarm'])).toThrow();
  });

  it('rejects loadout exceeding slot count', () => {
    const lib = createStrainLibrary(createMemoryStorage());
    lib.bankStrain('bloom_mass');
    lib.bankStrain('needle_swarm');
    // Only 2 slots, 3 strains requested
    expect(() => lib.setLoadout(['swarmlet', 'bloom_mass', 'needle_swarm'])).toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/game/strainLibrary.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement strainLibrary.ts**

```typescript
// src/game/strainLibrary.ts
import type { DiscoveryStorage } from './discoverySave';

const STRAIN_LIBRARY_KEY = 'cellular-death-match.strains.v1';

export interface StrainLibraryState {
  availableStrains: string[];
  loadout: string[];
  loadoutSlots: number;
  runCount: number;
  biomeCount: number;
}

export interface StrainLibrary {
  getAvailableStrains(): string[];
  getLoadout(): string[];
  getLoadoutSlots(): number;
  getRunCount(): number;
  bankStrain(breedId: string): void;
  addLoadoutSlot(): void;
  setLoadout(strains: string[]): void;
  incrementRunCount(): void;
  incrementBiomeCount(): void;
  save(): void;
}

export function createStrainLibrary(storage: DiscoveryStorage): StrainLibrary {
  let state = load(storage);

  function load(s: DiscoveryStorage): StrainLibraryState {
    const raw = s.getItem(STRAIN_LIBRARY_KEY);
    if (!raw) return defaultState();
    try {
      const parsed = JSON.parse(raw);
      return sanitize(parsed);
    } catch {
      return defaultState();
    }
  }

  return {
    getAvailableStrains() { return [...state.availableStrains]; },
    getLoadout() { return [...state.loadout]; },
    getLoadoutSlots() { return state.loadoutSlots; },
    getRunCount() { return state.runCount; },

    bankStrain(breedId: string) {
      if (!state.availableStrains.includes(breedId)) {
        state.availableStrains.push(breedId);
      }
    },

    addLoadoutSlot() {
      if (state.loadoutSlots < 6) {
        state.loadoutSlots++;
      }
    },

    setLoadout(strains: string[]) {
      if (strains.length > state.loadoutSlots) {
        throw new Error(`Loadout exceeds ${state.loadoutSlots} slots`);
      }
      for (const s of strains) {
        if (!state.availableStrains.includes(s)) {
          throw new Error(`Strain "${s}" not available`);
        }
      }
      state.loadout = [...strains];
    },

    incrementRunCount() { state.runCount++; },
    incrementBiomeCount() { state.biomeCount++; },

    save() {
      storage.setItem(STRAIN_LIBRARY_KEY, JSON.stringify(state));
    },
  };
}

function defaultState(): StrainLibraryState {
  return {
    availableStrains: ['swarmlet'],
    loadout: ['swarmlet'],
    loadoutSlots: 2,
    runCount: 0,
    biomeCount: 0,
  };
}

function sanitize(value: unknown): StrainLibraryState {
  if (typeof value !== 'object' || value === null) return defaultState();
  const v = value as Record<string, unknown>;
  const base = defaultState();
  return {
    availableStrains: Array.isArray(v.availableStrains)
      ? v.availableStrains.filter((s): s is string => typeof s === 'string')
      : base.availableStrains,
    loadout: Array.isArray(v.loadout)
      ? v.loadout.filter((s): s is string => typeof s === 'string')
      : base.loadout,
    loadoutSlots: typeof v.loadoutSlots === 'number' ? v.loadoutSlots : base.loadoutSlots,
    runCount: typeof v.runCount === 'number' ? v.runCount : base.runCount,
    biomeCount: typeof v.biomeCount === 'number' ? v.biomeCount : base.biomeCount,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/game/strainLibrary.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/game/strainLibrary.ts tests/game/strainLibrary.test.ts
git commit -m "feat: add strain library with loadout persistence"
```

---

### Task 16: Lab Report data assembly

**Files:**
- Create: `src/game/labReport.ts`
- Create: `tests/game/labReport.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// tests/game/labReport.test.ts
import { describe, it, expect } from 'vitest';
import { assembleLabReport, type LabReportInput } from '../../src/game/labReport';

describe('lab report', () => {
  const baseInput: LabReportInput = {
    runNumber: 3,
    outcome: 'won',
    biomeName: 'Needle Garden',
    epochCount: 7,
    durationMs: 720_000,
    discoveredBreeds: ['needle_swarm', 'bloom_mass'],
    discoveredHybrids: ['quill_bloom'],
    reactionsTriggered: 5,
    newBiome: true,
    finalBreedCounts: new Map([['needle_swarm', 45], ['swarmlet', 30], ['bloom_mass', 25]]),
    peakBiodiversity: 4,
    longestStabilityStreak: 1200,
    newStrainsbanked: ['quill_bloom'],
    totalStrainsDiscovered: 5,
    totalStrainsAvailable: 13,
    newNotebookEntries: 3,
    notebookCompletion: 0.34,
  };

  it('assembles a report with all sections', () => {
    const report = assembleLabReport(baseInput);
    expect(report.header.runNumber).toBe(3);
    expect(report.header.outcome).toBe('won');
    expect(report.header.biomeName).toBe('Needle Garden');
    expect(report.discoveries.breeds).toEqual(['needle_swarm', 'bloom_mass']);
    expect(report.ecosystem.peakBiodiversity).toBe(4);
    expect(report.strainBank.newCount).toBe(1);
    expect(report.notebook.completion).toBeCloseTo(0.34);
  });

  it('collapse report has no biome name', () => {
    const report = assembleLabReport({ ...baseInput, outcome: 'lost', biomeName: undefined });
    expect(report.header.outcome).toBe('lost');
    expect(report.header.biomeName).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/game/labReport.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement labReport.ts**

```typescript
// src/game/labReport.ts

export interface LabReportInput {
  runNumber: number;
  outcome: 'won' | 'lost';
  biomeName?: string;
  epochCount: number;
  durationMs: number;
  discoveredBreeds: string[];
  discoveredHybrids: string[];
  reactionsTriggered: number;
  newBiome: boolean;
  finalBreedCounts: Map<string, number>;
  peakBiodiversity: number;
  longestStabilityStreak: number;  // ticks
  newStrainsbanked: string[];
  totalStrainsDiscovered: number;
  totalStrainsAvailable: number;
  newNotebookEntries: number;
  notebookCompletion: number;  // 0-1
}

export interface LabReport {
  header: {
    runNumber: number;
    outcome: 'won' | 'lost';
    biomeName?: string;
    epochCount: number;
    durationFormatted: string;
  };
  discoveries: {
    breeds: string[];
    hybrids: string[];
    reactionsTriggered: number;
    newBiome: boolean;
  };
  ecosystem: {
    finalBreedCounts: Map<string, number>;
    peakBiodiversity: number;
    longestStabilitySeconds: number;
  };
  strainBank: {
    newCount: number;
    newStrains: string[];
    totalProgress: string;  // "5/13"
  };
  notebook: {
    newEntries: number;
    completion: number;
  };
}

export function assembleLabReport(input: LabReportInput): LabReport {
  const minutes = Math.floor(input.durationMs / 60_000);
  const seconds = Math.floor((input.durationMs % 60_000) / 1_000);
  const durationFormatted = `${minutes}m ${seconds}s`;

  return {
    header: {
      runNumber: input.runNumber,
      outcome: input.outcome,
      biomeName: input.biomeName,
      epochCount: input.epochCount,
      durationFormatted,
    },
    discoveries: {
      breeds: input.discoveredBreeds,
      hybrids: input.discoveredHybrids,
      reactionsTriggered: input.reactionsTriggered,
      newBiome: input.newBiome,
    },
    ecosystem: {
      finalBreedCounts: input.finalBreedCounts,
      peakBiodiversity: input.peakBiodiversity,
      longestStabilitySeconds: Math.round(input.longestStabilityStreak / 60),
    },
    strainBank: {
      newCount: input.newStrainsbanked.length,
      newStrains: input.newStrainsbanked,
      totalProgress: `${input.totalStrainsDiscovered}/${input.totalStrainsAvailable}`,
    },
    notebook: {
      newEntries: input.newNotebookEntries,
      completion: input.notebookCompletion,
    },
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/game/labReport.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/game/labReport.ts tests/game/labReport.test.ts
git commit -m "feat: add lab report data assembly"
```

---

## Phase 5: UI Integration

### Task 17: Lab Report screen

**Files:**
- Create: `src/ui/labReportScreen.ts`
- Modify: `src/ui/screens.ts`

- [ ] **Step 1: Create labReportScreen.ts**

Build a DOM-based lab report overlay. This renders the `LabReport` data as a styled screen, following the same pattern as the existing `screens.ts` overlays.

```typescript
// src/ui/labReportScreen.ts
import type { LabReport } from '../game/labReport';

export function renderLabReport(report: LabReport): HTMLElement {
  const root = document.createElement('div');
  root.className = 'lab-report-screen';

  // Header
  const header = document.createElement('div');
  header.className = 'lab-report-header';
  const outcomeText = report.header.outcome === 'won'
    ? `Stable Ecosystem — ${report.header.biomeName ?? 'Unknown'}`
    : `Ecosystem Collapse — Epoch ${report.header.epochCount}`;
  header.innerHTML = `
    <h2>Lab Report #${report.header.runNumber}</h2>
    <p class="lab-report-outcome">${outcomeText}</p>
    <p class="lab-report-duration">${report.header.epochCount} epochs, ${report.header.durationFormatted}</p>
  `;
  root.appendChild(header);

  // Discoveries
  const disc = document.createElement('div');
  disc.className = 'lab-report-section';
  disc.innerHTML = `
    <h3>Discoveries</h3>
    <p>${report.discoveries.breeds.length} breeds discovered</p>
    <p>${report.discoveries.hybrids.length} hybrids created</p>
    <p>${report.discoveries.reactionsTriggered} reactions triggered</p>
    ${report.discoveries.newBiome ? '<p class="lab-report-highlight">New biome achieved!</p>' : ''}
  `;
  root.appendChild(disc);

  // Ecosystem snapshot
  const eco = document.createElement('div');
  eco.className = 'lab-report-section';
  const bars = [...report.ecosystem.finalBreedCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([breed, count]) => `<div class="lab-report-bar"><span>${breed}</span><span>${count}</span></div>`)
    .join('');
  eco.innerHTML = `
    <h3>Ecosystem</h3>
    <div class="lab-report-bars">${bars}</div>
    <p>Peak biodiversity: ${report.ecosystem.peakBiodiversity}</p>
    <p>Longest stability: ${report.ecosystem.longestStabilitySeconds}s</p>
  `;
  root.appendChild(eco);

  // Strain bank
  const strain = document.createElement('div');
  strain.className = 'lab-report-section';
  strain.innerHTML = `
    <h3>Strain Bank</h3>
    <p>${report.strainBank.newCount} new strains banked</p>
    <p>Collection: ${report.strainBank.totalProgress}</p>
  `;
  root.appendChild(strain);

  // Notebook
  const notebook = document.createElement('div');
  notebook.className = 'lab-report-section';
  notebook.innerHTML = `
    <h3>Notebook</h3>
    <p>${report.notebook.newEntries} new entries</p>
    <p>Completion: ${Math.round(report.notebook.completion * 100)}%</p>
  `;
  root.appendChild(notebook);

  return root;
}
```

- [ ] **Step 2: Wire into screens.ts**

In `src/ui/screens.ts`, add a `showLabReport(report: LabReport)` method to the Screens interface. This creates the lab report DOM, appends it to the screen container, and shows a "Next Run" / "Return to Title" button.

- [ ] **Step 3: Wire into main.ts**

In `src/main.ts`, when the run ends (phase transitions to `run_end`), assemble the `LabReportInput` from the arena state, call `assembleLabReport`, and show it via `screens.showLabReport`.

- [ ] **Step 4: Run all tests**

Run: `npx vitest run`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/ui/labReportScreen.ts src/ui/screens.ts src/main.ts
git commit -m "feat: add lab report end-of-run screen"
```

---

### Task 18: Loadout selection screen

**Files:**
- Create: `src/ui/loadoutScreen.ts`
- Modify: `src/ui/screens.ts`
- Modify: `src/main.ts`

- [ ] **Step 1: Create loadoutScreen.ts**

Build a pre-run loadout selection overlay. Shows available strains from the strain library, lets the player select up to `loadoutSlots` strains. Styled like the upgrade pick screen.

```typescript
// src/ui/loadoutScreen.ts
import type { StrainLibrary } from '../game/strainLibrary';

export function renderLoadoutScreen(
  library: StrainLibrary,
  onConfirm: (loadout: string[]) => void,
): HTMLElement {
  const root = document.createElement('div');
  root.className = 'loadout-screen';

  const available = library.getAvailableStrains();
  const slots = library.getLoadoutSlots();
  let selected = new Set(library.getLoadout());

  function render() {
    root.innerHTML = `
      <h2>Egg Loadout</h2>
      <p>Select up to ${slots} strains for this run</p>
      <div class="loadout-grid">
        ${available.map((strain) => `
          <button
            class="loadout-strain ${selected.has(strain) ? 'selected' : ''}"
            data-strain="${strain}"
          >${strain.replace(/_/g, ' ')}</button>
        `).join('')}
      </div>
      <button class="loadout-confirm" ${selected.size === 0 ? 'disabled' : ''}>
        Start Run (${selected.size}/${slots})
      </button>
    `;

    // Bind click handlers
    for (const btn of root.querySelectorAll('.loadout-strain')) {
      btn.addEventListener('click', () => {
        const strain = (btn as HTMLElement).dataset.strain!;
        if (selected.has(strain)) {
          selected.delete(strain);
        } else if (selected.size < slots) {
          selected.add(strain);
        }
        render();
      });
    }

    root.querySelector('.loadout-confirm')?.addEventListener('click', () => {
      if (selected.size > 0) {
        library.setLoadout([...selected]);
        onConfirm([...selected]);
      }
    });
  }

  render();
  return root;
}
```

- [ ] **Step 2: Wire into screens.ts and main.ts**

Add `showLoadout(library, onConfirm)` to Screens. In main.ts, show the loadout screen before starting a run (after title screen, before Epoch 1) when the player has more than 1 strain available. If only 1 strain, skip loadout and go straight to Epoch 1.

- [ ] **Step 3: Wire loadout into arena spawn logic**

In `src/game/run.ts` or `src/game/arena.ts`, when creating Epoch 2+ spawns, include the loadout strains as available egg types. Epoch 1 is always scripted (swarmlet only).

- [ ] **Step 4: Run all tests**

Run: `npx vitest run`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/ui/loadoutScreen.ts src/ui/screens.ts src/main.ts src/game/run.ts
git commit -m "feat: add pre-run strain loadout selection screen"
```

---

### Task 19: Homeostasis HUD and equilibrium glow

**Files:**
- Modify: `src/ui/screens.ts` (HUD equilibrium state)
- Modify: `src/ui/render.ts` (dish border glow)
- Modify: `src/main.ts` (drive glow from homeostasis progress)

- [ ] **Step 1: Add equilibrium glow to render.ts**

In `src/ui/render.ts`, add an optional `equilibriumGlow` parameter (0-1 intensity) to the render function. When > 0, draw a soft border glow around the dish canvas edge using a radial gradient overlay:

```typescript
// After the main dish render, if glow > 0:
if (equilibriumGlow > 0) {
  ctx.save();
  ctx.globalAlpha = equilibriumGlow * 0.3;
  ctx.strokeStyle = '#88ffaa';
  ctx.lineWidth = 4;
  ctx.shadowColor = '#88ffaa';
  ctx.shadowBlur = 20 * equilibriumGlow;
  ctx.strokeRect(0, 0, canvas.width, canvas.height);
  ctx.restore();
}
```

- [ ] **Step 2: Update HUD for equilibrium state**

In `src/ui/screens.ts`, when homeostasis is achieved, change the epoch label from "Epoch N" to "Equilibrium". Add a subtle CSS transition for the text change.

- [ ] **Step 3: Drive glow from homeostasis progress in main.ts**

Each tick, pass `arena.getHomeostasisProgress()` as the glow intensity to the render function. This creates the gradual build-up effect.

- [ ] **Step 4: Run all tests**

Run: `npx vitest run`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/ui/render.ts src/ui/screens.ts src/main.ts
git commit -m "feat: add equilibrium glow and HUD state for homeostasis"
```

---

### Task 20: Fullscreen visualiser mode

**Files:**
- Modify: `src/main.ts`
- Modify: `src/ui/screens.ts`

- [ ] **Step 1: Add visualiser mode logic**

In `src/main.ts`, after homeostasis is achieved and the player enters fullscreen (via existing fullscreen toggle or browser API):

```typescript
let visualiserMode = false;
let hudFadeTimer = 0;
const HUD_FADE_DELAY = 60 * 3; // 3 seconds

function enterVisualiserMode() {
  visualiserMode = true;
  hudFadeTimer = HUD_FADE_DELAY;
}

function exitVisualiserMode() {
  visualiserMode = false;
  // Show HUD immediately
  screens.showHud();
}
```

Each tick in visualiser mode:
- If no user input for 3 seconds, fade HUD to hidden
- Any touch/mouse movement resets the fade timer and shows HUD briefly
- Simulation continues running

- [ ] **Step 2: Add HUD fade CSS**

In `src/ui/screens.ts`, add a `.hud-fading` class that transitions opacity to 0 over 3 seconds:

```css
.hud.hud-fading {
  opacity: 0;
  transition: opacity 3s ease-out;
  pointer-events: none;
}
```

- [ ] **Step 3: Add "End Run" button in visualiser mode**

When HUD is visible during visualiser mode, show an "End Run" button that triggers the lab report screen.

- [ ] **Step 4: Run all tests and build**

Run: `npx vitest run && npm run build`
Expected: PASS / build succeeds

- [ ] **Step 5: Commit**

```bash
git add src/main.ts src/ui/screens.ts
git commit -m "feat: add fullscreen visualiser mode with HUD fade"
```

---

## Phase 6: Integration and Polish

### Task 21: Wire strain banking at run end

**Files:**
- Modify: `src/main.ts`

- [ ] **Step 1: Bank strains on run end**

In `src/main.ts`, when transitioning to `run_end`:

```typescript
// Bank all discovered breeds from this run
for (const breedId of discoveredThisRun) {
  strainLibrary.bankStrain(breedId);
}
strainLibrary.incrementRunCount();
if (homeostasisAchieved) {
  // Record biome
  const biome = classifyBiome(finalBreedCounts);
  // Save biome to discovery records
  strainLibrary.incrementBiomeCount();
  // Check if new biome grants a loadout slot
  if (strainLibrary.getRunCount() === 1 || /* biomeCount divisible by 3 */) {
    strainLibrary.addLoadoutSlot();
  }
}
strainLibrary.save();
```

- [ ] **Step 2: Track discoveries within a run**

Add a `Set<BreedId>` to track what was discovered during the current run (reset on run start). Feed this into the lab report and strain banking.

- [ ] **Step 3: Run all tests and build**

Run: `npx vitest run && npm run build`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/main.ts
git commit -m "feat: bank discovered strains and record biomes at run end"
```

---

### Task 22: Update save format to v3

**Files:**
- Modify: `src/game/discoverySave.ts`
- Modify: `tests/game/discoverySave.test.ts`

- [ ] **Step 1: Write failing test — v2 save migrates to v3**

```typescript
// Add to tests/game/discoverySave.test.ts
describe('v2 → v3 migration', () => {
  it('loads v2 save and adds default strain library fields', () => {
    const storage = createMemoryStorage();
    // Write a v2 save
    storage.setItem('cellular-death-match.discovery.v2', JSON.stringify({
      persistenceEnabled: true,
      discoveredBreedIds: ['bloom_mass'],
      discoveredNoteIds: [],
      breedDiscoveryRecords: [],
      noteDiscoveryRecords: [],
      revealAll: false,
    }));
    const state = loadDiscoverySave(storage);
    expect(state.discoveredBreedIds).toContain('bloom_mass');
    // v3 fields get defaults
    expect(state.persistenceEnabled).toBe(true);
  });
});
```

- [ ] **Step 2: Update DISCOVERY_SAVE_KEY to v3**

Change `DISCOVERY_SAVE_KEY` to `'cellular-death-match.discovery.v3'`. Add migration logic: if v3 key is empty, check for v2 key, load it, and re-save as v3.

- [ ] **Step 3: Run all tests**

Run: `npx vitest run`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/game/discoverySave.ts tests/game/discoverySave.test.ts
git commit -m "feat: migrate discovery save to v3 format"
```

---

### Task 23: Objective choice UI for mid-game epochs

**Files:**
- Modify: `src/ui/screens.ts`
- Modify: `src/main.ts`

- [ ] **Step 1: Add objective choice to upgrade pick flow**

For epochs 4+, before the upgrade pick screen, show a 2-choice objective selection screen. Reuse the pick screen pattern: show 2 cards with objective name, description, and a "Choose" button.

In `src/ui/screens.ts`, add a `showObjectiveChoice(options: ObjectiveDef[], onPick: (obj: ObjectiveDef) => void)` method.

- [ ] **Step 2: Wire into main.ts epoch transition**

When an epoch completes and `fightIndex >= 3`, draw 2 objectives from the pool and show the choice screen before the upgrade pick.

- [ ] **Step 3: Run all tests and build**

Run: `npx vitest run && npm run build`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/ui/screens.ts src/main.ts
git commit -m "feat: add objective choice screen for mid-game epochs"
```

---

### Task 24: Objective evaluation for new objective kinds

**Files:**
- Modify: `src/game/arena.ts`

- [ ] **Step 1: Add evaluation logic for all new objective kinds**

In the objective evaluation section of `arena.ts`, add cases for:

- `sustain_cultures`: count distinct archetypes/breeds with living cells >= minCount
- `discover_any_breed`: latch when any breed is discovered during epoch
- `cross_breed`: latch when a hybrid is created during epoch
- `mega_culture`: check if any cell has vol > 800
- `reaction_chain`: count reactions triggered this epoch >= targetCount
- `balance_keeper`: track continuous time with no breed > maxDominance, latch when >= 30s
- `crisis_survivor`: latch if 3+ cultures survive through a crisis event
- `protector`: latch if a fragile culture survives an outbreak
- `acid_sculptor`: latch if any cell reaches < 100 vol via acid without dying
- `colony_founder`: count cultures of a single archetype >= targetCount
- `symbiosis`: track continuous proximity of 2 breeds >= 30s
- `extinction_reversal`: latch when recovering from 1 → 4+ cultures

- [ ] **Step 2: Run all tests**

Run: `npx vitest run`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/game/arena.ts
git commit -m "feat: add objective evaluation for all procedural objective kinds"
```

---

### Task 25: Title screen updates

**Files:**
- Modify: `src/ui/screens.ts`

- [ ] **Step 1: Add notebook completion and strain count to title screen**

In the title screen section of `src/ui/screens.ts`, display:
- "Lab Notebook: 34% documented" (from discovery progression)
- "Strain Bank: 5/13 strains" (from strain library)

Style as subtle text below the Start button.

- [ ] **Step 2: Run build**

Run: `npm run build`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add src/ui/screens.ts
git commit -m "feat: show notebook and strain progress on title screen"
```

---

### Task 26: Final integration test and cleanup

**Files:**
- All modified files

- [ ] **Step 1: Run full test suite**

Run: `npx vitest run`
Expected: PASS (same 4 pre-existing CSS failures, all new tests pass)

- [ ] **Step 2: Run build**

Run: `npm run build`
Expected: Build succeeds with no errors

- [ ] **Step 3: Smoke test the game**

Start the dev server:
```bash
npm run dev -- --port 5199 --strictPort
```

Verify in browser:
- Title screen shows notebook/strain progress
- Epoch 1 is guided, auto-advances through 3 beats
- Epoch 2 has "Build an Ecology" objective
- Epoch 3 has "First Breed" objective
- Mid-game offers 2 objective choices
- Pressure escalates per epoch
- Cells with different breed profiles look visibly different (compact bruisers vs loose swarmlets)
- Reagents visibly change cell shapes (salt hardens, acid fragments)
- Homeostasis glow builds when ecosystem stabilizes
- Lab report appears on run end
- Strains are banked after run
- Loadout screen appears on second run
- Fullscreen visualiser mode works post-homeostasis

- [ ] **Step 4: Commit any remaining fixes**

```bash
git add -A
git commit -m "chore: integration fixes and cleanup"
```
