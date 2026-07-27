// @ts-expect-error Vitest runs this test in Node; the app tsconfig does not ship Node types.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const html = readFileSync('index.html', 'utf8');
const screensSource = readFileSync('src/ui/screens.ts', 'utf8');

describe('overlay accessibility', () => {
  it('marks choice and outcome screens as labelled modal dialogs', () => {
    expect(html).toContain('id="screen-pick" class="screen" role="dialog" aria-modal="true" aria-labelledby="pick-title"');
    expect(html).toContain('id="screen-objective" class="screen" role="dialog" aria-modal="true" aria-labelledby="objective-title"');
    expect(html).toContain('id="screen-end" class="screen" role="dialog" aria-modal="true" aria-labelledby="end-title"');
  });

  it('moves focus to the active journey surface without scrolling', () => {
    expect(screensSource).toContain("? pickChoices.querySelector<HTMLButtonElement>('button')");
    expect(screensSource).toContain("? objectiveChoices.querySelector<HTMLButtonElement>('button')");
    expect(screensSource).toContain("? document.getElementById('game')");
    expect(screensSource).toContain('focus({ preventScroll: true })');
  });
});
