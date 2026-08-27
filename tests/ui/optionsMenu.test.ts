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
    expect(html).toContain('id="haptics-button" class="debug-option-button"');
    expect(html).toContain('hidden>Haptics — On</button>');
  });

  it('uses the Brick Breaker cog and keeps experience controls available', () => {
    expect(html).toContain('class="options-button__cog"');
    expect(html).toContain('M12.22 2h-.44');
    expect(html).toContain('id="dbg-reveal-discoveries"');
    expect(html).toContain('Open a fully stocked late-game trial');
    expect(html).toContain('id="dbg-clear-discoveries"');
    expect(html).toContain('Return to the first-time Professor tutorial');
  });

  it('confirms destructive data deletion in-product and reloads first-time state', () => {
    expect(html).toContain('id="delete-data-dialog"');
    expect(html).toContain('id="delete-data-cancel"');
    expect(html).toContain('id="delete-data-confirm"');
    expect(mainSource).toContain('dialog.showModal();');
    expect(mainSource).toContain('runtimeStorage.clear();');
    expect(mainSource).toContain('window.location.reload();');
  });

  it('turns reveal-all into a persistent, fully stocked procedural preview', () => {
    expect(mainSource).not.toContain('setDiscoveryPersistence');
    expect(mainSource).toContain('for (const lifeform of ALL_PROGRESSION_LIFEFORMS) strainLibrary.bankStrain(lifeform);');
    expect(mainSource).toContain('run.startLateGamePreview();');
    expect(mainSource).toContain('revealAllResearchArchive(researchArchive)');
    expect(mainSource).toContain('if (discoveryProgression.revealAll) return ALL_PROGRESSION_TOOLS;');
    expect(mainSource).toContain('if (discoveryProgression.revealAll) return ALL_PROGRESSION_LIFEFORMS;');
  });

  it('keeps diagnostics out of the ordinary player options menu', () => {
    expect(html).toContain('class="debug-block debug-only"');
    expect(html).not.toContain('id="dbg-persist-discoveries"');
    expect(mainSource).toContain("layout.dataset.diagnostics = String(new URLSearchParams(window.location.search).has('physdebug'));");
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
  });

  it('pauses ticks and resets the clock so resume cannot catch up paused time', () => {
    expect(mainSource).toContain('if (overlayState.menuOpen) {');
    expect(mainSource).toContain('status: \'paused\'');
    expect(mainSource).toContain('simClock.reset(now);');
    expect(mainSource).toContain('simClock.reset(performance.now());');
  });
});
