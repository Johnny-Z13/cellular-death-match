import { describe, expect, it } from 'vitest';
import { isCrazyGamesEnvironment, isCrazyGamesHostname } from '../../src/platform/crazyGames';

describe('CrazyGames environment detection', () => {
  it('accepts the portal and game-file subdomains without matching lookalikes', () => {
    expect(isCrazyGamesHostname('crazygames.com')).toBe(true);
    expect(isCrazyGamesHostname('game-files.crazygames.com')).toBe(true);
    expect(isCrazyGamesHostname('APP.CRAZYGAMES.COM.')).toBe(true);
    expect(isCrazyGamesHostname('notcrazygames.com')).toBe(false);
    expect(isCrazyGamesHostname('crazygames.com.example.test')).toBe(false);
  });

  it('detects current, referrer, ancestor, and explicit QA environments', () => {
    expect(isCrazyGamesEnvironment({
      currentUrl: 'https://game-files.crazygames.com/cellular-death-match/index.html',
    })).toBe(true);
    expect(isCrazyGamesEnvironment({
      currentUrl: 'https://cdn.example.test/game/',
      referrer: 'https://www.crazygames.com/game/cellular-death-match',
    })).toBe(true);
    expect(isCrazyGamesEnvironment({
      currentUrl: 'https://cdn.example.test/game/',
      ancestorOrigins: ['https://games.crazygames.com'],
    })).toBe(true);
    expect(isCrazyGamesEnvironment({
      currentUrl: 'http://127.0.0.1:5199/?platform=crazygames',
    })).toBe(true);
    expect(isCrazyGamesEnvironment({
      currentUrl: 'http://127.0.0.1:5199/',
    })).toBe(false);
  });
});
