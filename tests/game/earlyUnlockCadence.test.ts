import { describe, expect, it } from 'vitest';
import {
  applyCompletionResearchGrant,
  createDiscoveryProgression,
  updateDiscoveryProgression,
} from '../../src/game/discoveryProgression';
import { researchBriefForGrant } from '../../src/game/researchBrief';

describe('early unlock cadence', () => {
  it('keeps completed dishes rewarding visible unlocks after organic catalyst discoveries', () => {
    let progression = updateDiscoveryProgression(createDiscoveryProgression(), {
      breedIds: ['bloom_mass'],
      noteIds: ['breed_bloom_mass', 'recipe_incubator_shock'],
    });

    expect(progression.unlockedTools).toEqual(['egg', 'nutrient', 'toxin', 'water', 'salt', 'paste']);

    const first = applyCompletionResearchGrant(progression);
    expect(first?.grant.id).toBe('grant_salt_water_crystal');
    expect(first?.grant.rewardLabel).toBe('Acid reagent');
    progression = first!.progression;
    expect(progression.unlockedTools).toContain('acid');

    progression = updateDiscoveryProgression(progression, {
      noteIds: ['recipe_brine_flash'],
    });
    expect(progression.unlockedLifeforms).toContain('boss');

    const remainingRewardLabels: string[] = [];
    for (let i = 0; i < 3; i++) {
      const beforeTools = progression.unlockedTools.join('|');
      const beforeLifeforms = progression.unlockedLifeforms.join('|');
      const result = applyCompletionResearchGrant(progression);

      expect(result).not.toBeNull();
      expect(researchBriefForGrant(result!.grant)).toHaveLength(6);
      progression = result!.progression;
      remainingRewardLabels.push(result!.grant.rewardLabel);

      expect([
        progression.unlockedTools.join('|'),
        progression.unlockedLifeforms.join('|'),
      ]).not.toEqual([beforeTools, beforeLifeforms]);
    }

    expect(remainingRewardLabels).toEqual([
      'Sniper egg strain',
      'Mirror egg strain',
      'Glass Antibody rare culture',
    ]);
  });
});
