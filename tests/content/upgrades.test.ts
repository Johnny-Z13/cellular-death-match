import { describe, it, expect } from 'vitest';
import { UPGRADES, applyUpgrades, type PlayerConfig } from '../../src/content/upgrades';

const BASE: PlayerConfig = {
  targetVol: 300,
  speed: 10,
  engulfMultiplier: 5,
  bulletSize: 3,
};

describe('UPGRADES catalogue', () => {
  it('contains exactly three stub upgrades', () => {
    expect(UPGRADES.length).toBe(3);
  });

  it('every upgrade has a unique id and a modifier block', () => {
    const ids = new Set(UPGRADES.map((u) => u.id));
    expect(ids.size).toBe(UPGRADES.length);
    for (const u of UPGRADES) {
      expect(u.modifiers).toBeDefined();
    }
  });
});

describe('applyUpgrades', () => {
  it('returns a copy of base when no refs are passed', () => {
    const result = applyUpgrades(BASE, []);
    expect(result).toEqual(BASE);
    expect(result).not.toBe(BASE);
  });

  it('applies +50 targetVol from "vol_1"', () => {
    const result = applyUpgrades(BASE, [{ id: 'vol_1', stacks: 1 }]);
    expect(result.targetVol).toBe(350);
    expect(result.speed).toBe(BASE.speed);
  });

  it('stacks multiply per ref.stacks', () => {
    const result = applyUpgrades(BASE, [{ id: 'vol_1', stacks: 3 }]);
    expect(result.targetVol).toBe(BASE.targetVol + 50 * 3);
  });

  it('applies +15% engulfMultiplier from "engulf_1"', () => {
    const result = applyUpgrades(BASE, [{ id: 'engulf_1', stacks: 1 }]);
    // 5 * 1.15 = 5.75
    expect(result.engulfMultiplier).toBeCloseTo(5.75, 5);
  });

  it('applies +25% bulletSize from "bullet_1"', () => {
    const result = applyUpgrades(BASE, [{ id: 'bullet_1', stacks: 1 }]);
    // 3 * 1.25 = 3.75
    expect(result.bulletSize).toBeCloseTo(3.75, 5);
  });

  it('multiple different upgrades compose correctly', () => {
    const result = applyUpgrades(BASE, [
      { id: 'vol_1', stacks: 1 },
      { id: 'engulf_1', stacks: 2 },
      { id: 'bullet_1', stacks: 1 },
    ]);
    expect(result.targetVol).toBe(350);
    // Additive percent stacking: 5 * (1 + 0.15 + 0.15) = 5 * 1.30 = 6.5.
    expect(result.engulfMultiplier).toBeCloseTo(6.5, 5);
    expect(result.bulletSize).toBeCloseTo(3.75, 5);
  });

  it('unknown upgrade ids are silently ignored', () => {
    const result = applyUpgrades(BASE, [{ id: 'does_not_exist', stacks: 99 }]);
    expect(result).toEqual(BASE);
  });
});
