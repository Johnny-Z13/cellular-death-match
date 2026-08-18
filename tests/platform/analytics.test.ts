import { describe, expect, it } from 'vitest';
import { createAnalytics } from '../../src/platform/analytics';

describe('analytics adapter', () => {
  it('records timestamped local funnel events', () => {
    const analytics = createAnalytics({ nowMs: () => 42 });

    analytics.record('first_frame', { mode: 'merge_lab' });

    expect(analytics.events()).toEqual([{
      name: 'first_frame',
      atMs: 42,
      data: { mode: 'merge_lab' },
    }]);
  });

  it('caps retained debug events', () => {
    const analytics = createAnalytics({ nowMs: () => 1, maxEvents: 2 });

    analytics.record('a');
    analytics.record('b');
    analytics.record('c');

    expect(analytics.events().map((event) => event.name)).toEqual(['b', 'c']);
  });
});
