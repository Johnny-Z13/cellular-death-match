import type { EnemyArchetype } from './enemies';
import type { BreedId } from './catalysis';
import { OBJECTIVE_TUNING } from './ecologyTuning';

export type ObjectiveKind =
  | 'discover_breed'
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
  targetCount?: number;
  minCount?: number;
  minCoverage?: number;
  maxDominance?: number;
  sustainTicks?: number;
  volumeTarget?: number;
}

export const OBJECTIVES: ReadonlyArray<ObjectiveDef> = [
  {
    kind: 'discover_breed',
    name: 'Culture Shock',
    description: 'Feed a Swarmlet culture and observe the new mass that emerges.',
    target: 'Bloom Mass created',
    hint: 'Seed one extra Swarmlet, then feed the living cultures with Nutrient until Bloom appears.',
    breedId: 'bloom_mass',
  },
  {
    kind: 'preserve_grazers',
    name: 'Too Much of a Good Thing',
    description: 'Keep at least 3 useful cultures alive while the dish crowds in.',
    target: '3 cultures protected through observation',
    hint: 'Use Nutrient to keep small cultures moving and Toxin to push heavy feeders away.',
    minCount: OBJECTIVE_TUNING.preserveGrazerMin,
    sustainTicks: 60 * 12,
  },
  {
    kind: 'breed_archetype',
    name: 'Dilution Solution',
    description: 'Use careful feeding and dilution to raise 4 living Swarmlet cultures.',
    target: '4 living Swarmlets',
    hint: 'Seed Swarmlet eggs in open pockets and feed them before the dish gets crowded.',
    archetype: 'swarmlet',
    targetCount: OBJECTIVE_TUNING.breedTargetCount,
  },
  {
    kind: 'controlled_reaction',
    name: 'Fever Dream',
    description: 'Create a reagent reaction while keeping enough living matter in the dish.',
    target: '1 reaction, 4% living coverage',
    hint: 'Overlap unlocked reagents near living tissue, then keep enough culture alive to score it.',
    targetCount: OBJECTIVE_TUNING.controlledReactionMinCount,
    minCoverage: OBJECTIVE_TUNING.controlledReactionMinCoverage,
  },
  {
    kind: 'balanced_ecology',
    name: 'The Cure-ish',
    description: 'Reach the deadline with no single lifeform family above 56% of living matter.',
    target: 'dominance <= 56% at deadline',
    hint: 'Seed more than one strain and use pressure tools to stop one culture taking the dish.',
    maxDominance: OBJECTIVE_TUNING.balanceMaxDominance,
    minCount: OBJECTIVE_TUNING.balanceMinLifeforms,
  },
  {
    kind: 'dominant_archetype',
    name: 'Cultivate Boss Anchors',
    description: 'Make Boss organisms the dominant culture without collapsing the dish.',
    target: 'Boss dominant, 4% living coverage',
    hint: 'Boss cultures need room and food. Thin smaller rivals, but avoid sterilizing the dish.',
    archetype: 'boss',
    minCoverage: OBJECTIVE_TUNING.dominantMinCoverage,
  },
];

export function objectiveForEpoch(epochIndex: number): ObjectiveDef {
  return OBJECTIVES[epochIndex % OBJECTIVES.length]!;
}
