import { describe, expect, it } from 'vitest';
import { MERGE_LAB_LAUNCH_KEY, shouldLaunchMergeLab } from '../../src/platform/launchMode';
import { createMemoryKeyValueStorage } from '../../src/platform/storage';

describe('Merge Lab launch mode', () => {
  it('enables the CrazyGames route from URL params and hash', () => {
    expect(shouldLaunchMergeLab({ search: '?cg=1', hash: '' })).toBe(true);
    expect(shouldLaunchMergeLab({ search: '?mergeLab=true', hash: '' })).toBe(true);
    expect(shouldLaunchMergeLab({ search: '?mode=merge-lab', hash: '' })).toBe(true);
    expect(shouldLaunchMergeLab({ search: '', hash: '#merge-lab' })).toBe(true);
  });

  it('can be persisted for local QA', () => {
    const storage = createMemoryKeyValueStorage();
    storage.setItem(MERGE_LAB_LAUNCH_KEY, '1');

    expect(shouldLaunchMergeLab({ search: '', hash: '' }, storage)).toBe(true);
  });

  it('defaults to the existing game route', () => {
    expect(shouldLaunchMergeLab({ search: '', hash: '' })).toBe(false);
    expect(shouldLaunchMergeLab({ search: '?cg=0', hash: '' })).toBe(false);
  });
});
