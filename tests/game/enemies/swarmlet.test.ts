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
