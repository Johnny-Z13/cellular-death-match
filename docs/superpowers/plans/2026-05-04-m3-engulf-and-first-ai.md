# M3 — Engulf & First AI Implementation Plan

> Current-status note, 2026-05-25: this plan is retained as historical implementation context. The current app is documented in `README.md`, `AGENTS.md`, `CLAUDE.md`, `cloud.md`, and `docs/current-state.md`.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the engulf mechanic (the signature verb) and the first enemy AI (Bruiser) so that one full fight is playable end-to-end. Holding the engulf key (Shift or `e`) makes the player rapidly absorb adjacent enemy pixels — but disables shooting and decays `targetVol` while held. The Bruiser AI seeks the player and attempts to engulf on contact. Win = all enemy cells reach `vol === 0`. Loss = player cell reaches `vol === 0`. Both end the fight cleanly with a console log (no menus yet — those are M4).

**Architecture:**
- A new `engulfTerm` is added to the Monte Carlo step's `dH`. It biases pixel transfers toward cells with `engulfMultiplier > 1` from neighboring enemy cells. Implementation is one parameter (`engulfMultiplier` already exists on `Cell.intent` from M1) plus one new energy term (`engulfTerm`).
- A new `game/enemies/bruiser.ts` exports `bruiserStep(self, state)`, which writes the bruiser's intent each tick: vec toward player, engulf when close.
- A new `game/arena.ts` owns per-fight loop control: `createArena(opts) → { state, status, tick }`. `status` is `'running' | 'won' | 'lost'`. The arena reads sim state and reports the result; it doesn't render, doesn't read input.
- `main.ts` becomes the wiring: poll input, set player intent (including engulf), step the arena, render.

**Tech Stack:** Same as M1/M2.

**Reference:**
- Spec section 5 (Engulf Mechanic) is canonical for design intent.
- The Python sim has no engulf — this is a net-new mechanic.
- Bruiser AI is loosely modeled on the Python `desired_v` block (lines 76–82 of `simulator.py`) which makes CPU cells seek the nearest other cell. We replace "nearest" with "the player" and add engulf-on-contact.

**Definition of done:**
- `npm run dev` shows two cells. Cell 1 is the player (driven by WASD/space), cell 2 is the Bruiser AI (auto-seeks player).
- Holding Shift or `e` activates engulf: when the player is touching the Bruiser, pixels rapidly flow from Bruiser into player. Shooting is suppressed while engulf is held.
- Engulf decays player `targetVol` slowly; you can't engulf forever.
- Bruiser also engulfs the player on contact (it's not a free win for the player).
- When either cell reaches `vol === 0`, the loop stops and the console logs `WIN` or `LOSE`.
- All M2 tests still pass; new M3 tests cover the engulf term, Bruiser intent direction, win/loss detection, and the wrap-aware "shortest-path direction to player" helper.
- 60 FPS sustained.

---

## File Structure

Files this plan creates or modifies:

```
cellular-death-match/
├── src/
│   ├── main.ts                       # MODIFY: wire arena + engulf input + targetVol decay
│   ├── sim/
│   │   └── monte-carlo.ts            # MODIFY: add engulfTerm to dH
│   └── game/                         # (existing dir from M2)
│       ├── arena.ts                  # NEW: per-fight controller (status + tick)
│       ├── geometry.ts               # NEW: shortestVec(from, to, LX, LY) — wrap-aware direction
│       └── enemies/
│           └── bruiser.ts            # NEW: bruiser AI: seek + engulf on contact
└── tests/
    ├── sim/
    │   └── monte-carlo.test.ts       # MODIFY: add engulf term tests
    └── game/
        ├── arena.test.ts             # NEW: status transitions on win/loss
        ├── geometry.test.ts          # NEW: wrap-aware shortest direction
        └── enemies/
            └── bruiser.test.ts       # NEW: intent toward player, engulf on contact
```

**Module responsibilities:**
- `sim/monte-carlo.ts`: gains `engulfTerm(state, sourceVal, targetVal)` returning a negative-or-zero `dH` contribution when `sourceVal`'s `engulfMultiplier > 1` and `targetVal` is a different non-zero cell.
- `game/geometry.ts`: pure helper — `shortestVec(from, to, LX, LY)` returns the shortest displacement vector on a torus. Used by Bruiser AI; will also be used by Sniper/Splitter in M5.
- `game/enemies/bruiser.ts`: `bruiserStep(self: Cell, target: Cell, state: SimState)` writes intent on `self` based on player position. No internal state — fully reactive. (Future archetypes that *do* need internal state will define their own per-instance state object; Bruiser doesn't.)
- `game/arena.ts`: `createArena(opts)` returns `{ state, getStatus, tick }`. `getStatus()` returns `'running' | 'won' | 'lost'`. `tick(input)` accepts the player's input intent + engulf flag, runs Bruiser AI, then steps the sim. The arena does not own the rAF loop or rendering.
- `main.ts`: thin wiring. Input → arena.tick(input) → renderer.render(state). Stops the rAF loop when status leaves `'running'`.

---

## Task 1: Wrap-Aware Geometry Helper

**Why:** Bruiser AI needs to know which way to point its intent vector to reach the player. On a torus, the shortest path between two points may go through the wrap. This helper is small, pure, and universally useful — every future AI (Sniper, Splitter, Mirror) will need it.

**Files:**
- Create: `src/game/geometry.ts`
- Create: `tests/game/geometry.test.ts`

### Step 1.1: Write the failing tests at `tests/game/geometry.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { shortestVec } from '../../src/game/geometry';

describe('shortestVec', () => {
  it('returns the direct vector when no wrap is shorter', () => {
    // Grid 100x100. From (10, 10) to (40, 50): direct dx=30, dy=40.
    const v = shortestVec([10, 10], [40, 50], 100, 100);
    expect(v[0]).toBeCloseTo(30, 5);
    expect(v[1]).toBeCloseTo(40, 5);
  });

  it('returns negative direction when the wrap path is shorter on x', () => {
    // From (5, 50) to (95, 50) on 100-wide grid:
    //   direct dx = 90 (going right), wrap dx = -10 (going left, through 0)
    //   wrap is shorter — returns -10.
    const v = shortestVec([5, 50], [95, 50], 100, 100);
    expect(v[0]).toBeCloseTo(-10, 5);
    expect(v[1]).toBeCloseTo(0, 5);
  });

  it('returns negative direction when the wrap path is shorter on y', () => {
    const v = shortestVec([50, 5], [50, 95], 100, 100);
    expect(v[0]).toBeCloseTo(0, 5);
    expect(v[1]).toBeCloseTo(-10, 5);
  });

  it('handles non-square grids', () => {
    // 80x60 grid. From (5, 5) to (75, 55): direct (70, 50), wrap (-10, -10).
    // Wrap is shorter on both axes.
    const v = shortestVec([5, 5], [75, 55], 80, 60);
    expect(v[0]).toBeCloseTo(-10, 5);
    expect(v[1]).toBeCloseTo(-10, 5);
  });

  it('returns [0, 0] for identical points', () => {
    const v = shortestVec([42, 17], [42, 17], 100, 100);
    expect(v[0]).toBeCloseTo(0, 5);
    expect(v[1]).toBeCloseTo(0, 5);
  });

  it('handles fractional positions (cell centers)', () => {
    const v = shortestVec([10.5, 10.5], [11.5, 12.5], 100, 100);
    expect(v[0]).toBeCloseTo(1, 5);
    expect(v[1]).toBeCloseTo(2, 5);
  });
});
```

### Step 1.2: Run tests, verify they fail

Run: `npm test -- tests/game/geometry.test.ts`
Expected: FAIL — module not found.

### Step 1.3: Implement `src/game/geometry.ts`

```ts
// Returns the shortest displacement vector from `from` to `to` on a torus
// of size LX × LY. Result is in (-LX/2, LX/2] × (-LY/2, LY/2].
//
// Use this to compute "which direction should an AI go to reach the player",
// or "how far apart are two cells, accounting for grid wrap".
export function shortestVec(
  from: readonly [number, number],
  to: readonly [number, number],
  LX: number,
  LY: number,
): [number, number] {
  return [
    shortestAxis(to[0] - from[0], LX),
    shortestAxis(to[1] - from[1], LY),
  ];
}

function shortestAxis(delta: number, L: number): number {
  // Normalize delta into (-L/2, L/2].
  let d = delta % L;
  if (d > L / 2) d -= L;
  else if (d <= -L / 2) d += L;
  return d;
}
```

### Step 1.4: Run tests, verify they pass

Run: `npm test -- tests/game/geometry.test.ts`
Expected: 6 tests pass.

### Step 1.5: Run full suite + typecheck + build

```bash
npm test                # 46 total: 40 prior + 6 new
npm run typecheck       # clean
npm run build           # clean
```

If any step fails, STOP and report BLOCKED.

### Step 1.6: Commit

```bash
git add src/game/geometry.ts tests/game/geometry.test.ts
git commit -m "feat(game): wrap-aware shortestVec helper for AI direction"
```

---

## Task 2: Add Engulf Term to Monte Carlo Step

**Why:** This is the signature mechanic. We add a fourth term to `dH` in `mcStep`. When a cell with `intent.engulfMultiplier > 1` is the *source* of a candidate pixel transfer, AND the *target* is a different non-zero cell (i.e. an enemy), the term contributes a negative `dH`, making the transfer more likely to accept. This is exactly how the spec describes it (Section 5.4): "the player module sets `cell.intent.engulfMultiplier` to 1.0 normally, ~5.0 while held. The CPM movement-energy term gets a 'boundary attraction' component when the multiplier is > 1: pixel transfers *toward* the player cell from neighboring enemy cells get a `dH_engulf` bonus."

The math is simple: `dH_engulf = -(engulfMultiplier - 1) × engulfStrength` when engulfing applies, else 0. We use `engulfStrength = 1` for now (so engulfMultiplier=5 contributes -4 to dH, meaning `e^4 ≈ 55×` more likely to accept). This is strong but not infinite — the volume term still pushes back if you'd exceed targetVol.

**Files:**
- Modify: `src/sim/monte-carlo.ts`
- Modify: `tests/sim/monte-carlo.test.ts`

### Step 2.1: Read current `src/sim/monte-carlo.ts`

### Step 2.2: Add engulf term tests to `tests/sim/monte-carlo.test.ts`

The test file already exists (5 tests from M1). We're adding new tests *to the same file*. Find the closing `});` of the outer `describe('mcStep', ...)` block — it appears at the end of the file after the "early-returns" test:

```ts
  it('a step early-returns without changes if boundary is empty', () => {
    const state = makeStateWithTwoBlobs();
    state.grid.boundary.clear();
    const before = Array.from(state.grid.cells);
    mcStep(state);
    expect(Array.from(state.grid.cells)).toEqual(before);
  });
});
```

Add the following AFTER that closing `});` (at file scope):

```ts

describe('mcStep — engulf term', () => {
  it('with engulfMultiplier=5 on cell 1, cell 1 absorbs cell 2 pixels much faster', () => {
    // Run two parallel sims from the same seed. In sim A, cell 1 has engulfMultiplier=1 (off).
    // In sim B, cell 1 has engulfMultiplier=5 (engulf on). After many steps, sim B should
    // have cell 1 with significantly more volume.
    const seed = 99;
    const baseline = makeStateWithTwoBlobsAt((s) => {
      s.cells.get(1)!.intent.engulfMultiplier = 1;
    }, seed);
    const engulfing = makeStateWithTwoBlobsAt((s) => {
      s.cells.get(1)!.intent.engulfMultiplier = 5;
    }, seed);
    for (let i = 0; i < 5000; i++) {
      mcStep(baseline);
      mcStep(engulfing);
    }
    const v1Baseline = baseline.cells.get(1)!.vol;
    const v1Engulf = engulfing.cells.get(1)!.vol;
    expect(v1Engulf).toBeGreaterThan(v1Baseline);
  });

  it('engulfMultiplier=1 produces identical behavior to baseline (no-op when off)', () => {
    const seed = 42;
    const a = makeStateWithTwoBlobsAt(() => { /* default */ }, seed);
    const b = makeStateWithTwoBlobsAt((s) => {
      s.cells.get(1)!.intent.engulfMultiplier = 1;
    }, seed);
    for (let i = 0; i < 1000; i++) {
      mcStep(a);
      mcStep(b);
    }
    expect(Array.from(a.grid.cells)).toEqual(Array.from(b.grid.cells));
  });
});

// Helper used by the engulf-term tests above. Builds a fresh two-blob state,
// re-seeds its RNG, and applies a caller-supplied mutation (e.g. setting
// engulfMultiplier on cell 1).
function makeStateWithTwoBlobsAt(
  mutate: (s: ReturnType<typeof makeStateWithTwoBlobs>) => void,
  seed: number,
): ReturnType<typeof makeStateWithTwoBlobs> {
  const state = makeStateWithTwoBlobs();
  state.rng = createRng(seed);
  mutate(state);
  return state;
}
```

### Step 2.3: Run tests — expect the new ones to fail

Run: `npm test -- tests/sim/monte-carlo.test.ts`
Expected: 5 prior tests pass, 2 new "engulf term" tests fail.

The first new test fails because without `engulfTerm`, `engulfMultiplier=5` has no effect, so cell 1's volume in `engulfing` will equal cell 1's volume in `baseline`.

If 5 prior tests fail too, STOP and report BLOCKED — adding new tests shouldn't break old ones.

### Step 2.4: Add `engulfTerm` to `src/sim/monte-carlo.ts`

Find the existing `dH` calculation in `mcStep`:

```ts
  const dH =
    state.betaIsing * isingTerm(state, xT, yT, sourceVal, targetVal) +
    state.betaVol * volumeTerm(state, sourceVal, targetVal) +
    state.betaMov * movementTerm(state, sourceVal, dir);
  // engulfTerm intentionally omitted in M1 — added in M3.
```

Replace it with:

```ts
  const dH =
    state.betaIsing * isingTerm(state, xT, yT, sourceVal, targetVal) +
    state.betaVol * volumeTerm(state, sourceVal, targetVal) +
    state.betaMov * movementTerm(state, sourceVal, dir) +
    engulfTerm(state, sourceVal, targetVal);
```

Add the `engulfTerm` helper function below `movementTerm` and above `applyPixelTransfer`:

```ts
// Engulf term. When source has engulfMultiplier > 1 and target is a different
// non-zero cell (i.e. an enemy), bias the transfer toward acceptance.
//
//   dH_engulf = -(engulfMultiplier - 1)
//
// engulfMultiplier of 5 contributes dH = -4, making this transfer e^4 (~55x)
// more likely than the same transfer would be under the volume/Ising terms
// alone. The volume term still pushes back as the engulfer grows.
function engulfTerm(
  state: SimState,
  sourceVal: CellId,
  targetVal: CellId,
): number {
  if (sourceVal === 0 || targetVal === 0 || sourceVal === targetVal) return 0;
  const source = state.cells.get(sourceVal);
  if (!source) return 0;
  const m = source.intent.engulfMultiplier;
  if (m <= 1) return 0;
  return -(m - 1);
}
```

### Step 2.5: Run tests, verify they pass

Run: `npm test -- tests/sim/monte-carlo.test.ts`
Expected: 7 tests pass (5 prior + 2 new).

If the "absorbs faster" test fails, the most likely cause is sign confusion (you computed `+(m-1)` instead of `-(m-1)`). The metropolis check is `random() > exp(-dH)` — *negative* dH means the transfer is *more* likely.

### Step 2.6: Run full suite + typecheck + build

```bash
npm test                # 48 total (46 prior + 2 new)
npm run typecheck       # clean
npm run build           # clean
```

### Step 2.7: Commit

```bash
git add src/sim/monte-carlo.ts tests/sim/monte-carlo.test.ts
git commit -m "feat(sim): engulf term in MC step — absorb enemy pixels when engulfMultiplier>1"
```

---

## Task 3: Bruiser AI

**Why:** First enemy archetype. The Bruiser seeks the player and engulfs on contact. Per the spec (Section 7), Bruiser stats are +50% targetVol, -20% speed, +30% engulf rate. We bake those numbers into the spawn config in `main.ts` later (Task 5); the AI module itself just reads `self.intent` and `target.center` and writes intent fields.

The AI is reactive (no internal state) — every frame `bruiserStep(self, target, state)` recomputes the right intent. This keeps the function pure: same `self.center`, `target.center`, and grid → same result. Easy to test.

**Files:**
- Create: `src/game/enemies/bruiser.ts`
- Create: `tests/game/enemies/bruiser.test.ts`

### Step 3.1: Write failing tests

Create `tests/game/enemies/bruiser.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { createSim } from '../../../src/sim/sim';
import { bruiserStep } from '../../../src/game/enemies/bruiser';

function fixture() {
  return createSim({
    LX: 100,
    LY: 100,
    nCells: 2,
    targetVol: 100,
    seed: 1,
    wrap: true,
  });
}

describe('bruiserStep — seek behavior', () => {
  it('points intent.vec toward the target along the shortest path', () => {
    const state = fixture();
    const self = state.cells.get(2)!;
    const target = state.cells.get(1)!;
    // Force known centers to make the test deterministic.
    self.center = [10, 10];
    target.center = [40, 50];
    bruiserStep(self, target, state);
    // Direction (40-10, 50-10) = (30, 40), length 50, normalized (0.6, 0.8).
    expect(self.intent.vec[0]).toBeCloseTo(0.6, 3);
    expect(self.intent.vec[1]).toBeCloseTo(0.8, 3);
  });

  it('respects wrap when computing direction', () => {
    const state = fixture();
    const self = state.cells.get(2)!;
    const target = state.cells.get(1)!;
    self.center = [5, 50];
    target.center = [95, 50];
    bruiserStep(self, target, state);
    // Direct: dx=+90 (right). Wrap: dx=-10 (left). Wrap is shorter.
    expect(self.intent.vec[0]).toBeCloseTo(-1, 3);
    expect(self.intent.vec[1]).toBeCloseTo(0, 3);
  });

  it('zeros the intent vec when target is in the same position (avoid NaN)', () => {
    const state = fixture();
    const self = state.cells.get(2)!;
    const target = state.cells.get(1)!;
    self.center = [50, 50];
    target.center = [50, 50];
    bruiserStep(self, target, state);
    expect(self.intent.vec).toEqual([0, 0]);
  });
});

describe('bruiserStep — engulf on contact', () => {
  it('sets engulfMultiplier > 1 when distance to target is small', () => {
    const state = fixture();
    const self = state.cells.get(2)!;
    const target = state.cells.get(1)!;
    self.center = [50, 50];
    target.center = [52, 50];   // distance = 2; within engulf range
    bruiserStep(self, target, state);
    expect(self.intent.engulfMultiplier).toBeGreaterThan(1);
  });

  it('keeps engulfMultiplier at 1 when far from target', () => {
    const state = fixture();
    const self = state.cells.get(2)!;
    const target = state.cells.get(1)!;
    self.center = [10, 10];
    target.center = [70, 70];
    bruiserStep(self, target, state);
    expect(self.intent.engulfMultiplier).toBe(1);
  });
});

describe('bruiserStep — speed', () => {
  it('sets speed to a fixed Bruiser value', () => {
    const state = fixture();
    const self = state.cells.get(2)!;
    const target = state.cells.get(1)!;
    self.center = [10, 10];
    target.center = [50, 50];
    bruiserStep(self, target, state);
    // Spec: Bruiser speed -20% from base. Player base = 10 → bruiser = 8.
    expect(self.intent.speed).toBe(8);
  });
});
```

### Step 3.2: Run tests, verify they fail

Run: `npm test -- tests/game/enemies/bruiser.test.ts`
Expected: FAIL — module not found.

### Step 3.3: Implement `src/game/enemies/bruiser.ts`

Create the directory `src/game/enemies/` and file:

```ts
import type { Cell, SimState } from '../../sim/types';
import { shortestVec } from '../geometry';

// Engulf range: if center-to-center distance ≤ this, Bruiser engulfs.
// (Cells are blobs ~10-20 px wide, so 6 means "edges are touching or close".)
const ENGULF_RANGE = 6;

// Bruiser's engulf strength (slightly stronger than player's default).
// Spec section 7.1: Bruiser has +30% engulf rate vs base.
// We model "base" engulf as multiplier=5 and Bruiser as 5 * 1.3 ≈ 6.5.
const BRUISER_ENGULF_MULTIPLIER = 6.5;

// Bruiser speed: -20% from player base of 10.
const BRUISER_SPEED = 8;

export function bruiserStep(self: Cell, target: Cell, state: SimState): void {
  const { LX, LY } = state.grid;
  const v = shortestVec(self.center, target.center, LX, LY);
  const dist = Math.hypot(v[0], v[1]);

  // Direction toward target (zero if coincident, to avoid NaN).
  if (dist === 0) {
    self.intent.vec = [0, 0];
  } else {
    self.intent.vec = [v[0] / dist, v[1] / dist];
  }

  self.intent.speed = BRUISER_SPEED;

  // Engulf when in range.
  self.intent.engulfMultiplier = dist <= ENGULF_RANGE ? BRUISER_ENGULF_MULTIPLIER : 1;
}
```

### Step 3.4: Run tests, verify they pass

Run: `npm test -- tests/game/enemies/bruiser.test.ts`
Expected: 6 tests pass.

### Step 3.5: Run full suite + typecheck + build

```bash
npm test                # 54 total (48 prior + 6 new)
npm run typecheck       # clean
npm run build           # clean
```

### Step 3.6: Commit

```bash
git add src/game/enemies/bruiser.ts tests/game/enemies/bruiser.test.ts
git commit -m "feat(game): Bruiser AI — seek player, engulf on contact"
```

---

## Task 4: Arena (Per-Fight Controller)

**Why:** A single fight needs win/loss detection and a place that owns the per-tick game logic (run AI, step sim). Right now `main.ts` does this directly; that doesn't scale — M4 will add multiple fights, M5 will add multiple enemies. `arena.ts` is where that logic lives, with a tiny stable API.

**Files:**
- Create: `src/game/arena.ts`
- Create: `tests/game/arena.test.ts`

### Design

`createArena(opts)` returns an object with:
- `state: SimState` — the underlying sim, exposed for rendering.
- `getStatus(): 'running' | 'won' | 'lost'` — derived from cell volumes.
- `tick(input: ArenaInput): void` — one frame of game logic.

`ArenaInput` carries the player's intent + engulf flag + fire flag from `main.ts`. The arena doesn't care where it came from (keyboard, gamepad, recorded replay).

`tick` runs in this order each frame:
1. If status is not `'running'`, return immediately (game over).
2. Apply input to the player cell's intent.
3. For each non-player cell: run its archetype AI (M3: just Bruiser).
4. Apply per-tick decays (engulf decay on player's targetVol).
5. Step the sim.

Bullet firing is handled in `main.ts` (since the arena exposes `state.cells.get(playerId)` and `state.bullets`, and `main.ts` already has the cooldown logic from M2). We don't move that here yet — moving it requires deciding where bullet cooldown lives, and that's an M4 concern.

### Step 4.1: Write failing tests

Create `tests/game/arena.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { createArena } from '../../src/game/arena';

describe('createArena — initial state', () => {
  it('starts with status "running"', () => {
    const arena = createArena({
      LX: 50,
      LY: 50,
      seed: 1,
      playerTargetVol: 100,
      bruiserTargetVol: 150,
      wrap: true,
    });
    expect(arena.getStatus()).toBe('running');
  });

  it('exposes state with two cells', () => {
    const arena = createArena({
      LX: 50,
      LY: 50,
      seed: 1,
      playerTargetVol: 100,
      bruiserTargetVol: 150,
      wrap: true,
    });
    expect(arena.state.cells.size).toBe(2);
  });
});

describe('arena.getStatus — win/loss', () => {
  it('reports "won" when all non-player cells have vol 0', () => {
    const arena = createArena({
      LX: 50,
      LY: 50,
      seed: 1,
      playerTargetVol: 100,
      bruiserTargetVol: 150,
      wrap: true,
    });
    // Force the bruiser to vol 0.
    const bruiser = arena.state.cells.get(2)!;
    bruiser.vol = 0;
    expect(arena.getStatus()).toBe('won');
  });

  it('reports "lost" when player has vol 0', () => {
    const arena = createArena({
      LX: 50,
      LY: 50,
      seed: 1,
      playerTargetVol: 100,
      bruiserTargetVol: 150,
      wrap: true,
    });
    const player = arena.state.cells.get(1)!;
    player.vol = 0;
    expect(arena.getStatus()).toBe('lost');
  });

  it('reports "lost" with priority over "won" when both are 0', () => {
    const arena = createArena({
      LX: 50,
      LY: 50,
      seed: 1,
      playerTargetVol: 100,
      bruiserTargetVol: 150,
      wrap: true,
    });
    arena.state.cells.get(1)!.vol = 0;
    arena.state.cells.get(2)!.vol = 0;
    expect(arena.getStatus()).toBe('lost');
  });
});

describe('arena.tick — applies input', () => {
  it('writes the input intent onto the player cell', () => {
    const arena = createArena({
      LX: 50,
      LY: 50,
      seed: 1,
      playerTargetVol: 100,
      bruiserTargetVol: 150,
      wrap: true,
    });
    arena.tick({
      moveVec: [1, 0],
      shouldFire: false,
      shouldEngulf: false,
    });
    const player = arena.state.cells.get(1)!;
    expect(player.intent.vec).toEqual([1, 0]);
  });

  it('sets engulfMultiplier > 1 when shouldEngulf is true', () => {
    const arena = createArena({
      LX: 50,
      LY: 50,
      seed: 1,
      playerTargetVol: 100,
      bruiserTargetVol: 150,
      wrap: true,
    });
    arena.tick({
      moveVec: [0, 0],
      shouldFire: false,
      shouldEngulf: true,
    });
    const player = arena.state.cells.get(1)!;
    expect(player.intent.engulfMultiplier).toBeGreaterThan(1);
  });

  it('decays player targetVol while engulfing', () => {
    const arena = createArena({
      LX: 50,
      LY: 50,
      seed: 1,
      playerTargetVol: 100,
      bruiserTargetVol: 150,
      wrap: true,
    });
    const before = arena.state.cells.get(1)!.targetVol;
    arena.tick({ moveVec: [0, 0], shouldFire: false, shouldEngulf: true });
    const after = arena.state.cells.get(1)!.targetVol;
    expect(after).toBeLessThan(before);
  });

  it('does not decay targetVol when not engulfing', () => {
    const arena = createArena({
      LX: 50,
      LY: 50,
      seed: 1,
      playerTargetVol: 100,
      bruiserTargetVol: 150,
      wrap: true,
    });
    const before = arena.state.cells.get(1)!.targetVol;
    arena.tick({ moveVec: [0, 0], shouldFire: false, shouldEngulf: false });
    const after = arena.state.cells.get(1)!.targetVol;
    expect(after).toBe(before);
  });

  it('does nothing once status leaves running', () => {
    const arena = createArena({
      LX: 50,
      LY: 50,
      seed: 1,
      playerTargetVol: 100,
      bruiserTargetVol: 150,
      wrap: true,
    });
    arena.state.cells.get(2)!.vol = 0;        // forces "won"
    expect(arena.getStatus()).toBe('won');
    const cellsBefore = Array.from(arena.state.grid.cells);
    arena.tick({ moveVec: [1, 1], shouldFire: false, shouldEngulf: false });
    const cellsAfter = Array.from(arena.state.grid.cells);
    expect(cellsAfter).toEqual(cellsBefore);    // grid didn't change
  });
});
```

### Step 4.2: Run tests, verify they fail

Run: `npm test -- tests/game/arena.test.ts`
Expected: FAIL — module not found.

### Step 4.3: Implement `src/game/arena.ts`

```ts
import { type SimState } from '../sim/types';
import { createSim, tick as simTick } from '../sim/sim';
import { bruiserStep } from './enemies/bruiser';

export interface ArenaInput {
  moveVec: [number, number];
  shouldFire: boolean;
  shouldEngulf: boolean;
}

export type ArenaStatus = 'running' | 'won' | 'lost';

export interface Arena {
  state: SimState;
  getStatus(): ArenaStatus;
  tick(input: ArenaInput): void;
}

export interface CreateArenaOpts {
  LX: number;
  LY: number;
  seed: number;
  playerTargetVol: number;
  bruiserTargetVol: number;
  wrap: boolean;
  wrapBullets?: boolean;
}

const PLAYER_ID = 1;
const BRUISER_ID = 2;
const PLAYER_SPEED = 10;
const PLAYER_ENGULF_MULTIPLIER = 5;
const ENGULF_DECAY_PER_FRAME = 1 / 60;   // ~1 px/sec at 60 FPS
const MC_STEPS_PER_TICK = 1000;

export function createArena(opts: CreateArenaOpts): Arena {
  const state = createSim({
    LX: opts.LX,
    LY: opts.LY,
    nCells: 2,
    targetVol: opts.playerTargetVol,
    seed: opts.seed,
    wrap: opts.wrap,
    wrapBullets: opts.wrapBullets ?? true,
  });
  // The bruiser overrides its targetVol post-creation. (createSim only takes
  // a single targetVol for all cells; spawning archetypes with different
  // stats happens here.)
  const bruiser = state.cells.get(BRUISER_ID);
  if (bruiser) bruiser.targetVol = opts.bruiserTargetVol;

  return {
    state,
    getStatus(): ArenaStatus {
      const player = state.cells.get(PLAYER_ID);
      if (!player || player.vol === 0) return 'lost';
      // Won when all non-player cells have vol 0.
      for (const [id, cell] of state.cells) {
        if (id === PLAYER_ID) continue;
        if (cell.vol > 0) return 'running';
      }
      return 'won';
    },
    tick(input: ArenaInput): void {
      if (this.getStatus() !== 'running') return;

      // Player intent.
      const player = state.cells.get(PLAYER_ID);
      if (player) {
        player.intent.vec = input.moveVec;
        player.intent.speed = PLAYER_SPEED;
        player.intent.shooting = input.shouldFire;
        player.intent.engulfMultiplier = input.shouldEngulf ? PLAYER_ENGULF_MULTIPLIER : 1;
        if (input.shouldEngulf) {
          player.targetVol -= ENGULF_DECAY_PER_FRAME;
        }
      }

      // Enemy AI.
      const target = state.cells.get(PLAYER_ID);
      const bruiser = state.cells.get(BRUISER_ID);
      if (bruiser && target && bruiser.vol > 0) {
        bruiserStep(bruiser, target, state);
      }

      // Step the sim.
      simTick(state, MC_STEPS_PER_TICK);
    },
  };
}
```

### Step 4.4: Run tests, verify they pass

Run: `npm test -- tests/game/arena.test.ts`
Expected: 9 tests pass.

If "decays player targetVol while engulfing" fails: most likely cause is decay happening at floating-point precision below `toBeLessThan`'s sensitivity. `1/60` is a tiny but real decrement; the test should pass. If it doesn't, re-read the implementation.

### Step 4.5: Run full suite + typecheck + build

```bash
npm test                # 63 total (54 prior + 9 new)
npm run typecheck       # clean
npm run build           # clean
```

### Step 4.6: Commit

```bash
git add src/game/arena.ts tests/game/arena.test.ts
git commit -m "feat(game): Arena controller with status, input, AI dispatch"
```

---

## Task 5: Wire Arena Into `main.ts`

**Why:** Final piece. Replace the bespoke per-frame logic in `main.ts` with `createArena().tick(input)`. Add an engulf input key. When status changes to `'won'` or `'lost'`, log it and stop the rAF loop.

**Files:**
- Modify: `src/main.ts`
- Modify: `src/game/input.ts` (add engulf key tracking)
- Modify: `tests/game/input.test.ts` (test engulf key)

### Step 5.1: Add engulf to input — modify `src/game/input.ts`

Read the current file. Find the `InputState` interface:

```ts
export interface InputState {
  moveVec: [number, number];
  shouldFire: boolean;
  lastFireDir: [number, number];
}
```

Replace it with:

```ts
export interface InputState {
  moveVec: [number, number];
  shouldFire: boolean;
  shouldEngulf: boolean;
  lastFireDir: [number, number];
}
```

Find:
```ts
const FIRE_KEYS = new Set([' ', 'Spacebar']);
```

Replace with:
```ts
const FIRE_KEYS = new Set([' ', 'Spacebar']);
const ENGULF_KEYS = new Set(['Shift', 'e', 'E']);
```

Find the `poll()` body — specifically:
```ts
      let shouldFire = false;
      for (const k of held) {
        if (FIRE_KEYS.has(k)) { shouldFire = true; break; }
      }
      return { moveVec, shouldFire, lastFireDir };
```

Replace with:
```ts
      let shouldFire = false;
      let shouldEngulf = false;
      for (const k of held) {
        if (FIRE_KEYS.has(k)) shouldFire = true;
        if (ENGULF_KEYS.has(k)) shouldEngulf = true;
      }
      return { moveVec, shouldFire, shouldEngulf, lastFireDir };
```

### Step 5.2: Add engulf test — modify `tests/game/input.test.ts`

Find the closing `});` of the last `it()` block ("lastFireDir remembers..."). Before the outer `});` of the `describe`, add:

```ts

  it('shift sets shouldEngulf', () => {
    const input = createInput(target as unknown as EventTarget);
    target.dispatch('keydown', 'Shift');
    const s = input.poll();
    expect(s.shouldEngulf).toBe(true);
  });

  it('e sets shouldEngulf', () => {
    const input = createInput(target as unknown as EventTarget);
    target.dispatch('keydown', 'e');
    const s = input.poll();
    expect(s.shouldEngulf).toBe(true);
  });

  it('shouldEngulf is false when no engulf key held', () => {
    const input = createInput(target as unknown as EventTarget);
    target.dispatch('keydown', 'd');
    const s = input.poll();
    expect(s.shouldEngulf).toBe(false);
  });
```

### Step 5.3: Run input tests, verify both updates pass

Run: `npm test -- tests/game/input.test.ts`
Expected: 10 tests pass (7 prior + 3 new). The prior tests still pass because adding fields to `InputState` doesn't break them.

If they fail, the most likely reason is the `shouldEngulf: false` default isn't being set in the no-engulf-key case. Make sure the `for` loop initializes `shouldEngulf = false` before the loop.

### Step 5.4: Replace `src/main.ts`

Use the Write tool (full replacement):

```ts
import { createArena } from './game/arena';
import { addBullet } from './sim/bullets';
import { createRenderer } from './ui/render';
import { createInput } from './game/input';

const LX = 100;
const LY = 100;
const PLAYER_TARGET_VOL = 300;
const BRUISER_TARGET_VOL = 450;        // +50% per Bruiser archetype spec
const PLAYER_ID = 1;
const BULLET_COST = 5;
const BULLET_MIN_VOL = 20;
const BULLET_SPEED = 2;
const BULLET_SIZE = 3;
const FIRE_COOLDOWN_TICKS = 5;

const canvas = document.getElementById('game') as HTMLCanvasElement | null;
if (!canvas) throw new Error('Missing #game canvas');

const arena = createArena({
  LX,
  LY,
  seed: Date.now() & 0xffffffff,
  playerTargetVol: PLAYER_TARGET_VOL,
  bruiserTargetVol: BRUISER_TARGET_VOL,
  wrap: true,
});

const renderer = createRenderer(canvas, 2);
const input = createInput(window);

canvas.tabIndex = 0;
canvas.focus();
window.addEventListener('keydown', () => canvas.focus());

let cooldown = 0;
let lastFpsLog = performance.now();
let framesSinceLog = 0;
let running = true;

function loop() {
  if (!running) return;

  const inp = input.poll();

  // Fire bullets only when not engulfing (engulf disables shooting per spec).
  if (cooldown > 0) cooldown -= 1;
  const player = arena.state.cells.get(PLAYER_ID);
  if (
    inp.shouldFire &&
    !inp.shouldEngulf &&
    cooldown === 0 &&
    player &&
    player.targetVol >= BULLET_MIN_VOL
  ) {
    const dir = inp.moveVec[0] === 0 && inp.moveVec[1] === 0 ? inp.lastFireDir : inp.moveVec;
    const v: [number, number] = [dir[0] * BULLET_SPEED, dir[1] * BULLET_SPEED];
    if (v[0] !== 0 || v[1] !== 0) {
      addBullet(arena.state, {
        pos: [player.center[0], player.center[1]],
        v,
        ownerId: PLAYER_ID,
        size: BULLET_SIZE,
      });
      player.targetVol -= BULLET_COST;
      cooldown = FIRE_COOLDOWN_TICKS;
    }
  }

  arena.tick({
    moveVec: inp.moveVec,
    shouldFire: inp.shouldFire,
    shouldEngulf: inp.shouldEngulf,
  });

  renderer.render(arena.state);

  framesSinceLog++;
  const now = performance.now();
  if (now - lastFpsLog > 1000) {
    // eslint-disable-next-line no-console
    console.log(`FPS: ${framesSinceLog}`);
    framesSinceLog = 0;
    lastFpsLog = now;
  }

  const status = arena.getStatus();
  if (status !== 'running') {
    running = false;
    // eslint-disable-next-line no-console
    console.log(status === 'won' ? 'WIN' : 'LOSE');
    // One final render to show the final state.
    renderer.render(arena.state);
    return;
  }

  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
```

### Step 5.5: Verify

```bash
npm run typecheck       # clean
npm test                # 66 total (63 + 3 input tests)
npm run build           # clean
timeout 8 npm run dev 2>&1 | head -20    # confirm dev server starts
```

### Step 5.6: Commit

```bash
git add src/game/input.ts tests/game/input.test.ts src/main.ts
git commit -m "feat: wire arena + engulf input into main loop with win/loss exit"
```

---

## Task 6: Visual Smoke Test (Human-Verified)

**Why:** Subagents can't see the canvas.

- [ ] **Step 6.1: User runs `npm run dev` and verifies in a browser:**
  - Two cells. Player drives with WASD; Bruiser auto-seeks player.
  - Bruiser visibly drifts toward the player every frame.
  - Hold Shift (or `e`) while touching the Bruiser → pixels visibly flow from Bruiser into player at a noticeably faster rate than passive contact would produce.
  - While engulfing, space does not fire bullets.
  - While engulfing, player's `targetVol` slowly decays (you can verify by holding engulf for a long time alone — player shrinks).
  - Bruiser also engulfs the player when in range. If you stand still in the middle of nowhere, eventually the Bruiser will reach you and start eating you back.
  - Engaging long enough resolves the fight: console logs `WIN` or `LOSE` and the loop stops.
  - 60 FPS sustained during normal play.

- [ ] **Step 6.2: If something looks wrong, escalate.** Likely failure modes:
  - Engulf has no visible effect → engulf term sign or magnitude is wrong (Task 2).
  - Bruiser doesn't move toward player → `bruiserStep` direction or sim integration is wrong (Task 3 / Task 4).
  - Game doesn't end on win/loss → `getStatus` logic or main loop's exit condition is wrong (Task 4 / Task 5).
  - Engulf disables movement (not intended) → spec only says it disables shooting; movement should still work.

---

## Task 7: M3 Wrap-up

- [ ] **Step 7.1: Confirm M3 definition of done.**

- [ ] **Step 7.2: Tag the milestone.**

```bash
git tag m3-engulf-and-first-ai
git log --oneline | head -25
```

- [ ] **Step 7.3: Note any deferred concerns.**

Likely items:
- Engulf feel: too strong / too weak? (Spec built-in checkpoint says "after M3, is engulf actually fun? Redesign here if not.")
- Bruiser difficulty: too easy / too hard? Tune `BRUISER_ENGULF_MULTIPLIER`, `BRUISER_SPEED`, `BRUISER_TARGET_VOL` if needed.
- The visual is still ugly — no win/loss screen, no HUD. Both are M4/M7 work; not a defect.

---

## Notes for the Implementing Engineer

**On the engulf term sign.** The Metropolis acceptance is `random() < exp(-dH)` (technically `random() > exp(-dH) → reject`, which is the same thing). *Negative* `dH` means *more likely to accept*. So `dH_engulf = -(m-1)` makes engulfing transfers more likely, not less. If you write `+(m-1)`, engulf will *suppress* absorption — the test will catch this immediately.

**On Bruiser's "engulf range".** The spec doesn't specify an exact number. We pick 6 based on cell radius (~10 px wide → 5 px from center to edge → 6 means "edges close enough to touch through pixel noise"). This is tunable.

**On the targetVol decay rate.** `1/60` per frame at 60 FPS = 1px/sec. Spec section 5.2.1 says "targetVol decays slowly while engulf is held." This rate means a 300-volume player takes ~5 minutes to fully starve from engulf alone — way longer than any fight. The rate keeps engulf "honest" (can't engulf forever) without being punishing in practice. Tune in M3 wrap-up if the feel is off.

**On the order of operations in `arena.tick`.** Player intent → enemy AI → sim step. This means the AI sees the *new* player intent (set this frame) when computing its own move, not last frame's. That's a small detail that becomes important in multi-AI fights (M5) where two AIs might react to each other; here it doesn't matter much, but the convention is clearer this way.

**On `main.ts` doing both bullet logic and arena.tick.** There's a slight DRY violation — `arena.tick` writes player intent, then `main.ts` reads `player.targetVol` to decide whether to fire and writes to `player.targetVol` after firing. Future cleanup (M4 perhaps) would move bullet firing into the arena. We don't move it now because the bullet cooldown is per-rAF-frame state, not per-tick state, and `main.ts` already owns the rAF cadence. This is a known smell, not a bug.

**Read the spec.** `docs/superpowers/specs/2026-05-04-cellular-death-match-design.md` Section 5 (Engulf Mechanic) is the canonical reference. If this plan and the spec disagree, escalate.
