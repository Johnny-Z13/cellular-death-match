import { describe, expect, it } from 'vitest';
import {
  deleteAllGameSaveData,
  resetOnboardingSaveData,
  shouldResetOnboardingFromLocation,
  stripOnboardingResetParamsFromUrl,
} from '../../src/game/saveDataReset';

describe('save data reset', () => {
  it('resets onboarding and Merge Lab first-run state without deleting progression', () => {
    const storage = createStorage({
      'cdm.coach.seen.v3': '1',
      'cellular-death-match.cg.v1.save': '{"run":{"dna":70}}',
      'cellular-death-match.discovery.v2': '{"discoveredBreedIds":["bloom"]}',
      'cellular-death-match.strains.v1': '{"runCount":4}',
      unrelated: 'keep',
    });

    expect(resetOnboardingSaveData(storage)).toBe(2);

    expect(storage.getItem('cdm.coach.seen.v3')).toBeNull();
    expect(storage.getItem('cellular-death-match.cg.v1.save')).toBeNull();
    expect(storage.getItem('cellular-death-match.discovery.v2')).not.toBeNull();
    expect(storage.getItem('cellular-death-match.strains.v1')).not.toBeNull();
    expect(storage.getItem('unrelated')).toBe('keep');
  });

  it('deletes this game save data without clearing unrelated origin storage', () => {
    const storage = createStorage({
      'cdm.audio.muted': '1',
      'cdm.haptics.enabled.v1': '0',
      'cdm.launch.merge-lab': '1',
      'cellular-death-match.discovery.v2': '{}',
      'cellular-death-match.strains.v1': '{}',
      'other-game.save': 'keep',
    });

    expect(deleteAllGameSaveData(storage)).toBe(5);

    expect(storage.getItem('cdm.audio.muted')).toBeNull();
    expect(storage.getItem('cdm.haptics.enabled.v1')).toBeNull();
    expect(storage.getItem('cdm.launch.merge-lab')).toBeNull();
    expect(storage.getItem('cellular-death-match.discovery.v2')).toBeNull();
    expect(storage.getItem('cellular-death-match.strains.v1')).toBeNull();
    expect(storage.getItem('other-game.save')).toBe('keep');
  });

  it('supports an onboarding reset URL flag for phone QA', () => {
    expect(shouldResetOnboardingFromLocation({ search: '?cg=1&resetOnboarding=1' })).toBe(true);
    expect(shouldResetOnboardingFromLocation({ search: '?cg=1&resetSave=true' })).toBe(true);
    expect(shouldResetOnboardingFromLocation({ search: '?cg=1&resetSave=0' })).toBe(false);

    const next = stripOnboardingResetParamsFromUrl(new URL('https://example.test/?cg=1&resetOnboarding=1#merge-lab'));
    expect(next.href).toBe('https://example.test/?cg=1#merge-lab');
  });
});

function createStorage(seed: Record<string, string>) {
  const data = new Map(Object.entries(seed));
  return {
    get length() {
      return data.size;
    },
    getItem(key: string) {
      return data.get(key) ?? null;
    },
    key(index: number) {
      return [...data.keys()][index] ?? null;
    },
    removeItem(key: string) {
      data.delete(key);
    },
  };
}
