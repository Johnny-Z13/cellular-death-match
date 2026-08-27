// @ts-expect-error Vitest runs this test in Node; the app tsconfig does not ship Node types.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const html = readFileSync('index.html', 'utf8');
const screensSource = readFileSync('src/ui/screens.ts', 'utf8');

describe('open-ended run copy', () => {
  it('does not describe the game as ending when a dish clock expires', () => {
    expect(html).not.toContain('before the dish clock expires');
    expect(html).toContain('Cultivate a stable response without breeding something worse.');
  });

  it('does not format open-ended end summaries as x / 0 objectives', () => {
    expect(screensSource).toContain('info.totalFights === 0');
    expect(screensSource).not.toContain('ecosystem ${info.fightReached} / ${info.totalFights}');
    expect(screensSource).toContain("hudFightKey.textContent = info.totalFights > 0 ? 'Trial' : 'Study';");
    expect(screensSource).toContain('info.fightIndex - info.caseTrialCount + 1');
    expect(screensSource).toContain("hudTimeKey.textContent = info.objectiveTimed ? 'Window' : 'Dish';");
  });
});
