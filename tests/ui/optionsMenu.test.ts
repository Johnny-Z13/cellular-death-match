// @ts-expect-error Vitest runs this test in Node; the app tsconfig does not ship Node types.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const html = readFileSync('index.html', 'utf8');
const mainSource = readFileSync('src/main.ts', 'utf8');
const screensSource = readFileSync('src/ui/screens.ts', 'utf8');

describe('options menu', () => {
  it('replaces the chrome sound control with Options and keeps Sound inside the dialog', () => {
    expect(html).toContain('id="options-button"');
    expect(html).toContain('aria-haspopup="dialog"');
    expect(html).toContain('id="debug" class="debug options-panel" role="dialog"');
    expect(html).toContain('id="audio-button" class="debug-option-button"');
  });

  it('uses the same menu state path for the Options button, close controls, and Escape', () => {
    expect(screensSource).toContain('onOptionsOpen(handler: () => void): void;');
    expect(screensSource).toContain('onOptionsClose(handler: () => void): void;');
    expect(mainSource).toContain('screens.onOptionsOpen(() => {');
    expect(mainSource).toContain('screens.onOptionsClose(() => {');
    expect(mainSource).toContain('setOptionsMenuOpen(!overlayState.menuOpen);');
  });

  it('pauses ticks and resets the clock so resume cannot catch up paused time', () => {
    expect(mainSource).toContain('if (overlayState.menuOpen) {');
    expect(mainSource).toContain('status: \'paused\'');
    expect(mainSource).toContain('simClock.reset(now);');
    expect(mainSource).toContain('simClock.reset(performance.now());');
  });
});
