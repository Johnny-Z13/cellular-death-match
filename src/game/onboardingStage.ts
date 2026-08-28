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
  readonly pointerTarget: string;
}

export const ONBOARDING_BEATS: readonly OnboardingBeat[] = [
  {
    id: 'select-egg',
    title: 'I’m Dr. E. Press Egg.',
    body: 'Load one Swarmlet culture.',
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
    beat('select-bloom', 'Press Bloom Mass.', 'Use the specimen we stabilized.', 'lifeform:bloom_mass', 'Press Bloom Mass', 'lifeform:bloom_mass'),
    beat('place-bloom', 'Place it here.', 'Tap the marked point.', 'egg-used', 'Tap the dish', 'dish'),
    beat('select-nutrient', 'Press Nutrient.', 'Feed first. Order matters.', 'nutrient-selected', 'Press Nutrient', 'tool:nutrient'),
    beat('feed-bloom', 'Feed the culture.', 'Tap beside the Bloom Mass.', 'nutrient-used', 'Tap the dish', 'dish'),
    beat('select-toxin', 'Now press Toxin.', 'Add pressure to the fed tissue.', 'toxin-selected', 'Press Toxin', 'tool:toxin'),
    beat('apply-toxin', 'Test the fed field.', 'Tap the same spot.', 'toxin-used', 'Tap the same spot', 'dish'),
  ],
  [
    beat('select-bloom', 'Press Bloom Mass.', 'This time, we test a carrier.', 'lifeform:bloom_mass', 'Press Bloom Mass', 'lifeform:bloom_mass'),
    beat('place-bloom', 'Place it here.', 'Tap the marked point.', 'egg-used', 'Tap the dish', 'dish'),
    beat('select-nutrient', 'Press Nutrient.', 'Start with food.', 'nutrient-selected', 'Press Nutrient', 'tool:nutrient'),
    beat('feed-bloom', 'Feed the culture.', 'Tap beside the Bloom Mass.', 'nutrient-used', 'Tap the dish', 'dish'),
    beat('reveal-water', 'Reveal more reagents.', 'Drag the rack, or press the arrow.', 'toolbox-scrolled', 'Reveal more reagents', 'rack:more'),
    beat('select-water', 'Press Water.', 'Carry food through the tissue.', 'water-selected', 'Press Water', 'tool:water'),
    beat('apply-water', 'Wash the fed field.', 'Tap the same spot.', 'water-used', 'Tap the same spot', 'dish'),
  ],
  [
    beat('select-swarmlet', 'Press Swarmlet.', 'Fast tissue shows the discharge.', 'lifeform:swarmlet', 'Press Swarmlet', 'lifeform:swarmlet'),
    beat('place-swarmlet', 'Place it here.', 'Tap the marked point.', 'egg-used', 'Tap the dish', 'dish'),
    beat('select-toxin', 'Press Toxin.', 'Begin with pressure.', 'toxin-selected', 'Press Toxin', 'tool:toxin'),
    beat('apply-toxin', 'Add the Toxin field.', 'Tap beside the Swarmlet.', 'toxin-used', 'Tap the dish', 'dish'),
    beat('select-water', 'Press Water.', 'The first pulse makes Foam.', 'water-selected', 'Press Water', 'tool:water'),
    beat('make-foam', 'Create the Foam.', 'Tap the Toxin field.', 'water-used', 'Tap the same spot', 'dish'),
    beat('strike-foam', 'Water again. Same spot.', 'Strike the Foam before it fades.', 'water-used', 'Tap the Foam', 'dish'),
  ],
  [
    beat('select-bloom', 'Press Bloom Mass.', 'Its tissue can carry the channel.', 'lifeform:bloom_mass', 'Press Bloom Mass', 'lifeform:bloom_mass'),
    beat('place-bloom', 'Give it room.', 'Tap the marked point.', 'egg-used', 'Tap the dish', 'dish'),
    beat('select-salt', 'Press Salt first.', 'Set the channel boundary.', 'salt-selected', 'Press Salt', 'tool:salt'),
    beat('apply-salt', 'Salt the culture.', 'Tap beside the Bloom Mass.', 'salt-used', 'Tap the dish', 'dish'),
    beat('select-nutrient', 'Now press Nutrient.', 'Give the channel something to carry.', 'nutrient-selected', 'Press Nutrient', 'tool:nutrient'),
    beat('apply-nutrient', 'Feed the salted field.', 'Tap the same spot.', 'nutrient-used', 'Tap the same spot', 'dish'),
    beat('select-water', 'Finish with Water.', 'The final reagent matters.', 'water-selected', 'Press Water', 'tool:water'),
    beat('apply-water', 'Open the Brine Channel.', 'Tap here. Then sustain three cultures.', 'water-used', 'Tap the same spot', 'dish'),
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
