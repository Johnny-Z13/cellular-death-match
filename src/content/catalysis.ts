import type { TraitId } from './ecology';
import type { EnemyArchetype } from './enemies';

export type CautionLevel = 'stable' | 'volatile' | 'critical';

export type CatalysisEffectType =
  | 'nutrient'
  | 'toxin'
  | 'water'
  | 'salt'
  | 'acid'
  | 'bloom'
  | 'brine'
  | 'lysis'
  | 'foam'
  | 'conduit'
  | 'flare'
  | 'crystal'
  | 'fold_fault';

export type ReactionRecipeId =
  | 'nutrient_conduit'
  | 'acid_toxin_flare'
  | 'salt_water_crystal'
  | 'agitated_chain'
  | 'folding_fault';

export type BreedId =
  | 'needle_swarm'
  | 'folded_anchor'
  | 'glass_antibody'
  | 'bloom_mass'
  | 'static_lattice';

export type DiscoveryNoteId =
  | `recipe_${ReactionRecipeId}`
  | `breed_${BreedId}`
  | 'water_carries'
  | 'water_dilutes';

export interface ReactionContext {
  traits: readonly TraitId[];
  archetypes: readonly EnemyArchetype[];
  agitated?: boolean;
}

export interface ReactionRecipe {
  id: ReactionRecipeId;
  name: string;
  inputs: readonly CatalysisEffectType[];
  traits?: readonly TraitId[];
  archetypes?: readonly EnemyArchetype[];
  caution: CautionLevel;
  discoveryNoteId: DiscoveryNoteId;
  effect: {
    type: CatalysisEffectType;
    radiusBonus: number;
    ttl: number;
  };
}

export interface BreedDef {
  id: BreedId;
  name: string;
  baseArchetype: EnemyArchetype;
  traits: readonly TraitId[];
  targetVolMultiplier: number;
  speedMultiplier: number;
  engulfMultiplier: number;
  instabilityMultiplier: number;
  tint: [number, number, number];
  discoveryTrigger: string;
}

export interface DiscoveryNote {
  id: DiscoveryNoteId;
  title: string;
  body: string;
  caution: CautionLevel;
}

export const BREED_DEFS: Record<BreedId, BreedDef> = {
  needle_swarm: {
    id: 'needle_swarm',
    name: 'Needle Swarm',
    baseArchetype: 'sniper',
    traits: ['fleet', 'fragile'],
    targetVolMultiplier: 0.74,
    speedMultiplier: 1.28,
    engulfMultiplier: 0.9,
    instabilityMultiplier: 1.35,
    tint: [255, 86, 154],
    discoveryTrigger: 'Critical flare near a suppressor culture',
  },
  folded_anchor: {
    id: 'folded_anchor',
    name: 'Folded Anchor',
    baseArchetype: 'boss',
    traits: ['gelatinous', 'toxin_resistant'],
    targetVolMultiplier: 0.86,
    speedMultiplier: 0.72,
    engulfMultiplier: 1.18,
    instabilityMultiplier: 0.68,
    tint: [142, 118, 255],
    discoveryTrigger: 'Rule-fold fault stabilizing inside an anchor culture',
  },
  glass_antibody: {
    id: 'glass_antibody',
    name: 'Glass Antibody',
    baseArchetype: 'bruiser',
    traits: ['toxin_resistant', 'fragile'],
    targetVolMultiplier: 0.82,
    speedMultiplier: 1.05,
    engulfMultiplier: 1.24,
    instabilityMultiplier: 1.05,
    tint: [132, 236, 255],
    discoveryTrigger: 'Salt crystal shock through a resistant feeder',
  },
  bloom_mass: {
    id: 'bloom_mass',
    name: 'Bloom Mass',
    baseArchetype: 'splitter',
    traits: ['budding', 'gelatinous'],
    targetVolMultiplier: 1.32,
    speedMultiplier: 0.82,
    engulfMultiplier: 1.08,
    instabilityMultiplier: 0.95,
    tint: [106, 232, 126],
    discoveryTrigger: 'Nutrient conduit overfeeds a budding propagator',
  },
  static_lattice: {
    id: 'static_lattice',
    name: 'Static Lattice',
    baseArchetype: 'mirror',
    traits: ['toxin_resistant', 'budding'],
    targetVolMultiplier: 0.94,
    speedMultiplier: 0.78,
    engulfMultiplier: 0.96,
    instabilityMultiplier: 0.74,
    tint: [252, 220, 92],
    discoveryTrigger: 'Agitated chain reaction freezes into a repeating pattern',
  },
};

export const REACTION_RECIPES: readonly ReactionRecipe[] = [
  {
    id: 'agitated_chain',
    name: 'Agitated Chain',
    inputs: ['water', 'nutrient', 'bloom'],
    traits: ['budding'],
    archetypes: ['splitter', 'swarmlet'],
    caution: 'volatile',
    discoveryNoteId: 'recipe_agitated_chain',
    effect: { type: 'foam', radiusBonus: 18, ttl: 60 * 5 },
  },
  {
    id: 'nutrient_conduit',
    name: 'Nutrient Conduit',
    inputs: ['nutrient', 'water'],
    traits: ['budding'],
    archetypes: ['swarmlet', 'splitter'],
    caution: 'stable',
    discoveryNoteId: 'recipe_nutrient_conduit',
    effect: { type: 'conduit', radiusBonus: 16, ttl: 60 * 6 },
  },
  {
    id: 'acid_toxin_flare',
    name: 'Acid-Toxin Flare',
    inputs: ['acid', 'toxin'],
    traits: ['fragile'],
    archetypes: ['sniper', 'bruiser', 'swarmlet'],
    caution: 'critical',
    discoveryNoteId: 'recipe_acid_toxin_flare',
    effect: { type: 'flare', radiusBonus: 24, ttl: 60 * 3 },
  },
  {
    id: 'salt_water_crystal',
    name: 'Salt-Water Crystal',
    inputs: ['salt', 'water'],
    traits: ['gelatinous'],
    archetypes: ['bruiser', 'mirror'],
    caution: 'volatile',
    discoveryNoteId: 'recipe_salt_water_crystal',
    effect: { type: 'crystal', radiusBonus: 20, ttl: 60 * 7 },
  },
  {
    id: 'folding_fault',
    name: 'Folding Fault',
    inputs: ['acid', 'water', 'salt'],
    traits: ['gelatinous'],
    archetypes: ['boss', 'mirror', 'splitter'],
    caution: 'critical',
    discoveryNoteId: 'recipe_folding_fault',
    effect: { type: 'fold_fault', radiusBonus: 28, ttl: 60 * 8 },
  },
];

export const DISCOVERY_NOTES: Record<DiscoveryNoteId, DiscoveryNote> = {
  recipe_nutrient_conduit: {
    id: 'recipe_nutrient_conduit',
    title: 'Nutrient Conduit',
    body: 'Water can carry food into a budding culture and make it spread in channels.',
    caution: 'stable',
  },
  recipe_acid_toxin_flare: {
    id: 'recipe_acid_toxin_flare',
    title: 'Acid-Toxin Flare',
    body: 'Acid and toxin can ignite a short violent bloom around fragile tissue.',
    caution: 'critical',
  },
  recipe_salt_water_crystal: {
    id: 'recipe_salt_water_crystal',
    title: 'Salt-Water Crystal',
    body: 'Brine can snap into a brittle crystal field that slows and reshapes feeders.',
    caution: 'volatile',
  },
  recipe_agitated_chain: {
    id: 'recipe_agitated_chain',
    title: 'Agitated Chain',
    body: 'Shaking an overfed culture can link small reactions into one foaming front.',
    caution: 'volatile',
  },
  recipe_folding_fault: {
    id: 'recipe_folding_fault',
    title: 'Folding Fault',
    body: 'A stressed gel culture can fold into a repeating rule pattern.',
    caution: 'critical',
  },
  breed_needle_swarm: {
    id: 'breed_needle_swarm',
    title: 'New Breed: Needle Swarm',
    body: 'A fast glassy shooter strain that survives by staying thin and mean.',
    caution: 'critical',
  },
  breed_folded_anchor: {
    id: 'breed_folded_anchor',
    title: 'New Breed: Folded Anchor',
    body: 'A heavy culture that locks nearby motion into slow repeating folds.',
    caution: 'volatile',
  },
  breed_glass_antibody: {
    id: 'breed_glass_antibody',
    title: 'New Breed: Glass Antibody',
    body: 'A brittle feeder with sharp resistance and a habit of cracking lanes open.',
    caution: 'volatile',
  },
  breed_bloom_mass: {
    id: 'breed_bloom_mass',
    title: 'New Breed: Bloom Mass',
    body: 'A soft propagator that swells fast and sheds pressure into daughter cultures.',
    caution: 'stable',
  },
  breed_static_lattice: {
    id: 'breed_static_lattice',
    title: 'New Breed: Static Lattice',
    body: 'A flickering pattern culture that prefers loops over direct growth.',
    caution: 'volatile',
  },
  water_carries: {
    id: 'water_carries',
    title: 'Water Carries',
    body: 'Water can move useful reagents farther than the drop zone suggests.',
    caution: 'stable',
  },
  water_dilutes: {
    id: 'water_dilutes',
    title: 'Water Dilutes',
    body: 'Water can soften dangerous fields, but it also spreads the mess.',
    caution: 'stable',
  },
};

export function reactionRecipeFor(
  inputs: readonly CatalysisEffectType[],
  context: ReactionContext,
): ReactionRecipe | undefined {
  return REACTION_RECIPES.find((recipe) => {
    const hasInputs = recipe.inputs.every((input) => inputs.includes(input));
    if (!hasInputs) return false;

    const traitOk = !recipe.traits || recipe.traits.some((trait) => context.traits.includes(trait));
    if (!traitOk) return false;

    const archetypeOk = !recipe.archetypes || recipe.archetypes.some((archetype) => (
      context.archetypes.includes(archetype)
    ));
    if (!archetypeOk) return false;

    return recipe.id !== 'agitated_chain' || context.agitated === true;
  });
}
