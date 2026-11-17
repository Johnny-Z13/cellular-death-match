import { describe, expect, it } from 'vitest';
import { OBJECTIVES, type ObjectiveDef, type ObjectiveKind } from '../../src/content/objectives';
import { balanceStatusLine, goalLineFor } from '../../src/content/goalCopy';
import { retiredWordsIn } from '../../src/content/glossary';
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
  hold_balance: { kind: 'hold_balance', name: '', description: '', target: '', sustainTicks: 60 * 120 },
  keep_alive: { kind: 'keep_alive', name: '', description: '', target: '', minCount: 5, sustainTicks: 60 * 180 },
  food_web: { kind: 'food_web', name: '', description: '', target: '', sustainTicks: 60 * 180 },
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

describe('authored goal lines', () => {
  it('uses an authored goal when the objective provides one', () => {
    expect(goalLineFor(OBJECTIVES[0]!)).toBe('Feed a Swarmlet until it becomes Bloom Mass');
  });
});

describe('balance status line', () => {
  const name = (strain: string) => (strain === 'splitter' ? 'Splitter' : strain);
  const lines = [
    balanceStatusLine({ kind: 'balanced' }, name),
    balanceStatusLine({ kind: 'too_few_alive', have: 1, need: 3 }, name),
    balanceStatusLine({ kind: 'too_small', have: 2, need: 3 }, name),
    balanceStatusLine({ kind: 'dominant', strain: 'splitter', share: 0.624 }, name),
    balanceStatusLine({ kind: 'dominant', strain: null, share: 0.7 }, name),
  ];

  it('says whether the clock is running and what to do when it is not', () => {
    expect(lines[0]).toMatch(/^In balance/);
    expect(lines[1]).toBe('Clock paused: 1 of 3 of your strains alive. Plant 2 more.');
    expect(lines[2]).toBe('Clock paused: a strain of yours is too small. Feed it.');
    expect(lines[3]).toBe('Clock paused: Splitter holds 62%. Thin it out.');
    expect(lines[4]).toMatch(/^Clock paused: One strain holds 70%/);
  });

  it('stays short enough for the two lines a tablet gives Dr. E', () => {
    const longestName = balanceStatusLine({ kind: 'dominant', strain: 'Static Lattice', share: 1 }, (strain) => strain);
    for (const line of [...lines, longestName]) expect(line.length, line).toBeLessThanOrEqual(57);
  });

  it('uses only the player-facing vocabulary', () => {
    for (const line of lines) expect(retiredWordsIn(line), line).toEqual([]);
  });
});

