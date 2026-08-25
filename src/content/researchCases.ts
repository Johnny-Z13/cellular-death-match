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
    },
  ],
};

export const RESEARCH_CASES: readonly ResearchCaseDef[] = [COMMON_COLD_CASE];

export function trialForIndex(index: number): ResearchTrialDef {
  return COMMON_COLD_CASE.trials[Math.min(Math.max(0, index), COMMON_COLD_CASE.trials.length - 1)]!;
}
