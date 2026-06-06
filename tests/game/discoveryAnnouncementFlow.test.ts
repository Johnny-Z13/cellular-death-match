// @ts-expect-error Vitest runs this test in Node; the app tsconfig does not ship Node types.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const mainSource = readFileSync('src/main.ts', 'utf8');

describe('organic discovery announcement flow', () => {
  it('announces newly discovered catalysts before reward unlocks', () => {
    const functionStart = mainSource.indexOf('function advanceDiscoveryProgression(delta: DiscoveryDelta): boolean {');
    expect(functionStart).toBeGreaterThan(-1);
    const functionEnd = mainSource.indexOf('\n}\n\nfunction discoveryDebugInfo', functionStart);
    const body = mainSource.slice(functionStart, functionEnd);

    expect(body).toContain('const previousProgression = discoveryProgression;');
    expect(body).toContain('announceDiscoveryProgressionChange(previousProgression, nextProgression);');
    expect(body.indexOf('announceDiscoveryProgressionChange(previousProgression, nextProgression);')).toBeLessThan(
      body.indexOf('announceUnlocks(previousTools, previousLifeforms, discoveryProgression);'),
    );
  });

  it('pulses newly unlocked lifeform cards while announcing them', () => {
    const functionStart = mainSource.indexOf('function announceUnlocks(');
    expect(functionStart).toBeGreaterThan(-1);
    const functionEnd = mainSource.indexOf('\n}\n\nfunction isBaseArchetype', functionStart);
    const body = mainSource.slice(functionStart, functionEnd);

    expect(body).toContain('screens.showcaseLifeformUnlock(lifeform);');
    expect(body.indexOf('screens.showcaseLifeformUnlock(lifeform);')).toBeGreaterThan(
      body.indexOf('if (previousLifeforms.includes(lifeform)) continue;'),
    );
  });

  it('pulses newly unlocked reagent cards while announcing them', () => {
    const functionStart = mainSource.indexOf('function announceUnlocks(');
    expect(functionStart).toBeGreaterThan(-1);
    const functionEnd = mainSource.indexOf('\n}\n\nfunction isBaseArchetype', functionStart);
    const body = mainSource.slice(functionStart, functionEnd);

    expect(body).toContain('screens.showcaseToolUnlock(tool);');
    expect(body.indexOf('screens.showcaseToolUnlock(tool);')).toBeGreaterThan(
      body.indexOf('if (previousTools.includes(tool)) continue;'),
    );
  });

  it('surfaces completed-dish research on the upgrade pick screen before replaying it in the next dish', () => {
    const awardStart = mainSource.indexOf('function awardCompletionResearchGrant(): void {');
    expect(awardStart).toBeGreaterThan(-1);
    const awardEnd = mainSource.indexOf('\n}\n\nfunction replayPendingResearchBrief', awardStart);
    const awardBody = mainSource.slice(awardStart, awardEnd);

    expect(awardBody).toContain('pendingResearchBrief = researchBriefForGrant(result.grant);');
    expect(awardBody).toContain('screens.setPickResearchBrief(pendingResearchBrief);');
    expect(awardBody.indexOf('pendingResearchBrief = researchBriefForGrant(result.grant);')).toBeLessThan(
      awardBody.indexOf('screens.setPickResearchBrief(pendingResearchBrief);'),
    );

    const startFightStart = mainSource.indexOf('function startNewFight() {');
    expect(startFightStart).toBeGreaterThan(-1);
    const startFightEnd = mainSource.indexOf('\nfunction loop()', startFightStart);
    const startFightBody = mainSource.slice(startFightStart, startFightEnd);
    expect(startFightBody).toContain('screens.setPickResearchBrief([]);');
  });

  it('refreshes tool charges immediately after debug discovery actions change unlocks', () => {
    const revealStart = mainSource.indexOf('debug.onRevealDiscoveries(() => {');
    expect(revealStart).toBeGreaterThan(-1);
    const revealEnd = mainSource.indexOf('\n});', revealStart);
    const revealBody = mainSource.slice(revealStart, revealEnd);

    expect(revealBody).toContain('applyDiscoveryProgressionUi();');
    expect(revealBody).toContain('refreshArenaToolUi();');
    expect(revealBody.indexOf('applyDiscoveryProgressionUi();')).toBeLessThan(
      revealBody.indexOf('refreshArenaToolUi();'),
    );

    const clearStart = mainSource.indexOf('debug.onClearDiscoveries(() => {');
    expect(clearStart).toBeGreaterThan(-1);
    const clearEnd = mainSource.indexOf('\n});', clearStart);
    const clearBody = mainSource.slice(clearStart, clearEnd);

    expect(clearBody).toContain('applyDiscoveryProgressionUi();');
    expect(clearBody).toContain('refreshArenaToolUi();');
  });
});
