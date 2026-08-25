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
  readonly autoSpawn?: boolean;
}

export const ONBOARDING_BEATS: readonly OnboardingBeat[] = [
  {
    id: 'place-egg',
    title: 'Begin with one living variable',
    body: 'Place a Swarmlet egg anywhere with room to grow.',
    trigger: 'egg-placed',
    buttonHint: 'egg',
  },
  {
    id: 'feed-colony',
    title: 'Now tempt it into growth',
    body: 'Drop Nutrient beside the culture, then watch what the cells decide to do.',
    trigger: 'nutrient-used',
    buttonHint: 'nutrient',
  },
  {
    id: 'watch-bloom',
    title: 'Stand back. It is becoming interesting.',
    body: 'The fed cultures are approaching a new form.',
    trigger: 'bloom-discovered',
    autoSpawn: true,
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
