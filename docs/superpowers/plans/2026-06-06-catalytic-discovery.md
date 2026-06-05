# Catalytic Discovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add hybrid catalytic discovery: violent-but-recoverable reagent reactions, stronger water behavior, hidden breed discoveries, folding faults, clear dish event signposting, runtime UI cleanup, lifeform inspection, retro VDU monitor upgrades, and optional discovery persistence/debug controls.

**Architecture:** Keep `src/sim/` generic. Put tunable reaction and ecology data in `src/content/ecologyTuning.ts` and `src/content/catalysis.ts`. Keep runtime orchestration in `src/game/arena.ts`, with localStorage persistence isolated in `src/game/discoverySave.ts` and UI wiring in `src/main.ts`, `src/ui/screens.ts`, and `src/ui/debug.ts`.

**Tech Stack:** Vite, TypeScript, Vitest, browser canvas UI, localStorage.

---

## File Structure

- Create `src/content/ecologyTuning.ts`: all existing arena timings, population caps, objective thresholds, and base tool/reaction numeric constants.
- Create `src/content/catalysis.ts`: recipe definitions, hidden breed definitions, discovery note definitions, helper lookup functions.
- Create `src/game/discoverySave.ts`: injectable localStorage wrapper for optional persistent discoveries.
- Create `src/game/hash.ts`: shared deterministic hash helper for rendering and folding fault local rules.
- Modify `src/content/enemies.ts`: add `breedId?: BreedId` to `EnemySpawn`.
- Modify `src/game/arena.ts`: import tuning/content, detect catalytic reactions, spawn hidden breeds, advance folding faults, expose discovery and dish event state.
- Modify `src/ui/render.ts`: tint hidden breeds, folding-fault affected strains, and short-lived dish event markers.
- Modify `src/ui/screens.ts`: expose discovery/log/debug UI update methods and tone-coded monitor messages.
- Modify `src/ui/debug.ts`: add persistence controls and clear/reveal handlers.
- Modify `src/game/input.ts`: support menu/debug key ownership if Escape handling belongs in the shared input layer.
- Modify `src/main.ts`: wire save state, discovery events, dish log copy, runtime overlay state, and debug callbacks.
- Modify `src/audio/ecologyAudio.ts`: add stronger audio accents for catalytic flare, crystal shatter, and discovery.
- Modify `src/styles.css`: retro VDU dish log, event tone colors, debug controls, mobile-safe compact log.
- Modify `index.html`: add debug persistence controls and bump asset cache keys after CSS/JS edits.
- Create or modify tests in `tests/content/`, `tests/game/`, and `tests/ui/` where practical.

---

### Task 1: Extract Ecology Tuning Constants

**Files:**
- Create: `src/content/ecologyTuning.ts`
- Modify: `src/game/arena.ts`
- Create: `tests/content/ecologyTuning.test.ts`

- [ ] **Step 1: Write the tuning content test**

Create `tests/content/ecologyTuning.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  ARENA_TIMING,
  ECOSYSTEM_LIMITS,
  TOOL_TUNING,
  OBJECTIVE_TUNING,
  AGITATION_TUNING,
} from '../../src/content/ecologyTuning';

describe('ecology tuning', () => {
  it('defines positive timing intervals', () => {
    expect(ARENA_TIMING.defaultEpochTicks).toBeGreaterThan(0);
    expect(ARENA_TIMING.mutationIntervalTicks).toBeGreaterThan(0);
    expect(ARENA_TIMING.reseedIntervalTicks).toBeGreaterThan(0);
    expect(ARENA_TIMING.outbreakIntervalTicks).toBeGreaterThan(0);
    expect(ARENA_TIMING.accidentIntervalTicks).toBeGreaterThan(0);
    expect(ARENA_TIMING.crisisIntervalTicks).toBeGreaterThan(0);
  });

  it('keeps ecosystem population caps coherent', () => {
    expect(ECOSYSTEM_LIMITS.minPopulation).toBeGreaterThan(0);
    expect(ECOSYSTEM_LIMITS.maxPopulation).toBeGreaterThan(ECOSYSTEM_LIMITS.minPopulation);
    expect(ECOSYSTEM_LIMITS.quietEggRefillPopulation).toBeLessThan(ECOSYSTEM_LIMITS.minPopulation);
  });

  it('defines each lab tool radius and ttl', () => {
    for (const tool of ['nutrient', 'toxin', 'water', 'salt', 'acid'] as const) {
      expect(TOOL_TUNING[tool].radius).toBeGreaterThan(0);
      expect(TOOL_TUNING[tool].ttl).toBeGreaterThan(0);
    }
  });

  it('keeps objective thresholds in playable ranges', () => {
    expect(OBJECTIVE_TUNING.cullRedMaxVol).toBeGreaterThan(0);
    expect(OBJECTIVE_TUNING.bloomMinCoverage).toBeGreaterThan(0);
    expect(OBJECTIVE_TUNING.bloomMinCoverage).toBeLessThan(1);
    expect(OBJECTIVE_TUNING.sterilizeMaxCoverage).toBeGreaterThan(0);
    expect(OBJECTIVE_TUNING.sterilizeMaxCoverage).toBeLessThan(OBJECTIVE_TUNING.bloomMinCoverage);
  });

  it('defines agitation tuning without hidden zero values', () => {
    expect(AGITATION_TUNING.defaultCharges).toBeGreaterThan(0);
    expect(AGITATION_TUNING.durationTicks).toBeGreaterThan(0);
    expect(AGITATION_TUNING.extraSpeed).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run the red test**

Run: `npm test -- tests/content/ecologyTuning.test.ts`

Expected: FAIL because `src/content/ecologyTuning.ts` does not exist.

- [ ] **Step 3: Create `src/content/ecologyTuning.ts`**

Create exports with the current arena values:

```ts
export const ARENA_TIMING = {
  defaultEpochTicks: 60 * 75,
  mutationIntervalTicks: 60 * 10,
  reseedIntervalTicks: 60 * 5,
  outbreakIntervalTicks: 60 * 7,
  resupplyIntervalTicks: 60 * 11,
  accidentIntervalTicks: 60 * 13,
  emergencyEggRefillTicks: 60 * 8,
  crisisIntervalTicks: 60 * 18,
} as const;

export const ECOSYSTEM_LIMITS = {
  minPopulation: 5,
  quietEggRefillPopulation: 2,
  maxPopulation: 28,
  playerThreatRange: 16,
  maxToolEffects: 12,
  outbreakMinTargetVol: 360,
  outbreakHunterCount: 3,
} as const;

export const TOOL_TUNING = {
  nutrient: { radius: 20, ttl: 60 * 8 },
  toxin: { radius: 24, ttl: 60 * 7 },
  water: { radius: 28, ttl: 60 * 7 },
  salt: { radius: 18, ttl: 60 * 9 },
  acid: { radius: 17, ttl: 60 * 5 },
} as const;

export const TOOL_EFFECT_TUNING = {
  nutrientPulseGrowth: 80,
  nutrientGrowthPerTick: 1.8,
  nutrientPullSpeed: 5.5,
  toxinPulseDamage: 42,
  toxinShrinkPerTick: 0.24,
  toxinFleeSpeed: 13,
  waterPulseGrowth: 34,
  waterGrowthPerTick: 0.58,
  waterSpreadSpeed: 4.2,
  saltPulseDamage: 24,
  saltShrinkPerTick: 0.38,
  saltMaxSpeed: 3.6,
  acidPulseDamage: 76,
  acidShrinkPerTick: 0.66,
  acidFleeSpeed: 9,
  bloomGrowthPerTick: 3.1,
  brineShrinkPerTick: 0.72,
} as const;

export const OBJECTIVE_TUNING = {
  cullRedMaxVol: 180,
  cullBlueMin: 2,
  preserveBlueMin: 1,
  bloomMinCoverage: 0.10,
  sterilizeMaxCoverage: 0.04,
  balanceMaxDominance: 0.56,
  balanceBlueMin: 2,
} as const;

export const AGITATION_TUNING = {
  defaultCharges: 2,
  durationTicks: 90,
  minSpeed: 10,
  extraSpeed: 14,
} as const;
```

- [ ] **Step 4: Replace arena constants with imports**

In `src/game/arena.ts`, import the tuning objects and replace direct constants. Keep small local aliases only when they improve readability:

```ts
import {
  AGITATION_TUNING,
  ARENA_TIMING,
  ECOSYSTEM_LIMITS,
  OBJECTIVE_TUNING,
  TOOL_EFFECT_TUNING,
  TOOL_TUNING,
} from '../content/ecologyTuning';
```

Replace examples:

```ts
const epochTicks = opts.epochTicks ?? ARENA_TIMING.defaultEpochTicks;
const maxAgitationCharges = opts.player.agitationCharges ?? AGITATION_TUNING.defaultCharges;
if (tickNo % ARENA_TIMING.mutationIntervalTicks === 0) { ... }
if (archetypes.size >= ECOSYSTEM_LIMITS.maxPopulation) return null;
cell.targetVol = clamp(cell.targetVol + TOOL_EFFECT_TUNING.waterGrowthPerTick * strength, 25, 2200);
```

- [ ] **Step 5: Verify tuning extraction**

Run: `npm test -- tests/content/ecologyTuning.test.ts tests/game/arena.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/content/ecologyTuning.ts src/game/arena.ts tests/content/ecologyTuning.test.ts
git commit -m "refactor: extract ecosystem tuning constants"
```

---

### Task 2: Add Catalysis Content Definitions

**Files:**
- Create: `src/content/catalysis.ts`
- Create: `tests/content/catalysis.test.ts`
- Modify: `src/content/enemies.ts`

- [ ] **Step 1: Write catalysis content tests**

Create `tests/content/catalysis.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  BREED_DEFS,
  DISCOVERY_NOTES,
  REACTION_RECIPES,
  reactionRecipeFor,
  type BreedId,
} from '../../src/content/catalysis';

describe('catalysis content', () => {
  it('defines the initial hidden breed set', () => {
    const ids = Object.keys(BREED_DEFS).sort();
    expect(ids).toEqual([
      'bloom_mass',
      'folded_anchor',
      'glass_antibody',
      'needle_swarm',
      'static_lattice',
    ]);
  });

  it('keeps hidden breed definitions mechanically complete', () => {
    for (const def of Object.values(BREED_DEFS)) {
      expect(def.name.length).toBeGreaterThan(4);
      expect(def.baseArchetype).toBeTruthy();
      expect(def.traits.length).toBeGreaterThanOrEqual(1);
      expect(def.targetVolMultiplier).toBeGreaterThan(0);
      expect(def.speedMultiplier).toBeGreaterThan(0);
      expect(def.engulfMultiplier).toBeGreaterThan(0);
      expect(def.tint.length).toBe(3);
    }
  });

  it('defines reaction recipes with caution and effect type', () => {
    for (const recipe of REACTION_RECIPES) {
      expect(recipe.id.length).toBeGreaterThan(4);
      expect(recipe.inputs.length).toBeGreaterThanOrEqual(2);
      expect(['stable', 'volatile', 'critical']).toContain(recipe.caution);
      expect(recipe.effect.type).toBeTruthy();
      expect(recipe.discoveryNoteId.length).toBeGreaterThan(4);
    }
  });

  it('finds recipes without depending on input order', () => {
    const a = reactionRecipeFor(['water', 'nutrient'], { traits: ['budding'], archetypes: ['swarmlet'] });
    const b = reactionRecipeFor(['nutrient', 'water'], { traits: ['budding'], archetypes: ['swarmlet'] });
    expect(a?.id).toBe('nutrient_conduit');
    expect(b?.id).toBe('nutrient_conduit');
  });

  it('maps every breed to a discovery note', () => {
    for (const id of Object.keys(BREED_DEFS) as BreedId[]) {
      expect(DISCOVERY_NOTES[`breed_${id}`]).toBeDefined();
    }
  });
});
```

- [ ] **Step 2: Run the red test**

Run: `npm test -- tests/content/catalysis.test.ts`

Expected: FAIL because `src/content/catalysis.ts` does not exist.

- [ ] **Step 3: Create `src/content/catalysis.ts`**

Create the data module:

```ts
import type { EnemyArchetype } from './enemies';
import type { TraitId } from './ecology';

export type CautionLevel = 'stable' | 'volatile' | 'critical';
export type CatalysisEffectType =
  | 'nutrient'
  | 'toxin'
  | 'water'
  | 'salt'
  | 'acid'
  | 'bloom'
  | 'brine'
  | 'lysis'
  | 'foam'
  | 'conduit'
  | 'flare'
  | 'crystal'
  | 'fold_fault';
export type ReactionRecipeId =
  | 'nutrient_conduit'
  | 'acid_toxin_flare'
  | 'salt_water_crystal'
  | 'agitated_chain'
  | 'folding_fault';
export type BreedId =
  | 'needle_swarm'
  | 'folded_anchor'
  | 'glass_antibody'
  | 'bloom_mass'
  | 'static_lattice';
export type DiscoveryNoteId = `recipe_${ReactionRecipeId}` | `breed_${BreedId}` | 'water_carries' | 'water_dilutes';

export interface ReactionContext {
  traits: TraitId[];
  archetypes: EnemyArchetype[];
  agitated?: boolean;
}

export interface ReactionRecipe {
  id: ReactionRecipeId;
  name: string;
  inputs: CatalysisEffectType[];
  traits?: TraitId[];
  archetypes?: EnemyArchetype[];
  caution: CautionLevel;
  discoveryNoteId: DiscoveryNoteId;
  effect: {
    type: CatalysisEffectType;
    radiusBonus: number;
    ttl: number;
  };
}

export interface BreedDef {
  id: BreedId;
  name: string;
  baseArchetype: EnemyArchetype;
  traits: TraitId[];
  targetVolMultiplier: number;
  speedMultiplier: number;
  engulfMultiplier: number;
  instabilityMultiplier: number;
  tint: [number, number, number];
  discoveryTrigger: string;
}
```

Define `BREED_DEFS`, `REACTION_RECIPES`, `DISCOVERY_NOTES`, and:

```ts
export function reactionRecipeFor(
  inputs: readonly CatalysisEffectType[],
  context: ReactionContext,
): ReactionRecipe | undefined {
  return REACTION_RECIPES.find((recipe) => {
    const hasInputs = recipe.inputs.every((input) => inputs.includes(input));
    if (!hasInputs) return false;
    const traitOk = !recipe.traits || recipe.traits.some((trait) => context.traits.includes(trait));
    const archetypeOk = !recipe.archetypes || recipe.archetypes.some((archetype) => context.archetypes.includes(archetype));
    const agitationOk = recipe.id !== 'agitated_chain' || context.agitated === true;
    return traitOk && archetypeOk && agitationOk;
  });
}
```

Use fictional names only. Do not include real-world disease terms.

`src/content/catalysis.ts` must not import from `src/game/arena.ts`. Arena may map `CatalysisEffectType` to its runtime `ToolEffectType`, but content definitions should stay game-orchestrator independent.

- [ ] **Step 4: Add `breedId` to enemy spawns**

Modify `src/content/enemies.ts`:

```ts
import type { BreedId } from './catalysis';

export interface EnemySpawn {
  archetype: EnemyArchetype;
  breedId?: BreedId;
  targetVol: number;
  speed: number;
  engulfMultiplier: number;
  instability?: number;
  shootCooldown?: number;
  bulletSize?: number;
  bulletSpeed?: number;
  traits?: TraitId[];
}
```

- [ ] **Step 5: Verify catalysis content**

Run: `npm test -- tests/content/catalysis.test.ts tests/content/enemies.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/content/catalysis.ts src/content/enemies.ts tests/content/catalysis.test.ts
git commit -m "feat: define catalytic reactions and hidden breeds"
```

---

### Task 3: Add Discovery Save Data

**Files:**
- Create: `src/game/discoverySave.ts`
- Create: `tests/game/discoverySave.test.ts`

- [ ] **Step 1: Write save tests**

Create `tests/game/discoverySave.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  clearDiscoverySave,
  createMemoryStorage,
  loadDiscoverySave,
  revealAllDiscoveries,
  saveDiscoveryState,
  setDiscoveryPersistence,
} from '../../src/game/discoverySave';

describe('discovery save', () => {
  it('defaults to disabled persistence and empty discoveries', () => {
    const storage = createMemoryStorage();
    expect(loadDiscoverySave(storage)).toEqual({
      persistenceEnabled: false,
      discoveredBreedIds: [],
      discoveredNoteIds: [],
      revealAll: false,
    });
  });

  it('persists discoveries only when persistence is enabled', () => {
    const storage = createMemoryStorage();
    saveDiscoveryState(storage, {
      persistenceEnabled: false,
      discoveredBreedIds: ['needle_swarm'],
      discoveredNoteIds: ['breed_needle_swarm'],
      revealAll: false,
    });
    expect(loadDiscoverySave(storage).discoveredBreedIds).toEqual([]);

    setDiscoveryPersistence(storage, true);
    saveDiscoveryState(storage, {
      persistenceEnabled: true,
      discoveredBreedIds: ['needle_swarm'],
      discoveredNoteIds: ['breed_needle_swarm'],
      revealAll: false,
    });
    expect(loadDiscoverySave(storage).discoveredBreedIds).toEqual(['needle_swarm']);
  });

  it('clears saved discoveries but keeps persistence preference', () => {
    const storage = createMemoryStorage();
    setDiscoveryPersistence(storage, true);
    revealAllDiscoveries(storage);
    clearDiscoverySave(storage);
    expect(loadDiscoverySave(storage)).toEqual({
      persistenceEnabled: true,
      discoveredBreedIds: [],
      discoveredNoteIds: [],
      revealAll: false,
    });
  });

  it('falls back safely on corrupt JSON', () => {
    const storage = createMemoryStorage();
    storage.setItem('cellular-death-match.discovery.v1', '{bad json');
    expect(loadDiscoverySave(storage).discoveredBreedIds).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the red test**

Run: `npm test -- tests/game/discoverySave.test.ts`

Expected: FAIL because the save module does not exist.

- [ ] **Step 3: Implement `src/game/discoverySave.ts`**

Create:

```ts
import { BREED_DEFS, DISCOVERY_NOTES, type BreedId, type DiscoveryNoteId } from '../content/catalysis';

export interface DiscoveryStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface DiscoverySaveState {
  persistenceEnabled: boolean;
  discoveredBreedIds: BreedId[];
  discoveredNoteIds: DiscoveryNoteId[];
  revealAll: boolean;
}

export const DISCOVERY_SAVE_KEY = 'cellular-death-match.discovery.v1';

export function createMemoryStorage(): DiscoveryStorage {
  const data = new Map<string, string>();
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => { data.set(key, value); },
    removeItem: (key) => { data.delete(key); },
  };
}
```

Implement `loadDiscoverySave`, `saveDiscoveryState`, `setDiscoveryPersistence`, `clearDiscoverySave`, and `revealAllDiscoveries`. Validate loaded IDs against `BREED_DEFS` and `DISCOVERY_NOTES` so corrupt or obsolete saves cannot crash the game.

- [ ] **Step 4: Verify save behavior**

Run: `npm test -- tests/game/discoverySave.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/game/discoverySave.ts tests/game/discoverySave.test.ts
git commit -m "feat: add optional discovery save data"
```

---

### Task 4: Implement Stronger Water Behavior

**Files:**
- Modify: `src/game/arena.ts`
- Modify: `tests/game/arena.test.ts`

- [ ] **Step 1: Write water behavior tests**

Add tests to `tests/game/arena.test.ts` under `describe('arena ecosystem mode', ...)`:

```ts
it('lets water extend nutrient fields into a conduit', () => {
  const arena = createArena({
    LX: 80,
    LY: 80,
    seed: 210,
    player: { targetVol: 100, speed: 10, engulfMultiplier: 5, bulletSize: 3 },
    enemies: [{ archetype: 'swarmlet' as const, targetVol: 120, speed: 8, engulfMultiplier: 4, traits: ['budding'] }],
    wrap: false,
    mode: 'ecosystem',
    epochTicks: 60 * 20,
  });
  const cell = arena.state.cells.get(2)!;
  expect(arena.applyTool('nutrient', cell.center)).toBe(true);
  expect(arena.applyTool('water', [cell.center[0] + 4, cell.center[1]])).toBe(true);

  const conduit = arena.getToolEffects().find((effect) => effect.type === 'conduit');
  expect(conduit).toBeDefined();
  expect(arena.getEcology().signals.some((signal) => signal.includes('water carried nutrient'))).toBe(true);
});

it('lets water soften acid pressure when used after a flare', () => {
  const arena = createArena({
    LX: 80,
    LY: 80,
    seed: 211,
    player: { targetVol: 100, speed: 10, engulfMultiplier: 5, bulletSize: 3 },
    enemies: [{ archetype: 'swarmlet' as const, targetVol: 120, speed: 8, engulfMultiplier: 4 }],
    wrap: false,
    mode: 'ecosystem',
    epochTicks: 60 * 20,
  });
  const cell = arena.state.cells.get(2)!;
  expect(arena.applyTool('acid', cell.center)).toBe(true);
  const acidBefore = arena.getToolEffects().find((effect) => effect.type === 'acid')!;
  expect(arena.applyTool('water', cell.center)).toBe(true);
  const acidAfter = arena.getToolEffects().find((effect) => effect.type === 'acid')!;
  expect(acidAfter.radius).toBeGreaterThan(acidBefore.radius);
  expect(acidAfter.ttl).toBeLessThanOrEqual(acidBefore.ttl);
  expect(arena.getEcology().signals.some((signal) => signal.includes('water diluted'))).toBe(true);
});
```

- [ ] **Step 2: Run the red tests**

Run: `npm test -- tests/game/arena.test.ts -t "water"`

Expected: FAIL because `conduit` does not exist and water does not dilute acid fields.

- [ ] **Step 3: Add new effect type**

In `src/game/arena.ts`, extend `ToolEffectType`:

```ts
export type ToolEffectType =
  | Exclude<LabTool, 'egg'>
  | 'bloom'
  | 'brine'
  | 'lysis'
  | 'foam'
  | 'conduit'
  | 'flare'
  | 'crystal'
  | 'fold_fault'
  | 'mutation'
  | 'hatch';
```

- [ ] **Step 4: Implement water field transformations**

Add a helper near `reactionFor`:

```ts
function applyWaterTransformations(
  newEffect: ToolEffect,
  effects: ToolEffect[],
  pushSignal: (message: string) => void,
): ToolEffect | null {
  if (newEffect.type !== 'water') return null;
  const nutrient = nearestOverlappingEffect(newEffect, effects, 'nutrient');
  if (nutrient) {
    nutrient.radius = clamp(nutrient.radius + 10, nutrient.radius, 62);
    nutrient.ttl = Math.min(nutrient.maxTtl + 60, nutrient.ttl + 60);
    pushSignal('Lab note: water carried nutrient farther.');
    return derivedEffect('conduit', newEffect, nutrient, newEffect.seed, 60 * 5, 12);
  }

  const acid = nearestOverlappingEffect(newEffect, effects, 'acid');
  if (acid) {
    acid.radius = clamp(acid.radius + 8, acid.radius, 54);
    acid.ttl = Math.max(30, Math.floor(acid.ttl * 0.55));
    pushSignal('Lab note: water diluted the acid field.');
    return null;
  }

  const toxin = nearestOverlappingEffect(newEffect, effects, 'toxin');
  if (toxin) {
    toxin.radius = clamp(toxin.radius + 6, toxin.radius, 58);
    toxin.ttl = Math.max(45, Math.floor(toxin.ttl * 0.7));
    pushSignal('Lab note: water softened toxin pressure.');
    return null;
  }

  return null;
}
```

Implement `nearestOverlappingEffect` and `derivedEffect` with existing distance logic. Call this after `toolEffects.push(effect)` for non-egg tools.

- [ ] **Step 5: Add conduit behavior**

In `pulseToolEffect` and `applyToolEffects`, treat `conduit` as a stronger nutrient/water hybrid:

```ts
if (effect.type === 'conduit') {
  cell.targetVol = clamp(cell.targetVol + TOOL_EFFECT_TUNING.waterPulseGrowth * 1.25 * strength, 25, 2400);
}
```

In per-tick effects, pull like nutrient but spread slightly like water:

```ts
} else if (effect.type === 'conduit') {
  vx += dirX * strength * 0.4;
  vy += dirY * strength * 0.4;
  speedBoost += TOOL_EFFECT_TUNING.waterSpreadSpeed * 0.75 * strength;
  cell.targetVol = clamp(cell.targetVol + TOOL_EFFECT_TUNING.waterGrowthPerTick * 1.6 * strength, 25, 2400);
}
```

- [ ] **Step 6: Verify water behavior**

Run: `npm test -- tests/game/arena.test.ts -t "water"`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/game/arena.ts tests/game/arena.test.ts
git commit -m "feat: deepen water reagent behavior"
```

---

### Task 5: Implement Catalytic Reaction Detection

**Files:**
- Modify: `src/game/arena.ts`
- Modify: `src/main.ts`
- Modify: `src/audio/ecologyAudio.ts`
- Modify: `tests/game/arena.test.ts`

- [ ] **Step 1: Write catalytic reaction tests**

Add:

```ts
it('creates a critical acid toxin flare near fragile life', () => {
  const arena = createArena({
    LX: 80,
    LY: 80,
    seed: 220,
    player: { targetVol: 100, speed: 10, engulfMultiplier: 5, bulletSize: 3 },
    enemies: [{ archetype: 'sniper' as const, targetVol: 140, speed: 10, engulfMultiplier: 1, traits: ['fragile'] }],
    wrap: false,
    mode: 'ecosystem',
    epochTicks: 60 * 20,
  });
  const cell = arena.state.cells.get(2)!;
  expect(arena.applyTool('acid', cell.center)).toBe(true);
  expect(arena.applyTool('toxin', cell.center)).toBe(true);

  expect(arena.getToolEffects().some((effect) => effect.type === 'flare')).toBe(true);
  expect(arena.getEcology().signals.some((signal) => signal.includes('CATALYTIC FLARE'))).toBe(true);
  expect(arena.getEcology().discoveries.noteIds).toContain('recipe_acid_toxin_flare');
});

it('creates a crystal reaction from salt and water near gelatinous life', () => {
  const arena = createArena({
    LX: 80,
    LY: 80,
    seed: 221,
    player: { targetVol: 100, speed: 10, engulfMultiplier: 5, bulletSize: 3 },
    enemies: [{ archetype: 'bruiser' as const, targetVol: 260, speed: 8, engulfMultiplier: 6, traits: ['gelatinous'] }],
    wrap: false,
    mode: 'ecosystem',
    epochTicks: 60 * 20,
  });
  const cell = arena.state.cells.get(2)!;
  expect(arena.applyTool('salt', cell.center)).toBe(true);
  expect(arena.applyTool('water', cell.center)).toBe(true);

  expect(arena.getToolEffects().some((effect) => effect.type === 'crystal')).toBe(true);
  arena.tick({ moveVec: [0, 0], shouldFire: false, shouldEngulf: false });
  expect(cell.intent.speed).toBeLessThanOrEqual(2.6);
});
```

- [ ] **Step 2: Run red tests**

Run: `npm test -- tests/game/arena.test.ts -t "flare|crystal"`

Expected: FAIL because catalytic recipes are not wired.

- [ ] **Step 3: Add discovery state to arena**

In `EcologyInfo`, add:

```ts
discoveries: {
  breedIds: BreedId[];
  noteIds: DiscoveryNoteId[];
  latest: string[];
};
```

Inside `createArena`, add:

```ts
const discoveredBreedIds = new Set<BreedId>();
const discoveredNoteIds = new Set<DiscoveryNoteId>();
const discoveryMessages: string[] = [];

function discoverNote(id: DiscoveryNoteId, message: string): void {
  if (!discoveredNoteIds.has(id)) discoveredNoteIds.add(id);
  discoveryMessages.unshift(message);
  pushSignal(message);
  while (discoveryMessages.length > 8) discoveryMessages.pop();
}
```

Expose it in `getEcology()`.

- [ ] **Step 4: Detect recipes from tool context**

Add:

```ts
function reactionContextFor(
  state: SimState,
  archetypes: Map<CellId, EnemySpawn>,
  effect: ToolEffect,
): ReactionContext {
  const traits: TraitId[] = [];
  const archetypeSet = new Set<EnemyArchetype>();
  for (const [id, cell] of state.cells) {
    if (id === PLAYER_ID || cell.vol <= 0) continue;
    const dist = distanceBetween(state, cell.center, effect.pos);
    if (dist > effect.radius + 10) continue;
    const spawn = archetypes.get(id);
    if (!spawn) continue;
    archetypeSet.add(spawn.archetype);
    for (const trait of spawn.traits ?? []) traits.push(trait);
  }
  return { traits, archetypes: [...archetypeSet] };
}
```

After existing `reactionFor`, check `reactionRecipeFor([effect.type, nearby.type], context)` and create recipe-derived effect. Push all discovery messages in uppercase category style.

- [ ] **Step 5: Implement flare/crystal mechanics**

In `pulseToolEffect`, use high damage for `flare`, salt-like damage for `crystal`, and mutation pulse for flare:

```ts
if (effect.type === 'flare') {
  const toxinMultiplier = toxinMultiplierForCell(archetypes, id);
  cell.targetVol = clamp(cell.targetVol - TOOL_EFFECT_TUNING.acidPulseDamage * 1.35 * strength * toxinMultiplier, 12, 2400);
} else if (effect.type === 'crystal') {
  cell.targetVol = clamp(cell.targetVol - TOOL_EFFECT_TUNING.saltPulseDamage * 0.7 * strength, 12, 2400);
}
```

In `applyToolEffects`, `flare` uses acid flee/shrink, `crystal` clamps speed and shrinks slowly.

- [ ] **Step 6: Wire audio frame counts**

In `src/main.ts`, count `flare`, `crystal`, and `fold_fault` as `reactions`. In `src/audio/ecologyAudio.ts`, make `playReaction` scale intensity from count without adding new dependencies.

- [ ] **Step 7: Verify catalytic reactions**

Run: `npm test -- tests/game/arena.test.ts -t "flare|crystal"`

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/game/arena.ts src/main.ts src/audio/ecologyAudio.ts tests/game/arena.test.ts
git commit -m "feat: add violent catalytic reactions"
```

---

### Task 6: Implement Hidden Breed Discovery

**Files:**
- Modify: `src/game/arena.ts`
- Modify: `src/ui/render.ts`
- Modify: `tests/game/arena.test.ts`

- [ ] **Step 1: Write hidden breed tests**

Add:

```ts
it('discovers needle swarm from sniper pressure and swarmlet crowding', () => {
  const arena = createArena({
    LX: 90,
    LY: 90,
    seed: 230,
    player: { targetVol: 100, speed: 10, engulfMultiplier: 5, bulletSize: 3 },
    enemies: [
      { archetype: 'sniper' as const, targetVol: 140, speed: 10, engulfMultiplier: 1 },
      { archetype: 'swarmlet' as const, targetVol: 90, speed: 14, engulfMultiplier: 4 },
      { archetype: 'swarmlet' as const, targetVol: 90, speed: 14, engulfMultiplier: 4 },
    ],
    wrap: false,
    mode: 'ecosystem',
    epochTicks: 60 * 20,
  });

  for (let i = 0; i < 90; i++) {
    arena.tick({ moveVec: [0, 0], shouldFire: false, shouldEngulf: false });
  }

  expect(arena.getEcology().discoveries.breedIds).toContain('needle_swarm');
  expect(Array.from(arena.archetypes.values()).some((spawn) => spawn.breedId === 'needle_swarm')).toBe(true);
});

it('discovers glass antibody from acid toxin flare survivors', () => {
  const arena = createArena({
    LX: 90,
    LY: 90,
    seed: 231,
    player: { targetVol: 100, speed: 10, engulfMultiplier: 5, bulletSize: 3 },
    enemies: [{ archetype: 'swarmlet' as const, targetVol: 150, speed: 10, engulfMultiplier: 4, traits: ['toxin_resistant', 'fragile'] }],
    wrap: false,
    mode: 'ecosystem',
    epochTicks: 60 * 20,
  });
  const cell = arena.state.cells.get(2)!;
  expect(arena.applyTool('acid', cell.center)).toBe(true);
  expect(arena.applyTool('toxin', cell.center)).toBe(true);
  for (let i = 0; i < 20; i++) arena.tick({ moveVec: [0, 0], shouldFire: false, shouldEngulf: false });
  expect(arena.getEcology().discoveries.breedIds).toContain('glass_antibody');
});
```

- [ ] **Step 2: Run red tests**

Run: `npm test -- tests/game/arena.test.ts -t "discovers"`

Expected: FAIL because breed discovery is not implemented.

- [ ] **Step 3: Add breed spawning helper**

In `arena.ts`:

```ts
function breedSpawnFor(id: BreedId, base?: EnemySpawn): EnemySpawn {
  const def = BREED_DEFS[id];
  const source = base ?? ARCHETYPE_DEFAULTS[def.baseArchetype];
  return {
    ...source,
    archetype: def.baseArchetype,
    breedId: id,
    targetVol: clamp(source.targetVol * def.targetVolMultiplier, 45, 1800),
    speed: clamp(source.speed * def.speedMultiplier, 3, 20),
    engulfMultiplier: clamp(source.engulfMultiplier * def.engulfMultiplier, 1, 11),
    instability: (source.instability ?? 1) * def.instabilityMultiplier,
    traits: [...new Set([...(source.traits ?? []), ...def.traits])],
  };
}
```

- [ ] **Step 4: Add discovery helper**

```ts
function discoverBreed(id: BreedId, sourceCell?: Cell): void {
  if (!discoveredBreedIds.has(id)) {
    discoveredBreedIds.add(id);
    const def = BREED_DEFS[id];
    discoverNote(`breed_${id}`, `NEW BREED DISCOVERED: ${def.name}.`);
  }
  if (sourceCell && archetypes.size < ECOSYSTEM_LIMITS.maxPopulation) {
    arena.spawnEnemy({
      spawn: breedSpawnFor(id, archetypes.get(sourceCell.id)),
      pos: [...sourceCell.center],
    });
    birthCount += 1;
  }
}
```

If TypeScript complains because `arena` is referenced before declaration, make `discoverBreed` a nested function after `const arena: Arena = { ... }` is assigned impossible. Instead use `spawnBreed(arena, id, sourceCell)` as a top-level helper and call it from inside methods with `this`.

- [ ] **Step 5: Trigger initial hidden breeds**

Add deterministic checks in ecosystem tick:

- `needle_swarm`: sniper and at least two living swarmlets within 26 px of one another.
- `glass_antibody`: a living cell with `toxin_resistant` and `fragile` survives inside `flare`.
- `bloom_mass`: budding cell gains targetVol over 420 inside `conduit` or `bloom`.
- `static_lattice`: gelatinous cell survives inside `crystal`.
- `folded_anchor`: boss or bruiser survives inside `fold_fault`.

Use a helper:

```ts
function evaluateBreedDiscoveries(
  arena: Arena,
  state: SimState,
  archetypes: Map<CellId, EnemySpawn>,
  effects: ToolEffect[],
  discover: (id: BreedId, sourceCell?: Cell) => void,
): void
```

- [ ] **Step 6: Tint hidden breeds**

In `src/ui/render.ts`, import `BREED_DEFS`. If `spawn.breedId` is present, tint base color with `BREED_DEFS[spawn.breedId].tint` before trait tint.

- [ ] **Step 7: Verify hidden breeds**

Run: `npm test -- tests/game/arena.test.ts -t "discovers"`

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/game/arena.ts src/ui/render.ts tests/game/arena.test.ts
git commit -m "feat: discover hidden lifeform breeds"
```

---

### Task 7: Implement Folding Fault Local Rule

**Files:**
- Create: `src/game/hash.ts`
- Modify: `src/game/arena.ts`
- Modify: `src/main.ts`
- Modify: `tests/game/arena.test.ts`

- [ ] **Step 1: Write folding fault tests**

Add:

```ts
it('spawns a folding fault when agitation amplifies overlapping reactions', () => {
  const arena = createArena({
    LX: 90,
    LY: 90,
    seed: 240,
    player: { targetVol: 100, speed: 10, engulfMultiplier: 5, bulletSize: 3 },
    enemies: [{ archetype: 'boss' as const, targetVol: 900, speed: 6, engulfMultiplier: 6, traits: ['gelatinous'] }],
    wrap: false,
    mode: 'ecosystem',
    epochTicks: 60 * 20,
  });
  const cell = arena.state.cells.get(2)!;
  expect(arena.applyTool('nutrient', cell.center)).toBe(true);
  expect(arena.applyTool('water', cell.center)).toBe(true);
  expect(arena.agitate()).toBe(true);
  expect(arena.getToolEffects().some((effect) => effect.type === 'fold_fault')).toBe(true);
  expect(arena.getEcology().signals.some((signal) => signal.includes('FOLDING FAULT'))).toBe(true);
});

it('folding fault grows asymmetric local structure over time', () => {
  const arena = createArena({
    LX: 90,
    LY: 90,
    seed: 241,
    player: { targetVol: 100, speed: 10, engulfMultiplier: 5, bulletSize: 3 },
    enemies: [{ archetype: 'bruiser' as const, targetVol: 420, speed: 8, engulfMultiplier: 6, traits: ['gelatinous'] }],
    wrap: false,
    mode: 'ecosystem',
    epochTicks: 60 * 20,
  });
  const cell = arena.state.cells.get(2)!;
  expect(arena.applyTool('nutrient', cell.center)).toBe(true);
  expect(arena.applyTool('water', cell.center)).toBe(true);
  expect(arena.agitate()).toBe(true);
  const before = cell.targetVol;
  for (let i = 0; i < 90; i++) arena.tick({ moveVec: [0, 0], shouldFire: false, shouldEngulf: false });
  expect(cell.targetVol).not.toBe(before);
  expect(arena.getEcology().discoveries.noteIds).toContain('recipe_folding_fault');
});
```

- [ ] **Step 2: Run red tests**

Run: `npm test -- tests/game/arena.test.ts -t "folding fault"`

Expected: FAIL because folding faults are not implemented.

- [ ] **Step 3: Create folding fault effect during agitation**

In `agitate()`, after widening fields:

```ts
const overlappingReaction = findOverlappingReaction(toolEffects);
if (overlappingReaction) {
  const fault: ToolEffect = {
    type: 'fold_fault',
    pos: [...overlappingReaction.pos],
    radius: clamp(overlappingReaction.radius + 8, 18, 58),
    ttl: 60 * 5,
    maxTtl: 60 * 5,
    seed: state.rng.randInt(1_000_000),
  };
  toolEffects.push(fault);
  discoverNote('recipe_folding_fault', 'FOLDING FAULT: local rule escaped containment.');
}
```

- [ ] **Step 4: Share deterministic hash helper**

Create `src/game/hash.ts` and move the existing `hash2` implementation from `src/main.ts` unchanged:

```ts
export function hash2(seed: number, x: number, y: number): number {
  let n = Math.imul(x + seed * 374761393, 668265263) ^ Math.imul(y + seed * 1442695041, 2246822519);
  n = (n ^ (n >>> 13)) >>> 0;
  n = Math.imul(n, 1274126177) >>> 0;
  return ((n ^ (n >>> 16)) >>> 0) / 0xffffffff;
}
```

Import `hash2` from `src/game/hash.ts` in both `src/main.ts` and `src/game/arena.ts`.

- [ ] **Step 5: Implement local rule effect**

Add:

```ts
function applyFoldingFault(state: SimState, effect: ToolEffect): void {
  const { LX, LY } = state.grid;
  const phase = effect.maxTtl - effect.ttl;
  for (const [, cell] of state.cells) {
    if (cell.vol <= 0) continue;
    const v = displacementVec(cell.center, effect.pos, LX, LY, state.grid.wrap);
    const dist = Math.hypot(v[0], v[1]);
    if (dist > effect.radius) continue;
    const x = Math.floor(cell.center[0] + phase);
    const y = Math.floor(cell.center[1]);
    const bit = rule30Bit(effect.seed, x, y, phase);
    const strength = (1 - dist / effect.radius) * (effect.ttl / effect.maxTtl);
    if (bit === 1) {
      cell.targetVol = clamp(cell.targetVol + 0.95 * strength, 25, 2400);
      cell.intent.speed = Math.max(cell.intent.speed, 7 + strength * 6);
    } else {
      cell.targetVol = clamp(cell.targetVol - 0.42 * strength, 12, 2400);
    }
  }
}

function rule30Bit(seed: number, x: number, y: number, phase: number): 0 | 1 {
  const left = hash2(seed, x - 1, y + phase) > 0.5 ? 1 : 0;
  const center = hash2(seed + 17, x, y + phase) > 0.5 ? 1 : 0;
  const right = hash2(seed + 31, x + 1, y + phase) > 0.5 ? 1 : 0;
  const pattern = (left << 2) | (center << 1) | right;
  return ((30 >> pattern) & 1) as 0 | 1;
}
```

- [ ] **Step 6: Call folding fault each ecosystem tick**

In the ecosystem branch of `tick`, before normal tool effect expiration:

```ts
for (const effect of toolEffects) {
  if (effect.type === 'fold_fault') applyFoldingFault(state, effect);
}
```

- [ ] **Step 7: Verify folding faults**

Run: `npm test -- tests/game/arena.test.ts -t "folding fault"`

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/game/hash.ts src/game/arena.ts src/main.ts tests/game/arena.test.ts
git commit -m "feat: add folding fault local rules"
```

---

### Task 8: Wire Optional Persistent Discoveries

**Files:**
- Modify: `src/main.ts`
- Modify: `src/ui/debug.ts`
- Modify: `index.html`
- Modify: `tests/game/discoverySave.test.ts`

- [ ] **Step 1: Add debug DOM controls**

In `index.html`, inside the debug controls block, add:

```html
<label class="debug-toggle">
  <input id="dbg-persist-discoveries" type="checkbox" />
  persist discoveries
</label>
<button id="dbg-clear-discoveries" class="debug-mini-button" type="button">clear discoveries</button>
<button id="dbg-reveal-discoveries" class="debug-mini-button" type="button">reveal all</button>
<div class="debug-help" id="dbg-discovery-status">discoveries: run-local</div>
```

- [ ] **Step 2: Extend debug panel API**

In `src/ui/debug.ts`, extend:

```ts
export interface DebugDiscoveryInfo {
  persistenceEnabled: boolean;
  discoveredCount: number;
  revealAll: boolean;
}

export interface DebugPanel {
  update(state: SimState, info: DebugInfo): void;
  setSwatch(cellId: CellId, color: string): void;
  updateDiscoveries(info: DebugDiscoveryInfo): void;
  onDiscoveryPersistenceChange(handler: (enabled: boolean) => void): void;
  onClearDiscoveries(handler: () => void): void;
  onRevealDiscoveries(handler: () => void): void;
}
```

Use nullable element lookups for new debug controls so older HTML failures are explicit in tests/build.

- [ ] **Step 3: Wire save state in `main.ts`**

At startup:

```ts
import {
  clearDiscoverySave,
  loadDiscoverySave,
  revealAllDiscoveries,
  saveDiscoveryState,
  setDiscoveryPersistence,
} from './game/discoverySave';

const discoveryStorage = window.localStorage;
let discoverySave = loadDiscoverySave(discoveryStorage);
```

On each ticker/discovery update, merge arena discoveries with saved state if enabled:

```ts
function persistArenaDiscoveries(ar: Arena): void {
  const discoveries = ar.getEcology().discoveries;
  if (!discoverySave.persistenceEnabled) return;
  discoverySave = {
    ...discoverySave,
    discoveredBreedIds: unique([...discoverySave.discoveredBreedIds, ...discoveries.breedIds]),
    discoveredNoteIds: unique([...discoverySave.discoveredNoteIds, ...discoveries.noteIds]),
  };
  saveDiscoveryState(discoveryStorage, discoverySave);
}
```

Wire debug handlers:

```ts
debug.onDiscoveryPersistenceChange((enabled) => {
  discoverySave = setDiscoveryPersistence(discoveryStorage, enabled);
  debug.updateDiscoveries(discoveryDebugInfo());
});
debug.onClearDiscoveries(() => {
  discoverySave = clearDiscoverySave(discoveryStorage);
  debug.updateDiscoveries(discoveryDebugInfo());
});
debug.onRevealDiscoveries(() => {
  discoverySave = revealAllDiscoveries(discoveryStorage);
  debug.updateDiscoveries(discoveryDebugInfo());
});
```

- [ ] **Step 4: Add status styling**

In `src/styles.css`:

```css
.debug-toggle {
  display: flex;
  align-items: center;
  gap: 7px;
  color: #b8c8bd;
  font-size: 11px;
}

.debug-mini-button {
  width: 100%;
  margin-top: 6px;
  border: 1px solid #2d5140;
  background: #0d1b14;
  color: #baf5c7;
  font: inherit;
  font-size: 11px;
  padding: 6px 8px;
  cursor: pointer;
}
```

- [ ] **Step 5: Bump cache keys**

In `index.html`, update the query strings on `src/styles.css` and `src/main.ts`.

- [ ] **Step 6: Verify build**

Run: `npm run build`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add index.html src/main.ts src/ui/debug.ts src/styles.css
git commit -m "feat: wire discovery persistence debug controls"
```

---

### Task 9: Clean Runtime UI And Add Lifeform Inspector

**Files:**
- Modify: `index.html`
- Modify: `src/main.ts`
- Modify: `src/ui/screens.ts`
- Modify: `src/ui/debug.ts`
- Modify: `src/game/input.ts` if shared keyboard handling is the cleanest integration point.
- Modify: `src/styles.css`

- [ ] **Step 1: Trace current UI ownership**

Read `index.html`, `src/main.ts`, `src/ui/screens.ts`, `src/ui/debug.ts`, and `src/game/input.ts`. Confirm where keyboard input, debug inspector visibility, lifeform list rendering, and static control reminders currently live before editing.

- [ ] **Step 2: Define runtime overlay state**

In `src/main.ts`, add explicit state for UI chrome:

```ts
interface RuntimeOverlayState {
  menuOpen: boolean;
  debugOpen: boolean;
  selectedLifeformId: string | null;
}
```

Use this state to drive CSS classes or `hidden` attributes. The default runtime view should hide the large debug inspector and static control-reminder block.

- [ ] **Step 3: Add Escape menu/debug behavior**

Add Escape behavior:

- Escape opens the menu/debug overlay when closed.
- Escape closes it when open.
- Gameplay keyboard actions should not leak through while the menu is open.
- The main UI may keep one compact hint such as `Esc: menu`.

If `src/game/input.ts` already centralizes key ownership, add a menu-open guard there. If Escape handling is simpler in `src/main.ts`, keep it there and document why in code only if the flow is not obvious.

- [ ] **Step 4: Move control reminders out of the permanent debug panel**

In `index.html`, move the existing always-visible controls copy into an overlay/menu section. Keep FPS, tick, boundary, persistence controls, and save-management actions inside a debug area that is hidden by default.

Do not remove the debug data. The requirement is to recover screen space during normal play, not lose diagnostics.

- [ ] **Step 5: Add lifeform selection API**

In `src/ui/screens.ts`, extend the screen API so the lifeform guide can report hover/focus/click selection and render selected info:

```ts
onLifeformSelect(handler: (id: string) => void): void;
setSelectedLifeform(id: string | null): void;
```

The selected panel should show:

- Lifeform name.
- Short role.
- Traits or discovered breed tags.
- Caution hint when the lifeform participates in volatile recipes.
- Discovery status for hidden breeds.

- [ ] **Step 6: Make lifeform icons compact and expressive**

In `src/styles.css`, reduce the lifeform list footprint. Use small translucent icon buttons with subtle CSS animation:

```css
.life-item {
  min-height: 34px;
  opacity: 0.82;
}

.life-item[aria-selected="true"],
.life-item:focus-visible,
.life-item:hover {
  opacity: 1;
  border-color: var(--life-color);
}

.life-swatch {
  animation: life-idle-pulse 2.8s ease-in-out infinite;
}
```

Keep animation subtle and avoid layout shift. Respect `prefers-reduced-motion`.

- [ ] **Step 7: Browser smoke**

Run dev server and check:

- `375x667`: debug inspector is hidden by default, Escape opens/closes the menu, dish and controls have more breathing room.
- `390x844`: lifeform icons fit without crowding the dish log.
- `1280x720`: lifeform hover/focus/click reveals info without covering the dish.

- [ ] **Step 8: Verify build**

Run: `npm run build`

Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add index.html src/main.ts src/ui/screens.ts src/ui/debug.ts src/game/input.ts src/styles.css
git commit -m "feat: clean runtime UI and inspect lifeforms"
```

---

### Task 10: Add Dish Event Signposting

**Files:**
- Modify: `src/game/arena.ts`
- Modify: `src/ui/render.ts`
- Modify: `src/ui/screens.ts`
- Modify: `src/main.ts`
- Modify: `src/styles.css`
- Modify: `tests/game/arena.test.ts`

- [ ] **Step 1: Write event signposting tests**

Add tests proving important dish events are exposed with location, kind, and short TTL:

```ts
it('emits a dish event marker for visible mutations', () => {
  const arena = createArena({
    LX: 90,
    LY: 90,
    seed: 250,
    player: { targetVol: 100, speed: 10, engulfMultiplier: 5, bulletSize: 3 },
    enemies: [{ archetype: 'swarmlet' as const, targetVol: 120, speed: 10, engulfMultiplier: 4 }],
    wrap: false,
    mode: 'ecosystem',
    epochTicks: 60 * 20,
  });

  const cell = arena.state.cells.get(2)!;
  expect(arena.applyTool('acid', cell.center)).toBe(true);
  expect(arena.applyTool('toxin', cell.center)).toBe(true);
  for (let i = 0; i < 80; i++) arena.tick({ moveVec: [0, 0], shouldFire: false, shouldEngulf: false });

  expect(arena.getDishEvents().some((event) => event.kind === 'mutation' && event.ttl > 0)).toBe(true);
});

it('emits color-coded dish event markers for catalytic reactions', () => {
  const arena = createArena({
    LX: 90,
    LY: 90,
    seed: 251,
    player: { targetVol: 100, speed: 10, engulfMultiplier: 5, bulletSize: 3 },
    enemies: [{ archetype: 'swarmlet' as const, targetVol: 120, speed: 10, engulfMultiplier: 4, traits: ['fragile'] }],
    wrap: false,
    mode: 'ecosystem',
    epochTicks: 60 * 20,
  });
  const cell = arena.state.cells.get(2)!;
  expect(arena.applyTool('acid', cell.center)).toBe(true);
  expect(arena.applyTool('toxin', cell.center)).toBe(true);
  expect(arena.getDishEvents().some((event) => event.kind === 'critical' && event.color === 'red')).toBe(true);
});
```

- [ ] **Step 2: Add event marker types**

In `src/game/arena.ts`:

```ts
export type DishEventKind = 'mutation' | 'discovery' | 'caution' | 'critical' | 'stabilize' | 'fold';

export interface DishEventMarker {
  id: number;
  kind: DishEventKind;
  label: string;
  pos: Vec2;
  radius: number;
  ttl: number;
  maxTtl: number;
  color: 'amber' | 'cyan' | 'green' | 'red' | 'violet';
}
```

Add `getDishEvents(): DishEventMarker[]` to `Arena`. Keep markers in arena because they are tied to simulation position, but keep styling decisions minimal and data-like.

- [ ] **Step 3: Emit markers for important events**

Emit markers when:

- A visible mutation happens.
- A catalytic recipe fires.
- A folding fault spawns.
- A hidden breed is discovered or spawned.
- Water dilutes a dangerous field.

Use consistent kind/color mapping:

- `mutation`: amber.
- `discovery`: cyan.
- `caution`: amber.
- `critical`: red.
- `stabilize`: green.
- `fold`: violet.

- [ ] **Step 4: Add palette cycling for mutation-class events**

Add a small visual-only palette cycle for mutation, fold, and critical markers. Keep it data-driven so it can be tuned:

```ts
const DISH_EVENT_PALETTES = {
  mutation: ['#f6d365', '#fda085', '#b771ff', '#66e3ff'],
  fold: ['#8f7cff', '#45f0d1', '#f6d365', '#ff6b9d'],
  critical: ['#ff6b4a', '#ffd166', '#ff3b7a', '#ffffff'],
} as const;
```

Use the event age to select the current color, similar to old C64-style color cycling:

```ts
function cycledDishEventColor(event: DishEventMarker, frame: number): string {
  const palette = DISH_EVENT_PALETTES[event.kind as keyof typeof DISH_EVENT_PALETTES];
  if (!palette) return colorForDishEvent(event.color);
  const speed = event.kind === 'critical' ? 3 : 5;
  return palette[Math.floor(frame / speed) % palette.length]!;
}
```

Respect `prefers-reduced-motion` by disabling fast cycling and using a single tone or slow alpha pulse.

- [ ] **Step 5: Decay event markers**

Each ecosystem tick, decrement `ttl` and remove expired markers. Cap marker count, for example `ECOSYSTEM_LIMITS.maxDishEvents`, so repeated reactions cannot flood the renderer.

- [ ] **Step 6: Render event markers**

In `src/ui/render.ts`, draw short-lived marker rings after fields and before foreground cells:

```ts
function drawDishEventMarker(ctx: CanvasRenderingContext2D, event: DishEventMarker): void {
  const t = event.ttl / event.maxTtl;
  ctx.save();
  ctx.globalAlpha = 0.18 + 0.55 * t;
  ctx.strokeStyle = cycledDishEventColor(event, frame);
  ctx.lineWidth = 1.5 + (1 - t) * 3;
  ctx.beginPath();
  ctx.arc(event.pos[0], event.pos[1], event.radius + (1 - t) * 12, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}
```

Keep labels off the mobile canvas by default. If adding glyphs, use tiny symbols only and test overlap.

- [ ] **Step 7: Match monitor log tones**

In `src/ui/screens.ts` and `src/main.ts`, map the same event categories to monitor line tones so a red dish pulse and red/critical log line refer to the same moment.

- [ ] **Step 8: Verify signposting**

Run: `npm test -- tests/game/arena.test.ts -t "dish event|visible mutations|catalytic reactions"`

Expected: PASS.

Run: `npm run build`

Expected: PASS.

- [ ] **Step 9: Browser smoke**

Check:

- `375x667`: event rings are visible but do not cover thumb controls.
- `390x844`: visible mutation pulses can be seen in the dish.
- `1280x720`: reaction pulses, palette-cycled mutation/fold events, cell tint, and monitor log tone are visually connected.

- [ ] **Step 10: Commit**

```bash
git add src/game/arena.ts src/ui/render.ts src/ui/screens.ts src/main.ts src/styles.css tests/game/arena.test.ts
git commit -m "feat: signpost dish events"
```

---

### Task 11: Upgrade Dish Log To Retro VDU Discovery Terminal

**Files:**
- Modify: `src/styles.css`
- Modify: `src/main.ts`
- Modify: `src/ui/screens.ts`
- Modify: `index.html`

- [ ] **Step 1: Add log message categories**

In `src/ui/screens.ts`, change `addTicker(message: string)` to:

```ts
addTicker(message: string, tone?: 'normal' | 'discovery' | 'caution' | 'critical'): void;
```

Apply class:

```ts
line.className = `ticker-line ${tone ? `ticker-line-${tone}` : ''}`.trim();
```

- [ ] **Step 2: Update call sites**

In `src/main.ts`, use tones:

```ts
screens.addTicker('Predator outbreak: hunter cells erupted from the dominant lineage.', 'critical');
screens.addTicker('Visible mutation: a lineage expressed a new trait.', 'discovery');
screens.addTicker('Reagent reaction: unstable chemistry is blooming.', 'caution');
```

For arena signals:

```ts
const tone = signal.startsWith('NEW BREED DISCOVERED')
  ? 'discovery'
  : signal.startsWith('CAUTION') || signal.startsWith('CATALYTIC')
    ? 'caution'
    : 'normal';
screens.addTicker(signal, tone);
```

- [ ] **Step 3: Apply retro VDU styling**

In `src/styles.css`, update `.ticker-line` and tone-specific ticker classes:

```css
.ticker-line {
  background:
    linear-gradient(rgba(180, 220, 190, 0.045), rgba(140, 180, 170, 0.02)),
    rgba(5, 13, 15, 0.9);
  border-color: #2d4f55;
  color: #d6f2dc;
  font-size: 12px;
}

.ticker-line-discovery {
  border-color: #7ee6ff;
  color: #d8f8ff;
}

.ticker-line-caution {
  border-color: #d6d35e;
  color: #f4f0a2;
}

.ticker-line-critical {
  border-color: #ff7b5c;
  color: #ffd0c4;
}

.ticker-line-normal {
  border-color: #2d4f55;
}
```

Use green as one monitor accent, not the whole language. Discovery can be cyan, caution amber, critical red, mutation amber/violet, and stabilize/water green.

Desktop should show up to five lines:

```css
@media (min-width: 900px) {
  .ticker-line:nth-child(n + 6) {
    display: none;
  }
}
```

Mobile remains compact:

```css
.ticker-line:nth-child(n + 3) {
  display: none;
}
```

- [ ] **Step 4: Bump cache keys**

In `index.html`, update CSS and JS query strings.

- [ ] **Step 5: Verify build**

Run: `npm run build`

Expected: PASS.

- [ ] **Step 6: Browser smoke**

Run dev server and check:

- `375x667`: title wraps, arena starts, log does not cover dish or controls.
- `390x844`: life panel, HUD, and controls remain readable.
- `1280x720`: ticker reads as a retro VDU monitor, uses multiple event colors, and is fully visible.

- [ ] **Step 7: Commit**

```bash
git add index.html src/main.ts src/ui/screens.ts src/styles.css
git commit -m "feat: restyle dish log as VDU discovery terminal"
```

---

### Task 12: Full Verification And Tuning Pass

**Files:**
- Modify only tuning/content files unless tests prove code changes are required.

- [ ] **Step 1: Run full tests**

Run: `npm test`

Expected: all tests pass.

- [ ] **Step 2: Run build**

Run: `npm run build`

Expected: TypeScript and Vite build pass.

- [ ] **Step 3: Browser smoke**

Start or reuse dev server. Verify:

- `375x667`: no horizontal overflow, dish centered, tool controls reachable.
- `390x844`: HUD/life panel/toolbox/debug menu do not overlap incoherently.
- `1280x720`: dish, tool monitor, HUD, life guide, inspector, event markers, and VDU log are visible.

Expected: no console errors and canvas is nonblank after entering ecosystem.

- [ ] **Step 4: Gameplay tuning checklist**

Play at least two epochs and tune only data constants for these outcomes:

- Water should be useful with nutrient, acid, and toxin.
- Acid/toxin flare should look violent but leave some recoverable path.
- Salt/water crystal should slow and reshape, not simply delete everything.
- Folding fault should be rare enough to feel special.
- Hidden breed discovery should happen in a normal run without requiring exact pixel-perfect setup.
- Debug/FPS/controls are reachable from Escape but not permanently crowding normal play.
- Lifeform icons are compact, selectable, and readable through hover/focus/click info.
- Dish log should explain discoveries without becoming noisy.
- Dish event markers should make visible mutations and reactions obvious without becoming noisy.

- [ ] **Step 5: Final status**

Run:

```bash
git status --short --branch
```

Expected before final commit or handoff: only intentional source/doc changes are present.

- [ ] **Step 6: Commit final tuning**

```bash
git add src tests index.html docs
git commit -m "tune catalytic discovery loop"
```

If there are no tuning changes after verification, skip this commit and report that no final tuning commit was needed.

---

## Self Review

Spec coverage:

- Catalytic reactions: Tasks 2, 5, 7, and 10.
- Stronger water behavior: Task 4.
- Hidden breeds: Tasks 2 and 6.
- Folding/Rule-30-inspired local rule: Task 7.
- Runtime UI cleanup and lifeform inspection: Task 9.
- Dish event signposting: Task 10.
- Retro VDU dish log: Task 11.
- Optional save/debug discovery controls: Tasks 3 and 8.
- Magic number extraction: Task 1.
- Verification: Task 12.

No real-world disease vocabulary is required by any task. The plan keeps `src/sim/` generic and places new tunable data in content modules. The plan uses concrete file paths, commands, and test snippets. No unresolved placeholders remain.
