// @ts-expect-error Vitest runs this test in Node; the app tsconfig does not ship Node types.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync('src/styles.css', 'utf8');
const mainSource = readFileSync('src/main.ts', 'utf8');
const screensSource = readFileSync('src/ui/screens.ts', 'utf8');
const html = readFileSync('index.html', 'utf8');

describe('full screen mode', () => {
  it('exposes a compact main UI full screen button and uses full screen wording', () => {
    expect(html).toContain('id="fullscreen-button"');
    expect(html).toContain('aria-label="Enter full screen"');
    expect(html).toContain('>Full screen</button>');
    expect(html).toContain('id="dbg-fullscreen-mode"');
    expect(html).toContain('>full screen</button>');
    expect(html).not.toContain('presentation mode</button>');
  });

  it('wires the main UI full screen button through createScreens', () => {
    expect(screensSource).toContain('onFullscreenOpen(handler: () => void): void;');
    expect(screensSource).toContain('setFullscreenAvailable(available: boolean): void;');
    expect(screensSource).toContain('setFullscreenActive(active: boolean): void;');
    expect(screensSource).toContain("const fullscreenButton = get('fullscreen-button') as HTMLButtonElement;");
    expect(screensSource).toContain('fullscreenButton.addEventListener');
    expect(mainSource).toContain('screens.onFullscreenOpen(() => {');
    expect(mainSource).toContain('setPresentationMode(!overlayState.presentationMode);');
  });

  it('hides every UI layer except a clearly labelled exit button and lets the dish fill the viewport', () => {
    expect(css).toContain('.presentation-mode .debug');
    expect(css).toContain('.presentation-mode .screen');
    expect(css).toContain('.presentation-mode .mobile-shell');
    expect(css).toContain('.presentation-mode .fullscreen-button {');
    expect(css).toContain('.presentation-mode .fullscreen-button::before');
    expect(css).toContain('content: "←"');
    expect(css).toContain('.layout[data-screen="arena"].presentation-mode .fullscreen-button');
    expect(screensSource).toContain("fullscreenButton.textContent = active ? 'Exit full screen' : 'Full screen';");
    expect(css).toContain('width: min(100svw, 100svh)');
    expect(css).toContain('height: min(100svw, 100svh)');
    expect(css).not.toContain('width: min(96svw, 96svh, 900px)');
  });

  it('never hides the title screen when full screen is requested before gameplay', () => {
    expect(css).toContain('.layout[data-screen="arena"].presentation-mode .screen {');
    expect(css).not.toMatch(/^\.presentation-mode \.screen \{/m);
    expect(css).toContain('.layout[data-screen="arena"].presentation-mode canvas {');
    expect(css).toContain('.layout:not([data-screen="arena"]) #dbg-fullscreen-mode {');
    expect(mainSource).toContain("run.getState().phase !== 'arena'");
  });

  it('removes custom fullscreen controls on CrazyGames', () => {
    expect(mainSource).toContain('isCrazyGamesEnvironment');
    expect(mainSource).toContain('screens.setFullscreenAvailable(customFullscreenAvailable);');
    expect(mainSource).toContain('debug.setPresentationAvailable(customFullscreenAvailable);');
    expect(mainSource).toContain("if (enabled && (!customFullscreenAvailable || run.getState().phase !== 'arena')) return;");
    expect(screensSource).toContain('fullscreenButton.hidden = !available;');
  });

  it('uses Escape and native fullscreen exit to leave full screen mode before opening debug UI', () => {
    expect(mainSource).toContain('if (overlayState.presentationMode)');
    expect(mainSource).toContain('setPresentationMode(false)');
    expect(mainSource).toContain("document.addEventListener('fullscreenchange'");
    expect(mainSource).toContain('if (!document.fullscreenElement && overlayState.presentationMode)');
    expect(mainSource).toContain('return;');
  });

  it('leaves full screen mode before showing non-arena phase screens', () => {
    expect(mainSource).toContain("if (overlayState.presentationMode && state.phase !== 'arena')");
    expect(mainSource).toContain('setPresentationMode(false);');
  });
});
