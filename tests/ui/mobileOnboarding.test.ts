import { describe, expect, it } from 'vitest';
import { shouldOpenLifeformsForNewPlayer } from '../../src/ui/mobileOnboarding';

describe('mobile onboarding drawer', () => {
  it('opens on roomy first-run phone layouts', () => {
    expect(shouldOpenLifeformsForNewPlayer({
      hasSeenTutorial: false,
      isMobileViewport: true,
      viewportHeight: 844,
    })).toBe(true);
  });

  it('stays collapsed on short phones so the dish remains playable', () => {
    expect(shouldOpenLifeformsForNewPlayer({
      hasSeenTutorial: false,
      isMobileViewport: true,
      viewportHeight: 667,
    })).toBe(false);
  });

  it('stays collapsed for returning players and desktop layouts', () => {
    expect(shouldOpenLifeformsForNewPlayer({
      hasSeenTutorial: true,
      isMobileViewport: true,
      viewportHeight: 844,
    })).toBe(false);
    expect(shouldOpenLifeformsForNewPlayer({
      hasSeenTutorial: false,
      isMobileViewport: false,
      viewportHeight: 844,
    })).toBe(false);
  });
});
