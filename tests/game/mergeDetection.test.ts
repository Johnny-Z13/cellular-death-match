import { describe, expect, it } from 'vitest';
import { FORMS } from '../../src/content/forms';
import { createMergeTracker, formShape, isBlinking, isGliding, MERGE_DETECTION } from '../../src/game/mergeDetection';
import { createGrid, recomputeBoundary, setCell } from '../../src/sim/grid';
import { addPixel, createCell } from '../../src/sim/cell';
import { createRng } from '../../src/sim/rng';
import type { CellId, SimState } from '../../src/sim/types';

// A dish drawn as rows of characters: each digit is a culture id, '.' is agar.
function dish(rows: string[]): SimState {
  const LY = rows.length;
  const LX = rows[0]!.length;
  const grid = createGrid(LX, LY, false);
  const cells = new Map<number, ReturnType<typeof createCell>>();
  rows.forEach((row, y) => [...row].forEach((ch, x) => {
    if (ch === '.') return;
    const id = Number(ch);
    if (!cells.has(id)) cells.set(id, createCell(id, 20));
    setCell(grid, x, y, id);
    addPixel(cells.get(id)!, x, y, LX, LY);
  }));
  recomputeBoundary(grid);
  return {
    grid, cells, bullets: [], betaIsing: 1, betaVol: 1, betaMov: 1, events: [], rng: createRng(1),
    wrapBullets: false, engulfGain: 0.5, engulfDrain: 0.6, bulletDrain: 1,
  };
}

const PAIR = [
  '............',
  '..1111222...',
  '..1111222...',
  '..1111222...',
  '............',
];
const strains: Record<number, string> = { 1: 'bloom_mass', 2: 'swarmlet', 3: 'bruiser' };
const strainOf = (id: CellId) => strains[id] ?? null;
const scansToLock = (MERGE_DETECTION.lockSeconds * MERGE_DETECTION.ticksPerSecond) / MERGE_DETECTION.scanTicks;

describe('merge detection', () => {
  it('gives every form its own arrangement, so a chain is not a triangle', () => {
    const shapes = FORMS.map(formShape);
    expect(new Set(shapes).size).toBe(FORMS.length);
    expect(formShape({ strains: ['swarmlet', 'swarmlet', 'swarmlet'], touching: [[0, 1], [1, 2]] }))
      .not.toBe(formShape({ strains: ['swarmlet', 'swarmlet', 'swarmlet'], touching: [[0, 1], [0, 2], [1, 2]] }));
  });

  it('locks an isolated pair fed together once it holds for the lock window', () => {
    const state = dish(PAIR);
    const tracker = createMergeTracker();
    let events: ReturnType<typeof tracker.scan> = [];
    for (let i = 0; i < scansToLock - 1; i++) events.push(...tracker.scan(state, strainOf, () => true));
    expect(events).toEqual([]);
    expect(tracker.forming()[0]?.form.id).toBe('bloom_buddy');
    expect(tracker.forming()[0]!.progress).toBeGreaterThan(0.9);
    events = tracker.scan(state, strainOf, () => true);
    expect(events.map((e) => [e.kind, e.form.id])).toEqual([['locked', 'bloom_buddy']]);
    expect(tracker.bonds.partners(1)?.get(2)).toBe(1);
    expect(tracker.forming()).toEqual([]);
  });

  it('starts sticking while it forms, and lets go when it stops qualifying', () => {
    const state = dish(PAIR);
    const tracker = createMergeTracker();
    for (let i = 0; i < 6; i++) tracker.scan(state, strainOf, () => true);
    expect(tracker.bonds.partners(1)?.get(2)).toBeGreaterThan(0);
    tracker.scan(state, strainOf, () => false);
    expect(tracker.bonds.partners(1)).toBeUndefined();
    expect(tracker.forming()).toEqual([]);
  });

  it('never locks a group that is unfed or touches a third culture', () => {
    const tracker = createMergeTracker();
    const crowded = dish([
      '............',
      '..1111222333',
      '..1111222333',
      '..1111222333',
      '............',
    ]);
    for (let i = 0; i < scansToLock * 2; i++) {
      expect(tracker.scan(dish(PAIR), strainOf, () => false)).toEqual([]);
      expect(tracker.scan(crowded, strainOf, () => true).filter((e) => e.kind === 'locked')).toEqual([]);
    }
  });

  it('breaks a locked form whose cultures stay apart past the grace period', () => {
    const tracker = createMergeTracker();
    for (let i = 0; i < scansToLock; i++) tracker.scan(dish(PAIR), strainOf, () => true);
    expect(tracker.locked()).toHaveLength(1);
    const apart = dish([
      '............',
      '.111.....222',
      '.111.....222',
      '.111.....222',
      '............',
    ]);
    const graceScans = Math.ceil(MERGE_DETECTION.breakGraceTicks / MERGE_DETECTION.scanTicks);
    const events = [];
    for (let i = 0; i <= graceScans; i++) events.push(...tracker.scan(apart, strainOf, () => true));
    expect(events.map((e) => e.kind)).toEqual(['broke']);
    expect(tracker.locked()).toEqual([]);
    expect(tracker.bonds.partners(1)).toBeUndefined();
  });
});

describe('very rare behaviours', () => {
  const path = (points: Array<[number, number]>, vol = 100) => points.map(([x, y]) => ({ x, y, vol }));
  it('calls a long, straight journey a glide, and a wander not', () => {
    const straight = path(Array.from({ length: 20 }, (_, i) => [i * 2.5, i * 0.3]));
    const wander = path(Array.from({ length: 20 }, (_, i) => [Math.sin(i) * 30, Math.cos(i) * 30]));
    expect(isGliding(straight)).toBe(true);
    expect(isGliding(wander)).toBe(false);
    expect(isGliding(path([[0, 0], [10, 0], [20, 0]]))).toBe(false);
  });

  it('calls a steady pulse a blink, and a slow drift not', () => {
    const pulse = Array.from({ length: 30 }, (_, i) => ({ x: 0, y: 0, vol: 100 + (i % 4 < 2 ? 15 : -15) }));
    const drift = Array.from({ length: 30 }, (_, i) => ({ x: 0, y: 0, vol: 100 + i }));
    const shiver = Array.from({ length: 30 }, (_, i) => ({ x: 0, y: 0, vol: 100 + (i % 2 ? 2 : -2) }));
    expect(isBlinking(pulse)).toBe(true);
    expect(isBlinking(drift)).toBe(false);
    expect(isBlinking(shiver)).toBe(false);
  });
});

describe('group very rares', () => {
  const many: Record<number, string> = { 1: 'bloom_mass', 2: 'swarmlet', 3: 'bruiser', 4: 'splitter', 5: 'swarmlet', 6: 'swarmlet' };
  const strainOfMany = (id: CellId) => many[id] ?? null;

  it('locks four different strains together, fed, as the Rainbow', () => {
    const block = dish([
      '..........',
      '..11112222',
      '..11112222',
      '..11112222',
      '..11112222',
      '..33334444',
      '..33334444',
      '..33334444',
      '..33334444',
      '..........',
    ]);
    const tracker = createMergeTracker();
    const events = [];
    for (let i = 0; i < scansToLock; i++) events.push(...tracker.scan(block, strainOfMany, () => true));
    expect(events.map((e) => [e.kind, e.form.id])).toEqual([['locked', 'rainbow']]);
  });

  it('bonds two locked forms pressed together and fed into a Compound', () => {
    const tracker = createMergeTracker();
    const apart = dish([
      '.1111222.........',
      '.1111222...555666',
      '.1111222...555666',
      '...........555666',
    ]);
    for (let i = 0; i < scansToLock; i++) tracker.scan(apart, strainOfMany, () => true);
    expect(tracker.locked().map((f) => f.form.id).sort()).toEqual(['bloom_buddy', 'puddle_pals']);
    const together = dish([
      '.1111222.........',
      '.1111222555666...',
      '.1111222555666...',
      '........555666...',
    ]);
    const events = tracker.scan(together, strainOfMany, () => true);
    expect(events.filter((e) => e.kind === 'very-rare').map((e) => e.veryRare)).toEqual(['compound']);
    expect(tracker.scan(together, strainOfMany, () => true).filter((e) => e.kind === 'very-rare')).toEqual([]);
  });
});

describe('locked form motion', () => {
  it('steers a locked form as one without ever speeding it up', () => {
    const state = dish(PAIR);
    const tracker = createMergeTracker();
    for (let i = 0; i < scansToLock; i++) tracker.scan(state, strainOf, () => true);
    expect(tracker.locked()).toHaveLength(1);
    state.cells.get(1)!.intent = { vec: [1, 0], speed: 2, engulfMultiplier: 1, shooting: false };
    state.cells.get(2)!.intent = { vec: [0, 1], speed: 2, engulfMultiplier: 1, shooting: false };
    for (let i = 0; i < 100; i++) tracker.steer(state);
    for (const id of [1, 2]) expect(state.cells.get(id)!.intent.speed).toBeLessThanOrEqual(2);
  });
});
