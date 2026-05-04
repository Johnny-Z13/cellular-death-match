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
