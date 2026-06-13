// @ts-expect-error Vitest runs this test in Node; the app tsconfig does not ship Node types.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync('src/styles.css', 'utf8');
const screensSource = readFileSync('src/ui/screens.ts', 'utf8');

describe('end button ready affordance', () => {
  it('flashes the End button when the dish can be banked', () => {
    expect(screensSource).toContain("endEpochButton.classList.toggle('end-action-ready', complete);");
    expect(screensSource).toContain("endLabel.textContent = complete ? 'ready' : 'score dish'");
    expect(screensSource).toContain("endState.textContent = complete ? 'ready' : 'now'");
    expect(css).toContain('.end-action.end-action-ready::after');
    expect(css).toContain('animation: end-ready-flash');
    expect(css).toContain('@keyframes end-ready-flash');
    expect(css).toContain('.toolbox .end-action.end-action-ready');
    expect(css).toContain('order: -1;');
  });
});
