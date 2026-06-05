import { describe, expect, it } from 'vitest';
import {
  BREED_DEFS,
  DISCOVERY_NOTES,
  REACTION_RECIPES,
  reactionRecipeFor,
  type BreedId,
} from '../../src/content/catalysis';

describe('catalysis content', () => {
  it('defines the initial hidden breed set', () => {
    expect(Object.keys(BREED_DEFS).sort()).toEqual([
      'bloom_mass',
      'folded_anchor',
      'glass_antibody',
      'needle_swarm',
      'static_lattice',
    ]);
  });

  it('keeps hidden breed definitions mechanically complete', () => {
    for (const def of Object.values(BREED_DEFS)) {
      expect(def.name.length).toBeGreaterThan(4);
      expect(def.baseArchetype).toBeTruthy();
      expect(def.traits.length).toBeGreaterThanOrEqual(1);
      expect(def.targetVolMultiplier).toBeGreaterThan(0);
      expect(def.speedMultiplier).toBeGreaterThan(0);
      expect(def.engulfMultiplier).toBeGreaterThan(0);
      expect(def.instabilityMultiplier).toBeGreaterThan(0);
      expect(def.tint.length).toBe(3);
      expect(def.discoveryTrigger.length).toBeGreaterThan(4);
    }
  });

  it('defines reaction recipes with caution and effect type', () => {
    for (const recipe of REACTION_RECIPES) {
      expect(recipe.id.length).toBeGreaterThan(4);
      expect(recipe.inputs.length).toBeGreaterThanOrEqual(2);
      expect(['stable', 'volatile', 'critical']).toContain(recipe.caution);
      expect(recipe.effect.type).toBeTruthy();
      expect(recipe.effect.radiusBonus).toBeGreaterThanOrEqual(0);
      expect(recipe.effect.ttl).toBeGreaterThan(0);
      expect(recipe.discoveryNoteId.length).toBeGreaterThan(4);
    }
  });

  it('finds recipes without depending on input order', () => {
    const a = reactionRecipeFor(['water', 'nutrient'], {
      traits: ['budding'],
      archetypes: ['swarmlet'],
    });
    const b = reactionRecipeFor(['nutrient', 'water'], {
      traits: ['budding'],
      archetypes: ['swarmlet'],
    });

    expect(a?.id).toBe('nutrient_conduit');
    expect(b?.id).toBe('nutrient_conduit');
  });

  it('requires agitation for the agitated chain recipe', () => {
    const calm = reactionRecipeFor(['water', 'nutrient', 'bloom'], {
      traits: ['budding'],
      archetypes: ['splitter'],
    });
    const agitated = reactionRecipeFor(['water', 'nutrient', 'bloom'], {
      traits: ['budding'],
      archetypes: ['splitter'],
      agitated: true,
    });

    expect(calm?.id).not.toBe('agitated_chain');
    expect(agitated?.id).toBe('agitated_chain');
  });

  it('maps every breed to a discovery note', () => {
    for (const id of Object.keys(BREED_DEFS) as BreedId[]) {
      expect(DISCOVERY_NOTES[`breed_${id}`]).toBeDefined();
    }
  });
});
