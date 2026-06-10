import { describe, expect, it } from 'vitest';
import {
  BREED_DEFS,
  DISCOVERY_NOTES,
  REACTION_RECIPES,
  reactionRecipeFor,
  type BreedId,
} from '../../src/content/catalysis';

describe('catalysis content', () => {
  it('defines the base hidden breed set discovered straight from reagents', () => {
    const baseBreeds = Object.values(BREED_DEFS)
      .filter((def) => !def.parents)
      .map((def) => def.id)
      .sort();
    expect(baseBreeds).toEqual([
      'bloom_mass',
      'folded_anchor',
      'glass_antibody',
      'needle_swarm',
      'static_lattice',
    ]);
  });

  it('defines hybrid breeds bred from two discovered parents', () => {
    const hybrids = Object.values(BREED_DEFS).filter((def) => def.parents);
    expect(hybrids.map((def) => def.id).sort()).toEqual([
      'mire_lattice',
      'quill_bloom',
      'vitric_anchor',
    ]);
    for (const hybrid of hybrids) {
      const [a, b] = hybrid.parents!;
      // Parents must be distinct, real, and non-hybrid base breeds.
      expect(a).not.toBe(b);
      expect(BREED_DEFS[a]).toBeDefined();
      expect(BREED_DEFS[b]).toBeDefined();
      expect(BREED_DEFS[a].parents).toBeUndefined();
      expect(BREED_DEFS[b].parents).toBeUndefined();
    }
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

  it('hints that Static Lattice can be discovered from Foam Lightning patterning', () => {
    expect(BREED_DEFS.static_lattice.discoveryTrigger).toContain('Foam Lightning');
  });

  it('hints that Folded Anchor can be discovered from Rule-30 cascade folding', () => {
    expect(BREED_DEFS.folded_anchor.discoveryTrigger).toContain('Rule-30 Cascade');
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

  it('discovers foam inversion when water destabilizes acid near soft tissue', () => {
    const recipe = reactionRecipeFor(['water', 'acid'], {
      traits: ['gelatinous'],
      archetypes: ['bruiser'],
    });

    expect(recipe?.id).toBe('acid_water_foam');
    expect(recipe?.caution).toBe('volatile');
    expect(recipe?.effect.type).toBe('foam');
    expect(DISCOVERY_NOTES.recipe_acid_water_foam?.title).toBe('Foam Inversion');
  });

  it('discovers a rule cascade when salt crystallizes unstable foam', () => {
    const recipe = reactionRecipeFor(['foam', 'salt'], {
      traits: ['gelatinous'],
      archetypes: ['bruiser'],
    });

    expect(recipe?.id).toBe('foam_salt_rule30');
    expect(recipe?.caution).toBe('critical');
    expect(recipe?.effect.type).toBe('fold_fault');
    expect(DISCOVERY_NOTES.recipe_foam_salt_rule30?.title).toBe('Rule-30 Cascade');
  });

  it('discovers a mist lattice discharge when salt hits toxin mist around starter cultures', () => {
    const recipe = reactionRecipeFor(['foam', 'salt'], {
      traits: [],
      archetypes: ['swarmlet'],
    });

    expect(recipe?.id).toBe('mist_salt_discharge');
    expect(recipe?.caution).toBe('critical');
    expect(recipe?.effect.type).toBe('flare');
    expect(DISCOVERY_NOTES.recipe_mist_salt_discharge?.title).toBe('Mist Lattice Discharge');
  });

  it('discovers a prism flare when toxin fractures a crystal field', () => {
    const recipe = reactionRecipeFor(['toxin', 'crystal'], {
      traits: ['gelatinous'],
      archetypes: ['mirror'],
    });

    expect(recipe?.id).toBe('crystal_toxin_prism');
    expect(recipe?.caution).toBe('critical');
    expect(recipe?.effect.type).toBe('flare');
    expect(DISCOVERY_NOTES.recipe_crystal_toxin_prism?.title).toBe('Prism Flare');
  });

  it('prioritizes toxin prism over salt traps when toxin hits a crystal field', () => {
    const recipe = reactionRecipeFor(['crystal', 'toxin', 'salt', 'water'], {
      traits: ['gelatinous'],
      archetypes: ['mirror'],
    }, 'toxin');

    expect(recipe?.id).toBe('crystal_toxin_prism');
    expect(recipe?.effect.type).toBe('flare');
  });

  it('discovers a brine flash when acid hits salty pressure near soft tissue', () => {
    const recipe = reactionRecipeFor(['acid', 'brine', 'water', 'salt'], {
      traits: ['gelatinous'],
      archetypes: ['bruiser'],
    });

    expect(recipe?.id).toBe('brine_flash');
    expect(recipe?.caution).toBe('critical');
    expect(recipe?.effect.type).toBe('flare');
    expect(DISCOVERY_NOTES.recipe_brine_flash?.title).toBe('Brine Flash');
  });

  it('discovers a bitter bloom when toxin spoils an overfed budding culture', () => {
    const recipe = reactionRecipeFor(['toxin', 'nutrient'], {
      traits: ['budding'],
      archetypes: ['splitter'],
    });

    expect(recipe?.id).toBe('bitter_bloom');
    expect(recipe?.caution).toBe('volatile');
    expect(recipe?.effect.type).toBe('lysis');
    expect(DISCOVERY_NOTES.recipe_bitter_bloom?.title).toBe('Bitter Bloom');
  });

  it('discovers pressure bloom when toxin hits fed resistant starter cultures', () => {
    const recipe = reactionRecipeFor(['toxin', 'nutrient'], {
      traits: ['toxin_resistant'],
      archetypes: ['swarmlet'],
    });

    expect(recipe?.id).toBe('pressure_bloom');
    expect(recipe?.caution).toBe('critical');
    expect(recipe?.effect.type).toBe('flare');
    expect(DISCOVERY_NOTES.recipe_pressure_bloom?.title).toBe('Pressure Bloom');
  });

  it('discovers incubator shock when an egg hatches inside nutrient and toxin pressure', () => {
    const recipe = reactionRecipeFor(['hatch', 'nutrient', 'toxin'], {
      traits: ['budding', 'toxin_resistant'],
      archetypes: ['swarmlet'],
    });

    expect(recipe?.id).toBe('incubator_shock');
    expect(recipe?.caution).toBe('critical');
    expect(recipe?.effect.type).toBe('flare');
    expect(DISCOVERY_NOTES.recipe_incubator_shock?.title).toBe('Incubator Shock');
  });

  it('discovers toxin mist when water dilutes toxin around quick starter cultures', () => {
    const recipe = reactionRecipeFor(['water', 'toxin'], {
      traits: [],
      archetypes: ['swarmlet'],
    });

    expect(recipe?.id).toBe('toxin_water_mist');
    expect(recipe?.caution).toBe('volatile');
    expect(recipe?.effect.type).toBe('foam');
    expect(DISCOVERY_NOTES.recipe_toxin_water_mist?.title).toBe('Toxin Mist');
  });

  it('discovers foam lightning when water re-enters unstable foam around quick cultures', () => {
    const recipe = reactionRecipeFor(['water', 'foam'], {
      traits: ['budding'],
      archetypes: ['swarmlet'],
    });

    expect(recipe?.id).toBe('foam_lightning');
    expect(recipe?.caution).toBe('critical');
    expect(recipe?.effect.type).toBe('flare');
    expect(DISCOVERY_NOTES.recipe_foam_lightning?.title).toBe('Foam Lightning');
  });

  it('discovers chromatic spill when acid, water, and nutrient hit fragile growth', () => {
    const recipe = reactionRecipeFor(['acid', 'water', 'nutrient'], {
      traits: ['fragile'],
      archetypes: ['splitter'],
    });

    expect(recipe?.id).toBe('chromatic_spill');
    expect(recipe?.caution).toBe('volatile');
    expect(recipe?.effect.type).toBe('foam');
    expect(DISCOVERY_NOTES.recipe_chromatic_spill?.title).toBe('Chromatic Spill');
  });

  it('discovers lattice bloom when nutrient feeds a crystal field near pattern cultures', () => {
    const recipe = reactionRecipeFor(['crystal', 'nutrient'], {
      traits: ['budding'],
      archetypes: ['mirror'],
    });

    expect(recipe?.id).toBe('lattice_bloom');
    expect(recipe?.caution).toBe('volatile');
    expect(recipe?.effect.type).toBe('conduit');
    expect(DISCOVERY_NOTES.recipe_lattice_bloom?.title).toBe('Lattice Bloom');
  });

  it('prioritizes nutrient-fed lattice bloom over the crystal recipe that created the field', () => {
    const recipe = reactionRecipeFor(['crystal', 'nutrient', 'salt', 'water'], {
      traits: ['budding', 'gelatinous'],
      archetypes: ['mirror'],
    }, 'nutrient');

    expect(recipe?.id).toBe('lattice_bloom');
    expect(recipe?.effect.type).toBe('conduit');
  });

  it('discovers spore comet when an agitated hatch enters reactive foam', () => {
    const recipe = reactionRecipeFor(['hatch', 'foam'], {
      traits: ['budding'],
      archetypes: ['swarmlet'],
      agitated: true,
    });

    expect(recipe?.id).toBe('spore_comet');
    expect(recipe?.caution).toBe('critical');
    expect(recipe?.effect.type).toBe('flare');
    expect(DISCOVERY_NOTES.recipe_spore_comet?.title).toBe('Spore Comet');
  });

  it('requires agitation for spore comet hatches', () => {
    const calm = reactionRecipeFor(['hatch', 'foam'], {
      traits: ['budding'],
      archetypes: ['swarmlet'],
    });

    expect(calm?.id).not.toBe('spore_comet');
  });

  it('discovers velvet prison when salt and toxin trap gelatinous anchors', () => {
    const recipe = reactionRecipeFor(['salt', 'toxin'], {
      traits: ['gelatinous'],
      archetypes: ['boss'],
    });

    expect(recipe?.id).toBe('velvet_prison');
    expect(recipe?.caution).toBe('critical');
    expect(recipe?.effect.type).toBe('lysis');
    expect(DISCOVERY_NOTES.recipe_velvet_prison?.title).toBe('Velvet Prison');
  });

  it('maps every breed to a discovery note', () => {
    for (const id of Object.keys(BREED_DEFS) as BreedId[]) {
      expect(DISCOVERY_NOTES[`breed_${id}`]).toBeDefined();
    }
  });
});
