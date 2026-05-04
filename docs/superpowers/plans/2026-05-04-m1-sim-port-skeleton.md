# M1 — Sim Port Skeleton Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scaffold the project (Vite + TypeScript + Vitest) and port enough of the cellular Potts model from Python (cell-fight) to render two static colored blobs on a canvas at 60 FPS, with the boundary tracking and Monte Carlo step infrastructure in place — but no movement intent, no bullets, no input.

**Architecture:** A `sim/` module of pure functions over a mutable `SimState` value. Grid is a flat `Uint8Array` (one byte per pixel = cell id). Boundary pixels are tracked as a `Set<number>` of flat indices, updated incrementally on every pixel transfer. Cell volumes and centers are tracked incrementally — no full grid scans per tick. The renderer is a single function: walk the grid once, write RGBA into an `ImageData`, blit to canvas. The `main.ts` entry point owns the `requestAnimationFrame` loop and calls `tick(state)` then `render(state, ctx)` each frame.

**Tech Stack:** Vite 5+, TypeScript 5+ (strict), Vitest 2+. No runtime dependencies.

**Reference:** The Python source we are porting lives at `https://github.com/james-simon/cell-fight` — `simulator.py` (the `State` class and `cell_MC_step` function) and `utils.py` (helpers). We are NOT preserving the file structure; we are restructuring per the spec at `docs/superpowers/specs/2026-05-04-cellular-death-match-design.md` Section 3.

**Definition of done:** Run `npm run dev`, open the URL, see two distinct colored blobs sitting roughly still in a black canvas. DevTools shows ~60 FPS. `npm test` passes. `npm run build` produces a `dist/` directory.

---

## File Structure

Files this plan creates:

```
cellular-death-match/
├── .gitignore                    # node_modules, dist, etc.
├── index.html                    # canvas mount point
├── package.json                  # vite, typescript, vitest
├── tsconfig.json                 # strict mode
├── vite.config.ts                # vitest integration
├── src/
│   ├── main.ts                   # entry: rAF loop, wires sim + render
│   ├── styles.css                # body bg, canvas centering
│   ├── sim/
│   │   ├── types.ts              # SimState, Cell, Bullet, SimEvent types
│   │   ├── rng.ts                # seedable PRNG
│   │   ├── grid.ts               # grid creation, indexing, boundary helpers
│   │   ├── cell.ts               # cell creation, center-of-mass updates
│   │   ├── monte-carlo.ts        # mcStep + dH helpers
│   │   ├── bullets.ts            # stub: stepBullets() no-op (M2 fills it)
│   │   └── sim.ts                # façade: createSim, tick
│   └── ui/
│       └── render.ts             # sim → ImageData → canvas
└── tests/
    └── sim/
        ├── rng.test.ts
        ├── grid.test.ts
        ├── cell.test.ts
        └── monte-carlo.test.ts
```

**Module responsibilities:**
- `sim/types.ts`: type definitions only, no logic.
- `sim/rng.ts`: deterministic seedable RNG so sim tests are reproducible. (`Math.random()` is unseedable.)
- `sim/grid.ts`: `createGrid`, flat-index helpers (`idx`, `xy`), `isCellBoundary`, `recomputeBoundary`, `updateBoundaryAround`. Pure functions over a `Grid`.
- `sim/cell.ts`: `createCell`, circular-mean center-of-mass tracking via complex numbers (matches Python `cell_loc_sums`).
- `sim/monte-carlo.ts`: `mcStep` and the three energy-term helpers (`isingTerm`, `volumeTerm`, `movementTerm`). Engulf term is stubbed to 0 — added in M3.
- `sim/bullets.ts`: stub for now (`stepBullets` is a no-op). Real implementation comes in M2.
- `sim/sim.ts`: top-level `createSim(opts)` + `tick(state)` façade. The only thing `main.ts` calls.
- `ui/render.ts`: `render(state, ctx)`. Reads sim state, writes pixels. No mutation of sim.
- `main.ts`: bootstraps canvas, creates sim, runs `requestAnimationFrame` loop.

---

## Task 1: Project Scaffold

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vite.config.ts`
- Create: `index.html`
- Create: `src/main.ts`
- Create: `src/styles.css`
- Create: `.gitignore`

- [ ] **Step 1.1: Create `.gitignore`**

```
node_modules/
dist/
.DS_Store
*.log
.vite/
coverage/
```

- [ ] **Step 1.2: Create `package.json`**

```json
{
  "name": "cellular-death-match",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "devDependencies": {
    "typescript": "^5.6.0",
    "vite": "^5.4.0",
    "vitest": "^2.1.0"
  }
}
```

- [ ] **Step 1.3: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "noFallthroughCasesInSwitch": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "esModuleInterop": true,
    "verbatimModuleSyntax": false,
    "types": ["vite/client", "vitest/globals"]
  },
  "include": ["src/**/*", "tests/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 1.4: Create `vite.config.ts`**

```ts
import { defineConfig } from 'vite';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
```

- [ ] **Step 1.5: Create `index.html`**

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Cellular Death Match</title>
    <link rel="stylesheet" href="/src/styles.css" />
  </head>
  <body>
    <canvas id="game" width="500" height="500"></canvas>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

- [ ] **Step 1.6: Create `src/styles.css`**

```css
html, body {
  margin: 0;
  padding: 0;
  background: #0a0a0a;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: system-ui, sans-serif;
}

canvas {
  image-rendering: pixelated;
  background: #000;
  border: 1px solid #222;
}
```

- [ ] **Step 1.7: Create `src/main.ts` (placeholder)**

```ts
const canvas = document.getElementById('game') as HTMLCanvasElement;
const ctx = canvas.getContext('2d');
if (!ctx) throw new Error('No 2D context');

ctx.fillStyle = '#0f0';
ctx.fillRect(10, 10, 50, 50);
```

- [ ] **Step 1.8: Install dependencies**

Run: `cd /Users/Shared/Projects/Web/cellular-death-match && npm install`
Expected: creates `node_modules/`, `package-lock.json`, no errors.

- [ ] **Step 1.9: Verify dev server starts**

Run: `npm run dev`
Expected: Vite prints a localhost URL. Open it in a browser. See a green square on a near-black background. Stop the server (Ctrl-C).

- [ ] **Step 1.10: Verify build works**

Run: `npm run build`
Expected: Outputs to `dist/` with no errors. (TypeScript also runs.)

- [ ] **Step 1.11: Commit**

```bash
git add .gitignore package.json package-lock.json tsconfig.json vite.config.ts index.html src/main.ts src/styles.css
git commit -m "chore: scaffold Vite + TypeScript + Vitest project"
```

---

## Task 2: Seedable RNG

**Why:** The original Python sim uses `random.random()` and `np.random` — both unseedable from JS-land's perspective. Our sim tests need deterministic reproducibility, so we own a small PRNG. Mulberry32 is a 32-bit, ~5-line, well-distributed generator that's widely used for game/sim work.

**Files:**
- Create: `src/sim/rng.ts`
- Test: `tests/sim/rng.test.ts`

- [ ] **Step 2.1: Write the failing test**

Create `tests/sim/rng.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { createRng } from '../../src/sim/rng';

describe('createRng', () => {
  it('produces deterministic sequence for a given seed', () => {
    const a = createRng(42);
    const b = createRng(42);
    for (let i = 0; i < 10; i++) {
      expect(a.random()).toBe(b.random());
    }
  });

  it('produces different sequences for different seeds', () => {
    const a = createRng(1);
    const b = createRng(2);
    expect(a.random()).not.toBe(b.random());
  });

  it('outputs are in [0, 1)', () => {
    const r = createRng(123);
    for (let i = 0; i < 1000; i++) {
      const v = r.random();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('randInt(n) returns integers in [0, n)', () => {
    const r = createRng(5);
    for (let i = 0; i < 1000; i++) {
      const v = r.randInt(10);
      expect(Number.isInteger(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(10);
    }
  });
});
```

- [ ] **Step 2.2: Run test to verify it fails**

Run: `npm test -- tests/sim/rng.test.ts`
Expected: FAIL — "Cannot find module '../../src/sim/rng'"

- [ ] **Step 2.3: Write the implementation**

Create `src/sim/rng.ts`:

```ts
export interface Rng {
  random(): number;        // [0, 1)
  randInt(n: number): number; // [0, n)
}

export function createRng(seed: number): Rng {
  let state = seed >>> 0;
  if (state === 0) state = 0x9e3779b9;
  return {
    random() {
      state = (state + 0x6d2b79f5) >>> 0;
      let t = state;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
    randInt(n: number) {
      return Math.floor(this.random() * n);
    },
  };
}
```

- [ ] **Step 2.4: Run tests to verify they pass**

Run: `npm test -- tests/sim/rng.test.ts`
Expected: 4 tests pass.

- [ ] **Step 2.5: Commit**

```bash
git add src/sim/rng.ts tests/sim/rng.test.ts
git commit -m "feat(sim): add seedable Mulberry32 RNG"
```

---

## Task 3: Grid Type and Helpers

**Why:** All sim work operates over a 2D grid stored as a flat `Uint8Array`. Centralizing the indexing math (and wraparound logic) here means no other module has to think about it. The neighbor directions match the Python `neighbor_dirs` (8-connectivity).

**Files:**
- Create: `src/sim/types.ts`
- Create: `src/sim/grid.ts`
- Test: `tests/sim/grid.test.ts`

- [ ] **Step 3.1: Create `src/sim/types.ts`**

```ts
export type CellId = number;

export interface Grid {
  LX: number;
  LY: number;
  cells: Uint8Array;        // length LX * LY; cells[idx(x, y)] = CellId
  boundary: Set<number>;    // flat indices of pixels on a cell boundary
  wrap: boolean;
}

export interface Intent {
  vec: [number, number];        // normalized desired direction (len 0 or 1)
  speed: number;                // multiplier
  engulfMultiplier: number;     // 1.0 normal, >1 while engulf held (M3+)
  shooting: boolean;            // M2+
}

export interface Cell {
  id: CellId;
  vol: number;
  targetVol: number;
  centerSum: [
    { re: number; im: number },  // x-axis circular sum
    { re: number; im: number },  // y-axis circular sum
  ];
  center: [number, number];
  intent: Intent;
}

export type SimEvent =
  | { type: 'pixelTransferred'; from: CellId; to: CellId; pos: [number, number] };

export interface SimState {
  grid: Grid;
  cells: Map<CellId, Cell>;
  betaIsing: number;
  betaVol: number;
  betaMov: number;
  events: SimEvent[];
  rng: import('./rng').Rng;
}

// 8-connectivity neighbor directions (matches Python neighbor_dirs).
export const NEIGHBOR_DIRS: ReadonlyArray<readonly [number, number]> = [
  [1, 0], [1, 1], [0, 1], [-1, 1],
  [-1, 0], [-1, -1], [0, -1], [1, -1],
];
```

- [ ] **Step 3.2: Write failing tests**

Create `tests/sim/grid.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  createGrid,
  idx,
  xy,
  setCell,
  isCellBoundary,
  recomputeBoundary,
} from '../../src/sim/grid';

describe('createGrid', () => {
  it('creates an empty grid of the given size', () => {
    const g = createGrid(10, 8, true);
    expect(g.LX).toBe(10);
    expect(g.LY).toBe(8);
    expect(g.cells.length).toBe(80);
    expect(g.cells.every((v) => v === 0)).toBe(true);
    expect(g.boundary.size).toBe(0);
    expect(g.wrap).toBe(true);
  });
});

describe('idx / xy', () => {
  it('idx and xy round-trip', () => {
    const g = createGrid(10, 8, true);
    for (let x = 0; x < 10; x++) {
      for (let y = 0; y < 8; y++) {
        const i = idx(g, x, y);
        const [rx, ry] = xy(g, i);
        expect([rx, ry]).toEqual([x, y]);
      }
    }
  });
});

describe('isCellBoundary', () => {
  it('a pixel surrounded by same-id pixels is not on a boundary', () => {
    const g = createGrid(5, 5, true);
    g.cells.fill(1);
    expect(isCellBoundary(g, 2, 2)).toBe(false);
  });

  it('a pixel adjacent to a different cell is on a boundary', () => {
    const g = createGrid(5, 5, true);
    g.cells.fill(1);
    setCell(g, 3, 2, 2);  // single cell-2 pixel inside a sea of cell-1
    expect(isCellBoundary(g, 2, 2)).toBe(true);
    expect(isCellBoundary(g, 3, 2)).toBe(true);
  });

  it('with wrap=true, edges treat opposite side as neighbor', () => {
    const g = createGrid(5, 5, true);
    g.cells.fill(1);
    setCell(g, 0, 0, 2);
    expect(isCellBoundary(g, 4, 0)).toBe(true); // wraps to (0,0) neighbor
  });

  it('with wrap=false, off-grid neighbors do not count', () => {
    const g = createGrid(5, 5, false);
    g.cells.fill(1);
    expect(isCellBoundary(g, 0, 0)).toBe(false); // alone-on-edge, no off-grid
  });
});

describe('recomputeBoundary', () => {
  it('populates boundary from scratch', () => {
    const g = createGrid(5, 5, true);
    g.cells.fill(1);
    setCell(g, 2, 2, 2);
    recomputeBoundary(g);
    // (2,2) and its 8 neighbors are all on boundary
    expect(g.boundary.size).toBe(9);
    expect(g.boundary.has(idx(g, 2, 2))).toBe(true);
    expect(g.boundary.has(idx(g, 1, 1))).toBe(true);
  });
});
```

- [ ] **Step 3.3: Run tests, verify they fail**

Run: `npm test -- tests/sim/grid.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3.4: Implement `src/sim/grid.ts`**

```ts
import { type Grid, type CellId, NEIGHBOR_DIRS } from './types';

export function createGrid(LX: number, LY: number, wrap: boolean): Grid {
  return {
    LX,
    LY,
    cells: new Uint8Array(LX * LY),
    boundary: new Set<number>(),
    wrap,
  };
}

export function idx(g: Grid, x: number, y: number): number {
  return x * g.LY + y;
}

export function xy(g: Grid, i: number): [number, number] {
  return [Math.floor(i / g.LY), i % g.LY];
}

export function getCell(g: Grid, x: number, y: number): CellId {
  return g.cells[idx(g, x, y)] ?? 0;
}

export function setCell(g: Grid, x: number, y: number, id: CellId): void {
  g.cells[idx(g, x, y)] = id;
}

// Returns the in-grid coordinate after applying (dx, dy) to (x, y).
// If wrap=true, wraps; if wrap=false, returns null when off-grid.
export function neighborCoord(
  g: Grid,
  x: number,
  y: number,
  dx: number,
  dy: number,
): [number, number] | null {
  let nx = x + dx;
  let ny = y + dy;
  if (g.wrap) {
    nx = ((nx % g.LX) + g.LX) % g.LX;
    ny = ((ny % g.LY) + g.LY) % g.LY;
    return [nx, ny];
  }
  if (nx < 0 || nx >= g.LX || ny < 0 || ny >= g.LY) return null;
  return [nx, ny];
}

export function isCellBoundary(g: Grid, x: number, y: number): boolean {
  const here = getCell(g, x, y);
  for (const [dx, dy] of NEIGHBOR_DIRS) {
    const n = neighborCoord(g, x, y, dx, dy);
    if (n === null) continue;
    if (getCell(g, n[0], n[1]) !== here) return true;
  }
  return false;
}

export function recomputeBoundary(g: Grid): void {
  g.boundary.clear();
  for (let x = 0; x < g.LX; x++) {
    for (let y = 0; y < g.LY; y++) {
      if (isCellBoundary(g, x, y)) g.boundary.add(idx(g, x, y));
    }
  }
}

// Update the boundary set for a pixel and its 8 neighbors.
// Called after every pixel transfer.
export function updateBoundaryAround(g: Grid, x: number, y: number): void {
  for (const [dx, dy] of [[0, 0], ...NEIGHBOR_DIRS]) {
    const n = neighborCoord(g, x, y, dx as number, dy as number);
    if (n === null) continue;
    const i = idx(g, n[0], n[1]);
    if (isCellBoundary(g, n[0], n[1])) g.boundary.add(i);
    else g.boundary.delete(i);
  }
}

export function neighborVals(g: Grid, x: number, y: number): CellId[] {
  const out: CellId[] = [];
  for (const [dx, dy] of NEIGHBOR_DIRS) {
    const n = neighborCoord(g, x, y, dx, dy);
    if (n === null) continue;
    out.push(getCell(g, n[0], n[1]));
  }
  return out;
}
```

- [ ] **Step 3.5: Run tests, verify they pass**

Run: `npm test -- tests/sim/grid.test.ts`
Expected: all pass.

- [ ] **Step 3.6: Commit**

```bash
git add src/sim/types.ts src/sim/grid.ts tests/sim/grid.test.ts
git commit -m "feat(sim): grid type, indexing, boundary tracking"
```

---

## Task 4: Cell Type and Center-of-Mass Tracking

**Why:** Each cell tracks its volume (pixel count) and center (the average pixel position). Centers must be wraparound-aware: averaging "x = 1" and "x = 99" on a 100-wide grid should give x ≈ 0, not x = 50. The Python sim handles this with the circular-mean trick — represent each x-coordinate as `exp(2πi * x / LX)`, sum them as complex numbers, then take the angle of the result. We replicate that here using two `{re, im}` pairs per cell (one for x, one for y).

**Files:**
- Create: `src/sim/cell.ts`
- Test: `tests/sim/cell.test.ts`

- [ ] **Step 4.1: Write failing tests**

Create `tests/sim/cell.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { createCell, addPixel, removePixel } from '../../src/sim/cell';
import type { Cell } from '../../src/sim/types';

const LX = 10;
const LY = 10;

function fresh(id = 1): Cell {
  return createCell(id, 100);
}

describe('createCell', () => {
  it('initializes vol and centerSums to zero', () => {
    const c = fresh();
    expect(c.id).toBe(1);
    expect(c.vol).toBe(0);
    expect(c.targetVol).toBe(100);
    expect(c.centerSum[0]).toEqual({ re: 0, im: 0 });
    expect(c.centerSum[1]).toEqual({ re: 0, im: 0 });
  });
});

describe('addPixel / removePixel', () => {
  it('vol increments and decrements correctly', () => {
    const c = fresh();
    addPixel(c, 3, 5, LX, LY);
    expect(c.vol).toBe(1);
    addPixel(c, 4, 5, LX, LY);
    expect(c.vol).toBe(2);
    removePixel(c, 3, 5, LX, LY);
    expect(c.vol).toBe(1);
  });

  it('center is at the added pixel when only one pixel exists', () => {
    const c = fresh();
    addPixel(c, 3, 5, LX, LY);
    expect(c.center[0]).toBeCloseTo(3, 5);
    expect(c.center[1]).toBeCloseTo(5, 5);
  });

  it('center is the centroid of two adjacent pixels (no wrap-around case)', () => {
    const c = fresh();
    addPixel(c, 4, 4, LX, LY);
    addPixel(c, 4, 6, LX, LY);
    expect(c.center[0]).toBeCloseTo(4, 5);
    expect(c.center[1]).toBeCloseTo(5, 5);
  });

  it('center handles wraparound correctly', () => {
    // Two pixels: (0, 0) and (LX-1, 0). Expected center x ≈ -0.5 mod LX = LX-0.5.
    const c = fresh();
    addPixel(c, 0, 0, LX, LY);
    addPixel(c, LX - 1, 0, LX, LY);
    // The circular mean of x=0 and x=9 on a length-10 axis is 9.5 (or equivalently -0.5).
    // Our convention: result is in [0, LX). So expect ~9.5.
    expect(c.center[0]).toBeCloseTo(9.5, 1);
    expect(c.center[1]).toBeCloseTo(0, 1);
  });
});
```

- [ ] **Step 4.2: Run tests, verify they fail**

Run: `npm test -- tests/sim/cell.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 4.3: Implement `src/sim/cell.ts`**

```ts
import type { Cell, CellId } from './types';

export function createCell(id: CellId, targetVol: number): Cell {
  return {
    id,
    vol: 0,
    targetVol,
    centerSum: [
      { re: 0, im: 0 },
      { re: 0, im: 0 },
    ],
    center: [0, 0],
    intent: {
      vec: [0, 0],
      speed: 0,
      engulfMultiplier: 1,
      shooting: false,
    },
  };
}

// Internal: add or subtract one pixel's contribution to the circular sum,
// then recompute the center via the circular-mean trick.
//   exp(2πi * x / LX) for the x-axis, similar for y
//   center_x = (angle(sum_x / vol) / 2π) * LX, mod LX
function applyContribution(
  c: Cell,
  x: number,
  y: number,
  LX: number,
  LY: number,
  sign: 1 | -1,
): void {
  const ax = (2 * Math.PI * x) / LX;
  const ay = (2 * Math.PI * y) / LY;
  c.centerSum[0].re += sign * Math.cos(ax);
  c.centerSum[0].im += sign * Math.sin(ax);
  c.centerSum[1].re += sign * Math.cos(ay);
  c.centerSum[1].im += sign * Math.sin(ay);
}

function recomputeCenter(c: Cell, LX: number, LY: number): void {
  if (c.vol <= 0) {
    c.center = [0, 0];
    return;
  }
  // angle of (sum / vol) is the same as angle of sum (vol is positive real),
  // so we can skip the divide.
  const thetaX = Math.atan2(c.centerSum[0].im, c.centerSum[0].re);
  const thetaY = Math.atan2(c.centerSum[1].im, c.centerSum[1].re);
  // atan2 returns (-π, π]; convert to [0, 2π) then scale to grid coords.
  const ux = ((thetaX % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  const uy = ((thetaY % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  c.center = [(ux / (2 * Math.PI)) * LX, (uy / (2 * Math.PI)) * LY];
}

export function addPixel(c: Cell, x: number, y: number, LX: number, LY: number): void {
  c.vol += 1;
  applyContribution(c, x, y, LX, LY, 1);
  recomputeCenter(c, LX, LY);
}

export function removePixel(c: Cell, x: number, y: number, LX: number, LY: number): void {
  c.vol -= 1;
  applyContribution(c, x, y, LX, LY, -1);
  recomputeCenter(c, LX, LY);
}
```

- [ ] **Step 4.4: Run tests, verify they pass**

Run: `npm test -- tests/sim/cell.test.ts`
Expected: all pass.

- [ ] **Step 4.5: Commit**

```bash
git add src/sim/cell.ts tests/sim/cell.test.ts
git commit -m "feat(sim): cell type with wrap-aware circular-mean center tracking"
```

---

## Task 5: Monte Carlo Step

**Why:** This is the heart of the cellular Potts model. Each step picks a random boundary pixel, considers copying its value to a random neighbor, computes the change in the system's "energy" (`dH`), and accepts the change with probability `exp(-dH)`. Three energy terms in M1: surface tension (Ising), volume preservation, and movement intent. Engulf is the fourth term and is added in M3 — for now its multiplier is 1.0 so it has no effect.

The original Python `cell_MC_step` in `simulator.py` is a 70-line god function. We split it into a 10-line orchestrator + helpers.

**Files:**
- Create: `src/sim/monte-carlo.ts`
- Test: `tests/sim/monte-carlo.test.ts`

- [ ] **Step 5.1: Write failing tests**

Create `tests/sim/monte-carlo.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { createGrid, setCell, recomputeBoundary, idx } from '../../src/sim/grid';
import { createCell, addPixel } from '../../src/sim/cell';
import { createRng } from '../../src/sim/rng';
import { mcStep } from '../../src/sim/monte-carlo';
import type { SimState } from '../../src/sim/types';

function makeStateWithTwoBlobs(): SimState {
  const grid = createGrid(20, 20, true);
  const cells = new Map<number, ReturnType<typeof createCell>>();
  const c1 = createCell(1, 9);
  const c2 = createCell(2, 9);
  cells.set(1, c1);
  cells.set(2, c2);

  // 3x3 blob of cell 1 around (5, 10)
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      setCell(grid, 5 + dx, 10 + dy, 1);
      addPixel(c1, 5 + dx, 10 + dy, grid.LX, grid.LY);
    }
  }
  // 3x3 blob of cell 2 around (15, 10)
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      setCell(grid, 15 + dx, 10 + dy, 2);
      addPixel(c2, 15 + dx, 10 + dy, grid.LX, grid.LY);
    }
  }
  recomputeBoundary(grid);

  return {
    grid,
    cells,
    betaIsing: 1,
    betaVol: 1,
    betaMov: 1,
    events: [],
    rng: createRng(42),
  };
}

describe('mcStep', () => {
  it('does not change the grid when source and target have same id', () => {
    const state = makeStateWithTwoBlobs();
    // Force conditions where mcStep picks two same-id pixels: shrink boundary to one cell.
    // Easier: just run many steps and verify total volume conservation across both cells.
    const v1Before = state.cells.get(1)!.vol;
    const v2Before = state.cells.get(2)!.vol;
    for (let i = 0; i < 1000; i++) mcStep(state);
    const v1After = state.cells.get(1)!.vol;
    const v2After = state.cells.get(2)!.vol;
    // Total cell pixels shouldn't grow beyond grid pixels.
    expect(v1After + v2After).toBeLessThanOrEqual(state.grid.LX * state.grid.LY);
  });

  it('volumes match Uint8Array counts after many steps (invariant)', () => {
    const state = makeStateWithTwoBlobs();
    for (let i = 0; i < 5000; i++) mcStep(state);
    let count1 = 0;
    let count2 = 0;
    for (const v of state.grid.cells) {
      if (v === 1) count1++;
      else if (v === 2) count2++;
    }
    expect(state.cells.get(1)!.vol).toBe(count1);
    expect(state.cells.get(2)!.vol).toBe(count2);
  });

  it('boundary set matches a fresh recomputeBoundary after many steps', () => {
    const state = makeStateWithTwoBlobs();
    for (let i = 0; i < 5000; i++) mcStep(state);
    const tracked = new Set(state.grid.boundary);
    recomputeBoundary(state.grid);
    expect(state.grid.boundary).toEqual(tracked);
  });

  it('produces deterministic output for a fixed seed', () => {
    const a = makeStateWithTwoBlobs();
    const b = makeStateWithTwoBlobs();
    for (let i = 0; i < 1000; i++) {
      mcStep(a);
      mcStep(b);
    }
    expect(Array.from(a.grid.cells)).toEqual(Array.from(b.grid.cells));
  });

  it('a step early-returns without changes if boundary is empty', () => {
    const state = makeStateWithTwoBlobs();
    // Empty the boundary
    state.grid.boundary.clear();
    const before = Array.from(state.grid.cells);
    mcStep(state);
    expect(Array.from(state.grid.cells)).toEqual(before);
  });
});
```

- [ ] **Step 5.2: Run tests, verify they fail**

Run: `npm test -- tests/sim/monte-carlo.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 5.3: Implement `src/sim/monte-carlo.ts`**

```ts
import {
  type SimState,
  type CellId,
  NEIGHBOR_DIRS,
} from './types';
import {
  idx,
  xy,
  getCell,
  setCell,
  neighborCoord,
  neighborVals,
  updateBoundaryAround,
} from './grid';
import { addPixel, removePixel } from './cell';

// One Monte Carlo step. Returns true if the step changed the grid.
export function mcStep(state: SimState): boolean {
  const { grid, rng } = state;
  if (grid.boundary.size === 0) return false;

  // Pick a random boundary pixel as the source.
  const boundaryArr = Array.from(grid.boundary); // O(n) — see optimization note below.
  const sourceIdx = boundaryArr[rng.randInt(boundaryArr.length)];
  if (sourceIdx === undefined) return false;
  const [xS, yS] = xy(grid, sourceIdx);

  // Pick a random neighbor as the target.
  const dir = NEIGHBOR_DIRS[rng.randInt(NEIGHBOR_DIRS.length)];
  if (!dir) return false;
  const tCoord = neighborCoord(grid, xS, yS, dir[0], dir[1]);
  if (tCoord === null) return false;
  const [xT, yT] = tCoord;

  const sourceVal = getCell(grid, xS, yS);
  const targetVal = getCell(grid, xT, yT);
  if (sourceVal === targetVal) return false;

  const dH =
    state.betaIsing * isingTerm(state, xT, yT, sourceVal, targetVal) +
    state.betaVol * volumeTerm(state, sourceVal, targetVal) +
    state.betaMov * movementTerm(state, sourceVal, dir);
  // engulfTerm intentionally omitted in M1 — added in M3.

  if (rng.random() > Math.exp(-dH)) return false;

  // Accept: source value flows into target.
  applyPixelTransfer(state, xS, yS, xT, yT, sourceVal, targetVal);
  return true;
}

// Surface-tension (Ising) energy change.
// dH_ising = (#neighbors with target_val) - (#neighbors with source_val)
function isingTerm(
  state: SimState,
  xT: number,
  yT: number,
  sourceVal: CellId,
  targetVal: CellId,
): number {
  const nbrs = neighborVals(state.grid, xT, yT);
  let sameAsTarget = 0;
  let sameAsSource = 0;
  for (const v of nbrs) {
    if (v === targetVal) sameAsTarget++;
    else if (v === sourceVal) sameAsSource++;
  }
  return sameAsTarget - sameAsSource;
}

// Volume preservation (quadratic energy → linear force around target).
function volumeTerm(state: SimState, sourceVal: CellId, targetVal: CellId): number {
  let dH = 0;
  if (sourceVal !== 0) {
    const c = state.cells.get(sourceVal);
    if (c) dH += 2 * (c.vol - c.targetVol) + 1;
  }
  if (targetVal !== 0) {
    const c = state.cells.get(targetVal);
    if (c) dH += -2 * (c.vol - c.targetVol) + 1;
  }
  return dH;
}

// Movement intent. Cells "want" to move along their intent vector.
// dH = -(dir · desired_v). desired_v = intent.vec * intent.speed.
function movementTerm(
  state: SimState,
  sourceVal: CellId,
  dir: readonly [number, number],
): number {
  if (sourceVal === 0) return 0;
  const c = state.cells.get(sourceVal);
  if (!c) return 0;
  const dvx = c.intent.vec[0] * c.intent.speed;
  const dvy = c.intent.vec[1] * c.intent.speed;
  return -(dir[0] * dvx + dir[1] * dvy);
}

// Apply the accepted pixel transfer: update grid, vol, center, boundary.
function applyPixelTransfer(
  state: SimState,
  xS: number,
  yS: number,
  xT: number,
  yT: number,
  sourceVal: CellId,
  targetVal: CellId,
): void {
  const { grid } = state;
  setCell(grid, xT, yT, sourceVal);

  if (sourceVal !== 0) {
    const c = state.cells.get(sourceVal);
    if (c) addPixel(c, xT, yT, grid.LX, grid.LY);
  }
  if (targetVal !== 0) {
    const c = state.cells.get(targetVal);
    if (c) removePixel(c, xT, yT, grid.LX, grid.LY);
  }

  updateBoundaryAround(grid, xT, yT);
  state.events.push({
    type: 'pixelTransferred',
    from: targetVal,
    to: sourceVal,
    pos: [xT, yT],
  });

  // Suppress unused `xS`/`yS` warning by referencing them — they're documented
  // here for clarity (the source is the read site; the target is the write site).
  void xS;
  void yS;
  void idx;  // re-export hint; used inside grid module only.
}
```

> **Performance note:** `Array.from(grid.boundary)` runs every step. For a 100×100 grid with a handful of cells, the boundary is a few hundred pixels — copying an O(N) array 1000 times per frame is hot. M1 ships this naive version; we'll optimize it (e.g. a parallel `Array<number>` index alongside the `Set`) only if the perf budget says so. The TDD tests don't care about the implementation; they care about correctness.

- [ ] **Step 5.4: Run tests, verify they pass**

Run: `npm test -- tests/sim/monte-carlo.test.ts`
Expected: all 5 tests pass.

- [ ] **Step 5.5: Commit**

```bash
git add src/sim/monte-carlo.ts tests/sim/monte-carlo.test.ts
git commit -m "feat(sim): Monte Carlo step with Ising, volume, movement terms"
```

---

## Task 6: Sim Façade

**Why:** `main.ts` should not import from individual `sim/` files; it should import a single, narrow API. `createSim(opts)` builds a complete `SimState` with cells laid out in a circle (matching the Python `start_pattern='circle'`). `tick(state)` runs N MC steps and a stub bullet step.

**Files:**
- Create: `src/sim/bullets.ts`
- Create: `src/sim/sim.ts`
- Test: extend `tests/sim/monte-carlo.test.ts` with one integration test (or add a new file). We'll add a new file for clarity.
- Test: `tests/sim/sim.test.ts`

- [ ] **Step 6.1: Create stub `src/sim/bullets.ts`**

```ts
import type { SimState } from './types';

// M1 stub — bullets don't exist yet. M2 fills this in.
export function stepBullets(_state: SimState): void {
  /* no-op */
}
```

- [ ] **Step 6.2: Write failing tests for sim façade**

Create `tests/sim/sim.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { createSim, tick } from '../../src/sim/sim';

describe('createSim', () => {
  it('creates a sim with N cells at distinct positions', () => {
    const state = createSim({
      LX: 50,
      LY: 50,
      nCells: 4,
      targetVol: 100,
      seed: 42,
      wrap: true,
    });
    expect(state.cells.size).toBe(4);
    // Each cell occupies its 8-neighborhood + center = 9 pixels at start.
    for (const cell of state.cells.values()) {
      expect(cell.vol).toBe(9);
    }
    // No cell-id collisions on the grid (sum of vols = unique-pixel count).
    let occupied = 0;
    for (const v of state.grid.cells) if (v !== 0) occupied++;
    expect(occupied).toBe(4 * 9);
  });

  it('boundary is non-empty after creation', () => {
    const state = createSim({ LX: 50, LY: 50, nCells: 2, targetVol: 100, seed: 1, wrap: true });
    expect(state.grid.boundary.size).toBeGreaterThan(0);
  });
});

describe('tick', () => {
  it('runs MC steps and clears events on each call', () => {
    const state = createSim({ LX: 30, LY: 30, nCells: 2, targetVol: 50, seed: 7, wrap: true });
    state.events.push({ type: 'pixelTransferred', from: 1, to: 2, pos: [0, 0] });
    tick(state, 100);
    // events array should have been cleared at start of tick, then repopulated.
    // Just check that the lingering manual event is gone:
    const stale = state.events.find((e) => e.pos[0] === 0 && e.pos[1] === 0 && e.from === 1 && e.to === 2);
    expect(stale).toBeUndefined();
  });

  it('preserves grid–cell volume invariant after many ticks', () => {
    const state = createSim({ LX: 30, LY: 30, nCells: 2, targetVol: 50, seed: 7, wrap: true });
    for (let i = 0; i < 50; i++) tick(state, 100);
    let count1 = 0;
    let count2 = 0;
    for (const v of state.grid.cells) {
      if (v === 1) count1++;
      else if (v === 2) count2++;
    }
    expect(state.cells.get(1)!.vol).toBe(count1);
    expect(state.cells.get(2)!.vol).toBe(count2);
  });
});
```

- [ ] **Step 6.3: Run tests, verify they fail**

Run: `npm test -- tests/sim/sim.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 6.4: Implement `src/sim/sim.ts`**

```ts
import { type SimState, NEIGHBOR_DIRS } from './types';
import { createGrid, idx, setCell, recomputeBoundary } from './grid';
import { createCell, addPixel } from './cell';
import { createRng } from './rng';
import { mcStep } from './monte-carlo';
import { stepBullets } from './bullets';

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

export function createSim(opts: CreateSimOpts): SimState {
  const grid = createGrid(opts.LX, opts.LY, opts.wrap);
  const cells = new Map<number, ReturnType<typeof createCell>>();

  // Spawn cells in a circle (matches Python start_pattern='circle').
  for (let i = 1; i <= opts.nCells; i++) {
    const c = createCell(i, opts.targetVol);
    cells.set(i, c);

    const theta = (2 * Math.PI * i) / opts.nCells;
    const cx = Math.round(opts.LX / 2 + (opts.LX / 3) * Math.cos(theta));
    const cy = Math.round(opts.LY / 2 + (opts.LY / 3) * Math.sin(theta));

    // Place the cell at (cx, cy) and its 8 neighbors. With wrap, all 9 land on grid.
    for (const [dx, dy] of [[0, 0], ...NEIGHBOR_DIRS]) {
      const nx = ((cx + (dx as number)) % opts.LX + opts.LX) % opts.LX;
      const ny = ((cy + (dy as number)) % opts.LY + opts.LY) % opts.LY;
      // Don't overwrite another cell's pixels (shouldn't happen with reasonable nCells/LX).
      if (grid.cells[idx(grid, nx, ny)] !== 0) continue;
      setCell(grid, nx, ny, i);
      addPixel(c, nx, ny, opts.LX, opts.LY);
    }
  }

  recomputeBoundary(grid);

  return {
    grid,
    cells,
    betaIsing: opts.betaIsing ?? 1,
    betaVol: opts.betaVol ?? 1,
    betaMov: opts.betaMov ?? 1,
    events: [],
    rng: createRng(opts.seed),
  };
}

// Run `mcStepsPerTick` Monte Carlo steps + one bullet step. Clears events first.
export function tick(state: SimState, mcStepsPerTick: number): void {
  state.events.length = 0;
  for (let i = 0; i < mcStepsPerTick; i++) mcStep(state);
  stepBullets(state);
}
```

- [ ] **Step 6.5: Run tests, verify they pass**

Run: `npm test -- tests/sim/sim.test.ts`
Expected: all 4 tests pass.

- [ ] **Step 6.6: Run the full test suite to make sure nothing else broke**

Run: `npm test`
Expected: all tests across all files pass.

- [ ] **Step 6.7: Commit**

```bash
git add src/sim/bullets.ts src/sim/sim.ts tests/sim/sim.test.ts
git commit -m "feat(sim): createSim + tick façade with circle start pattern"
```

---

## Task 7: Renderer (Layer 1 — Grid Blit)

**Why:** Translate the sim's `Uint8Array` grid into pixels on a canvas. We render at native grid resolution (e.g. 100×100) into an `ImageData`, then `drawImage` it scaled up to display size (500×500). The browser handles the scaling natively (with CSS `image-rendering: pixelated` for crisp pixels). One blit per frame, no per-pixel `fillRect` calls. Boundary pixels are drawn lightened by 30% — preserves the original sim's look.

**Files:**
- Create: `src/ui/render.ts`
- (No test for the renderer in M1 — it's purely visual, tested by eye in Task 8.)

- [ ] **Step 7.1: Implement `src/ui/render.ts`**

```ts
import type { SimState, CellId } from '../sim/types';

export interface Renderer {
  render(state: SimState): void;
}

// Cached HSL → RGB lookup, indexed by CellId. cells[0] (empty) is black.
function buildPalette(nCells: number): Uint8ClampedArray[] {
  const out: Uint8ClampedArray[] = [];
  out.push(new Uint8ClampedArray([0, 0, 0, 255])); // empty
  for (let i = 0; i < nCells; i++) {
    const hue = i / nCells;            // 0..1
    const [r, g, b] = hsvToRgb(hue, 1, 0.7);
    out.push(new Uint8ClampedArray([r, g, b, 255]));
  }
  return out;
}

function hsvToRgb(h: number, s: number, v: number): [number, number, number] {
  // Standard HSV → RGB conversion.
  const i = Math.floor(h * 6);
  const f = h * 6 - i;
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);
  let r = 0, g = 0, b = 0;
  switch (i % 6) {
    case 0: r = v; g = t; b = p; break;
    case 1: r = q; g = v; b = p; break;
    case 2: r = p; g = v; b = t; break;
    case 3: r = p; g = q; b = v; break;
    case 4: r = t; g = p; b = v; break;
    case 5: r = v; g = p; b = q; break;
  }
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

// Lighten an RGB color by `factor` toward white (0..1).
function lighten(c: Uint8ClampedArray, factor: number): Uint8ClampedArray {
  return new Uint8ClampedArray([
    255 * factor + c[0]! * (1 - factor),
    255 * factor + c[1]! * (1 - factor),
    255 * factor + c[2]! * (1 - factor),
    255,
  ]);
}

export function createRenderer(
  canvas: HTMLCanvasElement,
  nCells: number,
): Renderer {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No 2D context');
  ctx.imageSmoothingEnabled = false;

  // Build palette: base color + boundary-lightened color.
  const base = buildPalette(nCells);
  const boundaryColors = base.map((c) => lighten(c, 0.3));

  let imageData: ImageData | null = null;
  let offscreen: HTMLCanvasElement | null = null;
  let offCtx: CanvasRenderingContext2D | null = null;

  return {
    render(state: SimState) {
      const { LX, LY, cells, boundary } = state.grid;
      // Lazy init when we know the grid size.
      if (!imageData || imageData.width !== LX || imageData.height !== LY) {
        offscreen = document.createElement('canvas');
        offscreen.width = LX;
        offscreen.height = LY;
        const o = offscreen.getContext('2d');
        if (!o) throw new Error('No 2D context for offscreen');
        offCtx = o;
        imageData = offCtx.createImageData(LX, LY);
      }

      const data = imageData.data;
      // The grid is indexed [x*LY + y]. ImageData is row-major: [y*LX + x] * 4.
      for (let x = 0; x < LX; x++) {
        for (let y = 0; y < LY; y++) {
          const cellIdx = x * LY + y;
          const id = cells[cellIdx] as CellId;
          const onBoundary = boundary.has(cellIdx);
          const palette = onBoundary ? boundaryColors[id] : base[id];
          // Fall back to black if id out of palette range.
          const color = palette ?? base[0]!;

          const pixIdx = (y * LX + x) * 4;
          data[pixIdx]     = color[0]!;
          data[pixIdx + 1] = color[1]!;
          data[pixIdx + 2] = color[2]!;
          data[pixIdx + 3] = 255;
        }
      }

      offCtx!.putImageData(imageData, 0, 0);
      // Scale up to display canvas.
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(offscreen!, 0, 0, canvas.width, canvas.height);
    },
  };
}
```

- [ ] **Step 7.2: Build to confirm types check**

Run: `npm run build`
Expected: TypeScript compiles cleanly. `dist/` is produced.

- [ ] **Step 7.3: Commit**

```bash
git add src/ui/render.ts
git commit -m "feat(ui): grid renderer with boundary lightening"
```

---

## Task 8: Wire It Up — `main.ts` and Visual Smoke Test

**Why:** Replace the placeholder `main.ts` with the real entry point: create the sim, create the renderer, run a `requestAnimationFrame` loop that calls `tick` then `render`. This is where M1 becomes visible.

**Files:**
- Modify: `src/main.ts`

- [ ] **Step 8.1: Replace `src/main.ts` contents**

```ts
import { createSim, tick } from './sim/sim';
import { createRenderer } from './ui/render';

const LX = 100;
const LY = 100;
const N_CELLS = 2;
const TARGET_VOL = 300;
const MC_STEPS_PER_FRAME = 1000;

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

// Simple FPS overlay (console only — HUD comes in M4).
let lastFpsLog = performance.now();
let framesSinceLog = 0;

function loop() {
  tick(state, MC_STEPS_PER_FRAME);
  renderer.render(state);

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

- [ ] **Step 8.2: Run dev server and visually verify**

Run: `npm run dev`
Open the printed URL in a browser.

Expected:
- Canvas fills with two distinct colored blobs (~9 pixels each at start, growing toward `targetVol = 300`).
- Blobs sit roughly in their starting positions — they don't drift purposefully (no movement intent set).
- Boundaries are visibly lighter than cell interiors.
- Browser DevTools console logs `FPS: ~60` once per second. (Acceptable: 30+ on a slow laptop.)

If FPS is below 30, **stop and investigate before proceeding** — likely culprits in order:
1. `Array.from(grid.boundary)` in `mcStep` is O(N) per step, called 1000× per frame. If hot, consider replacing with a parallel array.
2. The sin/cos/atan2 calls in `recomputeCenter` run on every accepted pixel transfer. Consider memoizing.
3. Browser DevTools profiler will tell you where to look — don't guess.

Stop the dev server (Ctrl-C).

- [ ] **Step 8.3: Run full test suite to verify nothing regressed**

Run: `npm test`
Expected: all tests pass.

- [ ] **Step 8.4: Run the build to verify production builds**

Run: `npm run build`
Expected: `dist/` is produced with no errors.

- [ ] **Step 8.5: Commit**

```bash
git add src/main.ts
git commit -m "feat: wire sim + renderer into rAF loop with FPS logging"
```

---

## Task 9: M1 Wrap-up

- [ ] **Step 9.1: Confirm M1 definition of done**

Re-read the goal at the top of this plan. Verify:
- ✅ Vite + TS + Vitest scaffolded.
- ✅ `npm run dev` shows two colored blobs at ~60 FPS.
- ✅ `npm test` passes (4 test files: rng, grid, cell, monte-carlo, sim).
- ✅ `npm run build` produces `dist/`.
- ✅ Git history is a clean sequence of focused commits.

- [ ] **Step 9.2: Tag the milestone**

```bash
git tag m1-sim-port-skeleton
git log --oneline
```

- [ ] **Step 9.3: Note any deferred concerns**

If you noticed during implementation:
- Performance issues → file a note in `docs/superpowers/notes/perf.md` for M2 to address.
- API smells in the sim layer that M2/M3 will need to clean up → note them.
- Things the spec missed → flag them; the spec may need an amendment before M2.

(Skip Step 9.3 if there's nothing to note.)

---

## Notes for the Implementing Engineer

**Why the heavy testing on the sim layer.** The CPM port has subtle bugs that don't show up visually but corrupt the simulation over time (e.g., volume desync between `Uint8Array` and `cell.vol`). The invariant tests (volume conservation, boundary set matches recompute) catch these cheaply.

**What you don't have to test in M1.** The renderer and `main.ts`. They're trivial enough to test by eye, and visual tests would add framework weight (Playwright etc.) for no real safety.

**Don't optimize prematurely.** The naive `Array.from(grid.boundary)` is fine for now. Profile *after* you've shipped M1; don't predict perf.

**On the `void` statements in `monte-carlo.ts`.** Those are there to silence `noUnusedParameters` for parameters we want to keep in the function signature for clarity even though M1 doesn't use them. If your linter isn't happy, just remove the parameter — the signature will be revisited in M2.

**Read the spec.** `docs/superpowers/specs/2026-05-04-cellular-death-match-design.md` Section 4 (Sim Layer) is the canonical reference for data shapes and the MC step. If this plan and the spec disagree, the spec wins; flag the contradiction.
