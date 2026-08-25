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
    title: 'Hi. I’m Dr. E. Mergent.',
    body: 'That dish is far too clean. Drop a Swarmlet egg anywhere inside it.',
    trigger: 'egg-placed',
    buttonHint: 'egg',
  },
  {
    id: 'feed-colony',
    title: 'Now I need you to feed it.',
    body: 'Select Nutrient and drop it beside the culture. Let’s see what the cells decide to become.',
    trigger: 'nutrient-used',
    buttonHint: 'nutrient',
  },
  {
    id: 'watch-bloom',
    title: 'Now I need you to stand back.',
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
