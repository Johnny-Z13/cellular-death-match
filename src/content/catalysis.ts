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
  | 'fold_fault'
  | 'hatch';

export type ReactionRecipeId =
  | 'nutrient_conduit'
  | 'bitter_bloom'
  | 'pressure_bloom'
  | 'incubator_shock'
  | 'toxin_water_mist'
  | 'foam_lightning'
  | 'mist_salt_discharge'
  | 'acid_water_foam'
  | 'foam_salt_rule30'
  | 'crystal_toxin_prism'
  | 'brine_flash'
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
  trigger?: CatalysisEffectType;
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
    discoveryTrigger: 'Rule-30 Cascade or fold fault stabilizing inside gelatinous tissue',
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
    discoveryTrigger: 'Foam Lightning or crystal shock freezes quick cultures into a repeating pattern',
  },
};

export const REACTION_RECIPES: readonly ReactionRecipe[] = [
  {
    id: 'bitter_bloom',
    name: 'Bitter Bloom',
    inputs: ['nutrient', 'toxin'],
    traits: ['budding'],
    archetypes: ['splitter', 'swarmlet'],
    caution: 'volatile',
    discoveryNoteId: 'recipe_bitter_bloom',
    effect: { type: 'lysis', radiusBonus: 14, ttl: 60 * 4 },
  },
  {
    id: 'pressure_bloom',
    name: 'Pressure Bloom',
    inputs: ['nutrient', 'toxin'],
    traits: ['toxin_resistant'],
    archetypes: ['swarmlet', 'splitter', 'bruiser'],
    caution: 'critical',
    discoveryNoteId: 'recipe_pressure_bloom',
    effect: { type: 'flare', radiusBonus: 16, ttl: 60 * 3 },
  },
  {
    id: 'incubator_shock',
    name: 'Incubator Shock',
    inputs: ['hatch', 'nutrient', 'toxin'],
    archetypes: ['swarmlet', 'splitter', 'bruiser'],
    caution: 'critical',
    discoveryNoteId: 'recipe_incubator_shock',
    effect: { type: 'flare', radiusBonus: 20, ttl: 60 * 3 },
  },
  {
    id: 'toxin_water_mist',
    name: 'Toxin Mist',
    inputs: ['toxin', 'water'],
    archetypes: ['swarmlet', 'splitter'],
    caution: 'volatile',
    discoveryNoteId: 'recipe_toxin_water_mist',
    effect: { type: 'foam', radiusBonus: 16, ttl: 60 * 4 },
  },
  {
    id: 'foam_lightning',
    name: 'Foam Lightning',
    inputs: ['foam', 'water'],
    trigger: 'water',
    archetypes: ['swarmlet', 'splitter'],
    caution: 'critical',
    discoveryNoteId: 'recipe_foam_lightning',
    effect: { type: 'flare', radiusBonus: 20, ttl: 60 * 3 },
  },
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
    id: 'mist_salt_discharge',
    name: 'Mist Lattice Discharge',
    inputs: ['foam', 'salt'],
    archetypes: ['swarmlet', 'splitter'],
    caution: 'critical',
    discoveryNoteId: 'recipe_mist_salt_discharge',
    effect: { type: 'flare', radiusBonus: 18, ttl: 60 * 3 },
  },
  {
    id: 'acid_water_foam',
    name: 'Foam Inversion',
    inputs: ['acid', 'water'],
    traits: ['gelatinous', 'fragile'],
    archetypes: ['bruiser', 'sniper', 'mirror'],
    caution: 'volatile',
    discoveryNoteId: 'recipe_acid_water_foam',
    effect: { type: 'foam', radiusBonus: 22, ttl: 60 * 4 },
  },
  {
    id: 'foam_salt_rule30',
    name: 'Rule-30 Cascade',
    inputs: ['foam', 'salt'],
    traits: ['gelatinous', 'fragile'],
    archetypes: ['bruiser', 'mirror', 'splitter'],
    caution: 'critical',
    discoveryNoteId: 'recipe_foam_salt_rule30',
    effect: { type: 'fold_fault', radiusBonus: 30, ttl: 60 * 7 },
  },
  {
    id: 'crystal_toxin_prism',
    name: 'Prism Flare',
    inputs: ['crystal', 'toxin'],
    traits: ['gelatinous', 'toxin_resistant'],
    archetypes: ['mirror', 'bruiser'],
    caution: 'critical',
    discoveryNoteId: 'recipe_crystal_toxin_prism',
    effect: { type: 'flare', radiusBonus: 18, ttl: 60 * 3 },
  },
  {
    id: 'brine_flash',
    name: 'Brine Flash',
    inputs: ['acid', 'brine'],
    traits: ['gelatinous', 'toxin_resistant'],
    archetypes: ['bruiser', 'mirror', 'boss'],
    caution: 'critical',
    discoveryNoteId: 'recipe_brine_flash',
    effect: { type: 'flare', radiusBonus: 22, ttl: 60 * 3 },
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
  recipe_bitter_bloom: {
    id: 'recipe_bitter_bloom',
    title: 'Bitter Bloom',
    body: 'Toxin can sour a fed budding culture into a sharp little shock front.',
    caution: 'volatile',
  },
  recipe_pressure_bloom: {
    id: 'recipe_pressure_bloom',
    title: 'Pressure Bloom',
    body: 'A resistant starter culture can hold food and toxin pressure just long enough to flash violently.',
    caution: 'critical',
  },
  recipe_incubator_shock: {
    id: 'recipe_incubator_shock',
    title: 'Incubator Shock',
    body: 'A fresh hatch inside food and toxin pressure can kick the whole nursery into a dangerous flash.',
    caution: 'critical',
  },
  recipe_toxin_water_mist: {
    id: 'recipe_toxin_water_mist',
    title: 'Toxin Mist',
    body: 'Water can turn toxin pressure into a drifting mist front around quick starter cultures.',
    caution: 'volatile',
  },
  recipe_foam_lightning: {
    id: 'recipe_foam_lightning',
    title: 'Foam Lightning',
    body: 'A second water pulse can overcharge reactive foam into a bright branching flare.',
    caution: 'critical',
  },
  recipe_mist_salt_discharge: {
    id: 'recipe_mist_salt_discharge',
    title: 'Mist Lattice Discharge',
    body: 'Salt can snap toxin mist into a bright static discharge that briefly patterns the whole local culture.',
    caution: 'critical',
  },
  recipe_acid_toxin_flare: {
    id: 'recipe_acid_toxin_flare',
    title: 'Acid-Toxin Flare',
    body: 'Acid and toxin can ignite a short violent bloom around fragile tissue.',
    caution: 'critical',
  },
  recipe_acid_water_foam: {
    id: 'recipe_acid_water_foam',
    title: 'Foam Inversion',
    body: 'Water can flip acid into a fizzing foam front around soft tissue instead of merely diluting it.',
    caution: 'volatile',
  },
  recipe_foam_salt_rule30: {
    id: 'recipe_foam_salt_rule30',
    title: 'Rule-30 Cascade',
    body: 'Salt can crystallize unstable foam into a self-repeating fold pattern.',
    caution: 'critical',
  },
  recipe_crystal_toxin_prism: {
    id: 'recipe_crystal_toxin_prism',
    title: 'Prism Flare',
    body: 'Toxin can fracture a brittle crystal field into a brief, violent prism flash.',
    caution: 'critical',
  },
  recipe_brine_flash: {
    id: 'recipe_brine_flash',
    title: 'Brine Flash',
    body: 'Acid can ignite salty pressure into a short, violent flash around soft or resistant cultures.',
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
  trigger?: CatalysisEffectType,
): ReactionRecipe | undefined {
  return REACTION_RECIPES.filter((recipe) => {
    const hasInputs = recipe.inputs.every((input) => inputs.includes(input));
    if (!hasInputs) return false;
    if (trigger && recipe.trigger && recipe.trigger !== trigger) return false;

    const traitOk = !recipe.traits || recipe.traits.some((trait) => context.traits.includes(trait));
    if (!traitOk) return false;

    const archetypeOk = !recipe.archetypes || recipe.archetypes.some((archetype) => (
      context.archetypes.includes(archetype)
    ));
    if (!archetypeOk) return false;

    return recipe.id !== 'agitated_chain' || context.agitated === true;
  }).sort((a, b) => recipePriority(b) - recipePriority(a))[0];
}

function recipePriority(recipe: ReactionRecipe): number {
  const cautionScore = recipe.caution === 'critical' ? 300 : recipe.caution === 'volatile' ? 200 : 100;
  const effectScore = recipe.effect.type === 'fold_fault' ? 40
    : recipe.effect.type === 'flare' ? 30
      : recipe.effect.type === 'crystal' ? 20
        : recipe.effect.type === 'foam' ? 10
          : 0;
  return cautionScore + effectScore + recipe.inputs.length;
}
