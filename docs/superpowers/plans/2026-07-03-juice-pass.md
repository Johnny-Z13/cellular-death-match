# Juice Pass v1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every dish interaction kicks back visibly (tap ripples), silent sim events become visible (birth/death/discovery particle bursts, dish shake), and the deadline clock reads as alive — with zero simulation changes.

**Architecture:** One new module `src/ui/juice.ts` owns all transient feedback. Its core (particle/ripple store + visual math) is pure and DOM-free so it unit-tests in vitest's `node` environment; a thin `createJuice(canvas, LX, LY)` wrapper does canvas drawing, shake CSS class toggling, and reduced-motion handling. `src/main.ts` fires juice calls from three existing hook points (pointerdown, the per-frame loop, the ticker's outbreak diff). The countdown clock is a `screens.ts` + CSS change only.

**Tech Stack:** Vite + TypeScript, vitest (env: `node` — no DOM in unit tests), Canvas 2D, plain CSS animations.

## Global Constraints

- **Node/npm are NOT on this machine's PATH.** Prefix every npm/npx command with:
  `export PATH="/private/tmp/claude-501/-Users-johnnyvenables-Projects-Web-cellular-death-match/b4c57106-8edb-41e2-ab74-9bdc0ea73440/scratchpad/node-v22.16.0-darwin-arm64/bin:$PATH"`
- No writes to `src/sim/**`, `src/game/arena.ts`, or `src/content/**`. Juice only reads existing state/events.
- Every effect honors `prefers-reduced-motion`: ripples become a static ring, bursts are skipped, shake is skipped (dish flash already covers reduced-motion big events), clock pulse disabled in CSS (color ramp stays).
- Hard caps: `MAX_PARTICLES = 200`, `MAX_RIPPLES = 24` — oldest evicted first.
- Unit tests must not touch the DOM: `src/ui/juice.ts` may only use `import type` from `./screens` (type-only imports are erased at compile time; a value import would drag DOM code into the node test env).
- Existing suite (556 tests) stays green. Commit messages end with `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>` via bash heredoc.
- Dev-server checks must use port 5199 (`5173` is occupied by an unrelated project).

---

### Task 1: Juice store core (pure logic + tests)

**Files:**
- Create: `src/ui/juice.ts` (pure core only — the canvas wrapper is Task 2)
- Test: `tests/ui/juiceStore.test.ts`

**Interfaces:**
- Consumes: `ToolId` from `src/ui/screens.ts:18` (`'egg' | 'nutrient' | 'toxin' | 'water' | 'salt' | 'acid' | 'paste'`) — **type-only import**.
- Produces (Task 2 and tests rely on these exact names):
  - `createJuiceStore(): JuiceStore`
  - `spawnRipple(store, pos: [number, number], tool: ToolId, now: number): void`
  - `spawnBurst(store, pos: [number, number], rgb: [number, number, number], kind: BurstKind, now: number, rand?: () => number): void`
  - `stepJuice(store, now: number): void`
  - `rippleVisual(r: Ripple, now: number): {radius, alpha, lineWidth, color} | null`
  - `staticRippleVisual(r: Ripple, now: number)` — same shape, for reduced motion
  - `particleVisual(p: Particle, now: number): {x, y, alpha, size} | null`
  - `MAX_PARTICLES`, `MAX_RIPPLES`, `RIPPLE_COLORS`
  - Types: `BurstKind = 'birth' | 'death' | 'discovery'`, `ShakeIntensity = 'soft' | 'hard'`, `Ripple`, `Particle`, `JuiceStore`

- [ ] **Step 1: Write the failing test**

Create `tests/ui/juiceStore.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  createJuiceStore, spawnRipple, spawnBurst, stepJuice,
  rippleVisual, staticRippleVisual, particleVisual,
  MAX_PARTICLES, MAX_RIPPLES, RIPPLE_COLORS,
} from '../../src/ui/juice';

const fixedRand = () => 0.5;

describe('juice store', () => {
  it('spawns a ripple and evicts the oldest past the cap', () => {
    const store = createJuiceStore();
    for (let i = 0; i < MAX_RIPPLES + 5; i++) {
      spawnRipple(store, [i, i], 'egg', 1000 + i);
    }
    expect(store.ripples.length).toBe(MAX_RIPPLES);
    expect(store.ripples[0]!.x).toBe(5); // oldest 5 evicted
  });

  it('enforces the particle cap across repeated bursts', () => {
    const store = createJuiceStore();
    for (let i = 0; i < 12; i++) {
      spawnBurst(store, [10, 10], [126, 230, 255], 'discovery', 1000, fixedRand);
    }
    expect(store.particles.length).toBe(MAX_PARTICLES);
  });

  it('dims death burst colors and keeps birth colors true', () => {
    const store = createJuiceStore();
    spawnBurst(store, [0, 0], [200, 100, 50], 'death', 0, fixedRand);
    expect(store.particles[0]!.rgb[0]).toBeLessThan(100);
    const store2 = createJuiceStore();
    spawnBurst(store2, [0, 0], [200, 100, 50], 'birth', 0, fixedRand);
    expect(store2.particles[0]!.rgb[0]).toBe(200);
  });

  it('ages out expired ripples and particles', () => {
    const store = createJuiceStore();
    spawnRipple(store, [1, 1], 'nutrient', 0);
    spawnBurst(store, [1, 1], [255, 255, 255], 'birth', 0, fixedRand);
    stepJuice(store, 100);
    expect(store.ripples.length).toBe(1);
    expect(store.particles.length).toBeGreaterThan(0);
    stepJuice(store, 10_000);
    expect(store.ripples.length).toBe(0);
    expect(store.particles.length).toBe(0);
  });

  it('ripple visual expands and fades, then nulls out', () => {
    const r = { x: 0, y: 0, tool: 'nutrient' as const, start: 0, duration: 450 };
    const early = rippleVisual(r, 0)!;
    const late = rippleVisual(r, 400)!;
    expect(early.color).toBe(RIPPLE_COLORS.nutrient);
    expect(late.radius).toBeGreaterThan(early.radius);
    expect(late.alpha).toBeLessThan(early.alpha);
    expect(rippleVisual(r, 450)).toBeNull();
  });

  it('static ripple visual has fixed radius for reduced motion', () => {
    const r = { x: 0, y: 0, tool: 'egg' as const, start: 0, duration: 450 };
    expect(staticRippleVisual(r, 0)!.radius).toBe(staticRippleVisual(r, 300)!.radius);
    expect(staticRippleVisual(r, 450)).toBeNull();
  });

  it('particles drift outward and fade', () => {
    const store = createJuiceStore();
    spawnBurst(store, [50, 50], [255, 255, 255], 'discovery', 0, fixedRand);
    const p = store.particles[0]!;
    const early = particleVisual(p, 50)!;
    const late = particleVisual(p, 800)!;
    const distEarly = Math.hypot(early.x - 50, early.y - 50);
    const distLate = Math.hypot(late.x - 50, late.y - 50);
    expect(distLate).toBeGreaterThan(distEarly);
    expect(late.alpha).toBeLessThan(early.alpha);
    expect(particleVisual(p, p.duration + 1)).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/ui/juiceStore.test.ts`
Expected: FAIL — cannot resolve `../../src/ui/juice`.

- [ ] **Step 3: Write the implementation**

Create `src/ui/juice.ts`:

```ts
// Transient tactile feedback: tap ripples, life/death/discovery particle
// bursts, and dish shake. Pure presentation — reads sim state, never writes.
// This core (store + visual math) is DOM-free so it unit-tests in node;
// createJuice (added separately) wraps it with canvas drawing.
import type { ToolId } from './screens';

export type BurstKind = 'birth' | 'death' | 'discovery';
export type ShakeIntensity = 'soft' | 'hard';

export interface Ripple {
  x: number;
  y: number;
  tool: ToolId;
  start: number;
  duration: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rgb: [number, number, number];
  start: number;
  duration: number;
  size: number;
}

export interface JuiceStore {
  ripples: Ripple[];
  particles: Particle[];
}

export const MAX_PARTICLES = 200;
export const MAX_RIPPLES = 24;

// Tool-tinted ripple colors, matched to the reagent identity hues used by
// the tool-effect overlay and dish-event palettes.
export const RIPPLE_COLORS: Record<ToolId, string> = {
  egg: '#7ee6ff',
  nutrient: '#f6d365',
  toxin: '#b771ff',
  paste: '#b6e36a',
  water: '#5ad8ff',
  salt: '#d2fff5',
  acid: '#83ff55',
};

// speed is grid units per second; duration in ms; size in grid units.
const BURST_TUNING: Record<BurstKind, { count: number; speed: number; duration: number; size: number }> = {
  birth: { count: 12, speed: 6, duration: 700, size: 1.2 },
  death: { count: 10, speed: 3, duration: 900, size: 1.0 },
  discovery: { count: 26, speed: 10, duration: 1100, size: 1.6 },
};

export function createJuiceStore(): JuiceStore {
  return { ripples: [], particles: [] };
}

export function spawnRipple(
  store: JuiceStore,
  pos: [number, number],
  tool: ToolId,
  now: number,
): void {
  store.ripples.push({ x: pos[0], y: pos[1], tool, start: now, duration: 450 });
  while (store.ripples.length > MAX_RIPPLES) store.ripples.shift();
}

export function spawnBurst(
  store: JuiceStore,
  pos: [number, number],
  rgb: [number, number, number],
  kind: BurstKind,
  now: number,
  rand: () => number = Math.random,
): void {
  const tune = BURST_TUNING[kind];
  // Death reads as a dark dissolving puff of the culture's own hue.
  const color: [number, number, number] = kind === 'death'
    ? [rgb[0] * 0.35, rgb[1] * 0.35, rgb[2] * 0.35]
    : rgb;
  for (let i = 0; i < tune.count; i++) {
    const angle = rand() * Math.PI * 2;
    const speed = tune.speed * (0.4 + 0.6 * rand());
    store.particles.push({
      x: pos[0],
      y: pos[1],
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      rgb: color,
      start: now,
      duration: tune.duration * (0.7 + 0.3 * rand()),
      size: tune.size,
    });
  }
  while (store.particles.length > MAX_PARTICLES) store.particles.shift();
}

export function stepJuice(store: JuiceStore, now: number): void {
  store.ripples = store.ripples.filter((r) => now - r.start < r.duration);
  store.particles = store.particles.filter((p) => now - p.start < p.duration);
}

export interface RippleFrame {
  radius: number;
  alpha: number;
  lineWidth: number;
  color: string;
}

export function rippleVisual(r: Ripple, now: number): RippleFrame | null {
  const t = (now - r.start) / r.duration;
  if (t < 0 || t >= 1) return null;
  return {
    radius: 2 + t * 10,
    alpha: 0.55 * (1 - t),
    lineWidth: 1 + 2 * (1 - t),
    color: RIPPLE_COLORS[r.tool],
  };
}

// Reduced motion: one faint non-expanding ring still confirms the tap.
export function staticRippleVisual(r: Ripple, now: number): RippleFrame | null {
  const t = (now - r.start) / r.duration;
  if (t < 0 || t >= 1) return null;
  return { radius: 6, alpha: 0.4, lineWidth: 1.5, color: RIPPLE_COLORS[r.tool] };
}

export interface ParticleFrame {
  x: number;
  y: number;
  alpha: number;
  size: number;
}

export function particleVisual(p: Particle, now: number): ParticleFrame | null {
  const t = (now - p.start) / p.duration;
  if (t < 0 || t >= 1) return null;
  // Decelerating drift: fast burst, gentle settle.
  const ease = 1 - (1 - t) * (1 - t);
  const travel = (p.duration / 1000) * ease;
  return {
    x: p.x + p.vx * travel,
    y: p.y + p.vy * travel,
    alpha: 0.9 * (1 - t),
    size: p.size,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/ui/juiceStore.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Typecheck and run the full suite**

Run: `npx tsc --noEmit && npx vitest run`
Expected: clean typecheck; 563 tests pass (556 existing + 7 new).

- [ ] **Step 6: Commit**

```bash
git add src/ui/juice.ts tests/ui/juiceStore.test.ts
git commit -m "$(cat <<'EOF'
feat: juice store core — ripples, bursts, caps, visual math

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Canvas wrapper + tap ripples wired into main.ts

**Files:**
- Modify: `src/ui/juice.ts` (append the wrapper)
- Modify: `src/main.ts` (instantiate; fire ripples in `pointerdown`; draw in `loop()`)
- Test: `tests/ui/juiceWiring.test.ts`

**Interfaces:**
- Consumes (from Task 1): `createJuiceStore`, `spawnRipple`, `spawnBurst`, `stepJuice`, `rippleVisual`, `staticRippleVisual`, `particleVisual`, `BurstKind`, `ShakeIntensity`.
- Produces (Tasks 3 relies on this):
  - `createJuice(canvas: HTMLCanvasElement, LX: number, LY: number): Juice`
  - `interface Juice { ripple(pos, tool): void; burst(pos, rgb, kind): void; shake(intensity): void; draw(): void; }`
  - In `main.ts`: a module-level `const juice = createJuice(canvas, LX, LY);`

- [ ] **Step 1: Write the failing wiring test**

The repo's convention for verifying DOM wiring is source-text assertion (see `tests/ui/epochBannerTiming.test.ts`). Create `tests/ui/juiceWiring.test.ts`:

```ts
// @ts-expect-error Vitest runs this test in Node; the app tsconfig does not ship Node types.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const mainSource = readFileSync('src/main.ts', 'utf8') as string;
const juiceSource = readFileSync('src/ui/juice.ts', 'utf8') as string;

describe('juice wiring', () => {
  it('fires a ripple on every successful tool application', () => {
    expect(mainSource).toContain("juice.ripple(pos, selectedTool)");
    expect(mainSource).toContain("juice.ripple(pos, 'paste')");
  });

  it('draws juice on top of the dish each frame', () => {
    expect(mainSource).toContain('juice.draw()');
  });

  it('honors reduced motion in the wrapper', () => {
    expect(juiceSource).toContain('prefers-reduced-motion');
    expect(juiceSource).toContain('staticRippleVisual');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/ui/juiceWiring.test.ts`
Expected: FAIL — `juice.ripple` not present in main.ts.

- [ ] **Step 3: Append the wrapper to `src/ui/juice.ts`**

```ts
export interface Juice {
  ripple(pos: [number, number], tool: ToolId): void;
  burst(pos: [number, number], rgb: [number, number, number], kind: BurstKind): void;
  shake(intensity: ShakeIntensity): void;
  draw(): void;
}

export function createJuice(canvas: HTMLCanvasElement, LX: number, LY: number): Juice {
  const store = createJuiceStore();
  const reduceMotion = typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  return {
    ripple(pos, tool) {
      spawnRipple(store, pos, tool, performance.now());
    },
    burst(pos, rgb, kind) {
      if (reduceMotion) return;
      spawnBurst(store, pos, rgb, kind, performance.now());
    },
    shake(intensity) {
      if (reduceMotion) return;
      const cls = intensity === 'hard' ? 'dish-shake' : 'dish-shake-soft';
      canvas.classList.remove('dish-shake', 'dish-shake-soft');
      void canvas.offsetWidth;
      canvas.classList.add(cls);
    },
    draw() {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const now = performance.now();
      stepJuice(store, now);
      const sx = canvas.width / LX;
      const sy = canvas.height / LY;
      const rs = (sx + sy) / 2;
      ctx.save();
      for (const r of store.ripples) {
        const v = reduceMotion ? staticRippleVisual(r, now) : rippleVisual(r, now);
        if (!v) continue;
        ctx.globalAlpha = v.alpha;
        ctx.strokeStyle = v.color;
        ctx.lineWidth = v.lineWidth;
        ctx.beginPath();
        ctx.arc(r.x * sx, r.y * sy, v.radius * rs, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.globalCompositeOperation = 'lighter';
      for (const p of store.particles) {
        const v = particleVisual(p, now);
        if (!v) continue;
        ctx.globalAlpha = v.alpha;
        ctx.fillStyle = `rgb(${p.rgb[0] | 0}, ${p.rgb[1] | 0}, ${p.rgb[2] | 0})`;
        ctx.beginPath();
        ctx.arc(v.x * sx, v.y * sy, v.size * rs * 0.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    },
  };
}
```

- [ ] **Step 4: Wire into `src/main.ts`**

4a. Add the import next to the other `./ui/` imports at the top:

```ts
import { createJuice } from './ui/juice';
```

4b. Instantiate directly after the `canvas.addEventListener('animationend', ...)` block (currently `src/main.ts:235-237`), and extend that listener to clear the soft-shake class Task 3 adds:

```ts
canvas.addEventListener('animationend', () => {
  canvas.classList.remove('dish-shake', 'dish-shake-soft');
});
const juice = createJuice(canvas, LX, LY);
```

(Replace the existing single-class `canvas.classList.remove('dish-shake');` body with the two-class version shown.)

4c. In the `pointerdown` handler's **paste** branch (currently `src/main.ts:257-262`), add a ripple inside the success block:

```ts
    if (arena.applyTool('paste', pos)) {
      uiAudio.play('drop_paste');
      juice.ripple(pos, 'paste');
      screens.updateToolCharges(arena.getToolStates());
      coach.report('paste-drawn');
      registerPlayerAction();
    }
```

4d. In the same handler's main branch (currently `src/main.ts:265-280`), add a ripple inside the success block, right after the sound line:

```ts
  if (arena.applyTool(selectedTool, pos, {
    eggArchetype: selectedEggArchetype,
    eggBreedId: selectedBreedId ?? undefined,
  })) {
    // Egg keeps the soft UI tap; reagents get their own bespoke drop sound.
    uiAudio.play(DROP_SOUND_FOR_TOOL[selectedTool] ?? 'ui_tap');
    juice.ripple(pos, selectedTool);
    ...
```

(Do NOT add a ripple to the `pointermove` paste path — the paste cursor glow already covers drag feedback, and per-move ripples would spam the cap.)

4e. In `loop()` (currently `src/main.ts:637-638`), draw juice after the tool effects so it sits on top:

```ts
  renderer.render(arena.state, arena.archetypes, arena.getDishEvents());
  renderToolEffects(arena);
  juice.draw();
```

- [ ] **Step 5: Run tests and typecheck**

Run: `npx vitest run tests/ui/juiceWiring.test.ts && npx tsc --noEmit`
Expected: wiring test PASS; typecheck clean.

Note: the wiring test's `main.ts` assertions pass now; the `juice.ripple(pos, 'paste')` assertion covers 4c.

- [ ] **Step 6: Run the full suite**

Run: `npx vitest run`
Expected: all tests pass (566: 563 + 3 new).

- [ ] **Step 7: Commit**

```bash
git add src/ui/juice.ts src/main.ts tests/ui/juiceWiring.test.ts
git commit -m "$(cat <<'EOF'
feat: tap ripples — juice canvas wrapper wired into dish input

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Birth/death/discovery bursts + dish shake on big events

**Files:**
- Modify: `src/main.ts` (cell tracker, dish-event diff, outbreak shake)
- Modify: `src/styles.css` (add `.dish-shake-soft` variant)
- Test: extend `tests/ui/juiceWiring.test.ts`

**Interfaces:**
- Consumes: `juice.burst(...)`, `juice.shake(...)` from Task 2; `lifeformIdentityForSpawn` from `src/content/lifeformIdentity.ts` (returns `{ colors: { primary: [r, g, b] } }` — already used this way by `src/ui/render.ts:314`); `arena.getDishEvents()` markers (`{ id, kind, pos }`, ids strictly increasing, kinds include `'discovery' | 'critical' | 'fold'`); cell `center: [number, number]` on `arena.state.cells` values.
- Produces: nothing new for later tasks.

- [ ] **Step 1: Extend the wiring test (failing first)**

Append to the `describe` block in `tests/ui/juiceWiring.test.ts`:

```ts
  it('bursts on births, deaths, and discoveries; shakes on critical events', () => {
    expect(mainSource).toContain("'birth'");
    expect(mainSource).toContain("'death'");
    expect(mainSource).toContain("juice.shake('hard')");
    expect(mainSource).toContain("juice.shake('soft')");
  });

  it('has a soft dish-shake variant with reduced amplitude', () => {
    const css = readFileSync('src/styles.css', 'utf8') as string;
    expect(css).toContain('.dish-shake-soft');
    expect(css).toContain('@keyframes dish-shake-soft');
  });
```

Run: `npx vitest run tests/ui/juiceWiring.test.ts` — expected: the two new tests FAIL.

- [ ] **Step 2: Add the cell/event tracker to `src/main.ts`**

2a. Add the import next to the other `./content/` imports:

```ts
import { lifeformIdentityForSpawn } from './content/lifeformIdentity';
```

2b. Add module-level state near the other loop-state variables (e.g. directly above `function createTickerState()`):

```ts
// Tracks per-cell life state and consumed dish-event ids so juice can fire
// birth/death/discovery feedback exactly once per event. Reset per arena.
interface CellFxTracker {
  known: Map<number, { vol: number; center: [number, number] }>;
  lastDishEventId: number;
  primed: boolean;
}

function createCellFxTracker(): CellFxTracker {
  return { known: new Map(), lastDishEventId: -1, primed: false };
}

let cellFxTracker: CellFxTracker = createCellFxTracker();

const FALLBACK_BURST_RGB: [number, number, number] = [140, 220, 255];

function burstColorFor(ar: Arena, id: number): [number, number, number] {
  const spawn = ar.archetypes.get(id);
  if (!spawn) return FALLBACK_BURST_RGB;
  const [r, g, b] = lifeformIdentityForSpawn(spawn).colors.primary;
  return [r, g, b];
}

function updateJuiceEvents(ar: Arena): void {
  // First frame of a dish: register everything silently so the initial
  // seeding doesn't read as a burst storm.
  if (!cellFxTracker.primed) {
    cellFxTracker.primed = true;
    for (const [id, cell] of ar.state.cells) {
      if (id === PLAYER_ID) continue;
      cellFxTracker.known.set(id, { vol: cell.vol, center: [cell.center[0], cell.center[1]] });
    }
    let maxSeen = cellFxTracker.lastDishEventId;
    for (const ev of ar.getDishEvents()) if (ev.id > maxSeen) maxSeen = ev.id;
    cellFxTracker.lastDishEventId = maxSeen;
    return;
  }

  // Births and deaths at their dish positions.
  for (const [id, cell] of ar.state.cells) {
    if (id === PLAYER_ID) continue;
    const prev = cellFxTracker.known.get(id);
    const alive = cell.vol > 0;
    if (!prev && alive) {
      juice.burst([cell.center[0], cell.center[1]], burstColorFor(ar, id), 'birth');
      cellFxTracker.known.set(id, { vol: cell.vol, center: [cell.center[0], cell.center[1]] });
    } else if (prev && prev.vol > 0 && !alive) {
      // Use the last live center — a dead cell's center is stale.
      juice.burst(prev.center, burstColorFor(ar, id), 'death');
      prev.vol = 0;
    } else if (prev && alive) {
      prev.vol = cell.vol;
      prev.center = [cell.center[0], cell.center[1]];
    }
  }

  // A cell removed from the map entirely also counts as a death.
  for (const [id, prev] of cellFxTracker.known) {
    if (prev.vol > 0 && !ar.state.cells.has(id)) {
      juice.burst(prev.center, FALLBACK_BURST_RGB, 'death');
      prev.vol = 0;
    }
  }

  // New dish events: discovery bursts, critical/fold hard shakes.
  let maxId = cellFxTracker.lastDishEventId;
  for (const ev of ar.getDishEvents()) {
    if (ev.id <= cellFxTracker.lastDishEventId) continue;
    if (ev.id > maxId) maxId = ev.id;
    if (ev.kind === 'discovery') {
      juice.burst(ev.pos, [126, 230, 255], 'discovery');
    } else if (ev.kind === 'critical' || ev.kind === 'fold') {
      juice.shake('hard');
    }
  }
  cellFxTracker.lastDishEventId = maxId;
}
```

Note: `PLAYER_ID` and the `Arena` type are already imported/used in `main.ts` — do not re-import.

2c. Call it from `loop()`, directly after the draw calls from Task 2:

```ts
  renderer.render(arena.state, arena.archetypes, arena.getDishEvents());
  renderToolEffects(arena);
  updateJuiceEvents(arena);
  juice.draw();
```

2d. Reset the tracker wherever a new arena is created. Search `src/main.ts` for where `tickerState` is reset (look for `createTickerState()` call sites — one is the initializer, one is in the arena-setup function that ends with `showPhase(); loop();`). Add alongside the per-arena reset:

```ts
  cellFxTracker = createCellFxTracker();
```

If `tickerState` is only initialized once at module level and never reset per-arena, add the `cellFxTracker` reset inside the arena-setup function (the one containing `coach.beginRun()` and ending with `showPhase(); loop();`), just before `loop();`.

- [ ] **Step 3: Add the outbreak soft shake**

In `updateTicker` (around `src/main.ts:1290`), the outbreak diff already exists:

```ts
  if (ecology.outbreaks > tickerState.lastOutbreakCount) {
    tickerState.lastOutbreakCount = ecology.outbreaks;
    screens.addTicker('Predator outbreak: hunter cells erupted from the dominant culture.', 'critical');
    juice.shake('soft');
  }
```

(Add only the `juice.shake('soft');` line.)

- [ ] **Step 4: Add the soft shake CSS variant**

In `src/styles.css`, directly after the existing `@keyframes dish-shake` block (starts at line ~692), add:

```css
.dish-shake-soft {
  animation: dish-shake-soft 480ms cubic-bezier(0.2, 0.9, 0.2, 1);
  transform-origin: center;
  will-change: transform;
}

@keyframes dish-shake-soft {
  0% { transform: translate(0, 0); }
  20% { transform: translate(-4px, 2px) rotate(-0.5deg); }
  45% { transform: translate(4px, -3px) rotate(0.6deg); }
  70% { transform: translate(-2px, 1px) rotate(-0.3deg); }
  100% { transform: translate(0, 0); }
}
```

- [ ] **Step 5: Run tests and typecheck**

Run: `npx vitest run tests/ui/juiceWiring.test.ts && npx tsc --noEmit`
Expected: all wiring tests PASS; typecheck clean.

- [ ] **Step 6: Run the full suite**

Run: `npx vitest run`
Expected: all pass (568).

- [ ] **Step 7: Commit**

```bash
git add src/main.ts src/styles.css tests/ui/juiceWiring.test.ts
git commit -m "$(cat <<'EOF'
feat: life/death/discovery bursts and dish shake on big events

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Living countdown clock

**Files:**
- Modify: `src/ui/screens.ts` (`updateHud`, ~line 522-527, plus one closure variable near `const hudProgress = get('hud-progress');` at line 149)
- Modify: `src/styles.css` (clock urgency colors, pulse keyframes, reduced-motion guard)
- Test: `tests/ui/deadlineClockCss.test.ts`

**Interfaces:**
- Consumes: `info.secondsRemaining: number` and `info.objectiveComplete: boolean`, both already on the `updateHud` info object.
- Produces: CSS classes `hud-deadline-warning`, `hud-deadline-critical`, `hud-deadline-tick` on the `#hud-progress` element.

Behavior spec: urgency only while the objective is incomplete. `secondsRemaining` 20→11 = warning (amber), ≤10 = critical (red). Each second change while ≤20 restarts a scale-pulse. Reduced motion: colors only, no pulse (pure CSS media query).

- [ ] **Step 1: Write the failing test**

Create `tests/ui/deadlineClockCss.test.ts`:

```ts
// @ts-expect-error Vitest runs this test in Node; the app tsconfig does not ship Node types.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync('src/styles.css', 'utf8') as string;
const screensSource = readFileSync('src/ui/screens.ts', 'utf8') as string;

describe('living deadline clock', () => {
  it('ramps the readout amber then red as time runs out', () => {
    expect(css).toContain('.hud-deadline-warning');
    expect(css).toContain('.hud-deadline-critical');
  });

  it('pulses on each second tick, disabled under reduced motion', () => {
    expect(css).toContain('@keyframes hud-deadline-tick');
    const reducedBlocks = css.match(/@media \(prefers-reduced-motion: reduce\)[\s\S]*?\n\}/g) ?? [];
    expect(reducedBlocks.some((b) => b.includes('hud-deadline-tick'))).toBe(true);
  });

  it('only signals urgency while the objective is incomplete', () => {
    expect(screensSource).toContain('hud-deadline-critical');
    expect(screensSource).toContain('!info.objectiveComplete');
  });
});
```

Run: `npx vitest run tests/ui/deadlineClockCss.test.ts` — expected: FAIL (classes don't exist yet).

- [ ] **Step 2: Update `src/ui/screens.ts`**

2a. Near `const hudProgress  = get('hud-progress');` (line 149), add:

```ts
  let lastDeadlineSeconds = -1;
```

2b. In `updateHud` (currently line ~522), replace the single line
`hudProgress.textContent = `${info.secondsRemaining}s`;` with:

```ts
      hudProgress.textContent = `${info.secondsRemaining}s`;
      const urgent = !info.objectiveComplete;
      hudProgress.classList.toggle(
        'hud-deadline-warning',
        urgent && info.secondsRemaining <= 20 && info.secondsRemaining > 10,
      );
      hudProgress.classList.toggle(
        'hud-deadline-critical',
        urgent && info.secondsRemaining <= 10,
      );
      if (urgent && info.secondsRemaining <= 20 && info.secondsRemaining !== lastDeadlineSeconds) {
        hudProgress.classList.remove('hud-deadline-tick');
        void hudProgress.offsetWidth;
        hudProgress.classList.add('hud-deadline-tick');
      }
      lastDeadlineSeconds = info.secondsRemaining;
```

- [ ] **Step 3: Add the CSS**

In `src/styles.css`, next to the other HUD rules (search `.hud-val`), add:

```css
#hud-progress {
  display: inline-block; /* transform (pulse) needs a box on this inline span */
}

#hud-progress.hud-deadline-warning {
  color: #f6d365;
}

#hud-progress.hud-deadline-critical {
  color: #ff6b4a;
}

#hud-progress.hud-deadline-tick {
  animation: hud-deadline-tick 420ms ease-out;
}

@keyframes hud-deadline-tick {
  0% { transform: scale(1.28); }
  100% { transform: scale(1); }
}

@media (prefers-reduced-motion: reduce) {
  #hud-progress.hud-deadline-tick { animation: none; }
}
```

- [ ] **Step 4: Run tests and typecheck**

Run: `npx vitest run tests/ui/deadlineClockCss.test.ts && npx tsc --noEmit`
Expected: PASS; clean typecheck.

- [ ] **Step 5: Run the full suite**

Run: `npx vitest run`
Expected: all pass (571).

- [ ] **Step 6: Commit**

```bash
git add src/ui/screens.ts src/styles.css tests/ui/deadlineClockCss.test.ts
git commit -m "$(cat <<'EOF'
feat: living deadline clock — per-second pulse and amber/red urgency ramp

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: Full verification + docs

**Files:**
- Modify: `docs/current-state.md` (one bullet under "Game feel")

- [ ] **Step 1: Full gate**

Run: `npx vitest run && npm run build`
Expected: all tests pass; `tsc --noEmit && vite build` clean.

- [ ] **Step 2: Manual smoke — desktop**

Start the dev server on the project's designated port (5173 is occupied by an unrelated project):

Run: `npm run dev -- --port 5199 --strictPort`

In a browser at `http://localhost:5199` (verify the page title is "Cellular Death Match"):
1. Enter the ecosystem, skip the tutorial.
2. Tap the dish with Egg selected → expect a cyan expanding ring at the tap point AND a small particle spray when the colony appears.
3. Select Nutrient, tap → gold ring.
4. Wait for a colony to die (or place many swarmlets to force competition) → dark dissolving puff at the dead colony's position.
5. Let the deadline run under 20s with the objective incomplete → readout turns amber, pulses each second; under 10s → red.
6. No console errors.

- [ ] **Step 3: Manual smoke — phone portrait**

Resize to 375×812 (or device emulation). Repeat taps; verify ripples land under the finger position (grid mapping) and the bottom tool bar still works. Verify the HUD clock classes render in the stacked mobile HUD.

- [ ] **Step 4: Update docs**

In `docs/current-state.md`, under the "Game feel" bullet (the one describing `src/ui/fx.ts`), extend with:

```markdown
- Juice layer: `src/ui/juice.ts` adds tap ripples (tool-tinted), particle bursts on colony birth/death and discovery, soft/hard dish shake on outbreaks and critical events, and a living deadline clock (amber/red ramp + per-second pulse). Pure presentation over existing state/events; capped particle pool; reduced-motion aware.
```

- [ ] **Step 5: Commit**

```bash
git add docs/current-state.md
git commit -m "$(cat <<'EOF'
docs: record juice layer in current-state

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
EOF
)"
```

---

## Deviations / Notes

- **Egg "pop"**: the design spec mentioned a pop overlay on egg placement. The egg hatch spawns a cell within a frame, so the Task 3 birth burst fires at the new colony automatically — the tap ripple + birth burst together deliver the pop without a separate overlay mechanism. No extra code.
- **Birth/death positions**: obtained by diffing `arena.state.cells` (read-only) rather than adding fields to arena payloads, so `arena.ts` stays untouched — stricter than the spec allowed.
- **`updateTicker` cadence**: outbreak shakes fire from the existing 45-tick ticker diff (~0.75s latency worst case). Acceptable for a shake; keeps a single diff site.
