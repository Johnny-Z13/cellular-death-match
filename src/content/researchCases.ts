import type { ObjectiveKind } from './objectives';

export interface ResearchTrialDef {
  id: string;
  number: number;
  name: string;
  labLabel: string;
  hypothesis: string;
  resultPromise: string;
  objectiveKind: ObjectiveKind;
  introducedFeature: string;
  guidanceTier: 'exact' | 'hypothesis';
  recoveryHints: readonly [principle: string, exactMethod: string];
}

export interface ResearchCaseDef {
  id: string;
  number: number;
  name: string;
  ailment: string;
  brief: string;
  trials: readonly ResearchTrialDef[];
}

export const COMMON_COLD_CASE: ResearchCaseDef = {
  id: 'common-cold',
  number: 1,
  name: 'The Common Cold Case',
  ailment: 'Persistent Sniffles',
  brief: 'Cultivate a stable response without breeding something worse.',
  trials: [
    {
      id: 'culture-shock',
      number: 1,
      name: 'Culture Shock',
      labLabel: 'Observe + stabilize',
      hypothesis: 'A fed Swarmlet may produce a viable new specimen.',
      resultPromise: 'Bloom Mass egg',
      objectiveKind: 'stabilize_breed',
      introducedFeature: 'Egg and Nutrient',
      guidanceTier: 'exact',
      recoveryHints: [
        'A growing culture needs one measured feed.',
        'Place a Swarmlet Egg, then place Nutrient beside it.',
      ],
    },
    {
      id: 'bitter-medicine',
      number: 2,
      name: 'Bitter Medicine',
      labLabel: 'Guided catalysis',
      hypothesis: 'Toxin added after feeding may turn Bloom growth into a useful reaction.',
      resultPromise: 'Bitter Bloom protocol',
      objectiveKind: 'understand_recipe',
      introducedFeature: 'Toxin',
      guidanceTier: 'exact',
      recoveryHints: [
        'Feed budding tissue before applying pressure.',
        'Place Bloom Mass, add Nutrient, then overlap it with Toxin.',
      ],
    },
    {
      id: 'carrier-medium',
      number: 3,
      name: 'Carrier Medium',
      labLabel: 'Reverse the order',
      hypothesis: 'Water may carry Nutrient through the same budding tissue without suppressing it.',
      resultPromise: 'Nutrient Conduit protocol',
      objectiveKind: 'understand_recipe',
      introducedFeature: 'Water',
      guidanceTier: 'hypothesis',
      recoveryHints: [
        'Water can carry an existing food field through budding tissue.',
        'Place Bloom Mass, add Nutrient, then overlap the same field with Water.',
      ],
    },
    {
      id: 'storm-in-a-dish',
      number: 4,
      name: 'Storm in a Dish',
      labLabel: 'Chain a reaction',
      hypothesis: 'An unstable Foam field may accept a second reagent and discharge.',
      resultPromise: 'Foam Lightning protocol',
      objectiveKind: 'understand_recipe',
      introducedFeature: 'Paste and Agitate',
      guidanceTier: 'hypothesis',
      recoveryHints: [
        'An unstable Foam signal can accept a second Water pulse before it fades.',
        'Near Swarmlet, overlap Toxin with Water to make Foam; then add Water there again.',
      ],
    },
    {
      id: 'cure-ish',
      number: 5,
      name: 'The Cure-ish',
      labLabel: 'Apply + balance',
      hypothesis: 'A known channel reaction may support a diverse dish without one strain taking over.',
      resultPromise: 'Applied protocol record',
      objectiveKind: 'apply_recipe',
      introducedFeature: 'Equilibrium',
      guidanceTier: 'hypothesis',
      recoveryHints: [
        'A channel needs a boundary, food to carry, and Water—then a diverse dish must survive it.',
        'On Bloom Mass, overlap Salt, Nutrient, then Water; keep three cultures alive and dominance at 60% or less.',
      ],
    },
  ],
};

export const RESEARCH_CASES: readonly ResearchCaseDef[] = [COMMON_COLD_CASE];

export function trialForIndex(index: number): ResearchTrialDef {
  return COMMON_COLD_CASE.trials[Math.min(Math.max(0, index), COMMON_COLD_CASE.trials.length - 1)]!;
}
