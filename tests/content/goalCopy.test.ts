import { describe, expect, it } from 'vitest';
import { OBJECTIVES, type ObjectiveDef, type ObjectiveKind } from '../../src/content/objectives';
import { goalLineFor } from '../../src/content/goalCopy';
import { OBJECTIVE_POOL } from '../../src/game/objectivePool';

const RETIRED = /\b(breed|genome|specimen|lifeform|chimera|reagent|protocol|study|epoch|equilibrium|homeostasis)s?\b/i;

const EVERY_KIND: Record<ObjectiveKind, ObjectiveDef> = {
  discover_breed: { kind: 'discover_breed', name: '', description: '', target: '', breedId: 'needle_swarm' },
  stabilize_breed: { kind: 'stabilize_breed', name: '', description: '', target: '', breedId: 'bloom_mass' },
  understand_recipe: { kind: 'understand_recipe', name: '', description: '', target: '', recipeId: 'bitter_bloom' },
  apply_recipe: { kind: 'apply_recipe', name: '', description: '', target: '', recipeId: 'brine_channel', minCount: 3 },
  preserve_grazers: { kind: 'preserve_grazers', name: '', description: '', target: '', minCount: 3 },
  breed_archetype: { kind: 'breed_archetype', name: '', description: '', target: '', archetype: 'splitter', targetCount: 4 },
  controlled_reaction: { kind: 'controlled_reaction', name: '', description: '', target: '', targetCount: 2 },
  balanced_ecology: { kind: 'balanced_ecology', name: '', description: '', target: '', minCount: 3, maxDominance: 0.5 },
  dominant_archetype: { kind: 'dominant_archetype', name: '', description: '', target: '', archetype: 'boss' },
  cross_breed: { kind: 'cross_breed', name: '', description: '', target: '' },
  mega_culture: { kind: 'mega_culture', name: '', description: '', target: '', volumeTarget: 800 },
  reaction_chain: { kind: 'reaction_chain', name: '', description: '', target: '', targetCount: 3 },
  balance_keeper: { kind: 'balance_keeper', name: '', description: '', target: '', sustainTicks: 60 * 30 },
  crisis_survivor: { kind: 'crisis_survivor', name: '', description: '', target: '', minCount: 3 },
  protector: { kind: 'protector', name: '', description: '', target: '' },
  acid_sculptor: { kind: 'acid_sculptor', name: '', description: '', target: '' },
  colony_founder: { kind: 'colony_founder', name: '', description: '', target: '', targetCount: 5 },
  symbiosis: { kind: 'symbiosis', name: '', description: '', target: '', sustainTicks: 60 * 30 },
  extinction_reversal: { kind: 'extinction_reversal', name: '', description: '', target: '', targetCount: 4 },
};

describe('goalLineFor', () => {
  it('writes a short imperative goal for every objective kind', () => {
    for (const def of Object.values(EVERY_KIND)) {
      const line = goalLineFor(def);
      expect(line.length, def.kind).toBeGreaterThan(8);
      expect(line.length, `${def.kind}: ${line}`).toBeLessThanOrEqual(48);
      expect(line, `${def.kind}: ${line}`).not.toMatch(RETIRED);
      expect(line[0], def.kind).toBe(line[0]!.toUpperCase());
      expect(line.endsWith('.'), def.kind).toBe(false);
    }
  });

  it('names the concrete strain, reaction and numbers the objective asks for', () => {
    expect(goalLineFor(EVERY_KIND.stabilize_breed)).toContain('Bloom Mass');
    expect(goalLineFor(EVERY_KIND.understand_recipe)).toContain('Bitter Bloom');
    expect(goalLineFor(EVERY_KIND.breed_archetype)).toContain('4');
    expect(goalLineFor(EVERY_KIND.breed_archetype)).toContain('Splitter');
    expect(goalLineFor(EVERY_KIND.mega_culture)).toContain('800');
    expect(goalLineFor(EVERY_KIND.extinction_reversal)).toContain('4');
  });

  it('fits every authored trial and pooled objective', () => {
    for (const def of [...OBJECTIVES, ...OBJECTIVE_POOL]) {
      const line = goalLineFor(def);
      expect(line.length, `${def.name}: ${line}`).toBeLessThanOrEqual(48);
      expect(line, `${def.name}: ${line}`).not.toMatch(RETIRED);
    }
  });
});
