import type { EnemyArchetype } from './enemies';
import { OBJECTIVE_TUNING } from './ecologyTuning';

export type ObjectiveKind =
  | 'preserve_grazers'
  | 'breed_archetype'
  | 'controlled_reaction'
  | 'balanced_ecology'
  | 'dominant_archetype';

export interface ObjectiveDef {
  kind: ObjectiveKind;
  name: string;
  description: string;
  target: string;
  archetype?: EnemyArchetype;
  targetCount?: number;
  minCount?: number;
  minCoverage?: number;
  maxDominance?: number;
}

export const OBJECTIVES: ReadonlyArray<ObjectiveDef> = [
  {
    kind: 'preserve_grazers',
    name: 'Protect Grazer Cultures',
    description: 'Keep at least 3 grazer or propagator cultures alive until the deadline.',
    target: '3 protected cultures at deadline',
    minCount: OBJECTIVE_TUNING.preserveGrazerMin,
  },
  {
    kind: 'breed_archetype',
    name: 'Breed Swarmlets',
    description: 'Raise the Swarmlet population to 4 living cultures.',
    target: '4 living Swarmlets',
    archetype: 'swarmlet',
    targetCount: OBJECTIVE_TUNING.breedTargetCount,
  },
  {
    kind: 'controlled_reaction',
    name: 'Trigger Catalysis',
    description: 'Create a reagent reaction while keeping enough living matter in the dish.',
    target: '1 reaction, 4% living coverage',
    targetCount: OBJECTIVE_TUNING.controlledReactionMinCount,
    minCoverage: OBJECTIVE_TUNING.controlledReactionMinCoverage,
  },
  {
    kind: 'balanced_ecology',
    name: 'Prevent Monoculture',
    description: 'Reach the deadline with no single lifeform family above 56% of living matter.',
    target: 'dominance <= 56% at deadline',
    maxDominance: OBJECTIVE_TUNING.balanceMaxDominance,
    minCount: OBJECTIVE_TUNING.balanceMinLifeforms,
  },
  {
    kind: 'dominant_archetype',
    name: 'Cultivate Boss Anchors',
    description: 'Make Boss organisms the dominant culture without collapsing the dish.',
    target: 'Boss dominant, 4% living coverage',
    archetype: 'boss',
    minCoverage: OBJECTIVE_TUNING.dominantMinCoverage,
  },
];

export function objectiveForEpoch(epochIndex: number): ObjectiveDef {
  return OBJECTIVES[epochIndex % OBJECTIVES.length]!;
}
