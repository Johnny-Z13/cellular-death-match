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
