import { describe, it, expect } from 'vitest';
import { UPGRADES, UPGRADE_TOOLS, applyUpgrades, upgradeEffects, upgradeToolNote, type PlayerConfig } from '../../src/content/upgrades';
import { AGITATION_TUNING, TOOL_TUNING } from '../../src/content/ecologyTuning';

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
    expect(result.eggCharges).toBe(TOOL_TUNING.egg.charges + 6);
  });

  it('adds nutrient charges from "food_1"', () => {
    const result = applyUpgrades(BASE, [{ id: 'food_1', stacks: 1 }]);
    expect(result.nutrientCharges).toBe(TOOL_TUNING.nutrient.charges + 1);
  });

  it('adds toxin charges from "toxin_1"', () => {
    const result = applyUpgrades(BASE, [{ id: 'toxin_1', stacks: 1 }]);
    expect(result.toxinCharges).toBe(TOOL_TUNING.toxin.charges + 1);
  });

  it('adds agitation charges from "centrifuge_1" on top of the default', () => {
    const result = applyUpgrades(BASE, [{ id: 'centrifuge_1', stacks: 1 }]);
    expect(result.agitationCharges).toBe(AGITATION_TUNING.defaultCharges + 1);
  });

  it('applies tool radius research', () => {
    const result = applyUpgrades({ ...BASE, nutrientRadius: 20, toxinRadius: 24 }, [
      { id: 'food_radius_1', stacks: 1 },
      { id: 'toxin_radius_1', stacks: 1 },
    ]);
    expect(result.nutrientRadius).toBeCloseTo(23.6, 5);
    expect(result.toxinRadius).toBeCloseTo(28.32, 5);
  });

  // A base config that names no charges for a tool means the tool's default
  // stock (TOOL_TUNING), so "+2 water" must land on top of that, never on 0.
  it('adds water, salt, and acid charges on top of each tool default', () => {
    const result = applyUpgrades(BASE, [
      { id: 'water_1', stacks: 1 },
      { id: 'salt_1', stacks: 1 },
      { id: 'acid_1', stacks: 1 },
    ]);
    expect(result.waterCharges).toBe(TOOL_TUNING.water.charges + 2);
    expect(result.saltCharges).toBe(TOOL_TUNING.salt.charges + 2);
    expect(result.acidCharges).toBe(TOOL_TUNING.acid.charges + 1);
  });

  it('never leaves a tool with fewer charges than it has without the upgrade', () => {
    const defaults: Record<string, number> = {
      eggCharges: TOOL_TUNING.egg.charges,
      nutrientCharges: TOOL_TUNING.nutrient.charges,
      toxinCharges: TOOL_TUNING.toxin.charges,
      waterCharges: TOOL_TUNING.water.charges,
      saltCharges: TOOL_TUNING.salt.charges,
      acidCharges: TOOL_TUNING.acid.charges,
      agitationCharges: AGITATION_TUNING.defaultCharges,
    };
    for (const upgrade of UPGRADES) {
      const result = applyUpgrades(BASE, [{ id: upgrade.id, stacks: 1 }]) as unknown as Record<string, number | undefined>;
      for (const [key, stock] of Object.entries(defaults)) {
        expect(result[key] ?? stock, `${upgrade.id} → ${key}`).toBeGreaterThanOrEqual(stock);
      }
    }
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
    expect(result.eggCharges).toBe(TOOL_TUNING.egg.charges + 2);
    expect(result.nutrientCharges).toBe(TOOL_TUNING.nutrient.charges + 1);
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
    // A tool that comes with the next trial is a head start, said so.
    expect(upgradeToolNote('toxin_radius_1', ['egg', 'nutrient'], ['toxin'])).toBe('For Toxin · arrives next trial');
    expect(upgradeToolNote('toxin_radius_1', ['egg', 'nutrient', 'toxin'], ['water'])).toBeNull();
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

describe('upgrade effects (what the pick card shows)', () => {
  const effectsOf = (id: string, owned: Array<{ id: string; stacks: number }> = []) => upgradeEffects(
    id,
    applyUpgrades(BASE, owned),
    applyUpgrades(BASE, [...owned, { id, stacks: 1 }]),
  );

  it('reads a charge upgrade as the stock before and after', () => {
    expect(effectsOf('water_1')).toEqual([
      { tool: 'water', stat: 'charges', from: TOOL_TUNING.water.charges, to: TOOL_TUNING.water.charges + 2 },
    ]);
    expect(effectsOf('centrifuge_1')).toEqual([
      { tool: 'agitate', stat: 'charges', from: AGITATION_TUNING.defaultCharges, to: AGITATION_TUNING.defaultCharges + 1 },
    ]);
  });

  it('reads a spread upgrade as reach, one entry per tool it widens', () => {
    const [toxin] = effectsOf('toxin_radius_1');
    expect(toxin).toMatchObject({ tool: 'toxin', stat: 'reach', from: TOOL_TUNING.toxin.radius });
    expect(toxin!.to / toxin!.from).toBeCloseTo(1.18, 5);
    expect(effectsOf('volatile_reagents_1').map((effect) => `${effect.tool}:${effect.stat}`))
      .toEqual(['water:reach', 'salt:reach', 'acid:reach']);
  });

  it('starts from what the player already holds', () => {
    expect(effectsOf('egg_1', [{ id: 'egg_1', stacks: 1 }])[0]).toMatchObject({
      from: TOOL_TUNING.egg.charges + 2,
      to: TOOL_TUNING.egg.charges + 4,
    });
  });

  it('shows nothing for an upgrade that improves no rack tool', () => {
    expect(effectsOf('red_buffer_1')).toEqual([]);
  });

  it('gives every tool upgrade in the catalogue a picture', () => {
    for (const upgrade of UPGRADES) {
      if ((UPGRADE_TOOLS[upgrade.id] ?? []).length === 0) continue;
      const effects = effectsOf(upgrade.id);
      expect(effects.length, upgrade.id).toBeGreaterThan(0);
      for (const effect of effects) expect(effect.to, upgrade.id).toBeGreaterThan(effect.from);
    }
  });
});

