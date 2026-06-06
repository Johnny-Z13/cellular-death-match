import { describe, expect, it } from 'vitest';
import {
  ALL_PROGRESSION_LIFEFORMS,
  ALL_PROGRESSION_TOOLS,
  RESEARCH_GRANT_SEQUENCE,
  applyCompletionResearchGrant,
  clearDiscoveryProgression,
  createDiscoveryProgression,
  discoveryAnnouncementsForProgressionChange,
  nextResearchGrant,
  revealAllDiscoveryProgression,
  updateDiscoveryProgression,
} from '../../src/game/discoveryProgression';
import { EPOCHS_PER_RUN } from '../../src/game/run';

describe('discovery progression', () => {
  it('starts with the onboarding kit only', () => {
    const progression = createDiscoveryProgression();

    expect(progression.unlockedLifeforms).toEqual(['swarmlet', 'bruiser', 'splitter']);
    expect(progression.unlockedTools).toEqual(['egg', 'nutrient', 'toxin']);
    expect(progression.discoveredBreedIds).toEqual([]);
    expect(progression.discoveredNoteIds).toEqual([]);
  });

  it('unlocks Bloom Mass and Water when Bloom Mass is discovered', () => {
    const progression = updateDiscoveryProgression(createDiscoveryProgression(), {
      breedIds: ['bloom_mass'],
      noteIds: ['breed_bloom_mass'],
    });

    expect(progression.unlockedLifeforms).toContain('bloom_mass');
    expect(progression.unlockedTools).toContain('water');
  });

  it('reveals and clears all runtime unlocks without requiring persistence', () => {
    const revealed = revealAllDiscoveryProgression(createDiscoveryProgression());

    expect(revealed.revealAll).toBe(true);
    expect(revealed.unlockedTools).toEqual(ALL_PROGRESSION_TOOLS);
    expect(revealed.unlockedLifeforms).toEqual(ALL_PROGRESSION_LIFEFORMS);

    const cleared = clearDiscoveryProgression(revealed);
    expect(cleared.revealAll).toBe(false);
    expect(cleared.unlockedTools).toEqual(['egg', 'nutrient', 'toxin']);
    expect(cleared.unlockedLifeforms).toEqual(['swarmlet', 'bruiser', 'splitter']);
  });

  it('offers one new research grant per completed dish in the authored run', () => {
    let progression = updateDiscoveryProgression(createDiscoveryProgression(), {
      breedIds: ['bloom_mass'],
      noteIds: ['breed_bloom_mass'],
    });

    const first = nextResearchGrant(progression);
    expect(first?.id).toBe('grant_water_carries');
    progression = updateDiscoveryProgression(progression, first!.delta);
    expect(progression.unlockedTools).toContain('salt');

    const second = nextResearchGrant(progression);
    expect(second?.id).toBe('grant_salt_water_crystal');
    progression = updateDiscoveryProgression(progression, second!.delta);
    expect(progression.unlockedTools).toContain('acid');

    const third = nextResearchGrant(progression);
    expect(third?.id).toBe('grant_acid_toxin_flare');
    progression = updateDiscoveryProgression(progression, third!.delta);
    expect(progression.unlockedLifeforms).toContain('sniper');

    const fourth = nextResearchGrant(progression);
    expect(fourth?.id).toBe('grant_needle_swarm');
    progression = updateDiscoveryProgression(progression, fourth!.delta);
    expect(progression.unlockedLifeforms).toContain('mirror');

    const fifth = nextResearchGrant(progression);
    expect(fifth?.id).toBe('grant_folding_fault');
    progression = updateDiscoveryProgression(progression, fifth!.delta);
    expect(progression.unlockedLifeforms).toContain('boss');

    const sixth = nextResearchGrant(progression);
    expect(sixth?.id).toBe('grant_glass_antibody');
    progression = updateDiscoveryProgression(progression, sixth!.delta);
    expect(progression.unlockedLifeforms).toContain('glass_antibody');

    expect(nextResearchGrant(progression)).toBeNull();
  });

  it('applies one visible research grant for each authored petri dish after onboarding discovery', () => {
    let progression = updateDiscoveryProgression(createDiscoveryProgression(), {
      breedIds: ['bloom_mass'],
      noteIds: ['breed_bloom_mass'],
    });
    const grantIds: string[] = [];

    for (let completedDish = 0; completedDish < EPOCHS_PER_RUN; completedDish++) {
      const result = applyCompletionResearchGrant(progression);
      expect(result).not.toBeNull();
      grantIds.push(result!.grant.id);
      progression = result!.progression;
    }

    expect(grantIds).toEqual([
      'grant_water_carries',
      'grant_salt_water_crystal',
      'grant_acid_toxin_flare',
      'grant_needle_swarm',
      'grant_folding_fault',
      'grant_glass_antibody',
    ]);
    expect(progression.unlockedTools).toEqual(ALL_PROGRESSION_TOOLS);
    expect(progression.unlockedLifeforms).toEqual([
      'swarmlet',
      'bruiser',
      'splitter',
      'sniper',
      'mirror',
      'boss',
      'bloom_mass',
      'glass_antibody',
      'needle_swarm',
    ]);
    expect(progression.unlockedLifeforms).not.toEqual(ALL_PROGRESSION_LIFEFORMS);
    expect(applyCompletionResearchGrant(progression)).toBeNull();
  });

  it('skips grants the player already discovered organically', () => {
    const progression = updateDiscoveryProgression(createDiscoveryProgression(), {
      breedIds: ['bloom_mass'],
      noteIds: ['breed_bloom_mass', 'water_carries', 'recipe_salt_water_crystal'],
    });

    expect(nextResearchGrant(progression)?.id).toBe('grant_acid_toxin_flare');
  });

  it('skips completion grants whose reward was already unlocked by a different discovery', () => {
    const progression = updateDiscoveryProgression(createDiscoveryProgression(), {
      breedIds: ['bloom_mass'],
      noteIds: ['breed_bloom_mass', 'recipe_agitated_chain'],
    });

    expect(progression.unlockedTools).toContain('salt');
    expect(nextResearchGrant(progression)?.id).toBe('grant_salt_water_crystal');
  });

  it('does not offer a completion grant whose hinted experiment uses locked tools', () => {
    const progression = updateDiscoveryProgression(createDiscoveryProgression(), {
      noteIds: ['recipe_bitter_bloom'],
    });

    expect(progression.unlockedTools).toContain('salt');
    expect(progression.unlockedTools).not.toContain('water');
    expect(nextResearchGrant(progression)).toBeNull();
  });

  it('stops completion grants once organic discoveries have already unlocked every grant reward', () => {
    const progression = updateDiscoveryProgression(createDiscoveryProgression(), {
      breedIds: ['bloom_mass', 'needle_swarm', 'glass_antibody'],
      noteIds: [
        'breed_bloom_mass',
        'water_carries',
        'recipe_salt_water_crystal',
        'recipe_acid_toxin_flare',
        'breed_needle_swarm',
        'breed_glass_antibody',
        'recipe_crystal_toxin_prism',
      ],
    });

    expect(progression.unlockedTools).toEqual(ALL_PROGRESSION_TOOLS);
    expect(progression.unlockedLifeforms).toContain('boss');
    expect(nextResearchGrant(progression)).toBeNull();
  });

  it('labels every research grant with caution and a usable experiment hint', () => {
    let progression = updateDiscoveryProgression(createDiscoveryProgression(), {
      breedIds: ['bloom_mass'],
      noteIds: ['breed_bloom_mass'],
    });
    const grants = [];

    for (let i = 0; i < EPOCHS_PER_RUN; i++) {
      const result = applyCompletionResearchGrant(progression)!;
      grants.push(result.grant);
      progression = result.progression;
    }

    expect(grants.map((grant) => grant.caution)).toEqual([
      'stable',
      'volatile',
      'critical',
      'critical',
      'critical',
      'volatile',
    ]);
    expect(grants.every((grant) => grant.hint.startsWith('Try '))).toBe(true);
    expect(grants.find((grant) => grant.id === 'grant_acid_toxin_flare')?.message).toContain('HANDLE CAREFULLY');
  });

  it('requires explicit unlocked prerequisites for every experiment-style research hint', () => {
    for (const grant of RESEARCH_GRANT_SEQUENCE) {
      expect(grant.hint.startsWith('Try ')).toBe(true);
      expect((grant.requiredTools?.length ?? 0) + (grant.requiredLifeforms?.length ?? 0)).toBeGreaterThan(0);
    }
  });

  it('names the visible reward for each completed-dish research grant', () => {
    let progression = updateDiscoveryProgression(createDiscoveryProgression(), {
      breedIds: ['bloom_mass'],
      noteIds: ['breed_bloom_mass'],
    });
    const rewardLabels: string[] = [];

    for (let i = 0; i < EPOCHS_PER_RUN; i++) {
      const result = applyCompletionResearchGrant(progression)!;
      rewardLabels.push(result.grant.rewardLabel);
      progression = result.progression;
    }

    expect(rewardLabels).toEqual([
      'Salt reagent',
      'Acid reagent',
      'Sniper egg strain',
      'Mirror egg strain',
      'Boss egg strain',
      'Glass Antibody rare culture',
    ]);
  });

  it('maps grant caution to ticker tone', () => {
    const stable = nextResearchGrant(updateDiscoveryProgression(createDiscoveryProgression(), {
      breedIds: ['bloom_mass'],
      noteIds: ['breed_bloom_mass'],
    }))!;
    const critical = nextResearchGrant(updateDiscoveryProgression(createDiscoveryProgression(), {
      breedIds: ['bloom_mass'],
      noteIds: ['breed_bloom_mass', 'water_carries', 'recipe_salt_water_crystal'],
    }))!;

    expect(stable.tone).toBe('discovery');
    expect(critical.tone).toBe('critical');
  });

  it('unlocks Mirror eggs from mist lattice discharge discoveries', () => {
    const progression = updateDiscoveryProgression(createDiscoveryProgression(), {
      noteIds: ['recipe_mist_salt_discharge'],
    });

    expect(progression.unlockedLifeforms).toContain('mirror');
  });

  it('unlocks Mirror eggs from foam lightning discoveries', () => {
    const progression = updateDiscoveryProgression(createDiscoveryProgression(), {
      noteIds: ['recipe_foam_lightning'],
    });

    expect(progression.unlockedLifeforms).toContain('mirror');
  });

  it('unlocks Boss eggs from either folding fault or Rule-30 cascade notes', () => {
    const progression = updateDiscoveryProgression(createDiscoveryProgression(), {
      noteIds: ['recipe_foam_salt_rule30'],
    });

    expect(progression.unlockedLifeforms).toContain('boss');
  });

  it('unlocks Boss eggs from critical prism flare discoveries', () => {
    const progression = updateDiscoveryProgression(createDiscoveryProgression(), {
      noteIds: ['recipe_crystal_toxin_prism'],
    });

    expect(progression.unlockedLifeforms).toContain('boss');
  });

  it('unlocks Boss eggs from brine flash discoveries', () => {
    const progression = updateDiscoveryProgression(createDiscoveryProgression(), {
      noteIds: ['recipe_brine_flash'],
    });

    expect(progression.unlockedLifeforms).toContain('boss');
  });

  it('unlocks Salt from agitated chain discoveries', () => {
    const progression = updateDiscoveryProgression(createDiscoveryProgression(), {
      noteIds: ['recipe_agitated_chain'],
    });

    expect(progression.unlockedTools).toContain('salt');
  });

  it('unlocks Salt from bitter bloom discoveries', () => {
    const progression = updateDiscoveryProgression(createDiscoveryProgression(), {
      noteIds: ['recipe_bitter_bloom'],
    });

    expect(progression.unlockedTools).toContain('salt');
  });

  it('unlocks Salt from pressure bloom discoveries', () => {
    const progression = updateDiscoveryProgression(createDiscoveryProgression(), {
      noteIds: ['recipe_pressure_bloom'],
    });

    expect(progression.unlockedTools).toContain('salt');
  });

  it('unlocks Salt from incubator shock discoveries', () => {
    const progression = updateDiscoveryProgression(createDiscoveryProgression(), {
      noteIds: ['recipe_incubator_shock'],
    });

    expect(progression.unlockedTools).toContain('salt');
  });

  it('unlocks Salt from toxin mist discoveries', () => {
    const progression = updateDiscoveryProgression(createDiscoveryProgression(), {
      noteIds: ['recipe_toxin_water_mist'],
    });

    expect(progression.unlockedTools).toContain('salt');
  });

  it('formats organic discovery announcements before reward unlock messages', () => {
    const previous = createDiscoveryProgression();
    const next = updateDiscoveryProgression(previous, {
      noteIds: ['recipe_pressure_bloom'],
    });

    expect(discoveryAnnouncementsForProgressionChange(previous, next)).toEqual([
      {
        message: 'New catalyst discovered: Pressure Bloom.',
        tone: 'critical',
      },
    ]);
  });
});
