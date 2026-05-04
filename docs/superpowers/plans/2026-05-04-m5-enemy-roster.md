# M5 — Full Enemy Roster Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the M4 single-Bruiser-per-fight arena with the full V1 enemy roster: Sniper, Splitter, Swarm, Mirror, Boss. Fight schedule data lives in `src/content/enemies.ts`. The arena supports an arbitrary number of enemies per fight, mid-fight cell spawning (for Splitter on-death), and per-archetype AI dispatch. By end of M5, the 8-fight gauntlet from spec section 7.1 runs end-to-end with each fight feeling distinct.

**Architecture:**
- New module `src/content/enemies.ts` defines the fight schedule (array of `EnemySpawn[]` per fight) and per-archetype default stats.
- New AI modules under `src/game/enemies/`: `sniper.ts`, `splitter.ts`, `swarmlet.ts`, `mirror.ts`, `boss.ts`. (Bruiser exists from M3.)
- `src/game/arena.ts` is refactored: `CreateArenaOpts.enemies: EnemySpawn[]` replaces the single `enemy` config. The arena dispatches each enemy to its archetype's `step` function each tick. New helper `arena.spawnEnemy(opts)` for mid-fight spawning.
- `src/sim/sim.ts` gains `addCell(state, opts)` to add a cell after the initial `createSim` call — needed for Splitter death spawns.
- `src/game/run.ts` `getEnemyConfig()` is renamed to `getFightSpawnList()` returning `EnemySpawn[]`. `main.ts` adapts.

**Tech Stack:** Same.

**Reference:** Spec section 7 (Enemy Roster) is canonical. Section 7.2 calls out **Mirror as the scope lever** — if implementation gets too tangled, drop Mirror and replace fight 6 with `1× elite Splitter + 1× elite Sniper`. Don't preemptively drop it; only invoke this if a Mirror task escalates BLOCKED twice.

The spec calls out Boss phase 3 ("shrinking arena boundary"). **M5 ships a simpler 2-phase Boss** (P1 bruiser-like; P2 splits into 3 medium cells). Phase 3's shrinking-arena mechanic requires new sim plumbing (a "wall" that eats edge pixels) and is deferred to M7 polish. Document this as a known scope reduction.

**Definition of done:**
- All 8 fights from the spec schedule run, with distinct visual/behavioral feel:
  - Fight 1: lone Bruiser (existing behavior).
  - Fight 2: lone Sniper that flees and shoots a lot.
  - Fight 3: 1 Bruiser + 1 Sniper, both visible and pursuing/fleeing simultaneously.
  - Fight 4: lone Splitter that on death spawns 2 small swarmlets (you have to kill all three to win).
  - Fight 5: 4 small swarmlets that converge on you.
  - Fight 6: lone Mirror that has your accumulated upgrades applied to it.
  - Fight 7: 1 elite Splitter + 1 elite Sniper (+20% stats).
  - Fight 8: Boss; P1 = bruiser-like at 3× targetVol; P2 (at ≤50% vol) = splits into 3 medium cells.
- HUD continues to show "Fight N / 8" and accumulated upgrades.
- All 87 prior tests still pass; new M5 tests cover sim's `addCell`, each new archetype's intent function, and arena's multi-enemy dispatch.
- 60 FPS sustained even in fight 5 (4 enemies = ~5 cells total, still fine).

---

## File Structure

```
cellular-death-match/
├── src/
│   ├── content/
│   │   └── enemies.ts                # NEW: fight schedule + per-archetype stat defaults
│   ├── game/
│   │   ├── arena.ts                  # MODIFY: support EnemySpawn[] + spawnEnemy
│   │   ├── run.ts                    # MODIFY: getFightSpawnList replaces getEnemyConfig
│   │   └── enemies/
│   │       ├── bruiser.ts            # (existing — unchanged)
│   │       ├── sniper.ts             # NEW
│   │       ├── splitter.ts           # NEW (calls arena.spawnEnemy on death)
│   │       ├── swarmlet.ts           # NEW (used by splitter spawn + swarm fight)
│   │       ├── mirror.ts             # NEW
│   │       └── boss.ts               # NEW (multi-phase)
│   ├── sim/
│   │   └── sim.ts                    # MODIFY: add addCell helper
│   └── main.ts                       # MODIFY: pass spawn list, update HUD wording
└── tests/
    ├── content/
    │   └── enemies.test.ts           # NEW: fight schedule has 8 entries with expected shape
    ├── game/
    │   ├── arena.test.ts             # MODIFY: tests use enemies[] not single enemy
    │   ├── run.test.ts               # MODIFY: getFightSpawnList tests
    │   └── enemies/
    │       ├── sniper.test.ts        # NEW
    │       ├── splitter.test.ts      # NEW
    │       ├── swarmlet.test.ts      # NEW
    │       ├── mirror.test.ts        # NEW
    │       └── boss.test.ts          # NEW
    └── sim/
        └── sim.test.ts               # MODIFY: addCell tests
```

**Key new types:**

```ts
// In src/content/enemies.ts
export type EnemyArchetype =
  | 'bruiser' | 'sniper' | 'splitter' | 'swarmlet' | 'mirror' | 'boss';

export interface EnemySpawn {
  archetype: EnemyArchetype;
  targetVol: number;
  speed: number;
  engulfMultiplier: number;        // active in engulf range
  // Sniper-specific tuning. Optional; non-snipers ignore.
  shootCooldown?: number;          // ticks between shots
  bulletSize?: number;             // sniper bullets are bigger
  bulletSpeed?: number;
}
```

```ts
// In src/game/arena.ts (revised)
export interface CreateArenaOpts {
  LX: number;
  LY: number;
  seed: number;
  player: PlayerConfig;
  enemies: EnemySpawn[];           // 1+ spawns; each becomes a cell at start
  wrap: boolean;
  wrapBullets?: boolean;
}

export interface Arena {
  state: SimState;
  player: PlayerConfig;
  // Per-cell-id metadata so the AI dispatch knows which archetype to call.
  // Populated at construction and on spawnEnemy.
  archetypes: Map<CellId, EnemySpawn>;
  getStatus(): ArenaStatus;
  tick(input: ArenaInput): void;
  spawnEnemy(opts: SpawnEnemyOpts): CellId;
}

export interface SpawnEnemyOpts {
  spawn: EnemySpawn;
  pos: [number, number];           // grid position to seed the new cell at
}
```

---

## Task 1: Sim — `addCell` for Mid-Fight Spawns

**Why:** Splitter on-death spawning means new cells appear during a fight, not just at `createSim`. We add a small helper that grows the cell map and seeds initial pixels around a given position.

**Files:**
- Modify: `src/sim/sim.ts`
- Modify: `tests/sim/sim.test.ts`

### Step 1.1: Read current `src/sim/sim.ts` and `tests/sim/sim.test.ts`

The current `createSim` returns a `SimState` with N cells already laid out in a circle. M5 needs `addCell` to add an (N+1)th cell mid-game.

### Step 1.2: Write new test in `tests/sim/sim.test.ts`

Find the closing `});` of the outer `describe('tick', ...)` block at the end of the file. Add a new describe block AFTER it:

```ts

describe('addCell', () => {
  it('adds a new cell with given id at given position', () => {
    const state = createSim({
      LX: 30, LY: 30, nCells: 2, targetVol: 50, seed: 1, wrap: true,
    });
    const newId = addCell(state, {
      id: 5,
      targetVol: 80,
      pos: [15, 15],
    });
    expect(newId).toBe(5);
    expect(state.cells.has(5)).toBe(true);
    const cell = state.cells.get(5)!;
    expect(cell.id).toBe(5);
    expect(cell.targetVol).toBe(80);
    expect(cell.vol).toBeGreaterThan(0);
    // Center should be near (15, 15) since pixels were seeded around that point.
    expect(cell.center[0]).toBeCloseTo(15, 0);
    expect(cell.center[1]).toBeCloseTo(15, 0);
  });

  it('boundary set is updated to include new cell pixels', () => {
    const state = createSim({
      LX: 30, LY: 30, nCells: 2, targetVol: 50, seed: 1, wrap: true,
    });
    const before = state.grid.boundary.size;
    addCell(state, { id: 7, targetVol: 50, pos: [5, 5] });
    expect(state.grid.boundary.size).toBeGreaterThan(before);
  });

  it('does not overwrite existing cell pixels', () => {
    const state = createSim({
      LX: 30, LY: 30, nCells: 2, targetVol: 50, seed: 1, wrap: true,
    });
    const cell1 = state.cells.get(1)!;
    const volBefore = cell1.vol;
    // Place a new cell INSIDE cell 1's territory — pixels owned by cell 1 are skipped.
    addCell(state, { id: 9, targetVol: 30, pos: [Math.round(cell1.center[0]), Math.round(cell1.center[1])] });
    // Cell 1's volume should be unchanged.
    expect(cell1.vol).toBe(volBefore);
  });
});
```

Add `addCell` to the existing import:

```ts
import { createSim, tick, addCell } from '../../src/sim/sim';
```

### Step 1.3: Run, expect failures

Run: `npm test -- tests/sim/sim.test.ts`
Expected: FAIL — `addCell` not exported.

### Step 1.4: Add `addCell` to `src/sim/sim.ts`

Find the existing exports (`createSim`, `tick`). Below the `tick` function definition, add:

```ts
export interface AddCellOpts {
  id: CellId;
  targetVol: number;
  pos: [number, number];   // grid position to seed pixels around
}

// Add a new cell to the sim mid-tick. Seeds pixels in the 3x3 around `pos`,
// skipping any pixels already owned by another cell. The boundary set is
// updated to reflect the new cell.
export function addCell(state: SimState, opts: AddCellOpts): CellId {
  const cell = createCell(opts.id, opts.targetVol);
  state.cells.set(opts.id, cell);

  const { LX, LY, wrap } = state.grid;
  const cx = Math.round(opts.pos[0]);
  const cy = Math.round(opts.pos[1]);

  // Seed the 3×3 around (cx, cy). Skip pixels that already belong to another cell.
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      let nx = cx + dx;
      let ny = cy + dy;
      if (wrap) {
        nx = ((nx % LX) + LX) % LX;
        ny = ((ny % LY) + LY) % LY;
      } else {
        if (nx < 0 || nx >= LX || ny < 0 || ny >= LY) continue;
      }
      if (state.grid.cells[idx(state.grid, nx, ny)] !== 0) continue;
      setCell(state.grid, nx, ny, opts.id);
      addPixel(cell, nx, ny, LX, LY);
    }
  }

  // Update boundary around the new pixels (and their neighbors).
  for (let dx = -2; dx <= 2; dx++) {
    for (let dy = -2; dy <= 2; dy++) {
      let nx = cx + dx;
      let ny = cy + dy;
      if (wrap) {
        nx = ((nx % LX) + LX) % LX;
        ny = ((ny % LY) + LY) % LY;
      } else {
        if (nx < 0 || nx >= LX || ny < 0 || ny >= LY) continue;
      }
      updateBoundaryAround(state.grid, nx, ny);
    }
  }

  return opts.id;
}
```

You'll also need to add to the imports at the top of `sim.ts`:

```ts
import { createGrid, idx, setCell, recomputeBoundary, updateBoundaryAround } from './grid';
import { createCell, addPixel } from './cell';
```

(`updateBoundaryAround` may not currently be imported — add it.)

Also import `CellId` from `./types` if it isn't already.

### Step 1.5: Run tests

Run: `npm test -- tests/sim/sim.test.ts`
Expected: 7 tests pass (4 prior + 3 new).

### Step 1.6: Run full suite + typecheck + build

```bash
npm test                # 90 total (87 + 3)
npm run typecheck       # clean
npm run build           # clean
```

### Step 1.7: Commit

```bash
git add src/sim/sim.ts tests/sim/sim.test.ts
git commit -m "feat(sim): addCell for mid-fight cell spawning"
```

---

## Task 2: Content — Enemy Spawn Schedule

**Why:** The fight-by-fight enemy lineup is *data*, not logic. Eight entries, one per fight, each an array of `EnemySpawn`. The arena reads this list and spawns the corresponding cells.

**Files:**
- Create: `src/content/enemies.ts`
- Create: `tests/content/enemies.test.ts`

### Step 2.1: Write failing tests

Create `tests/content/enemies.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  FIGHT_SCHEDULE,
  ARCHETYPE_DEFAULTS,
  type EnemyArchetype,
} from '../../src/content/enemies';

describe('FIGHT_SCHEDULE', () => {
  it('has exactly 8 fights', () => {
    expect(FIGHT_SCHEDULE.length).toBe(8);
  });

  it('every fight has at least one enemy', () => {
    for (const fight of FIGHT_SCHEDULE) {
      expect(fight.length).toBeGreaterThan(0);
    }
  });

  it('matches the spec schedule', () => {
    // Spec section 7.1 fight schedule:
    expect(FIGHT_SCHEDULE[0]!.map((e) => e.archetype)).toEqual(['bruiser']);
    expect(FIGHT_SCHEDULE[1]!.map((e) => e.archetype)).toEqual(['sniper']);
    expect(FIGHT_SCHEDULE[2]!.map((e) => e.archetype).sort()).toEqual(['bruiser', 'sniper']);
    expect(FIGHT_SCHEDULE[3]!.map((e) => e.archetype)).toEqual(['splitter']);
    expect(FIGHT_SCHEDULE[4]!.length).toBe(4);
    for (const e of FIGHT_SCHEDULE[4]!) expect(e.archetype).toBe('swarmlet');
    expect(FIGHT_SCHEDULE[5]!.map((e) => e.archetype)).toEqual(['mirror']);
    expect(FIGHT_SCHEDULE[6]!.map((e) => e.archetype).sort()).toEqual(['sniper', 'splitter']);
    expect(FIGHT_SCHEDULE[7]!.map((e) => e.archetype)).toEqual(['boss']);
  });

  it('fight 7 spawns are elite (+20% stats vs base)', () => {
    const elite = FIGHT_SCHEDULE[6]!;
    for (const e of elite) {
      const base = ARCHETYPE_DEFAULTS[e.archetype];
      // +20% targetVol applied.
      expect(e.targetVol).toBeCloseTo(base.targetVol * 1.2, 5);
    }
  });
});

describe('ARCHETYPE_DEFAULTS', () => {
  it('has defaults for every archetype', () => {
    const required: EnemyArchetype[] = ['bruiser', 'sniper', 'splitter', 'swarmlet', 'mirror', 'boss'];
    for (const a of required) {
      expect(ARCHETYPE_DEFAULTS[a]).toBeDefined();
      expect(ARCHETYPE_DEFAULTS[a].targetVol).toBeGreaterThan(0);
    }
  });

  it('boss has 3x the bruiser targetVol per spec', () => {
    expect(ARCHETYPE_DEFAULTS.boss.targetVol).toBeCloseTo(ARCHETYPE_DEFAULTS.bruiser.targetVol * 3, 5);
  });

  it('snipers have shoot fields', () => {
    const sniper = ARCHETYPE_DEFAULTS.sniper;
    expect(sniper.shootCooldown).toBeDefined();
    expect(sniper.bulletSize).toBeDefined();
    expect(sniper.bulletSpeed).toBeDefined();
  });
});
```

### Step 2.2: Run, expect fail

Run: `npm test -- tests/content/enemies.test.ts`
Expected: FAIL — module not found.

### Step 2.3: Implement `src/content/enemies.ts`

```ts
export type EnemyArchetype =
  | 'bruiser' | 'sniper' | 'splitter' | 'swarmlet' | 'mirror' | 'boss';

export interface EnemySpawn {
  archetype: EnemyArchetype;
  targetVol: number;
  speed: number;
  engulfMultiplier: number;
  shootCooldown?: number;          // ticks between shots (snipers only)
  bulletSize?: number;
  bulletSpeed?: number;
}

// Per-archetype default stats. Per spec section 7.1.
export const ARCHETYPE_DEFAULTS: Record<EnemyArchetype, EnemySpawn> = {
  // Player base = 300 targetVol, 10 speed, 5 engulfMultiplier (in run.ts).
  bruiser: {
    archetype: 'bruiser',
    targetVol: 450,                // +50% per spec
    speed: 8,                      // -20% per spec
    engulfMultiplier: 6.5,         // +30% per spec (5 * 1.3)
  },
  sniper: {
    archetype: 'sniper',
    targetVol: 240,                // -20% per spec
    speed: 12,                     // +20% per spec
    engulfMultiplier: 1,           // snipers don't engulf
    shootCooldown: 30,             // shoots ~2x per second
    bulletSize: 4,                 // +50% per spec (3 * 1.5)
    bulletSpeed: 2,
  },
  splitter: {
    archetype: 'splitter',
    targetVol: 300,                // base, per spec
    speed: 8,
    engulfMultiplier: 6.5,         // bruiser-like
  },
  swarmlet: {
    archetype: 'swarmlet',
    targetVol: 120,                // -60% per spec (300 * 0.4)
    speed: 12,                     // +20%
    engulfMultiplier: 4,           // weaker than player baseline
  },
  mirror: {
    archetype: 'mirror',
    // Mirror's stats are overridden at fight time using the player's config.
    // These are placeholder defaults so the type checks; the arena replaces them.
    targetVol: 300,
    speed: 10,
    engulfMultiplier: 5,
  },
  boss: {
    archetype: 'boss',
    targetVol: 1350,               // 3x bruiser per spec
    speed: 8,
    engulfMultiplier: 6.5,
  },
};

const elite = (s: EnemySpawn): EnemySpawn => ({
  ...s,
  targetVol: s.targetVol * 1.2,
});

const swarmlet4: EnemySpawn[] = Array.from({ length: 4 }, () => ({ ...ARCHETYPE_DEFAULTS.swarmlet }));

// Fight schedule. Spec section 7.1.
export const FIGHT_SCHEDULE: ReadonlyArray<ReadonlyArray<EnemySpawn>> = [
  [{ ...ARCHETYPE_DEFAULTS.bruiser }],
  [{ ...ARCHETYPE_DEFAULTS.sniper }],
  [{ ...ARCHETYPE_DEFAULTS.bruiser }, { ...ARCHETYPE_DEFAULTS.sniper }],
  [{ ...ARCHETYPE_DEFAULTS.splitter }],
  swarmlet4,
  [{ ...ARCHETYPE_DEFAULTS.mirror }],
  [elite({ ...ARCHETYPE_DEFAULTS.splitter }), elite({ ...ARCHETYPE_DEFAULTS.sniper })],
  [{ ...ARCHETYPE_DEFAULTS.boss }],
];
```

### Step 2.4: Run tests

Run: `npm test -- tests/content/enemies.test.ts`
Expected: 6 tests pass.

### Step 2.5: Run full suite + typecheck + build

```bash
npm test                # 96 total (90 + 6)
npm run typecheck       # clean
npm run build           # clean
```

### Step 2.6: Commit

```bash
git add src/content/enemies.ts tests/content/enemies.test.ts
git commit -m "feat(content): enemy archetype defaults + 8-fight schedule"
```

---

## Task 3: Sniper AI

**Why:** First new archetype. Maintains distance from player. Fires bullets at the player on a cooldown. Doesn't engulf. Pure reactive behavior — no internal state beyond cooldown timing, which lives in the AI module's per-step closure (or a small per-cell state map kept by the arena).

**Decision:** AI cooldown timing is per-cell state. We add a small `Map<CellId, ArchetypeState>` to the arena, and pass `state.archetypeState[id]` to each AI step. Snipers store `{ shootTimer: number }`.

**Files:**
- Create: `src/game/enemies/sniper.ts`
- Create: `tests/game/enemies/sniper.test.ts`

### Step 3.1: Write failing tests

Create `tests/game/enemies/sniper.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { createSim } from '../../../src/sim/sim';
import { sniperStep, type SniperState } from '../../../src/game/enemies/sniper';
import { ARCHETYPE_DEFAULTS } from '../../../src/content/enemies';

function fixture() {
  return createSim({
    LX: 100, LY: 100, nCells: 2, targetVol: 100, seed: 1, wrap: true,
  });
}

describe('sniperStep — distance keeping', () => {
  it('flees when target is within fleeRange', () => {
    const state = fixture();
    const self = state.cells.get(2)!;
    const target = state.cells.get(1)!;
    self.center = [50, 50];
    target.center = [55, 50];   // 5px away — close
    const sniperState: SniperState = { shootTimer: 0 };
    sniperStep(self, target, state, ARCHETYPE_DEFAULTS.sniper, sniperState);
    // Direction should be AWAY from target. Target is at +x; flee direction is -x.
    expect(self.intent.vec[0]).toBeLessThan(0);
  });

  it('approaches (slowly) when target is too far', () => {
    const state = fixture();
    const self = state.cells.get(2)!;
    const target = state.cells.get(1)!;
    self.center = [10, 10];
    target.center = [80, 10];
    const sniperState: SniperState = { shootTimer: 0 };
    sniperStep(self, target, state, ARCHETYPE_DEFAULTS.sniper, sniperState);
    // Far away — should move TOWARD target.
    expect(self.intent.vec[0]).toBeGreaterThan(0);
  });

  it('engulfMultiplier is always 1 (sniper does not engulf)', () => {
    const state = fixture();
    const self = state.cells.get(2)!;
    const target = state.cells.get(1)!;
    self.center = [50, 50];
    target.center = [51, 50];
    const sniperState: SniperState = { shootTimer: 0 };
    sniperStep(self, target, state, ARCHETYPE_DEFAULTS.sniper, sniperState);
    expect(self.intent.engulfMultiplier).toBe(1);
  });
});

describe('sniperStep — shooting', () => {
  it('decrements shootTimer each step', () => {
    const state = fixture();
    const self = state.cells.get(2)!;
    const target = state.cells.get(1)!;
    self.center = [10, 10];
    target.center = [50, 50];
    const sniperState: SniperState = { shootTimer: 10 };
    sniperStep(self, target, state, ARCHETYPE_DEFAULTS.sniper, sniperState);
    expect(sniperState.shootTimer).toBe(9);
  });

  it('fires a bullet when shootTimer reaches 0 and resets to cooldown', () => {
    const state = fixture();
    const self = state.cells.get(2)!;
    const target = state.cells.get(1)!;
    self.center = [10, 10];
    target.center = [50, 50];
    const sniperState: SniperState = { shootTimer: 0 };
    expect(state.bullets.length).toBe(0);
    sniperStep(self, target, state, ARCHETYPE_DEFAULTS.sniper, sniperState);
    expect(state.bullets.length).toBe(1);
    expect(sniperState.shootTimer).toBe(ARCHETYPE_DEFAULTS.sniper.shootCooldown);
    // Bullet should be aimed at the player.
    const b = state.bullets[0]!;
    expect(b.ownerId).toBe(2);
    // Velocity should point roughly toward target.
    expect(b.v[0]).toBeGreaterThan(0);   // target is at +x
  });
});
```

### Step 3.2: Run, expect fail

Run: `npm test -- tests/game/enemies/sniper.test.ts`
Expected: FAIL — module not found.

### Step 3.3: Implement `src/game/enemies/sniper.ts`

```ts
import type { Cell, SimState } from '../../sim/types';
import type { EnemySpawn } from '../../content/enemies';
import { shortestVec } from '../geometry';
import { addBullet } from '../../sim/bullets';

export interface SniperState {
  shootTimer: number;
}

const FLEE_RANGE = 25;          // if target closer than this, flee
const APPROACH_RANGE = 60;      // if target farther than this, approach
// Between FLEE_RANGE and APPROACH_RANGE: hold position.

export function sniperStep(
  self: Cell,
  target: Cell,
  state: SimState,
  spawn: EnemySpawn,
  internal: SniperState,
): void {
  const { LX, LY } = state.grid;
  const v = shortestVec(self.center, target.center, LX, LY);
  const dist = Math.hypot(v[0], v[1]);

  // Movement.
  if (dist === 0) {
    self.intent.vec = [0, 0];
  } else if (dist < FLEE_RANGE) {
    self.intent.vec = [-v[0] / dist, -v[1] / dist];   // flee
  } else if (dist > APPROACH_RANGE) {
    self.intent.vec = [v[0] / dist, v[1] / dist];     // approach
  } else {
    self.intent.vec = [0, 0];                          // hold
  }

  self.intent.speed = spawn.speed;
  self.intent.engulfMultiplier = 1;                    // never engulfs

  // Shoot.
  if (internal.shootTimer > 0) {
    internal.shootTimer -= 1;
    return;
  }
  // Fire toward target.
  if (dist > 0 && spawn.bulletSpeed !== undefined && spawn.bulletSize !== undefined) {
    const dirX = v[0] / dist;
    const dirY = v[1] / dist;
    addBullet(state, {
      pos: [self.center[0], self.center[1]],
      v: [dirX * spawn.bulletSpeed, dirY * spawn.bulletSpeed],
      ownerId: self.id,
      size: spawn.bulletSize,
    });
    internal.shootTimer = spawn.shootCooldown ?? 30;
  }
}
```

### Step 3.4: Run tests

Run: `npm test -- tests/game/enemies/sniper.test.ts`
Expected: 5 tests pass.

### Step 3.5: Run full suite + typecheck + build

```bash
npm test                # 101 total (96 + 5)
npm run typecheck       # clean
npm run build           # clean
```

### Step 3.6: Commit

```bash
git add src/game/enemies/sniper.ts tests/game/enemies/sniper.test.ts
git commit -m "feat(game): Sniper AI — distance-keeping + cooldown-driven bullets"
```

---

## Task 4: Swarmlet AI

**Why:** Used by both Splitter (death spawn) and Swarm fight (4 of them). Simplest archetype: dumb seek-player, no special behavior. Identical to a small Bruiser without engulf intelligence — when in contact, Bruiser-style engulf turns on.

**Files:**
- Create: `src/game/enemies/swarmlet.ts`
- Create: `tests/game/enemies/swarmlet.test.ts`

### Step 4.1: Write tests

Create `tests/game/enemies/swarmlet.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { createSim } from '../../../src/sim/sim';
import { swarmletStep } from '../../../src/game/enemies/swarmlet';
import { ARCHETYPE_DEFAULTS } from '../../../src/content/enemies';

function fixture() {
  return createSim({
    LX: 100, LY: 100, nCells: 2, targetVol: 100, seed: 1, wrap: true,
  });
}

describe('swarmletStep', () => {
  it('points intent.vec toward target', () => {
    const state = fixture();
    const self = state.cells.get(2)!;
    const target = state.cells.get(1)!;
    self.center = [10, 10];
    target.center = [50, 10];
    swarmletStep(self, target, state, ARCHETYPE_DEFAULTS.swarmlet);
    expect(self.intent.vec[0]).toBeCloseTo(1, 3);
    expect(self.intent.vec[1]).toBeCloseTo(0, 3);
  });

  it('uses spawn-config speed', () => {
    const state = fixture();
    const self = state.cells.get(2)!;
    const target = state.cells.get(1)!;
    self.center = [10, 10];
    target.center = [50, 50];
    swarmletStep(self, target, state, ARCHETYPE_DEFAULTS.swarmlet);
    expect(self.intent.speed).toBe(ARCHETYPE_DEFAULTS.swarmlet.speed);
  });

  it('engulfs when in close range', () => {
    const state = fixture();
    const self = state.cells.get(2)!;
    const target = state.cells.get(1)!;
    self.center = [50, 50];
    target.center = [52, 50];
    swarmletStep(self, target, state, ARCHETYPE_DEFAULTS.swarmlet);
    expect(self.intent.engulfMultiplier).toBeGreaterThan(1);
  });

  it('does not engulf when far', () => {
    const state = fixture();
    const self = state.cells.get(2)!;
    const target = state.cells.get(1)!;
    self.center = [10, 10];
    target.center = [70, 70];
    swarmletStep(self, target, state, ARCHETYPE_DEFAULTS.swarmlet);
    expect(self.intent.engulfMultiplier).toBe(1);
  });
});
```

### Step 4.2: Run, expect fail.

Run: `npm test -- tests/game/enemies/swarmlet.test.ts`
Expected: FAIL — module not found.

### Step 4.3: Implement `src/game/enemies/swarmlet.ts`

```ts
import type { Cell, SimState } from '../../sim/types';
import type { EnemySpawn } from '../../content/enemies';
import { shortestVec } from '../geometry';

const ENGULF_RANGE = 6;

export function swarmletStep(
  self: Cell,
  target: Cell,
  state: SimState,
  spawn: EnemySpawn,
): void {
  const { LX, LY } = state.grid;
  const v = shortestVec(self.center, target.center, LX, LY);
  const dist = Math.hypot(v[0], v[1]);

  if (dist === 0) {
    self.intent.vec = [0, 0];
  } else {
    self.intent.vec = [v[0] / dist, v[1] / dist];
  }

  self.intent.speed = spawn.speed;
  self.intent.engulfMultiplier = dist <= ENGULF_RANGE ? spawn.engulfMultiplier : 1;
}
```

### Step 4.4: Run tests

Run: `npm test -- tests/game/enemies/swarmlet.test.ts`
Expected: 4 tests pass.

### Step 4.5: Verify + commit

```bash
npm test                # 105 total
npm run typecheck       # clean
npm run build           # clean
git add src/game/enemies/swarmlet.ts tests/game/enemies/swarmlet.test.ts
git commit -m "feat(game): Swarmlet AI — small dumb seeker used by Splitter + Swarm"
```

---

## Task 5: Splitter AI

**Why:** Bruiser-like behavior, but on death spawns 2 swarmlets. The "on death" trigger is checked by the arena — when a Splitter cell's `vol` drops to 0, the arena calls a hook to spawn swarmlets. The Splitter AI itself is just movement + engulf.

**Implementation note:** the death trigger lives in the arena's per-tick logic, not in `splitterStep`. `splitterStep` is purely "what does the cell want to do *while alive*." We'll wire the death-spawn in the arena task (Task 7).

**Files:**
- Create: `src/game/enemies/splitter.ts`
- Create: `tests/game/enemies/splitter.test.ts`

### Step 5.1: Write tests (very small — splitter behavior is bruiser-like)

Create `tests/game/enemies/splitter.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { createSim } from '../../../src/sim/sim';
import { splitterStep } from '../../../src/game/enemies/splitter';
import { ARCHETYPE_DEFAULTS } from '../../../src/content/enemies';

function fixture() {
  return createSim({
    LX: 100, LY: 100, nCells: 2, targetVol: 100, seed: 1, wrap: true,
  });
}

describe('splitterStep', () => {
  it('seeks the player', () => {
    const state = fixture();
    const self = state.cells.get(2)!;
    const target = state.cells.get(1)!;
    self.center = [10, 10];
    target.center = [50, 10];
    splitterStep(self, target, state, ARCHETYPE_DEFAULTS.splitter);
    expect(self.intent.vec[0]).toBeCloseTo(1, 3);
  });

  it('engulfs on contact', () => {
    const state = fixture();
    const self = state.cells.get(2)!;
    const target = state.cells.get(1)!;
    self.center = [50, 50];
    target.center = [52, 50];
    splitterStep(self, target, state, ARCHETYPE_DEFAULTS.splitter);
    expect(self.intent.engulfMultiplier).toBeGreaterThan(1);
  });
});
```

### Step 5.2: Run, expect fail.

### Step 5.3: Implement `src/game/enemies/splitter.ts`

```ts
import type { Cell, SimState } from '../../sim/types';
import type { EnemySpawn } from '../../content/enemies';
import { shortestVec } from '../geometry';

const ENGULF_RANGE = 6;

// Bruiser-like behavior. The death-spawn-2-swarmlets trigger lives in the
// arena, not here.
export function splitterStep(
  self: Cell,
  target: Cell,
  state: SimState,
  spawn: EnemySpawn,
): void {
  const { LX, LY } = state.grid;
  const v = shortestVec(self.center, target.center, LX, LY);
  const dist = Math.hypot(v[0], v[1]);

  if (dist === 0) {
    self.intent.vec = [0, 0];
  } else {
    self.intent.vec = [v[0] / dist, v[1] / dist];
  }

  self.intent.speed = spawn.speed;
  self.intent.engulfMultiplier = dist <= ENGULF_RANGE ? spawn.engulfMultiplier : 1;
}
```

### Step 5.4: Run tests

Run: `npm test -- tests/game/enemies/splitter.test.ts`
Expected: 2 tests pass.

### Step 5.5: Verify + commit

```bash
npm test                # 107 total
npm run typecheck       # clean
npm run build           # clean
git add src/game/enemies/splitter.ts tests/game/enemies/splitter.test.ts
git commit -m "feat(game): Splitter AI — bruiser-like (death-spawn lives in arena)"
```

---

## Task 6: Mirror AI

**Why:** Mirror's behavior is "play like the player would." For M5 stub, this means: bruiser-like seek + engulf, BUT use the player's currently-applied stats. The Mirror's targetVol/speed/engulfMultiplier are set at fight start by reading the player's config, not from `ARCHETYPE_DEFAULTS.mirror`. The stats override happens in the arena (Task 7); the Mirror AI itself just dispatches like a Bruiser.

**Files:**
- Create: `src/game/enemies/mirror.ts`
- Create: `tests/game/enemies/mirror.test.ts`

### Step 6.1: Write tests

Create `tests/game/enemies/mirror.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { createSim } from '../../../src/sim/sim';
import { mirrorStep } from '../../../src/game/enemies/mirror';
import { ARCHETYPE_DEFAULTS } from '../../../src/content/enemies';

function fixture() {
  return createSim({
    LX: 100, LY: 100, nCells: 2, targetVol: 100, seed: 1, wrap: true,
  });
}

describe('mirrorStep', () => {
  it('seeks the player', () => {
    const state = fixture();
    const self = state.cells.get(2)!;
    const target = state.cells.get(1)!;
    self.center = [10, 10];
    target.center = [50, 10];
    mirrorStep(self, target, state, ARCHETYPE_DEFAULTS.mirror);
    expect(self.intent.vec[0]).toBeCloseTo(1, 3);
  });

  it('engulfs on contact', () => {
    const state = fixture();
    const self = state.cells.get(2)!;
    const target = state.cells.get(1)!;
    self.center = [50, 50];
    target.center = [52, 50];
    mirrorStep(self, target, state, ARCHETYPE_DEFAULTS.mirror);
    expect(self.intent.engulfMultiplier).toBeGreaterThan(1);
  });
});
```

### Step 6.2: Run, expect fail.

### Step 6.3: Implement `src/game/enemies/mirror.ts`

```ts
import type { Cell, SimState } from '../../sim/types';
import type { EnemySpawn } from '../../content/enemies';
import { shortestVec } from '../geometry';

const ENGULF_RANGE = 6;

// Mirror plays like the player. For M5 stub, this means bruiser-like behavior.
// The "use player's stats" trick lives in the arena (it overrides the spawn
// config at fight start with the run's current player config).
export function mirrorStep(
  self: Cell,
  target: Cell,
  state: SimState,
  spawn: EnemySpawn,
): void {
  const { LX, LY } = state.grid;
  const v = shortestVec(self.center, target.center, LX, LY);
  const dist = Math.hypot(v[0], v[1]);

  if (dist === 0) {
    self.intent.vec = [0, 0];
  } else {
    self.intent.vec = [v[0] / dist, v[1] / dist];
  }

  self.intent.speed = spawn.speed;
  self.intent.engulfMultiplier = dist <= ENGULF_RANGE ? spawn.engulfMultiplier : 1;
}
```

### Step 6.4: Run tests + commit

```bash
npm test                # 109 total
npm run typecheck       # clean
npm run build           # clean
git add src/game/enemies/mirror.ts tests/game/enemies/mirror.test.ts
git commit -m "feat(game): Mirror AI — bruiser-like dispatch (stats applied by arena)"
```

---

## Task 7: Arena Refactor — Multi-Enemy + Spawn + Per-Cell Archetype

**Why:** This is the integration task. The arena's tick loop must now: dispatch each enemy to its archetype's step function; track per-cell archetype + AI state; handle on-death effects (Splitter spawns swarmlets); apply Mirror's "copy player stats" at construction.

**Files:**
- Modify: `src/game/arena.ts`
- Modify: `tests/game/arena.test.ts`

### Step 7.1: Read current `src/game/arena.ts` and `tests/game/arena.test.ts`

### Step 7.2: Update `tests/game/arena.test.ts`

The current tests use `enemy: { ... }`. We change the shape to `enemies: EnemySpawn[]`. Use Edit with `replace_all: true`:

Find:
```ts
  enemy: { targetVol: 150, speed: 8, engulfMultiplier: 6.5 },
```

Replace with:
```ts
  enemies: [{ archetype: 'bruiser' as const, targetVol: 150, speed: 8, engulfMultiplier: 6.5 }],
```

There should be 10 occurrences (one per test). Apply globally. The 'as const' hint is needed because `EnemyArchetype` is a string-literal union.

Add this import at the top of `tests/game/arena.test.ts` if not already imported:

```ts
import type { EnemySpawn } from '../../src/content/enemies';
```

(You may not need it explicitly if all uses are inline-typed via `as const`.)

### Step 7.3: Run, expect failures (TS errors about missing `enemies` field, extra `enemy` field)

Run: `npm test -- tests/game/arena.test.ts`
Expected: TS or runtime failures.

### Step 7.4: Replace `src/game/arena.ts`

Use the Write tool with the new full content:

```ts
import { type SimState, type CellId } from '../sim/types';
import { createSim, tick as simTick, addCell } from '../sim/sim';
import { type PlayerConfig } from '../content/upgrades';
import { type EnemySpawn, ARCHETYPE_DEFAULTS } from '../content/enemies';
import { bruiserStep } from './enemies/bruiser';
import { sniperStep, type SniperState } from './enemies/sniper';
import { splitterStep } from './enemies/splitter';
import { swarmletStep } from './enemies/swarmlet';
import { mirrorStep } from './enemies/mirror';
import { bossStep, type BossState } from './enemies/boss';

export type { PlayerConfig } from '../content/upgrades';

export interface ArenaInput {
  moveVec: [number, number];
  shouldFire: boolean;
  shouldEngulf: boolean;
}

export type ArenaStatus = 'running' | 'won' | 'lost';

export interface Arena {
  state: SimState;
  player: PlayerConfig;
  archetypes: Map<CellId, EnemySpawn>;
  getStatus(): ArenaStatus;
  tick(input: ArenaInput): void;
  spawnEnemy(opts: SpawnEnemyOpts): CellId;
}

export interface SpawnEnemyOpts {
  spawn: EnemySpawn;
  pos: [number, number];
}

export interface CreateArenaOpts {
  LX: number;
  LY: number;
  seed: number;
  player: PlayerConfig;
  enemies: EnemySpawn[];
  wrap: boolean;
  wrapBullets?: boolean;
}

const PLAYER_ID = 1;
const ENGULF_DECAY_PER_FRAME = 1 / 60;
const MC_STEPS_PER_TICK = 1000;

interface AiState {
  sniper?: SniperState;
  boss?: BossState;
  // For Splitter: track whether on-death spawn has fired.
  splitter?: { didSpawn: boolean };
}

export function createArena(opts: CreateArenaOpts): Arena {
  const nEnemies = opts.enemies.length;
  // createSim places nCells in a circle around the grid center. We want player + N enemies.
  const state = createSim({
    LX: opts.LX,
    LY: opts.LY,
    nCells: 1 + nEnemies,
    targetVol: opts.player.targetVol,
    seed: opts.seed,
    wrap: opts.wrap,
    wrapBullets: opts.wrapBullets ?? true,
  });

  // Player is cell id 1; enemies are 2..(1+nEnemies). Override their targetVol.
  const archetypes = new Map<CellId, EnemySpawn>();
  const aiStates = new Map<CellId, AiState>();
  let nextCellId = 2 + nEnemies;          // ids beyond initial spawns (used by spawnEnemy)

  for (let i = 0; i < nEnemies; i++) {
    const cellId = 2 + i;
    let spawn = opts.enemies[i]!;
    // Mirror adopts the player's stats.
    if (spawn.archetype === 'mirror') {
      spawn = {
        ...spawn,
        targetVol: opts.player.targetVol,
        speed: opts.player.speed,
        engulfMultiplier: opts.player.engulfMultiplier,
      };
    }
    archetypes.set(cellId, spawn);
    const cell = state.cells.get(cellId);
    if (cell) cell.targetVol = spawn.targetVol;

    // Initialize per-archetype AI state.
    const aiState: AiState = {};
    if (spawn.archetype === 'sniper') aiState.sniper = { shootTimer: spawn.shootCooldown ?? 30 };
    if (spawn.archetype === 'boss')   aiState.boss = { phase: 1, didSpawnP2: false };
    if (spawn.archetype === 'splitter') aiState.splitter = { didSpawn: false };
    aiStates.set(cellId, aiState);
  }

  const player = state.cells.get(PLAYER_ID);
  if (player) player.intent.speed = opts.player.speed;

  function dispatchAi(self: { id: CellId; cell: import('../sim/types').Cell }, target: import('../sim/types').Cell, ar: Arena): void {
    const spawn = archetypes.get(self.id);
    if (!spawn) return;
    const ai = aiStates.get(self.id);
    if (!ai) return;
    switch (spawn.archetype) {
      case 'bruiser':  bruiserStep(self.cell, target, state); return;
      case 'sniper':   sniperStep(self.cell, target, state, spawn, ai.sniper!); return;
      case 'splitter': splitterStep(self.cell, target, state, spawn); return;
      case 'swarmlet': swarmletStep(self.cell, target, state, spawn); return;
      case 'mirror':   mirrorStep(self.cell, target, state, spawn); return;
      case 'boss':     bossStep(self.cell, target, state, spawn, ai.boss!, ar); return;
    }
  }

  const arena: Arena = {
    state,
    player: opts.player,
    archetypes,
    getStatus(): ArenaStatus {
      const p = state.cells.get(PLAYER_ID);
      if (!p || p.vol === 0) return 'lost';
      for (const [id, cell] of state.cells) {
        if (id === PLAYER_ID) continue;
        if (cell.vol > 0) return 'running';
      }
      return 'won';
    },
    tick(input: ArenaInput): void {
      if (this.getStatus() !== 'running') return;

      // Player intent.
      const p = state.cells.get(PLAYER_ID);
      if (p) {
        p.intent.vec = input.moveVec;
        p.intent.speed = opts.player.speed;
        p.intent.shooting = input.shouldFire;
        p.intent.engulfMultiplier = input.shouldEngulf ? opts.player.engulfMultiplier : 1;
        if (input.shouldEngulf) {
          p.targetVol -= ENGULF_DECAY_PER_FRAME;
        }
      }

      // Enemy AIs.
      const target = state.cells.get(PLAYER_ID);
      if (target) {
        for (const [id, _spawn] of archetypes) {
          const cell = state.cells.get(id);
          if (!cell || cell.vol === 0) continue;
          dispatchAi({ id, cell }, target, this);
        }
      }

      // On-death handlers (after AI step, since cells may have changed vol).
      for (const [id, spawn] of archetypes) {
        if (spawn.archetype !== 'splitter') continue;
        const ai = aiStates.get(id);
        if (!ai?.splitter || ai.splitter.didSpawn) continue;
        const cell = state.cells.get(id);
        if (!cell || cell.vol > 0) continue;
        // Splitter died — spawn 2 swarmlets at its last known center.
        ai.splitter.didSpawn = true;
        const pos = cell.center;
        const swarmletSpawn = { ...ARCHETYPE_DEFAULTS.swarmlet, targetVol: ARCHETYPE_DEFAULTS.swarmlet.targetVol };
        this.spawnEnemy({ spawn: swarmletSpawn, pos: [pos[0] - 3, pos[1]] });
        this.spawnEnemy({ spawn: swarmletSpawn, pos: [pos[0] + 3, pos[1]] });
      }

      simTick(state, MC_STEPS_PER_TICK);
    },
    spawnEnemy(spawnOpts: SpawnEnemyOpts): CellId {
      const id = nextCellId++;
      addCell(state, {
        id,
        targetVol: spawnOpts.spawn.targetVol,
        pos: spawnOpts.pos,
      });
      archetypes.set(id, spawnOpts.spawn);
      const ai: AiState = {};
      if (spawnOpts.spawn.archetype === 'sniper') ai.sniper = { shootTimer: spawnOpts.spawn.shootCooldown ?? 30 };
      if (spawnOpts.spawn.archetype === 'boss')   ai.boss = { phase: 1, didSpawnP2: false };
      if (spawnOpts.spawn.archetype === 'splitter') ai.splitter = { didSpawn: false };
      aiStates.set(id, ai);
      return id;
    },
  };
  return arena;
}
```

### Step 7.5: We need `bossStep` and `BossState` to exist for this to typecheck. Stub them.

Create `src/game/enemies/boss.ts`:

```ts
import type { Cell, SimState } from '../../sim/types';
import type { EnemySpawn } from '../../content/enemies';
import type { Arena } from '../arena';
import { shortestVec } from '../geometry';
import { ARCHETYPE_DEFAULTS } from '../../content/enemies';

export interface BossState {
  phase: 1 | 2;
  didSpawnP2: boolean;
}

const ENGULF_RANGE = 6;

// Boss has 2 phases (M5):
//   P1: bruiser-like behavior at 3× targetVol.
//   P2: when vol drops below 50% of starting targetVol, it splits into
//       3 medium-sized cells. Spawn happens once.
export function bossStep(
  self: Cell,
  target: Cell,
  state: SimState,
  spawn: EnemySpawn,
  internal: BossState,
  arena: Arena,
): void {
  const { LX, LY } = state.grid;
  const v = shortestVec(self.center, target.center, LX, LY);
  const dist = Math.hypot(v[0], v[1]);

  // Movement (bruiser-like).
  if (dist === 0) {
    self.intent.vec = [0, 0];
  } else {
    self.intent.vec = [v[0] / dist, v[1] / dist];
  }
  self.intent.speed = spawn.speed;
  self.intent.engulfMultiplier = dist <= ENGULF_RANGE ? spawn.engulfMultiplier : 1;

  // Phase transition: when boss vol drops below 50% of original targetVol, spawn 3 mediums.
  if (internal.phase === 1 && self.vol < spawn.targetVol * 0.5 && !internal.didSpawnP2) {
    internal.didSpawnP2 = true;
    internal.phase = 2;
    const pos = self.center;
    const medium: EnemySpawn = {
      ...ARCHETYPE_DEFAULTS.bruiser,
      targetVol: ARCHETYPE_DEFAULTS.bruiser.targetVol * 0.6,
    };
    arena.spawnEnemy({ spawn: medium, pos: [pos[0] - 6, pos[1]] });
    arena.spawnEnemy({ spawn: medium, pos: [pos[0] + 6, pos[1]] });
    arena.spawnEnemy({ spawn: medium, pos: [pos[0], pos[1] + 6] });
  }
}
```

### Step 7.6: Run arena tests

Run: `npm test -- tests/game/arena.test.ts`
Expected: 10 tests pass.

If any fail with TS errors about `enemies[]`, double-check the `as const` cast in test fixtures.

### Step 7.7: Run full suite + typecheck + build

```bash
npm test                # 119 total (109 + 10 arena unchanged in count, 0 boss tests)
npm run typecheck       # clean
npm run build           # clean
```

Wait — boss has no tests yet. Let me double-check: arena tests are 10 pre-existing (now refactored). Total before this task: 109. We add boss.ts but no boss test file. So 119 = 109 + ? Let me check counts: M3 ended at 67. M4 added: 8 (upgrades) + 11 (run) = 19. So end of M4 = 87 (plus the M5 Task 1+2 sim & content additions: 3 + 6 = 9 more, totaling 96). Then sniper +5 = 101, swarmlet +4 = 105, splitter +2 = 107, mirror +2 = 109. Arena refactored (no count change) = 109. Boss is just stubbed (no tests) — final = 109 here. That matches.

Final test count after Task 7: **109**.

### Step 7.8: Commit

```bash
git add src/game/arena.ts src/game/enemies/boss.ts tests/game/arena.test.ts
git commit -m "refactor(game): arena dispatches per-archetype AI; supports multiple enemies + spawn"
```

---

## Task 8: Run — `getFightSpawnList` Replaces `getEnemyConfig`

**Why:** `run.getEnemyConfig()` returns one Bruiser config. We replace it with `getFightSpawnList()` returning the array of `EnemySpawn` for the current fight, drawn from `FIGHT_SCHEDULE`. The per-fight scaling we had (10% per fight) goes away — the schedule itself describes per-fight stats. The Mirror fight will read player stats via the arena's construction logic (Task 7).

**Files:**
- Modify: `src/game/run.ts`
- Modify: `tests/game/run.test.ts`

### Step 8.1: Read current files.

### Step 8.2: Update `tests/game/run.test.ts`

Find the `getEnemyConfig` describe block at the bottom. Replace it with:

```ts
describe('getFightSpawnList', () => {
  it('returns the schedule entry for fight 0 (single bruiser)', () => {
    const run = createRun(42);
    run.start();
    const list = run.getFightSpawnList();
    expect(list.length).toBe(1);
    expect(list[0]!.archetype).toBe('bruiser');
  });

  it('returns the schedule entry for fight 4 (4 swarmlets)', () => {
    const run = createRun(42);
    run.start();
    // Advance to fight 4.
    for (let i = 0; i < 4; i++) {
      run.winFight();
      run.pickUpgrade(run.getState().pendingPickChoices[0]!);
    }
    expect(run.getState().fightIndex).toBe(4);
    const list = run.getFightSpawnList();
    expect(list.length).toBe(4);
    for (const e of list) expect(e.archetype).toBe('swarmlet');
  });
});
```

Also update the prior `getPlayerConfig` test if it references `getEnemyConfig`. Let it stay focused on `getPlayerConfig`. Remove any `getEnemyConfig` calls from it.

### Step 8.3: Run, expect failures (`getFightSpawnList` doesn't exist).

### Step 8.4: Update `src/game/run.ts`

Find `getEnemyConfig` and replace it with `getFightSpawnList`:

```ts
    getFightSpawnList() {
      // Return a deep copy so callers can't mutate the schedule.
      const fight = FIGHT_SCHEDULE[fightIndex];
      if (!fight) return [];
      return fight.map((e) => ({ ...e }));
    },
```

Update the `Run` interface:

```ts
export interface Run {
  getState(): RunState;
  start(): void;
  winFight(): void;
  loseFight(): void;
  pickUpgrade(id: string): void;
  restart(): void;
  getPlayerConfig(): PlayerConfig;
  getFightSpawnList(): EnemySpawn[];
}
```

Add at the top:

```ts
import { FIGHT_SCHEDULE, type EnemySpawn } from '../content/enemies';
```

And remove the now-unused `EnemyArenaConfig` import + the old `BRUISER_BASE` and `FIGHT_DIFFICULTY_SCALE` constants.

### Step 8.5: Run tests

Run: `npm test -- tests/game/run.test.ts`
Expected: 12 tests pass (11 prior with `getEnemyConfig` test replaced by 1, + 2 new `getFightSpawnList` = 12 total).

If any fail, copy the exact error.

### Step 8.6: Run full suite + typecheck + build

```bash
npm test                # 110 total
npm run typecheck       # clean
npm run build           # clean
```

### Step 8.7: Commit

```bash
git add src/game/run.ts tests/game/run.test.ts
git commit -m "feat(game): run.getFightSpawnList reads from FIGHT_SCHEDULE"
```

---

## Task 9: Wire Spawn List into main.ts

**Why:** `main.ts` currently calls `run.getEnemyConfig()` and passes `enemy` to `createArena`. Switch to `run.getFightSpawnList()` and pass `enemies`.

**Files:**
- Modify: `src/main.ts`

### Step 9.1: Read current `main.ts` to find the `createArena` call.

### Step 9.2: In the `startNewFight` function, find:

```ts
  const enemyCfg = run.getEnemyConfig();
  arena = createArena({
    LX,
    LY,
    seed: (Date.now() & 0xffffffff) ^ (run.getState().fightIndex * 2654435761),
    player: playerCfg,
    enemy: enemyCfg,
    wrap: true,
  });
```

Replace with:

```ts
  const enemies = run.getFightSpawnList();
  arena = createArena({
    LX,
    LY,
    seed: (Date.now() & 0xffffffff) ^ (run.getState().fightIndex * 2654435761),
    player: playerCfg,
    enemies,
    wrap: true,
  });
```

Also: when creating the renderer, currently it's `createRenderer(canvas, 2)`. With multi-enemy fights we need more colors. Change to `createRenderer(canvas, 1 + enemies.length)`.

Update the `debug.setSwatch` calls — currently they hard-code 2 cells. Comment that out for now; it'll be misleading on multi-enemy fights, but fixing it is M7 polish:

Find:
```ts
debug.setSwatch(1, cellColorCss(0, 2));
debug.setSwatch(2, cellColorCss(1, 2));
```

Replace with:
```ts
// Debug swatches for multi-enemy fights are populated in startNewFight() now,
// since the cell count varies per fight.
```

And inside `startNewFight()`, after `renderer = createRenderer(canvas, 1 + enemies.length);`, add:

```ts
  // Update debug panel swatches to match this fight's cell count.
  debug.setSwatch(1, cellColorCss(0, 1 + enemies.length));
  for (let i = 0; i < enemies.length; i++) {
    debug.setSwatch(2 + i, cellColorCss(1 + i, 1 + enemies.length));
  }
```

### Step 9.3: Verify

```bash
npm run typecheck       # clean
npm test                # 110 still pass
npm run build           # clean
timeout 8 npm run dev 2>&1 | head -20    # dev server starts
```

### Step 9.4: Commit

```bash
git add src/main.ts
git commit -m "feat: wire FIGHT_SCHEDULE through arena into render/debug"
```

---

## Task 10: Visual Smoke Test (Human-Verified)

- [ ] **Step 10.1: User plays a full run and reports.**
  - Fight 1: lone Bruiser (red player vs cyan-ish blob). Familiar.
  - Fight 2: lone Sniper. Sniper visibly flees when you approach and fires bullets at you. Bullets are bigger than yours.
  - Fight 3: 1 Bruiser + 1 Sniper. Both move with their respective behaviors.
  - Fight 4: lone Splitter. Behaves bruiser-like. When its vol → 0, two small swarmlets pop into existence at its last position. You must clear both to win.
  - Fight 5: 4 small swarmlets converge on you. Visually busy.
  - Fight 6: lone Mirror. Same color as you (or close). Your stats applied to it. If you have engulf upgrades, the Mirror also has them.
  - Fight 7: 1 elite Splitter + 1 elite Sniper, both larger than baseline.
  - Fight 8: Boss. Massive. When you whittle it below ~50%, it splits into 3 medium bruiser-like cells.
  - HUD shows "Fight N / 8" each fight; build accumulates.
  - 60 FPS sustained even in fight 5.

- [ ] **Step 10.2: If anything is broken, escalate.**

---

## Task 11: M5 Wrap-up

- [ ] **Step 11.1: Confirm M5 definition of done.**
- [ ] **Step 11.2: Tag the milestone.**
- [ ] **Step 11.3: Note deferred concerns** — likely: Boss phase 3 (shrinking arena) for M7, debug panel only shows 2 cells (M7 polish), Sniper firing rate may need tuning after play.

---

## Notes for the Implementing Engineer

**On Boss phase tracking.** The Boss's `phase` field is internal AI state, not arena state. The Boss spawns its phase-2 cells once when its own vol drops below 50% of starting. Those new cells are *separate cells* in the cells map; the Boss continues to exist (smaller) until killed.

**On per-cell archetype state.** `aiStates` is a `Map<CellId, AiState>`. Mid-fight spawned cells need their AiState added in `spawnEnemy`. Don't forget — a Splitter spawning swarmlets means the swarmlets need their own (empty) AiState.

**On Mirror copying player stats.** This happens at construction time in `createArena`. The Mirror sees the *current* run's `getPlayerConfig()`. So if you've picked "Faster Engulf" twice and "Bigger Cell" once, the Mirror has +30% engulf and +50 targetVol. Cool emergent thing to test.

**On the simplification of Boss.** Spec says 3 phases; we ship 2. The deferred phase 3 (shrinking arena) needs new sim plumbing — a "wall" that consumes edge pixels — and that's a meaningful chunk of work. M7 polish window is the right place. Note this in the wrap-up commit message.

**Read the spec.** Section 7 is canonical. If this plan and the spec disagree, the spec wins; flag the contradiction.
