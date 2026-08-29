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
  ['egg', 'nutrient', 'toxin', 'water', 'paste', 'agitate'],
  ['egg', 'nutrient', 'toxin', 'water', 'paste', 'salt', 'agitate'],
];

// The authored Case controls when an earned specimen may enter the current
// trial. The progression state still controls whether the genome was actually
// decoded, so ending an experiment early cannot grant the next organism.
export const FIRST_CASE_STAGE_LIFEFORMS: readonly (readonly ProgressionLifeformId[])[] = [
  ONBOARDING_STAGE_LIFEFORMS,
  ['swarmlet', 'bloom_mass'],
  ['swarmlet', 'bruiser', 'bloom_mass'],
  ['swarmlet', 'bruiser', 'splitter', 'bloom_mass'],
  ['swarmlet', 'bruiser', 'splitter', 'mirror', 'bloom_mass'],
];

export interface OnboardingBeat {
  readonly id: string;
  readonly title: string;
  readonly body: string;
  readonly trigger: string;
  readonly action: string;
  readonly pointerTarget?: string;
  readonly kicker?: string;
  readonly step?: string;
}

export const ONBOARDING_BEATS: readonly OnboardingBeat[] = [
  {
    id: 'select-egg',
    title: 'I’m Dr. E. Press Egg.',
    body: 'Trial 1 — Culture Shock. Load one Swarmlet culture.',
    trigger: 'egg-selected',
    action: 'Press Egg',
    pointerTarget: 'tool:egg',
  },
  {
    id: 'place-egg',
    title: 'Place it here.',
    body: 'Tap the point inside the dish.',
    trigger: 'egg-used',
    action: 'Tap the dish',
    pointerTarget: 'dish',
  },
  {
    id: 'select-nutrient',
    title: 'Now press Nutrient.',
    body: 'One measured feed. Nothing else.',
    trigger: 'nutrient-selected',
    action: 'Press Nutrient',
    pointerTarget: 'tool:nutrient',
  },
  {
    id: 'feed-colony',
    title: 'Feed it once.',
    body: 'Tap beside the egg.',
    trigger: 'nutrient-used',
    action: 'Tap beside the egg',
    pointerTarget: 'dish',
  },
];

export const TRIAL_ONBOARDING_BEATS: readonly (readonly OnboardingBeat[])[] = [
  ONBOARDING_BEATS,
  [
    beat('select-bloom', 'Open Eggs. Choose Bloom Mass.', 'Trial 2 — Bitter Medicine. Use the specimen we stabilized.', 'lifeform:bloom_mass', 'Open Eggs · choose Bloom Mass', 'lifeform:bloom_mass'),
    beat('place-bloom', 'Place it here.', 'Tap the marked point.', 'egg-used', 'Tap the dish', 'dish'),
    beat('select-nutrient', 'Press Nutrient.', 'Feed first. Order matters.', 'nutrient-selected', 'Press Nutrient', 'tool:nutrient'),
    beat('feed-bloom', 'Feed the culture.', 'Tap beside the Bloom Mass.', 'nutrient-used', 'Tap the dish', 'dish'),
    beat('select-toxin', 'Now press Toxin.', 'Add pressure to the fed tissue.', 'toxin-selected', 'Press Toxin', 'tool:toxin'),
    beat('apply-toxin', 'Test the fed field.', 'Tap the same spot.', 'toxin-used', 'Tap the same spot', 'dish'),
  ],
];

// Trial 3 remains hypothesis-led. This one-off mobile beat teaches only the
// rack gesture needed to reach its newly relevant Water tool.
export const MOBILE_TOOLBOX_ONBOARDING_BEAT: OnboardingBeat = {
  id: 'reveal-mobile-tools',
  kicker: 'Dr. E · Instrument tip',
  title: 'More tools are in the rack.',
  body: 'Drag tools left to reveal Water — or tap ›.',
  step: 'New control',
  trigger: 'toolbox-scrolled',
  action: 'Drag tools left',
};

function beat(
  id: string,
  title: string,
  body: string,
  trigger: string,
  action: string,
  pointerTarget: string,
): OnboardingBeat {
  return { id, title, body, trigger, action, pointerTarget };
}

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
  _bloomCreatedInCurrentDish = progression.discoveredBreedIds.includes('bloom_mass'),
): readonly ProgressionLifeformId[] {
  const authoredLifeforms = FIRST_CASE_STAGE_LIFEFORMS[fightIndex];
  if (authoredLifeforms) {
    const earned = new Set(progression.unlockedLifeforms);
    return authoredLifeforms.filter((lifeform) => earned.has(lifeform));
  }
  return progression.unlockedLifeforms;
}

export function shouldUseOnboardingDishForCurrentStage(
  fightIndex: number,
  bloomCreatedInCurrentDish = false,
): boolean {
  return fightIndex === 0 && !bloomCreatedInCurrentDish;
}
