// @ts-expect-error Vitest runs this test in Node; the app tsconfig does not ship Node types.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const mainSource = readFileSync('src/main.ts', 'utf8');

describe('organic discovery announcement flow', () => {
  it('announces newly discovered catalysts before reward unlocks', () => {
    const functionStart = mainSource.indexOf('function advanceDiscoveryProgression(');
    expect(functionStart).toBeGreaterThan(-1);
    const functionEnd = mainSource.indexOf('\n}\n\nfunction discoveryDebugInfo', functionStart);
    const body = mainSource.slice(functionStart, functionEnd);

    expect(body).toContain('const previousProgression = discoveryProgression;');
    expect(body).toContain('announceDiscoveryProgressionChange(previousProgression, nextProgression);');
    expect(body.indexOf('announceDiscoveryProgressionChange(previousProgression, nextProgression);')).toBeLessThan(
      body.indexOf('announceUnlocks(previousAvailability, currentUnlockAvailability());'),
    );
  });

  it('pulses newly unlocked lifeform cards while announcing them', () => {
    const functionStart = mainSource.indexOf('function announceUnlocks(');
    expect(functionStart).toBeGreaterThan(-1);
    const functionEnd = mainSource.indexOf('\n}\n\nfunction isBaseArchetype', functionStart);
    const body = mainSource.slice(functionStart, functionEnd);

    expect(body).toContain('screens.showcaseLifeformUnlock(lifeform);');
    expect(body.indexOf('screens.showcaseLifeformUnlock(lifeform);')).toBeGreaterThan(
      body.indexOf('if (previous.lifeforms.includes(lifeform)) continue;'),
    );
  });

  it('pulses newly unlocked reagent cards while announcing them', () => {
    const functionStart = mainSource.indexOf('function announceUnlocks(');
    expect(functionStart).toBeGreaterThan(-1);
    const functionEnd = mainSource.indexOf('\n}\n\nfunction isBaseArchetype', functionStart);
    const body = mainSource.slice(functionStart, functionEnd);

    expect(body).toContain('screens.showcaseToolUnlock(tool);');
    expect(body.indexOf('screens.showcaseToolUnlock(tool);')).toBeGreaterThan(
      body.indexOf('if (previous.tools.includes(tool)) continue;'),
    );
  });

  it('promotes a recipe through repeated player evidence without automatic dish grants', () => {
    expect(mainSource).toContain('observedNotesAtDishStart = new Set(');
    expect(mainSource).toContain("noteId.startsWith('recipe_') && observedNotesAtDishStart.has(noteId)");
    expect(mainSource).toContain("advanceDiscoveryProgression({ noteIds: repeatedRecipeNotes }, { note: 'understood' });");
    expect(mainSource).not.toContain('applyCompletionResearchGrant');
    expect(mainSource).not.toContain('awardCompletionResearchGrant');
  });

  it('refreshes tool charges immediately after reveal-all changes unlocks', () => {
    const revealStart = mainSource.indexOf('debug.onRevealDiscoveries(() => {');
    expect(revealStart).toBeGreaterThan(-1);
    const revealEnd = mainSource.indexOf('\n});', revealStart);
    const revealBody = mainSource.slice(revealStart, revealEnd);

    expect(revealBody).toContain('applyDiscoveryProgressionUi();');
    expect(revealBody).toContain('refreshArenaToolUi();');
    expect(revealBody.indexOf('applyDiscoveryProgressionUi();')).toBeLessThan(
      revealBody.indexOf('refreshArenaToolUi();'),
    );

    expect(mainSource).toContain('debug.onClearDiscoveries(() => {\n  openDeleteDataDialog();');
    expect(mainSource).toContain('runtimeStorage.clear();');
  });
});
