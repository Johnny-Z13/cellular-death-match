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
      labLabel: 'Seed + feed',
      hypothesis: 'A fed Swarmlet culture may produce a useful new mass.',
      resultPromise: 'Bloom Mass specimen',
      objectiveKind: 'discover_breed',
      introducedFeature: 'Egg and Nutrient',
    },
    {
      id: 'too-much-good-thing',
      number: 2,
      name: 'Too Much of a Good Thing',
      labLabel: 'Control growth',
      hypothesis: 'Selective pressure should save the useful cultures from overgrowth.',
      resultPromise: 'Toxin protocol',
      objectiveKind: 'preserve_grazers',
      introducedFeature: 'Toxin',
    },
    {
      id: 'dilution-solution',
      number: 3,
      name: 'Dilution Solution',
      labLabel: 'Move resources',
      hypothesis: 'A controlled dilution may spread food without surrendering the dish.',
      resultPromise: 'Water protocol',
      objectiveKind: 'breed_archetype',
      introducedFeature: 'Water',
    },
    {
      id: 'fever-dream',
      number: 4,
      name: 'Fever Dream',
      labLabel: 'Trigger reaction',
      hypothesis: 'Overlapping fields may provoke a useful reaction. Probably useful.',
      resultPromise: 'Catalysis record',
      objectiveKind: 'controlled_reaction',
      introducedFeature: 'Paste and Agitate',
    },
    {
      id: 'cure-ish',
      number: 5,
      name: 'The Cure-ish',
      labLabel: 'Hold balance',
      hypothesis: 'A diverse culture held in balance may qualify as a cure. Broadly.',
      resultPromise: 'Case conclusion',
      objectiveKind: 'balanced_ecology',
      introducedFeature: 'Equilibrium',
    },
  ],
};

export const RESEARCH_CASES: readonly ResearchCaseDef[] = [COMMON_COLD_CASE];

export function trialForIndex(index: number): ResearchTrialDef {
  return COMMON_COLD_CASE.trials[Math.min(Math.max(0, index), COMMON_COLD_CASE.trials.length - 1)]!;
}

