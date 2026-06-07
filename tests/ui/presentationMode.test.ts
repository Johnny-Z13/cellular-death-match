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
    expect(screensSource).toContain("const fullscreenButton = get('fullscreen-button') as HTMLButtonElement;");
    expect(screensSource).toContain('fullscreenButton.addEventListener');
    expect(mainSource).toContain('screens.onFullscreenOpen(() => {');
    expect(mainSource).toContain('setPresentationMode(true);');
  });

  it('hides every UI layer and lets the dish fill the viewport', () => {
    expect(css).toContain('.presentation-mode .debug');
    expect(css).toContain('.presentation-mode .screen');
    expect(css).toContain('.presentation-mode .fullscreen-button');
    expect(css).toContain('width: min(100svw, 100svh)');
    expect(css).toContain('height: min(100svw, 100svh)');
    expect(css).not.toContain('width: min(96svw, 96svh, 900px)');
  });

  it('uses Escape and native fullscreen exit to leave full screen mode before opening debug UI', () => {
    expect(mainSource).toContain('if (overlayState.presentationMode)');
    expect(mainSource).toContain('setPresentationMode(false)');
    expect(mainSource).toContain("document.addEventListener('fullscreenchange'");
    expect(mainSource).toContain('if (!document.fullscreenElement && overlayState.presentationMode)');
    expect(mainSource).toContain('return;');
  });
});
