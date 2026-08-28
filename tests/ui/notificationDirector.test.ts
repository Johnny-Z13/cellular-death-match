import { describe, expect, it } from 'vitest';
import { NotificationDirector } from '../../src/ui/notificationDirector';

describe('mobile notification director', () => {
  it('starts one event and deduplicates active or queued copies', () => {
    const director = new NotificationDirector<string>();
    const toast = { key: 'toast:ready', priority: 1 as const, payload: 'ready' };

    expect(director.enqueue(toast).action).toBe('start');
    expect(director.enqueue(toast).action).toBe('duplicate');
    expect(director.getActive()?.key).toBe(toast.key);
  });

  it('lets a headline interrupt a minor toast, then resumes the displaced event', () => {
    const director = new NotificationDirector<string>();
    director.enqueue({ key: 'toast:tool', priority: 1, payload: 'tool' });

    const result = director.enqueue({
      key: 'banner:breed',
      priority: 3,
      payload: 'breed',
    });

    expect(result.action).toBe('replace');
    expect(director.getActive()?.key).toBe('banner:breed');
    expect(director.complete('banner:breed')?.key).toBe('toast:tool');
  });

  it('serializes a safe-boundary genome reveal above feedback already in the mobile channel', () => {
    const director = new NotificationDirector<string>();
    director.enqueue({ key: 'toast:reaction', priority: 1, payload: 'reaction' });
    director.enqueue({ key: 'banner:result', priority: 3, payload: 'result' });

    const result = director.enqueue({
      key: 'genome:splitter',
      priority: 4,
      payload: 'splitter',
    });

    expect(result.action).toBe('replace');
    expect(director.getActive()?.key).toBe('genome:splitter');
    expect(director.complete('genome:splitter')?.key).toBe('banner:result');
    expect(director.complete('banner:result')?.key).toBe('toast:reaction');
  });

  it('upgrades a semantic duplicate instead of replaying its smaller toast', () => {
    const director = new NotificationDirector<string>();
    director.enqueue({ key: 'message:bloom mass', priority: 2, payload: 'toast' });

    const result = director.enqueue({
      key: 'message:bloom mass',
      priority: 3,
      payload: 'banner',
    });

    expect(result.action).toBe('replace');
    expect(director.getActive()?.payload).toBe('banner');
    expect(director.complete('message:bloom mass')).toBeNull();
  });

  it('keeps equal-priority events in arrival order', () => {
    const director = new NotificationDirector<string>();
    director.enqueue({ key: 'active', priority: 3, payload: 'active' });
    director.enqueue({ key: 'first', priority: 2, payload: 'first' });
    director.enqueue({ key: 'second', priority: 2, payload: 'second' });

    expect(director.complete('active')?.key).toBe('first');
    expect(director.complete('first')?.key).toBe('second');
  });

  it('bounds stale backlog and drops the lowest-priority tail', () => {
    const director = new NotificationDirector<string>(2);
    director.enqueue({ key: 'active', priority: 3, payload: 'active' });
    director.enqueue({ key: 'low-a', priority: 1, payload: 'low-a' });
    director.enqueue({ key: 'high', priority: 2, payload: 'high' });

    expect(director.enqueue({ key: 'low-b', priority: 1, payload: 'low-b' }).action).toBe('dropped');
    expect(director.getQueued().map((item) => item.key)).toEqual(['high', 'low-a']);
  });

  it('clears active and queued feedback at a screen boundary', () => {
    const director = new NotificationDirector<string>();
    director.enqueue({ key: 'active', priority: 3, payload: 'active' });
    director.enqueue({ key: 'queued', priority: 2, payload: 'queued' });

    director.clear();

    expect(director.getActive()).toBeNull();
    expect(director.getQueued()).toEqual([]);
  });
});
