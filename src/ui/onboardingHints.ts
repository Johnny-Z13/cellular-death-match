export interface OnboardingIdleNudgeInput {
  objectiveComplete: boolean;
  tutorialActive: boolean;
  objectiveHint: string | undefined;
}

export interface OnboardingIdleNudge {
  title: string;
  body: string;
  interruptTutorial: boolean;
}

export function onboardingIdleNudge(input: OnboardingIdleNudgeInput): OnboardingIdleNudge {
  if (input.objectiveComplete) {
    return {
      title: 'Experiment ready',
      body: 'Press End to bank this dish and unlock the next research step.',
      interruptTutorial: false,
    };
  }

  if (input.tutorialActive) {
    return {
      title: 'Make the first discovery',
      body: 'Place one Swarmlet egg, then feed the living cultures with Nutrient until Bloom appears.',
      interruptTutorial: true,
    };
  }

  return {
    title: 'Stuck? Try this',
    body: input.objectiveHint ?? 'Drop a Nutrient near a culture and watch how it feeds and follows.',
    interruptTutorial: false,
  };
}
