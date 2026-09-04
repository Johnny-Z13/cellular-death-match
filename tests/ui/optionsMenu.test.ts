// @ts-expect-error Vitest runs this test in Node; the app tsconfig does not ship Node types.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const html = readFileSync('index.html', 'utf8');
const css = readFileSync('src/styles.css', 'utf8');
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
    expect(html).toContain('Try a fully stocked trial. Your save stays intact.');
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

  it('turns reveal-all into a non-owning, fully stocked procedural preview', () => {
    expect(mainSource).not.toContain('setDiscoveryPersistence');
    expect(mainSource).not.toContain('for (const lifeform of ALL_PROGRESSION_LIFEFORMS) strainLibrary.bankStrain(lifeform);');
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

  it('announces modal state, traps focus, and restores the active onboarding target before the opener', () => {
    expect(html).toContain('aria-haspopup="dialog" aria-expanded="false"');
    expect(html).toContain('aria-labelledby="options-title" aria-hidden="true"');
    expect(mainSource).toContain("event.key === 'Tab' && overlayState.menuOpen");
    expect(mainSource).toContain('trapOptionsFocus(event);');
    expect(mainSource).toContain("document.getElementById('options-close')?.focus();");
    expect(mainSource).toContain('if (!focusCurrentOnboardingTarget()) fallback?.focus();');
  });

  it('pauses ticks and resets the clock so resume cannot catch up paused time', () => {
    expect(mainSource).toContain('if (overlayState.menuOpen) {');
    expect(mainSource).toContain('status: \'paused\'');
    expect(mainSource).toContain('simClock.reset(now);');
    expect(mainSource).toContain('simClock.reset(performance.now());');
  });

  it('owns the interaction plane without tutorial or celebration layers leaking through', () => {
    const menuStart = mainSource.indexOf('function setOptionsMenuOpen(open: boolean): void {');
    const menuEnd = mainSource.indexOf('function trapOptionsFocus(', menuStart);
    const menuFlow = mainSource.slice(menuStart, menuEnd);

    expect(menuFlow).toContain('applyOverlayState();');
    expect(menuFlow).toContain('syncOnboardingPointer();');
    expect(css).toContain('.menu-open .onboarding-professor-pointer,');
    expect(css).toContain('.menu-open .fx-toasts {');
    expect(css).toContain('visibility: hidden !important;');
  });

  it('gives settings controls full touch targets and visible keyboard focus', () => {
    expect(css).toContain('button:focus-visible,');
    expect(css).toContain('[role="tab"]:focus-visible {');
    expect(css).toMatch(/\.options-close \{[\s\S]*?min-height: 44px;/);
    expect(css).toMatch(/\.debug-option-button \{[\s\S]*?min-height: 44px;/);
    expect(css).toMatch(/\.debug-mini-button \{[\s\S]*?min-height: 44px;/);
    expect(css).toMatch(/\.notebook-close \{[\s\S]*?min-height: 44px;/);
    expect(css).toMatch(/\.notebook-tab-button \{[\s\S]*?min-height: 44px;/);
    expect(css).not.toMatch(/\.notebook-tab-button \{[\s\S]{0,180}?min-height: 40px;/);
  });
});
