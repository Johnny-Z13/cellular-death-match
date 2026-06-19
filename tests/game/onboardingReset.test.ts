import { describe, expect, it } from 'vitest';
import { DISCOVERY_SAVE_KEY, createMemoryStorage } from '../../src/game/discoverySave';
import { applyOnboardingStateReset, ONBOARDING_RESET_KEY } from '../../src/game/onboardingReset';

describe('onboarding state reset', () => {
  it('clears legacy and current discovery/tutorial keys exactly once', () => {
    const storage = createMemoryStorage();
    storage.setItem('cellular-death-match.discovery.v1', 'old progress');
    storage.setItem(DISCOVERY_SAVE_KEY, 'new progress');
    storage.setItem('cdm.coach.seen', '1');
    storage.setItem('cdm.coach.seen.v2', '1');
    storage.setItem('cdm.coach.seen.v3', '1');
    storage.setItem('cdm.audio.muted', '1');

    expect(applyOnboardingStateReset(storage)).toBe(true);

    expect(storage.getItem('cellular-death-match.discovery.v1')).toBeNull();
    expect(storage.getItem(DISCOVERY_SAVE_KEY)).toBeNull();
    expect(storage.getItem('cdm.coach.seen')).toBeNull();
    expect(storage.getItem('cdm.coach.seen.v2')).toBeNull();
    expect(storage.getItem('cdm.coach.seen.v3')).toBeNull();
    expect(storage.getItem('cdm.audio.muted')).toBe('1');
    expect(storage.getItem(ONBOARDING_RESET_KEY)).toBe('1');

    storage.setItem(DISCOVERY_SAVE_KEY, 'progress after reset');

    expect(applyOnboardingStateReset(storage)).toBe(false);
    expect(storage.getItem(DISCOVERY_SAVE_KEY)).toBe('progress after reset');
  });
});
