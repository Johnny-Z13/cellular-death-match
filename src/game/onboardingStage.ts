import type {
  DiscoveryProgressionState,
  ProgressionLifeformId,
  ProgressionToolId,
} from './discoveryProgression';

export const ONBOARDING_STAGE_TOOLS: readonly ProgressionToolId[] = ['egg', 'nutrient'];
export const ONBOARDING_STAGE_LIFEFORMS: readonly ProgressionLifeformId[] = ['swarmlet'];

export const FIRST_CASE_STAGE_TOOLS: readonly (readonly ProgressionToolId[])[] = [
  ['egg', 'nutrient'],
  ['egg', 'nutrient', 'toxin'],
  ['egg', 'nutrient', 'toxin', 'water'],
  ['egg', 'nutrient', 'toxin', 'water', 'paste'],
  ['egg', 'nutrient', 'toxin', 'water', 'paste', 'salt'],
];

export interface OnboardingBeat {
  readonly id: string;
  readonly title: string;
  readonly body: string;
  readonly trigger: string;
  readonly buttonHint?: string;
}

export const ONBOARDING_BEATS: readonly OnboardingBeat[] = [
  {
    id: 'place-egg',
    title: 'Hi. I’m Dr. E. Mergent.',
    body: 'We’ll begin with one living sample. Drop a single Swarmlet egg anywhere inside the dish.',
    trigger: 'egg-placed',
    buttonHint: 'egg',
  },
  {
    id: 'feed-colony',
    title: 'Good. Now feed it.',
    body: 'Select Nutrient, then tap beside the egg. One feed is enough.',
    trigger: 'nutrient-used',
    buttonHint: 'nutrient',
  },
];

export function isOnboardingEpoch(fightIndex: number): boolean {
  return fightIndex === 0;
}

export function isFixedEpoch(fightIndex: number): boolean {
  return fightIndex <= 4;
}

export function isMidGameEpoch(fightIndex: number): boolean {
  return fightIndex >= 5;
}

export function toolUnlocksForCurrentStage(
  progression: DiscoveryProgressionState,
  fightIndex: number,
  _bloomCreatedInCurrentDish = progression.discoveredBreedIds.includes('bloom_mass'),
): readonly ProgressionToolId[] {
  const authoredTools = FIRST_CASE_STAGE_TOOLS[fightIndex];
  if (authoredTools) return authoredTools;
  return progression.unlockedTools;
}

export function lifeformUnlocksForCurrentStage(
  progression: DiscoveryProgressionState,
  fightIndex: number,
  bloomCreatedInCurrentDish = progression.discoveredBreedIds.includes('bloom_mass'),
): readonly ProgressionLifeformId[] {
  if (shouldUseOnboardingDishForCurrentStage(fightIndex, bloomCreatedInCurrentDish)) {
    return ONBOARDING_STAGE_LIFEFORMS;
  }
  return progression.unlockedLifeforms;
}

export function shouldUseOnboardingDishForCurrentStage(
  fightIndex: number,
  bloomCreatedInCurrentDish = false,
): boolean {
  return fightIndex === 0 && !bloomCreatedInCurrentDish;
}
