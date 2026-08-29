export interface OnboardingIdleNudgeInput {
  objectiveComplete: boolean;
  tutorialActive: boolean;
  objectiveHint: string | undefined;
  guidanceTier?: 'exact' | 'hypothesis';
  nudgeIndex?: number;
  recoveryHints?: readonly [principle: string, exactMethod: string];
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
      body: 'Bank this result to preserve the evidence and unlock the next research step.',
      interruptTutorial: false,
    };
  }

  if (input.guidanceTier === 'exact' && input.recoveryHints) {
    return {
      title: 'No reaction yet',
      body: input.recoveryHints[1],
      interruptTutorial: true,
    };
  }

  if (input.tutorialActive) {
    return {
      title: 'Make the first discovery',
      body: 'Place one Swarmlet egg, then feed the living cultures with Nutrient until Bloom appears.',
      interruptTutorial: true,
    };
  }

  if (input.guidanceTier === 'hypothesis' && input.recoveryHints) {
    const exact = (input.nudgeIndex ?? 0) > 0;
    return {
      title: exact ? 'Exact method' : 'A principle to test',
      body: exact ? input.recoveryHints[1] : input.recoveryHints[0],
      interruptTutorial: false,
    };
  }

  return {
    title: 'Stuck? Try this',
    body: input.objectiveHint ?? 'Drop a Nutrient near a culture and watch how it feeds and follows.',
    interruptTutorial: false,
  };
}
