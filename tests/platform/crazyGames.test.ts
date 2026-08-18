import { describe, expect, it } from 'vitest';
import { createCrazyGamesPlatform, type CrazyGamesSdk } from '../../src/platform/crazyGames';

describe('CrazyGames platform adapter', () => {
  it('is safe when the SDK is absent', async () => {
    const platform = createCrazyGamesPlatform({ win: {} });

    expect(await platform.init()).toBe(false);
    platform.startGameplay('local');
    expect(platform.isGameplayStarted()).toBe(true);
    platform.stopGameplay('pause');
    expect(platform.isGameplayStarted()).toBe(false);
  });

  it('awaits init before sending queued gameplay start', async () => {
    let starts = 0;
    let stops = 0;
    const sdk: CrazyGamesSdk = {
      async init() {},
      game: {
        gameplayStart: () => { starts += 1; },
        gameplayStop: () => { stops += 1; },
      },
    };
    const platform = createCrazyGamesPlatform({ win: { CrazyGames: { SDK: sdk } } });

    platform.startGameplay('first-playable');
    expect(starts).toBe(0);
    await platform.init();
    expect(starts).toBe(1);

    platform.startGameplay('duplicate');
    expect(starts).toBe(1);
    platform.stopGameplay('pause');
    expect(stops).toBe(1);
  });
});
