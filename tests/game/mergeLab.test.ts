import { describe, expect, it } from 'vitest';
import { createAnalytics } from '../../src/platform/analytics';
import { createMemoryKeyValueStorage, createStorageAdapter } from '../../src/platform/storage';
import {
  FEED_DNA,
  FIRST_MERGE_DNA,
  MERGE_LAB_SAVE_KEY,
  createEmptyMergeLabSave,
  createMergeLabRuntime,
  loadMergeLabSave,
} from '../../src/game/mergeLab';

describe('Merge Lab runtime', () => {
  it('banks first input, first merge, first reward, and atlas progress immediately', () => {
    const storage = createStorageAdapter({
      namespace: 'cellular-death-match.cg.v1',
      localStorage: createMemoryKeyValueStorage(),
    });
    const analytics = createAnalytics({ nowMs: () => 0 });
    const runtime = createMergeLabRuntime(storage, analytics, 0);

    runtime.recordFirstInput(100);
    runtime.performFirstMerge(250);

    expect(runtime.state.run.dna).toBe(FIRST_MERGE_DNA);
    expect(runtime.state.run.firstInputAtMs).toBe(100);
    expect(runtime.state.run.firstMergeAtMs).toBe(250);
    expect(runtime.state.run.firstRewardAtMs).toBe(250);
    expect(runtime.state.atlas.reveals).toBe(1);
    expect(runtime.state.mergeTiers.sprinter).toBe(2);
    expect(loadMergeLabSave(storage).run.dna).toBe(FIRST_MERGE_DNA);
    expect(analytics.events().map((event) => event.name)).toEqual([
      'first_input',
      'first_merge',
      'first_reward',
    ]);
  });

  it('persists feed reward only after the first merge', () => {
    const storage = createStorageAdapter({
      namespace: 'cellular-death-match.cg.v1',
      localStorage: createMemoryKeyValueStorage(),
    });
    const analytics = createAnalytics({ nowMs: () => 0 });
    const runtime = createMergeLabRuntime(storage, analytics, 0);

    runtime.performFeed(100);
    expect(runtime.state.run.dna).toBe(0);

    runtime.performFirstMerge(200);
    runtime.performFeed(300);
    runtime.performFeed(400);

    expect(runtime.state.run.dna).toBe(FIRST_MERGE_DNA + FEED_DNA);
    expect(runtime.state.run.firstFeedAtMs).toBe(300);
    expect(loadMergeLabSave(storage).run.dna).toBe(FIRST_MERGE_DNA + FEED_DNA);
  });

  it('recovers safely from corrupt saved state', () => {
    const storage = createStorageAdapter({
      namespace: 'cellular-death-match.cg.v1',
      localStorage: createMemoryKeyValueStorage(),
    });
    storage.setRaw(MERGE_LAB_SAVE_KEY, '{bad json');

    expect(loadMergeLabSave(storage)).toEqual(createEmptyMergeLabSave(0));
  });
});
