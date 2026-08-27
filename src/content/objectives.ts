import type { EnemyArchetype } from './enemies';
import type { BreedId, ReactionRecipeId } from './catalysis';

export type ObjectiveKind =
  | 'discover_breed'
  | 'stabilize_breed'
  | 'understand_recipe'
  | 'apply_recipe'
  | 'preserve_grazers'
  | 'breed_archetype'
  | 'controlled_reaction'
  | 'balanced_ecology'
  | 'dominant_archetype'
  | 'cross_breed'
  | 'mega_culture'
  | 'reaction_chain'
  | 'balance_keeper'
  | 'crisis_survivor'
  | 'protector'
  | 'acid_sculptor'
  | 'colony_founder'
  | 'symbiosis'
  | 'extinction_reversal';

export interface ObjectiveDef {
  kind: ObjectiveKind;
  name: string;
  description: string;
  target: string;
  hint?: string;
  archetype?: EnemyArchetype;
  breedId?: BreedId;
  recipeId?: ReactionRecipeId;
  targetCount?: number;
  minCount?: number;
  minCoverage?: number;
  maxDominance?: number;
  sustainTicks?: number;
  volumeTarget?: number;
  /** Only selected pressure experiments expire. Ordinary dishes stay open. */
  timed?: boolean;
}

export const OBJECTIVES: ReadonlyArray<ObjectiveDef> = [
  {
    kind: 'stabilize_breed',
    name: 'Culture Shock',
    description: 'Feed one Swarmlet culture. Keep the Bloom Mass alive long enough to bank it.',
    target: 'Bloom Mass stabilized',
    hint: 'Seed one extra Swarmlet, then feed the living cultures with Nutrient until Bloom appears.',
    breedId: 'bloom_mass',
  },
  {
    kind: 'understand_recipe',
    name: 'Bitter Medicine',
    description: 'Reproduce Bitter Bloom by feeding a budding culture, then adding Toxin.',
    target: 'Bitter Bloom protocol understood',
    hint: 'Select Bloom Mass. Place Nutrient on it, then overlap the field with Toxin.',
    recipeId: 'bitter_bloom',
  },
  {
    kind: 'understand_recipe',
    name: 'Carrier Medium',
    description: 'Reproduce Nutrient Conduit by carrying food through a budding culture with Water.',
    target: 'Nutrient Conduit protocol understood',
    hint: 'Place Nutrient on Bloom Mass, then add Water to the same field.',
    recipeId: 'nutrient_conduit',
  },
  {
    kind: 'understand_recipe',
    name: 'Storm in a Dish',
    description: 'Create unstable Foam, then strike it with Water near a quick culture.',
    target: 'Foam Lightning protocol understood',
    hint: 'Overlap Toxin and Water near Swarmlet, then add Water to the Foam before it fades.',
    recipeId: 'foam_lightning',
  },
  {
    kind: 'apply_recipe',
    name: 'The Cure-ish',
    description: 'Apply Brine Channel while maintaining a diverse, living dish.',
    target: 'Brine Channel + 3 cultures + dominance <= 60%',
    hint: 'Place Salt and Nutrient near Bloom Mass, then add Water. Keep three cultures alive.',
    recipeId: 'brine_channel',
    maxDominance: 0.6,
    minCount: 3,
    minCoverage: 0.04,
  },
];

export function objectiveForEpoch(epochIndex: number): ObjectiveDef {
  return OBJECTIVES[epochIndex % OBJECTIVES.length]!;
}
