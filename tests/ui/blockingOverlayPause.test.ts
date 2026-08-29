// @ts-expect-error Vitest runs this test in Node; the app tsconfig does not ship Node types.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const html = readFileSync('index.html', 'utf8');
const mainSource = readFileSync('src/main.ts', 'utf8');
const css = readFileSync('src/styles.css', 'utf8');

describe('blocking-overlay culture pause', () => {
  it('freezes authoritative time behind Notebook, Options, and mobile drawers', () => {
    expect(mainSource).toContain('function blockingOverlayOpen(): boolean');
    expect(mainSource).toContain('overlayState.menuOpen || overlayState.notebookOpen');
    expect(mainSource).toContain("layout.dataset.mobileDrawer === 'lifeforms'");
    expect(mainSource).toContain("layout.dataset.mobileDrawer === 'log'");
    expect(mainSource).toContain('simClock.reset(now);');
    expect(mainSource).toContain("status: 'paused'");
  });

  it('announces the paused state without covering the dish controls', () => {
    expect(html).toContain('id="simulation-paused-badge"');
    expect(html).toContain('Culture paused');
    expect(css).toContain('.simulation-paused .simulation-paused-badge');
    expect(css).toContain('pointer-events: none');
  });
});
