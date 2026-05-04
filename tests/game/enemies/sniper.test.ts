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
