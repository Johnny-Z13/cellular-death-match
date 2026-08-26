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
  readonly action: string;
  readonly pointerTarget: string;
}

export const ONBOARDING_BEATS: readonly OnboardingBeat[] = [
  {
    id: 'select-egg',
    title: 'Hi. I’m Dr. E. Mergent.',
    body: 'I want one living sample. Press Egg below; that loads the Swarmlet culture.',
    trigger: 'egg-selected',
    action: 'Press Egg',
    pointerTarget: 'tool:egg',
  },
  {
    id: 'place-egg',
    title: 'Now place my sample.',
    body: 'Tap the exact spot I’m pointing to inside the dish.',
    trigger: 'egg-used',
    action: 'Tap the dish',
    pointerTarget: 'dish',
  },
  {
    id: 'select-nutrient',
    title: 'Good. Press Nutrient.',
    body: 'I’m loading one measured feed. Do not add anything else yet.',
    trigger: 'nutrient-selected',
    action: 'Press Nutrient',
    pointerTarget: 'tool:nutrient',
  },
  {
    id: 'feed-colony',
    title: 'Feed it once.',
    body: 'Tap beside the egg where I’m pointing. One feed is enough.',
    trigger: 'nutrient-used',
    action: 'Tap beside the egg',
    pointerTarget: 'dish',
  },
];

export const TRIAL_ONBOARDING_BEATS: readonly (readonly OnboardingBeat[])[] = [
  ONBOARDING_BEATS,
  [
    beat('select-bloom', 'Use the specimen we stabilized.', 'Press Bloom Mass. I’ll load its egg into the injector.', 'lifeform:bloom_mass', 'Press Bloom Mass', 'lifeform:bloom_mass'),
    beat('place-bloom', 'Place the Bloom Mass.', 'Tap the marked spot in the dish.', 'egg-used', 'Tap the dish', 'dish'),
    beat('select-nutrient', 'Feed it first.', 'Press Nutrient. The order matters.', 'nutrient-selected', 'Press Nutrient', 'tool:nutrient'),
    beat('feed-bloom', 'Put food on the culture.', 'Tap directly beside the Bloom Mass.', 'nutrient-used', 'Tap the dish', 'dish'),
    beat('select-toxin', 'Now add pressure.', 'Press Toxin. This is how we test the fed tissue.', 'toxin-selected', 'Press Toxin', 'tool:toxin'),
    beat('apply-toxin', 'Sour the same field.', 'Tap the fed Bloom Mass. I expect a Bitter Bloom reaction.', 'toxin-used', 'Tap the same spot', 'dish'),
  ],
  [
    beat('select-bloom', 'Return to Bloom Mass.', 'Press Bloom Mass. We are testing a gentler carrier this time.', 'lifeform:bloom_mass', 'Press Bloom Mass', 'lifeform:bloom_mass'),
    beat('place-bloom', 'Place the culture.', 'Tap the marked spot in the dish.', 'egg-used', 'Tap the dish', 'dish'),
    beat('select-nutrient', 'Start with food.', 'Press Nutrient.', 'nutrient-selected', 'Press Nutrient', 'tool:nutrient'),
    beat('feed-bloom', 'Feed the culture.', 'Tap beside the Bloom Mass.', 'nutrient-used', 'Tap the dish', 'dish'),
    beat('reveal-water', 'My reagent rack continues.', 'Drag the rack sideways — or press the arrow — to reveal Water.', 'toolbox-scrolled', 'Reveal more reagents', 'rack:more'),
    beat('select-water', 'Now press Water.', 'I want to carry the Nutrient through the budding tissue.', 'water-selected', 'Press Water', 'tool:water'),
    beat('apply-water', 'Wash the same field.', 'Tap the fed culture to form a Nutrient Conduit.', 'water-used', 'Tap the same spot', 'dish'),
  ],
  [
    beat('select-swarmlet', 'We need a quick culture.', 'Press Swarmlet. Fast tissue makes the discharge easier to see.', 'lifeform:swarmlet', 'Press Swarmlet', 'lifeform:swarmlet'),
    beat('place-swarmlet', 'Place the culture.', 'Tap the marked spot in the dish.', 'egg-used', 'Tap the dish', 'dish'),
    beat('select-toxin', 'Begin with Toxin.', 'Press Toxin.', 'toxin-selected', 'Press Toxin', 'tool:toxin'),
    beat('apply-toxin', 'Add the pressure field.', 'Tap beside the Swarmlet.', 'toxin-used', 'Tap the dish', 'dish'),
    beat('select-water', 'Press Water.', 'The first Water pulse will turn the Toxin into Foam.', 'water-selected', 'Press Water', 'tool:water'),
    beat('make-foam', 'Create the Foam.', 'Tap the Toxin field once.', 'water-used', 'Tap the same spot', 'dish'),
    beat('strike-foam', 'Water again. Same place.', 'Tap the Foam before it fades. That should produce Foam Lightning.', 'water-used', 'Tap the Foam', 'dish'),
  ],
  [
    beat('select-bloom', 'One final culture protocol.', 'Press Bloom Mass. Its budding tissue can carry the channel.', 'lifeform:bloom_mass', 'Press Bloom Mass', 'lifeform:bloom_mass'),
    beat('place-bloom', 'Place it with room to grow.', 'Tap the marked spot in the dish.', 'egg-used', 'Tap the dish', 'dish'),
    beat('select-salt', 'Press Salt first.', 'I’m setting the channel boundary.', 'salt-selected', 'Press Salt', 'tool:salt'),
    beat('apply-salt', 'Salt the culture.', 'Tap beside the Bloom Mass.', 'salt-used', 'Tap the dish', 'dish'),
    beat('select-nutrient', 'Now press Nutrient.', 'The culture still needs something worth carrying.', 'nutrient-selected', 'Press Nutrient', 'tool:nutrient'),
    beat('apply-nutrient', 'Feed the salted field.', 'Tap the same area.', 'nutrient-used', 'Tap the same spot', 'dish'),
    beat('select-water', 'Finish with Water.', 'Press Water. The finishing reagent matters.', 'water-selected', 'Press Water', 'tool:water'),
    beat('apply-water', 'Open the Brine Channel.', 'Tap the combined field, then keep three cultures alive.', 'water-used', 'Tap the same spot', 'dish'),
  ],
];

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
