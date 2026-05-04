# M2 — Input & Bullets Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Drive the player cell with WASD and fire bullets with the space bar. Bullets travel across the grid, chip pixels off non-owner cells on overlap, and despawn after wrapping ≥2 times. The player cell visibly moves where pointed; bullets visibly chip the static target cell.

**Architecture:** Add a `Bullet` type to `sim/types.ts`. Replace the `stepBullets` stub in `sim/bullets.ts` with the real implementation: per-tick advance bullets, detect overlap with grid pixels, delete non-owner pixels, despawn old bullets. Add a thin `game/input.ts` module that owns keyboard state and translates it to a player `Intent` plus a `shouldFire` signal. `main.ts` becomes the wiring layer that ties keyboard → player intent and reads "fire bullet" intent each frame, calling `addBullet` on the sim. Keep `sim/` agnostic of "player" — it only sees cells with intent vectors and a `bullets[]` array.

**Tech Stack:** Same as M1. No new runtime deps.

**Reference:** Python `simulator.py` `step_bullets`, `add_bullet`, `bullet_pxs`, `State.bullets`, and the firing logic at the top of `step_bullets`. We're porting this faithfully but cleaning up the structure: the Python `step_bullets` reads `pygame.key.get_pressed()` directly, mixing input and physics. We separate them.

**Definition of done:**
- `npm run dev` shows two cells. WASD drives cell 1 (player) — it visibly moves in the chosen direction.
- Space bar fires a bullet from cell 1 in the current movement direction (or last direction if not currently moving).
- Bullets travel, chip pixels off cell 2 (the static target) on overlap, and despawn after wrapping the grid twice.
- Bullets are rendered as bright dots in the owner's color (lightened).
- Firing costs `target_vol`; if `target_vol < 20`, firing is suppressed (matches Python).
- 60 FPS sustained on player's machine.
- All M1 tests still pass; new M2 tests cover bullet stepping, collision, despawn, and input → intent translation.

---

## File Structure

Files this plan creates or modifies:

```
cellular-death-match/
├── src/
│   ├── main.ts                  # MODIFY: wire input + spawn player + per-frame fire
│   ├── sim/
│   │   ├── types.ts             # MODIFY: add Bullet, BulletId, extend SimState/SimEvent
│   │   ├── bullets.ts           # REPLACE: real stepBullets + addBullet + bullet rendering helpers
│   │   └── sim.ts               # MODIFY: createSim initializes empty bullets[]
│   ├── ui/
│   │   └── render.ts            # MODIFY: render bullets on top of grid (lightened owner color)
│   └── game/                    # NEW directory
│       └── input.ts             # NEW: keyboard listener → { vec, shouldFire }
└── tests/
    ├── sim/
    │   └── bullets.test.ts      # NEW: addBullet, stepBullets advance, collision, despawn
    └── game/                    # NEW directory
        └── input.test.ts        # NEW: key state → intent vector + shouldFire flag
```

**Module responsibilities:**
- `sim/types.ts`: adds `Bullet` interface, adds `bullets: Bullet[]` to `SimState`, adds `bulletHit` and `bulletFired` events to `SimEvent`.
- `sim/bullets.ts`: `addBullet(state, opts)`, `stepBullets(state)`. Pure logic; no input, no rendering.
- `sim/sim.ts`: `createSim` initializes `state.bullets = []`. `tick` already calls `stepBullets` (from M1 stub) — no change needed there.
- `ui/render.ts`: extends renderer to draw bullets in their owner's lightened color over the grid blit. One `arc()` call per bullet, post-blit.
- `game/input.ts`: a small module that attaches `keydown`/`keyup` listeners to `window` and exposes `pollInput()` returning `{ moveVec: [number, number], shouldFire: boolean, lastFireDir: [number, number] }`. The "last fire dir" handles the case where the player presses space without holding a movement key — they fire in the direction they were last moving (matches Python behavior).
- `main.ts`: spawns the player cell, calls `pollInput()` each frame, writes the result into `state.cells.get(playerId)!.intent`, and fires a bullet if `shouldFire` and `target_vol >= 20`.

---

## Task 1: Add Bullet Types

**Why:** The data shape comes first. Other tasks can't be written until `Bullet` exists in the type system. We extend `SimState` with `bullets: Bullet[]`, and `SimEvent` with `bulletFired` and `bulletHit` variants for downstream consumption (juice, audio, upgrade hooks).

**Files:**
- Modify: `src/sim/types.ts`

- [ ] **Step 1.1: Read current `src/sim/types.ts`**

Read the file first to see current contents. The current file ends with `NEIGHBOR_DIRS` — you'll be adding to it.

- [ ] **Step 1.2: Add the Bullet type and extend SimState/SimEvent**

Edit `src/sim/types.ts`. Find the line:
```ts
export type SimEvent =
  | { type: 'pixelTransferred'; from: CellId; to: CellId; pos: [number, number] };
```

Replace it with:
```ts
export interface Bullet {
  pos: [number, number];        // grid coordinates, fractional
  v: [number, number];          // velocity in grid-pixels per tick
  ownerId: CellId;              // which cell fired this bullet (collisions ignored vs owner during grace period)
  size: number;                 // bullet width/height in pixels (square footprint)
  age: number;                  // ticks since spawn
  wraps: number;                // count of grid-edge wraps; despawn at >=2
}

export type SimEvent =
  | { type: 'pixelTransferred'; from: CellId; to: CellId; pos: [number, number] }
  | { type: 'bulletFired';      ownerId: CellId; pos: [number, number]; v: [number, number] }
  | { type: 'bulletHit';        ownerId: CellId; victimId: CellId; pos: [number, number] };
```

Then find the `SimState` interface:
```ts
export interface SimState {
  grid: Grid;
  cells: Map<CellId, Cell>;
  betaIsing: number;
  betaVol: number;
  betaMov: number;
  events: SimEvent[];
  rng: import('./rng').Rng;
}
```

Replace it with:
```ts
export interface SimState {
  grid: Grid;
  cells: Map<CellId, Cell>;
  bullets: Bullet[];
  betaIsing: number;
  betaVol: number;
  betaMov: number;
  events: SimEvent[];
  rng: import('./rng').Rng;
  wrapBullets: boolean;        // true: bullets wrap on grid edges (matches Python wrap_bullets=True)
}
```

- [ ] **Step 1.3: Run typecheck — expect failures in `sim.ts` and `bullets.ts`**

Run: `npm run typecheck`
Expected: TS errors in `src/sim/sim.ts` (the `createSim` return value is missing the new `bullets` and `wrapBullets` fields) and possibly `src/sim/bullets.ts`. This is expected — Task 2 fixes them.

If you see errors elsewhere (e.g. in `monte-carlo.ts` or `main.ts`), STOP and report — those weren't supposed to break.

- [ ] **Step 1.4: Commit**

```bash
git add src/sim/types.ts
git commit -m "feat(sim): add Bullet type, extend SimState/SimEvent for bullets"
```

It's intentional that this commit leaves the build broken — Task 2 immediately follows. The TDD discipline is to make atomic conceptual commits even when intermediate states don't compile. Some teams squash; we don't here because each commit corresponds to a reviewable scope.

---

## Task 2: Update Sim Façade for Bullets

**Why:** `createSim` must initialize the new `bullets: []` and `wrapBullets` fields. This is a one-line fix to the return object plus an option to `CreateSimOpts`.

**Files:**
- Modify: `src/sim/sim.ts`

- [ ] **Step 2.1: Read current `src/sim/sim.ts`**

- [ ] **Step 2.2: Add `wrapBullets` to `CreateSimOpts` and the return value**

Edit `src/sim/sim.ts`. Find the `CreateSimOpts` interface:
```ts
export interface CreateSimOpts {
  LX: number;
  LY: number;
  nCells: number;
  targetVol: number;
  seed: number;
  wrap: boolean;
  betaIsing?: number;
  betaVol?: number;
  betaMov?: number;
}
```

Replace it with:
```ts
export interface CreateSimOpts {
  LX: number;
  LY: number;
  nCells: number;
  targetVol: number;
  seed: number;
  wrap: boolean;
  wrapBullets?: boolean;       // default true
  betaIsing?: number;
  betaVol?: number;
  betaMov?: number;
}
```

Find the return statement at the bottom of `createSim`:
```ts
  return {
    grid,
    cells,
    betaIsing: opts.betaIsing ?? 1,
    betaVol: opts.betaVol ?? 1,
    betaMov: opts.betaMov ?? 1,
    events: [],
    rng: createRng(opts.seed),
  };
```

Replace it with:
```ts
  return {
    grid,
    cells,
    bullets: [],
    betaIsing: opts.betaIsing ?? 1,
    betaVol: opts.betaVol ?? 1,
    betaMov: opts.betaMov ?? 1,
    events: [],
    rng: createRng(opts.seed),
    wrapBullets: opts.wrapBullets ?? true,
  };
```

- [ ] **Step 2.3: Run typecheck — expect clean (or only `bullets.ts` errors)**

Run: `npm run typecheck`
Expected: clean, OR errors only in `src/sim/bullets.ts` (the stub doesn't reference `state.bullets` yet, so it should compile). If you see errors anywhere else, STOP.

- [ ] **Step 2.4: Run M1 tests — verify they still pass**

Run: `npm test`
Expected: 25 tests pass. The `tests/sim/sim.test.ts` test "creates a sim with N cells at distinct positions" should still pass; we're only adding fields, not changing existing ones.

If tests fail, STOP and report the specific failure.

- [ ] **Step 2.5: Commit**

```bash
git add src/sim/sim.ts
git commit -m "feat(sim): initialize bullets[] and wrapBullets in createSim"
```

---

## Task 3: Implement `addBullet` and `stepBullets`

**Why:** This is the heart of M2. Bullets travel across the grid, eat pixels on contact (chipping the target cell), and despawn after wrapping twice. Faithful port of Python `step_bullets`, restructured into smaller pieces.

**Files:**
- Replace: `src/sim/bullets.ts`
- Create: `tests/sim/bullets.test.ts`

### Behavior the implementation must satisfy

From the Python source, the bullet lifecycle is:
1. **Spawn:** `addBullet(state, { x, y, v, ownerId, size })` appends a `Bullet` with `age: 0, wraps: 0`. Emits `bulletFired` event.
2. **Per tick:**
   - For each bullet: enumerate the pixels it currently overlaps (`bulletPxs(bullet, grid)`).
     - For each overlapping pixel: if `grid[px] !== 0` AND `(grid[px] !== ownerId OR age >= norm(LX, LY) / 3)`:
       - Decrement that cell's `vol` and `targetVol`.
       - Set `grid[px] = 0` (the pixel becomes empty).
       - Update boundary around that pixel.
       - Emit `bulletHit` event with `victimId`.
   - Advance: `pos += v`, `age += 1`.
3. **Wrap or despawn:**
   - If `wrapBullets === false`: drop bullets whose `pos` is outside `[0, LX) × [0, LY)`.
   - If `wrapBullets === true`: wrap `pos` modulo `(LX, LY)`. Increment `wraps` each time the position changes due to wrap. Drop bullets with `wraps >= 2`.

The `age >= norm(LX, LY) / 3` clause is the "firing grace period" — your own bullet doesn't damage you for the first ~33 ticks (gives time to clear your own pixels). This matters because bullets spawn *inside* the firing cell.

### Step 3.1: Write the failing tests at `tests/sim/bullets.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { createSim } from '../../src/sim/sim';
import { addBullet, stepBullets } from '../../src/sim/bullets';
import type { SimState } from '../../src/sim/types';

function fixture(): SimState {
  return createSim({
    LX: 30,
    LY: 30,
    nCells: 2,
    targetVol: 30,
    seed: 1,
    wrap: true,
  });
}

describe('addBullet', () => {
  it('appends a bullet with default fields', () => {
    const state = fixture();
    addBullet(state, {
      pos: [5, 5],
      v: [1, 0],
      ownerId: 1,
      size: 1,
    });
    expect(state.bullets.length).toBe(1);
    const b = state.bullets[0]!;
    expect(b.pos).toEqual([5, 5]);
    expect(b.v).toEqual([1, 0]);
    expect(b.ownerId).toBe(1);
    expect(b.size).toBe(1);
    expect(b.age).toBe(0);
    expect(b.wraps).toBe(0);
  });

  it('emits a bulletFired event', () => {
    const state = fixture();
    state.events.length = 0;
    addBullet(state, { pos: [5, 5], v: [1, 0], ownerId: 1, size: 1 });
    const fired = state.events.find((e) => e.type === 'bulletFired');
    expect(fired).toBeDefined();
  });
});

describe('stepBullets — advance', () => {
  it('advances bullet position by velocity each step', () => {
    const state = fixture();
    addBullet(state, { pos: [5, 5], v: [1, 2], ownerId: 1, size: 1 });
    stepBullets(state);
    const b = state.bullets[0]!;
    expect(b.pos[0]).toBeCloseTo(6, 5);
    expect(b.pos[1]).toBeCloseTo(7, 5);
    expect(b.age).toBe(1);
  });
});

describe('stepBullets — collision with non-owner', () => {
  it('chips a pixel off a non-owner cell on overlap', () => {
    // Build a controlled state: place a bullet directly on a pixel of cell 2.
    const state = fixture();
    state.bullets = [];

    // Find a pixel of cell 2.
    let target: [number, number] | null = null;
    for (let x = 0; x < state.grid.LX && target === null; x++) {
      for (let y = 0; y < state.grid.LY; y++) {
        if (state.grid.cells[x * state.grid.LY + y] === 2) {
          target = [x, y];
          break;
        }
      }
    }
    if (target === null) throw new Error('No cell-2 pixel found in fixture');

    const cell2 = state.cells.get(2)!;
    const volBefore = cell2.vol;
    addBullet(state, {
      pos: [target[0], target[1]],
      v: [0, 0],            // no movement — collision happens this tick
      ownerId: 1,           // cell 1's bullet
      size: 1,
    });

    stepBullets(state);

    expect(cell2.vol).toBe(volBefore - 1);
    expect(state.grid.cells[target[0] * state.grid.LY + target[1]]).toBe(0);
    const hits = state.events.filter((e) => e.type === 'bulletHit');
    expect(hits.length).toBeGreaterThanOrEqual(1);
  });
});

describe('stepBullets — owner grace period', () => {
  it('does not damage owner during grace period (age < grace)', () => {
    const state = fixture();
    state.bullets = [];

    // Find a pixel of cell 1.
    let inside: [number, number] | null = null;
    for (let x = 0; x < state.grid.LX && inside === null; x++) {
      for (let y = 0; y < state.grid.LY; y++) {
        if (state.grid.cells[x * state.grid.LY + y] === 1) {
          inside = [x, y];
          break;
        }
      }
    }
    if (inside === null) throw new Error('No cell-1 pixel found');

    const cell1 = state.cells.get(1)!;
    const volBefore = cell1.vol;
    addBullet(state, {
      pos: [inside[0], inside[1]],
      v: [0, 0],
      ownerId: 1,           // owner's own bullet
      size: 1,
    });

    stepBullets(state);

    // Grace period (LX = LY = 30, norm ≈ 42.4, /3 ≈ 14.1) — at age 1, no damage.
    expect(cell1.vol).toBe(volBefore);
    expect(state.grid.cells[inside[0] * state.grid.LY + inside[1]]).toBe(1);
  });
});

describe('stepBullets — wrap and despawn', () => {
  it('wraps bullet position when wrapBullets=true and counts wraps', () => {
    const state = fixture();
    state.bullets = [];
    addBullet(state, {
      pos: [29, 0],            // at the right edge of a 30×30 grid
      v: [2, 0],               // crosses the edge in one step
      ownerId: 1,
      size: 1,
    });
    stepBullets(state);
    const b = state.bullets[0]!;
    expect(b.pos[0]).toBeCloseTo(1, 5);   // wrapped
    expect(b.wraps).toBe(1);
  });

  it('despawns a bullet that has wrapped twice', () => {
    const state = fixture();
    state.bullets = [];
    addBullet(state, {
      pos: [29, 0],
      v: [2, 0],
      ownerId: 1,
      size: 1,
    });
    // Two wraps to remove.
    stepBullets(state); // wraps 1
    stepBullets(state); // bullet now at ~3, no wrap; advance several more
    // Force more wraps
    state.bullets[0]!.pos = [29, 0];
    stepBullets(state); // wraps 2 — should despawn
    expect(state.bullets.length).toBe(0);
  });

  it('drops bullet that exits non-wrap grid', () => {
    const state = createSim({
      LX: 30,
      LY: 30,
      nCells: 2,
      targetVol: 30,
      seed: 1,
      wrap: true,
      wrapBullets: false,
    });
    state.bullets = [];
    addBullet(state, {
      pos: [29, 0],
      v: [2, 0],
      ownerId: 1,
      size: 1,
    });
    stepBullets(state);
    expect(state.bullets.length).toBe(0);
  });
});
```

### Step 3.2: Run tests, verify they fail

Run: `npm test -- tests/sim/bullets.test.ts`
Expected: FAIL — `addBullet` is not exported (or `bullets.ts` exports a no-op `stepBullets`).

If failure is for any other reason, STOP and report BLOCKED.

### Step 3.3: Replace `src/sim/bullets.ts` with the real implementation

Use the Write tool (full replacement). New content:

```ts
import { type Bullet, type CellId, type SimState } from './types';
import { getCell, setCell, updateBoundaryAround } from './grid';
import { removePixel } from './cell';

export interface AddBulletOpts {
  pos: [number, number];
  v: [number, number];
  ownerId: CellId;
  size: number;
}

export function addBullet(state: SimState, opts: AddBulletOpts): void {
  const bullet: Bullet = {
    pos: [opts.pos[0], opts.pos[1]],
    v: [opts.v[0], opts.v[1]],
    ownerId: opts.ownerId,
    size: opts.size,
    age: 0,
    wraps: 0,
  };
  state.bullets.push(bullet);
  state.events.push({
    type: 'bulletFired',
    ownerId: opts.ownerId,
    pos: [opts.pos[0], opts.pos[1]],
    v: [opts.v[0], opts.v[1]],
  });
}

// Returns the integer grid pixel coordinates this bullet currently overlaps.
// A size-N bullet covers an N×N square centered on `pos`.
function bulletPxs(b: Bullet, LX: number, LY: number): [number, number][] {
  const out: [number, number][] = [];
  const half = (b.size - 1) / 2;
  const xLo = Math.max(Math.round(b.pos[0] - half), 0);
  const xHi = Math.min(Math.round(b.pos[0] + half) + 1, LX);
  const yLo = Math.max(Math.round(b.pos[1] - half), 0);
  const yHi = Math.min(Math.round(b.pos[1] + half) + 1, LY);
  for (let x = xLo; x < xHi; x++) {
    for (let y = yLo; y < yHi; y++) {
      out.push([x, y]);
    }
  }
  return out;
}

// The "firing grace period": a bullet doesn't damage its owner until it has
// traveled the radius of the field. Matches Python: norm([LX, LY]) / 3.
function gracePeriod(LX: number, LY: number): number {
  return Math.sqrt(LX * LX + LY * LY) / 3;
}

export function stepBullets(state: SimState): void {
  const { grid, bullets, cells, wrapBullets } = state;
  const { LX, LY } = grid;
  const grace = gracePeriod(LX, LY);

  // 1. Process collisions and advance each bullet.
  for (const b of bullets) {
    for (const [x, y] of bulletPxs(b, LX, LY)) {
      const id = getCell(grid, x, y) as CellId;
      if (id === 0) continue;
      // Hit if not owner, OR owner but past grace period.
      if (id !== b.ownerId || b.age >= grace) {
        const victim = cells.get(id);
        if (victim) {
          // Use the canonical pixel-removal helper so center & vol stay in sync.
          // (Don't reimplement the circular-mean math here — that's cell.ts's job.)
          removePixel(victim, x, y, LX, LY);
          victim.targetVol -= 1;        // metabolism decay on damage; Python: target_cell_vols[id] -= 1
        }
        setCell(grid, x, y, 0);
        updateBoundaryAround(grid, x, y);
        state.events.push({
          type: 'bulletHit',
          ownerId: b.ownerId,
          victimId: id,
          pos: [x, y],
        });
      }
    }
    b.pos[0] += b.v[0];
    b.pos[1] += b.v[1];
    b.age += 1;
  }

  // 2. Wrap or drop.
  if (wrapBullets) {
    for (const b of bullets) {
      let wrapped = false;
      let nx = b.pos[0];
      let ny = b.pos[1];
      while (nx < 0)   { nx += LX; wrapped = true; }
      while (nx >= LX) { nx -= LX; wrapped = true; }
      while (ny < 0)   { ny += LY; wrapped = true; }
      while (ny >= LY) { ny -= LY; wrapped = true; }
      b.pos[0] = nx;
      b.pos[1] = ny;
      if (wrapped) b.wraps += 1;
    }
    state.bullets = bullets.filter((b) => b.wraps < 2);
  } else {
    state.bullets = bullets.filter(
      (b) => b.pos[0] >= 0 && b.pos[0] < LX && b.pos[1] >= 0 && b.pos[1] < LY,
    );
  }
}
```

> **Note on the `void idx`:** The `idx` import is currently unused but conceptually grouped with grid mutations; some implementers may prefer to remove the import. If your linter is unhappy, remove `idx` from the import line entirely. The plan's intent is that the grid imports stay grouped, but a clean tree is also fine.

### Step 3.4: Run the new tests, verify they pass

Run: `npm test -- tests/sim/bullets.test.ts`
Expected: all 7 tests pass. The wrap-and-despawn test in particular is fiddly — if it fails, the most likely cause is wrap-counting logic in your implementation. Read the test and the spec carefully.

### Step 3.5: Run the full suite

Run: `npm test`
Expected: 32 tests total (25 from M1 + 7 new). All pass.

### Step 3.6: Verify build still works

Run: `npm run build`
Expected: clean.

### Step 3.7: Commit

```bash
git add src/sim/bullets.ts tests/sim/bullets.test.ts
git commit -m "feat(sim): bullets with collision, wrap, despawn"
```

---

## Task 4: Render Bullets

**Why:** Bullets need to be visible. We extend the renderer to draw a bright dot per bullet, in the owner's color, lightened. One `arc()` call per bullet — particle-light. No tests; visual verification only.

**Files:**
- Modify: `src/ui/render.ts`

- [ ] **Step 4.1: Read current `src/ui/render.ts`** to understand the existing `createRenderer` shape.

- [ ] **Step 4.2: Add a bullet-rendering helper and call it in `render()`**

Find the end of the `render` method body — currently:
```ts
      offCtx!.putImageData(imageData, 0, 0);
      // Scale up to display canvas.
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(offscreen!, 0, 0, canvas.width, canvas.height);
    },
```

Replace it with:
```ts
      offCtx!.putImageData(imageData, 0, 0);
      // Scale up to display canvas.
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(offscreen!, 0, 0, canvas.width, canvas.height);

      // Draw bullets on top, in display coordinates.
      const sx = canvas.width / LX;
      const sy = canvas.height / LY;
      for (const b of state.bullets) {
        const palette = base[b.ownerId] ?? base[0]!;
        // Lighten by 0.5 for the bullet color (slightly brighter than boundary).
        const r = 255 * 0.5 + palette[0]! * 0.5;
        const g = 255 * 0.5 + palette[1]! * 0.5;
        const bl = 255 * 0.5 + palette[2]! * 0.5;
        ctx.fillStyle = `rgb(${r | 0}, ${g | 0}, ${bl | 0})`;
        ctx.beginPath();
        const cx = (b.pos[1] + 0.5) * sx;     // note: grid is [x][y] → display y is grid x
        const cy = (b.pos[0] + 0.5) * sy;
        const radius = Math.max(b.size * sx * 0.5, 2);
        ctx.arc(cx, cy, radius, 0, 2 * Math.PI);
        ctx.fill();
      }
    },
```

(The grid-x → display-y mapping is intentional and matches how `render.ts` already writes `pixIdx = (y * LX + x) * 4` — display X = grid Y, display Y = grid X. We follow that convention for bullets.)

- [ ] **Step 4.3: Run typecheck**

Run: `npm run typecheck`
Expected: clean.

- [ ] **Step 4.4: Run tests**

Run: `npm test`
Expected: 32 tests still pass (no new ones; renderer has no tests).

- [ ] **Step 4.5: Commit**

```bash
git add src/ui/render.ts
git commit -m "feat(ui): render bullets as bright dots in owner color"
```

---

## Task 5: Input Module

**Why:** Translate keyboard state to a player intent vector and a fire signal. Isolated module so input is testable without the DOM (we mock the listener), and so future changes (gamepad, touch, AI taking control of cell 1) only touch one file.

**Files:**
- Create: `src/game/input.ts`
- Create: `tests/game/input.test.ts`

### Step 5.1: Write the failing tests at `tests/game/input.test.ts`

```ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createInput } from '../../src/game/input';

// Minimal DOM stand-in: the input module attaches keydown/keyup listeners
// to a target. We pass a mock target and dispatch events manually.
class MockTarget {
  private handlers = new Map<string, ((e: { key: string }) => void)[]>();
  addEventListener(type: string, fn: (e: { key: string }) => void): void {
    if (!this.handlers.has(type)) this.handlers.set(type, []);
    this.handlers.get(type)!.push(fn);
  }
  removeEventListener(type: string, fn: (e: { key: string }) => void): void {
    const h = this.handlers.get(type);
    if (!h) return;
    const idx = h.indexOf(fn);
    if (idx !== -1) h.splice(idx, 1);
  }
  dispatch(type: string, key: string): void {
    const h = this.handlers.get(type) ?? [];
    for (const fn of h) fn({ key });
  }
}

describe('createInput', () => {
  let target: MockTarget;
  beforeEach(() => {
    target = new MockTarget();
  });
  afterEach(() => { /* MockTarget is GC'd */ });

  it('starts with zero vector and not firing', () => {
    const input = createInput(target as unknown as EventTarget);
    const s = input.poll();
    expect(s.moveVec).toEqual([0, 0]);
    expect(s.shouldFire).toBe(false);
  });

  it('arrow up sets moveVec to [-1, 0] (negative grid x)', () => {
    const input = createInput(target as unknown as EventTarget);
    target.dispatch('keydown', 'ArrowUp');
    const s = input.poll();
    expect(s.moveVec).toEqual([-1, 0]);
  });

  it('WASD also works as movement', () => {
    const input = createInput(target as unknown as EventTarget);
    target.dispatch('keydown', 'd');
    const s = input.poll();
    expect(s.moveVec).toEqual([0, 1]);
  });

  it('combined keys produce normalized diagonal', () => {
    const input = createInput(target as unknown as EventTarget);
    target.dispatch('keydown', 'ArrowUp');
    target.dispatch('keydown', 'ArrowRight');
    const s = input.poll();
    // Up = [-1, 0], Right = [0, 1]; combined raw [-1, 1], normalized.
    const inv = 1 / Math.sqrt(2);
    expect(s.moveVec[0]).toBeCloseTo(-inv, 5);
    expect(s.moveVec[1]).toBeCloseTo(inv, 5);
  });

  it('keyup removes a key from movement', () => {
    const input = createInput(target as unknown as EventTarget);
    target.dispatch('keydown', 'ArrowUp');
    target.dispatch('keyup', 'ArrowUp');
    const s = input.poll();
    expect(s.moveVec).toEqual([0, 0]);
  });

  it('space sets shouldFire while held', () => {
    const input = createInput(target as unknown as EventTarget);
    target.dispatch('keydown', ' ');
    const s1 = input.poll();
    expect(s1.shouldFire).toBe(true);
    target.dispatch('keyup', ' ');
    const s2 = input.poll();
    expect(s2.shouldFire).toBe(false);
  });

  it('lastFireDir remembers last non-zero movement when current is zero', () => {
    const input = createInput(target as unknown as EventTarget);
    target.dispatch('keydown', 'ArrowDown');
    input.poll(); // moveVec = [1, 0]; lastFireDir captured
    target.dispatch('keyup', 'ArrowDown');
    const s = input.poll();
    expect(s.moveVec).toEqual([0, 0]);
    expect(s.lastFireDir).toEqual([1, 0]);
  });
});
```

### Step 5.2: Run tests, verify they fail

Run: `npm test -- tests/game/input.test.ts`
Expected: FAIL — module not found.

If failure is for any other reason, STOP and report BLOCKED.

### Step 5.3: Implement `src/game/input.ts`

```ts
export interface InputState {
  moveVec: [number, number];      // normalized (length 0 or 1)
  shouldFire: boolean;
  lastFireDir: [number, number];  // last non-zero moveVec (or [1, 0] initial)
}

export interface Input {
  poll(): InputState;
  destroy(): void;
}

// Maps a KeyboardEvent.key value to a [dx, dy] grid-direction contribution.
//
// Convention: grid coordinates are (row, col) = (x, y). "Up" on screen means
// "toward smaller grid x" (negative x). Right = +y. This matches the way
// `ui/render.ts` already maps grid-x → display-y.
const KEY_DIRS: Record<string, [number, number]> = {
  ArrowUp: [-1, 0], w: [-1, 0], W: [-1, 0],
  ArrowDown: [1, 0], s: [1, 0], S: [1, 0],
  ArrowLeft: [0, -1], a: [0, -1], A: [0, -1],
  ArrowRight: [0, 1], d: [0, 1], D: [0, 1],
};

const FIRE_KEYS = new Set([' ', 'Spacebar']);

function normalize(v: [number, number]): [number, number] {
  const len = Math.hypot(v[0], v[1]);
  if (len === 0) return [0, 0];
  return [v[0] / len, v[1] / len];
}

export function createInput(target: EventTarget): Input {
  const held = new Set<string>();
  let lastFireDir: [number, number] = [1, 0];

  const onDown = (e: { key: string }) => { held.add(e.key); };
  const onUp = (e: { key: string }) => { held.delete(e.key); };

  target.addEventListener('keydown', onDown as EventListener);
  target.addEventListener('keyup', onUp as EventListener);

  return {
    poll(): InputState {
      let dx = 0, dy = 0;
      for (const k of held) {
        const dir = KEY_DIRS[k];
        if (dir) { dx += dir[0]; dy += dir[1]; }
      }
      const moveVec = normalize([dx, dy]);
      if (moveVec[0] !== 0 || moveVec[1] !== 0) {
        lastFireDir = moveVec;
      }
      let shouldFire = false;
      for (const k of held) {
        if (FIRE_KEYS.has(k)) { shouldFire = true; break; }
      }
      return { moveVec, shouldFire, lastFireDir };
    },
    destroy() {
      target.removeEventListener('keydown', onDown as EventListener);
      target.removeEventListener('keyup', onUp as EventListener);
    },
  };
}
```

### Step 5.4: Run tests, verify they pass

Run: `npm test -- tests/game/input.test.ts`
Expected: 7 tests pass.

### Step 5.5: Run full suite

Run: `npm test`
Expected: 39 tests total (32 from prior + 7 new).

### Step 5.6: Commit

```bash
git add src/game/input.ts tests/game/input.test.ts
git commit -m "feat(game): keyboard input module with WASD/arrows + space fire"
```

---

## Task 6: Wire Input + Bullets in `main.ts`

**Why:** Connect input → player intent and per-frame fire logic. After this step, `npm run dev` is the M2 visual smoke test.

**Files:**
- Modify: `src/main.ts`

- [ ] **Step 6.1: Read current `src/main.ts`**

- [ ] **Step 6.2: Replace `src/main.ts` with the M2 entry point**

Use the Write tool (full replacement):

```ts
import { createSim, tick } from './sim/sim';
import { addBullet } from './sim/bullets';
import { createRenderer } from './ui/render';
import { createInput } from './game/input';

const LX = 100;
const LY = 100;
const N_CELLS = 2;
const TARGET_VOL = 300;
const MC_STEPS_PER_FRAME = 1000;
const PLAYER_ID = 1;
const PLAYER_SPEED = 10;          // matches Python default
const BULLET_COST = 5;            // target_vol cost per shot (Python: bullet_cost = 5)
const BULLET_MIN_VOL = 20;        // can't fire below this targetVol (Python rule)
const BULLET_SPEED = 2;           // grid pixels per tick (Python default)
const BULLET_SIZE = 3;            // square footprint
const FIRE_COOLDOWN_TICKS = 5;    // simple rate limit (not in Python; M2 prevents bullet spray)

const canvas = document.getElementById('game') as HTMLCanvasElement | null;
if (!canvas) throw new Error('Missing #game canvas');

const state = createSim({
  LX,
  LY,
  nCells: N_CELLS,
  targetVol: TARGET_VOL,
  seed: Date.now() & 0xffffffff,
  wrap: true,
});

const renderer = createRenderer(canvas, N_CELLS);
const input = createInput(window);

// Ensure the canvas takes keyboard focus.
canvas.tabIndex = 0;
canvas.focus();
window.addEventListener('keydown', () => canvas.focus());

let cooldown = 0;
let lastFpsLog = performance.now();
let framesSinceLog = 0;

function loop() {
  const inp = input.poll();

  // 1. Drive the player cell's intent.
  const player = state.cells.get(PLAYER_ID);
  if (player) {
    player.intent.vec = inp.moveVec;
    player.intent.speed = PLAYER_SPEED;
    player.intent.shooting = inp.shouldFire;
  }

  // 2. Fire a bullet if possible.
  if (cooldown > 0) cooldown -= 1;
  if (inp.shouldFire && cooldown === 0 && player && player.targetVol >= BULLET_MIN_VOL) {
    const dir = inp.moveVec[0] === 0 && inp.moveVec[1] === 0 ? inp.lastFireDir : inp.moveVec;
    const v: [number, number] = [dir[0] * BULLET_SPEED, dir[1] * BULLET_SPEED];
    if (v[0] !== 0 || v[1] !== 0) {
      addBullet(state, {
        pos: [player.center[0], player.center[1]],
        v,
        ownerId: PLAYER_ID,
        size: BULLET_SIZE,
      });
      player.targetVol -= BULLET_COST;
      cooldown = FIRE_COOLDOWN_TICKS;
    }
  }

  // 3. Step the sim.
  tick(state, MC_STEPS_PER_FRAME);

  // 4. Render.
  renderer.render(state);

  // 5. FPS log.
  framesSinceLog++;
  const now = performance.now();
  if (now - lastFpsLog > 1000) {
    // eslint-disable-next-line no-console
    console.log(`FPS: ${framesSinceLog}`);
    framesSinceLog = 0;
    lastFpsLog = now;
  }

  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
```

- [ ] **Step 6.3: Run typecheck**

Run: `npm run typecheck`
Expected: clean.

- [ ] **Step 6.4: Run full test suite**

Run: `npm test`
Expected: 39 tests still pass.

- [ ] **Step 6.5: Run build**

Run: `npm run build`
Expected: clean. `dist/` produced.

- [ ] **Step 6.6: Briefly start the dev server to confirm it serves without errors**

Run: `timeout 8 npm run dev 2>&1 | head -20`
Expected: Vite prints a Local URL with no error stack traces.

- [ ] **Step 6.7: Commit**

```bash
git add src/main.ts
git commit -m "feat: wire keyboard input + bullet firing into main loop"
```

---

## Task 7: Visual Smoke Test (Human-Verified)

**Why:** Subagents can't see the canvas. The user runs the game and confirms the M2 definition of done.

- [ ] **Step 7.1: User runs `npm run dev` and verifies in a browser:**
  - Two colored blobs as before. The first (cell 1, the player) accepts WASD or arrow keys to drive it visibly across the grid.
  - Holding space fires bullets in the current movement direction. If not currently moving, fires in the last movement direction (default right).
  - Bullets are visible as bright dots, traveling across the grid.
  - Bullets chip pixels off cell 2 — its boundary visibly degrades on hits.
  - Bullets wrap at edges (since `wrapBullets: true` is the default), and despawn after wrapping twice.
  - Player's `targetVol` decreases on each shot (visible as slow shrinkage of cell 1 if you fire enough — though the cell tries to maintain its targetVol via the sim's volume term).
  - 60 FPS sustained per console log.

- [ ] **Step 7.2: If something looks wrong, escalate.** Specifically: if cell 1 doesn't move, the input → intent → movement-term chain is broken (Task 6). If bullets don't appear, the renderer wiring is wrong (Task 4). If bullets pass through cell 2 without damage, `stepBullets` collision logic is wrong (Task 3).

---

## Task 8: M2 Wrap-up

- [ ] **Step 8.1: Confirm M2 definition of done**

- [ ] **Step 8.2: Tag the milestone**

```bash
git tag m2-input-and-bullets
git log --oneline | head -20
```

- [ ] **Step 8.3: Note any deferred concerns**

If any of the following came up during M2, jot a note for the M3 plan:
- Performance issues (e.g. bullet collision walking every pixel — for `size=3` that's 9 pixels per bullet per tick, fine).
- API smells (the renderer's `base` palette is captured in closure — when M3 adds more cells, we may need to rebuild it).
- Things that worked but feel off (does fire feel responsive enough? cooldown too high/low?).

---

## Notes for the Implementing Engineer

**On bullet collision and the player's own bullets.** The "grace period" logic (`age >= norm(LX, LY)/3`) is straight from the Python source. It's there because bullets spawn *inside* the firing cell, so they overlap their owner's pixels for the first few ticks. Without grace, you'd damage yourself the moment you fire. The grace period equals roughly the radius of the playing field — by the time a bullet has traveled that far, it's left the firing cell.

**On the renderer's display-x ↔ grid-y mapping.** Look at `render.ts` Task 7 in M1 — `pixIdx = (y * LX + x) * 4`. That writes grid-coordinate `(x, y)` into ImageData position `(x_display, y_display) = (y, x)`. So display-X is grid-Y. We follow that convention everywhere. This means "ArrowUp" → grid-x decreases → display-y decreases → cell moves up on screen. ✓

**On `state.bullets` mutation.** `stepBullets` reassigns `state.bullets = bullets.filter(...)` at the end. This is intentional — `filter` returns a new array. The earlier loop iterates the *same* array (no mutation during iteration). This is safe.

**On test fragility.** The collision test reads `state.grid.cells` directly to find a cell-2 pixel rather than relying on a known position. Cell positions are seed-dependent; this approach is robust.

**Read the spec.** `docs/superpowers/specs/2026-05-04-cellular-death-match-design.md` Section 4 (Sim Layer) describes events and the bullet pipeline. If this plan and the spec disagree, escalate — don't silently pick one.
