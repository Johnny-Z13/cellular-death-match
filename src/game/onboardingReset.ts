import {
  DISCOVERY_SAVE_KEY,
  type DiscoveryStorage,
} from './discoverySave';

export const ONBOARDING_RESET_KEY = 'cdm.onboarding-reset.v2';

const KNOWN_DISCOVERY_KEYS = [
  'cellular-death-match.discovery.v1',
  DISCOVERY_SAVE_KEY,
] as const;

const KNOWN_COACH_KEYS = [
  'cdm.coach.seen',
  'cdm.coach.seen.v2',
  'cdm.coach.seen.v3',
] as const;

export function applyOnboardingStateReset(storage: DiscoveryStorage): boolean {
  try {
    if (storage.getItem(ONBOARDING_RESET_KEY) === '1') return false;
    for (const key of [...KNOWN_DISCOVERY_KEYS, ...KNOWN_COACH_KEYS]) {
      storage.removeItem(key);
    }
    storage.setItem(ONBOARDING_RESET_KEY, '1');
    return true;
  } catch {
    return false;
  }
}
