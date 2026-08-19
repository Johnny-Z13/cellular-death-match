// @ts-expect-error Vitest runs this test in Node; the app tsconfig does not ship Node types.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const html = readFileSync('index.html', 'utf8');
const mainSource = readFileSync('src/main.ts', 'utf8');
const screensSource = readFileSync('src/ui/screens.ts', 'utf8');
const styles = readFileSync('src/styles.css', 'utf8');

describe('options menu', () => {
  it('replaces the chrome sound control with Options and keeps Sound inside the dialog', () => {
    expect(html).toContain('id="options-button"');
    expect(html).toContain('aria-haspopup="dialog"');
    expect(html).toContain('id="debug" class="debug options-panel" role="dialog"');
    expect(html).toContain('id="audio-button" class="debug-option-button"');
    expect(html).toContain('id="haptics-button" class="debug-option-button"');
    expect(html).toContain('hidden>Haptics — On</button>');
  });

  it('exposes reset controls inside Options with destructive confirmation wiring', () => {
    expect(html).toContain('id="reset-onboarding-button"');
    expect(html).toContain('Reset onboarding');
    expect(html).toContain('id="delete-save-data-button"');
    expect(html).toContain('Delete all save data');
    expect(html).toContain('id="save-data-status" aria-live="polite"');
    expect(mainSource).toContain('resetOnboardingSaveData(runtimeStorage)');
    expect(mainSource).toContain('deleteAllGameSaveData(runtimeStorage)');
    expect(mainSource).toContain("window.confirm('Delete all Cellular Death Match save data");
  });

  it('exposes haptics only when the browser supports the mobile feature', () => {
    expect(screensSource).toContain('setHapticsAvailable(available: boolean): void;');
    expect(screensSource).toContain('hapticsButton.hidden = !available;');
    expect(mainSource).toContain('screens.setHapticsAvailable(haptics.isSupported());');
    expect(mainSource).toContain('screens.onHapticsToggle(() => {');
  });

  it('uses the same menu state path for the Options button, close controls, and Escape', () => {
    expect(screensSource).toContain('onOptionsOpen(handler: () => void): void;');
    expect(screensSource).toContain('onOptionsClose(handler: () => void): void;');
    expect(mainSource).toContain('screens.onOptionsOpen(() => {');
    expect(mainSource).toContain('screens.onOptionsClose(() => {');
    expect(mainSource).toContain('if (overlayState.menuOpen) {');
    expect(mainSource).toContain('setOptionsMenuOpen(false);');
  });

  it('announces modal state, traps focus, and restores the opener', () => {
    expect(html).toContain('aria-haspopup="dialog" aria-expanded="false"');
    expect(html).toContain('aria-labelledby="options-title" aria-hidden="true"');
    expect(mainSource).toContain("event.key === 'Tab' && overlayState.menuOpen");
    expect(mainSource).toContain('trapOptionsFocus(event);');
    expect(mainSource).toContain("document.getElementById('options-close')?.focus();");
    expect(mainSource).toContain('optionsReturnFocus?.focus();');
    expect(styles).toContain('.title-automata {\n  position: absolute;');
    expect(styles).toContain('pointer-events: none;');
  });

  it('pauses ticks and resets the clock so resume cannot catch up paused time', () => {
    expect(mainSource).toContain('if (overlayState.menuOpen) {');
    expect(mainSource).toContain('status: \'paused\'');
    expect(mainSource).toContain('simClock.reset(now);');
    expect(mainSource).toContain('simClock.reset(performance.now());');
  });
});
