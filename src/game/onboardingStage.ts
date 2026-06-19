import type {
  DiscoveryProgressionState,
  ProgressionLifeformId,
  ProgressionToolId,
} from './discoveryProgression';

export const ONBOARDING_STAGE_TOOLS: readonly ProgressionToolId[] = ['egg', 'nutrient'];
export const ONBOARDING_STAGE_LIFEFORMS: readonly ProgressionLifeformId[] = ['swarmlet'];

export interface OnboardingBeat {
  readonly id: string;
  readonly message: string;
  readonly trigger: string;
  readonly buttonHint?: string;
  readonly autoSpawn?: boolean;
}

export const ONBOARDING_BEATS: readonly OnboardingBeat[] = [
  {
    id: 'place-egg',
    message: 'Place a Swarmlet egg in the dish',
    trigger: 'egg-placed',
    buttonHint: 'egg',
  },
  {
    id: 'feed-colony',
    message: 'Drop a nutrient near your culture',
    trigger: 'nutrient-used',
    buttonHint: 'nutrient',
  },
  {
    id: 'watch-bloom',
    message: 'Watch your colony bloom...',
    trigger: 'bloom-discovered',
    autoSpawn: true,
  },
];

export function isOnboardingEpoch(fightIndex: number): boolean {
  return fightIndex === 0;
}

export function isFixedEpoch(fightIndex: number): boolean {
  return fightIndex <= 2;
}

export function isMidGameEpoch(fightIndex: number): boolean {
  return fightIndex >= 3;
}

export function toolUnlocksForCurrentStage(
  progression: DiscoveryProgressionState,
  fightIndex: number,
  bloomCreatedInCurrentDish = progression.discoveredBreedIds.includes('bloom_mass'),
): readonly ProgressionToolId[] {
  if (shouldUseOnboardingDishForCurrentStage(fightIndex, bloomCreatedInCurrentDish)) {
    return ONBOARDING_STAGE_TOOLS;
  }
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
