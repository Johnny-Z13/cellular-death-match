import { describe, it, expect } from 'vitest';
import { UPGRADES, UPGRADE_TOOLS, applyUpgrades, upgradeToolNote, type PlayerConfig } from '../../src/content/upgrades';

const BASE: PlayerConfig = {
  targetVol: 300,
  speed: 10,
  engulfMultiplier: 5,
  bulletSize: 3,
};

describe('UPGRADES catalogue', () => {
  it('contains a broader adaptation pool', () => {
    expect(UPGRADES.length).toBeGreaterThanOrEqual(6);
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

  it('applies +80 targetVol from "red_buffer_1"', () => {
    const result = applyUpgrades(BASE, [{ id: 'red_buffer_1', stacks: 1 }]);
    expect(result.targetVol).toBe(380);
    expect(result.speed).toBe(BASE.speed);
  });

  it('stacks multiply per ref.stacks', () => {
    const result = applyUpgrades(BASE, [{ id: 'egg_1', stacks: 3 }]);
    expect(result.eggCharges).toBe(6);
  });

  it('adds nutrient charges from "food_1"', () => {
    const result = applyUpgrades(BASE, [{ id: 'food_1', stacks: 1 }]);
    expect(result.nutrientCharges).toBe(1);
  });

  it('adds toxin charges from "toxin_1"', () => {
    const result = applyUpgrades(BASE, [{ id: 'toxin_1', stacks: 1 }]);
    expect(result.toxinCharges).toBe(1);
  });

  it('adds agitation charges from "centrifuge_1"', () => {
    const result = applyUpgrades(BASE, [{ id: 'centrifuge_1', stacks: 1 }]);
    expect(result.agitationCharges).toBe(1);
  });

  it('applies tool radius research', () => {
    const result = applyUpgrades({ ...BASE, nutrientRadius: 20, toxinRadius: 24 }, [
      { id: 'food_radius_1', stacks: 1 },
      { id: 'toxin_radius_1', stacks: 1 },
    ]);
    expect(result.nutrientRadius).toBeCloseTo(23.6, 5);
    expect(result.toxinRadius).toBeCloseTo(28.32, 5);
  });

  it('adds water, salt, and acid charges from reagent research', () => {
    const result = applyUpgrades(BASE, [
      { id: 'water_1', stacks: 1 },
      { id: 'salt_1', stacks: 1 },
      { id: 'acid_1', stacks: 1 },
    ]);
    expect(result.waterCharges).toBe(2);
    expect(result.saltCharges).toBe(2);
    expect(result.acidCharges).toBe(1);
  });

  it('applies radius research for volatile reagents', () => {
    const result = applyUpgrades({ ...BASE, waterRadius: 28, saltRadius: 18, acidRadius: 17 }, [
      { id: 'volatile_reagents_1', stacks: 1 },
    ]);
    expect(result.waterRadius).toBeCloseTo(31.36, 5);
    expect(result.saltRadius).toBeCloseTo(20.16, 5);
    expect(result.acidRadius).toBeCloseTo(19.04, 5);
  });

  it('stacks volatile reagent research additively', () => {
    const result = applyUpgrades({ ...BASE, acidRadius: 17 }, [
      { id: 'volatile_reagents_1', stacks: 2 },
    ]);
    expect(result.acidRadius).toBeCloseTo(21.08, 5);
  });

  it('multiple different upgrades compose correctly', () => {
    const result = applyUpgrades(BASE, [
      { id: 'red_buffer_1', stacks: 1 },
      { id: 'egg_1', stacks: 1 },
      { id: 'food_1', stacks: 1 },
    ]);
    expect(result.targetVol).toBe(380);
    expect(result.eggCharges).toBe(2);
    expect(result.nutrientCharges).toBe(1);
  });

  it('unknown upgrade ids are silently ignored', () => {
    const result = applyUpgrades(BASE, [{ id: 'does_not_exist', stacks: 99 }]);
    expect(result).toEqual(BASE);
  });
});

describe('upgrade tool notes', () => {
  it('names the tool an upgrade needs when it is not in the rack yet', () => {
    expect(upgradeToolNote('toxin_radius_1', ['egg', 'nutrient'])).toBe('For Toxin · not in your rack yet');
    expect(upgradeToolNote('volatile_reagents_1', ['egg', 'nutrient', 'toxin'])).toBe('For Water, Salt and Acid · not in your rack yet');
  });

  it('stays quiet when the tool is already available or the upgrade needs none', () => {
    expect(upgradeToolNote('toxin_radius_1', ['egg', 'nutrient', 'toxin'])).toBeNull();
    expect(upgradeToolNote('volatile_reagents_1', ['water'])).toBeNull();
    expect(upgradeToolNote('red_buffer_1', [])).toBeNull();
    expect(upgradeToolNote('unknown_upgrade', [])).toBeNull();
  });

  it('maps every upgrade in the catalogue', () => {
    for (const upgrade of UPGRADES) expect(UPGRADE_TOOLS[upgrade.id], upgrade.id).toBeDefined();
  });
});
