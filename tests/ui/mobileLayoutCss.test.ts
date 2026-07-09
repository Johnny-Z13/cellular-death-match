// @ts-expect-error Vitest runs this test in Node; the app tsconfig does not ship Node types.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync('src/styles.css', 'utf8');

function mediaBlock(query: string): string {
  const marker = `@media ${query} {`;
  const start = css.indexOf(marker);
  expect(start).toBeGreaterThan(-1);

  let depth = 0;
  for (let i = start; i < css.length; i += 1) {
    if (css[i] === '{') depth += 1;
    if (css[i] === '}') {
      depth -= 1;
      if (depth === 0) return css.slice(start, i + 1);
    }
  }

  throw new Error(`Unclosed media block: ${query}`);
}

describe('mobile layout CSS', () => {
  it('hides gameplay chrome behind the title screen', () => {
    expect(css).toContain('.layout[data-screen="title"] .toolbox,');
    expect(css).toContain('.layout[data-screen="title"] .life-panel,');
    expect(css).toContain('.layout[data-screen="title"] .ticker,');
    expect(css).toContain('.layout[data-screen="title"] .mobile-shell,');
    expect(css).toContain('.layout[data-screen="title"] .hud {');
    expect(css).toContain('pointer-events: none');
  });

  it('switches phones to compact horizontal trays instead of desktop-length fixed lists', () => {
    const mobile = mediaBlock('(max-width: 899px)');

    expect(mobile).toContain('padding: calc(70px + env(safe-area-inset-top)) 10px calc(146px + env(safe-area-inset-bottom))');
    expect(mobile).toContain('width: min(94vw, calc(100svh - 236px), 800px)');
    expect(mobile).toContain('height: min(94vw, calc(100svh - 236px), 800px)');

    expect(mobile).toContain('.mobile-shell {');
    expect(mobile).toContain('display: grid');
    expect(mobile).toContain('grid-template-columns: minmax(72px, auto) minmax(0, 1fr) minmax(72px, auto)');
    expect(mobile).toContain('.mobile-tool-readout {');
    expect(mobile).toContain('bottom: calc(92px + env(safe-area-inset-bottom))');
    expect(mobile).toContain('.hud {');
    // The HUD drops below the top chrome buttons (Sound / Full screen) so they
    // never sit on top of the deadline / equilibrium values.
    expect(mobile).toContain('top: calc(46px + env(safe-area-inset-top))');
    expect(mobile).toContain('font-size: 10px');
    expect(mobile).toContain('.hud-hint-row,');
    expect(mobile).toContain('.hud-volume-row');
    expect(mobile).toContain('display: none');

    expect(mobile).toContain('.toolbox {');
    expect(mobile).toContain('grid-template-columns: none');
    expect(mobile).toContain('grid-auto-flow: column');
    expect(mobile).toContain('grid-auto-columns: minmax(72px, 1fr)');
    expect(mobile).toContain('overflow-x: auto');
    expect(mobile).toContain('overflow-y: hidden');

    expect(mobile).toContain('.life-panel {');
    expect(mobile).toContain('bottom: calc(146px + env(safe-area-inset-bottom))');
    expect(mobile).toContain('max-height: min(42svh, 284px)');
    expect(mobile).toContain('overflow: hidden');
    expect(mobile).toContain('transform: translateY(calc(100% + 160px))');
    expect(mobile).toContain('pointer-events: none');
    expect(mobile).toContain('.mobile-lifeforms-open .life-panel {');
    expect(mobile).toContain('transform: translateY(0)');

    expect(mobile).toContain('.life-list {');
    expect(mobile).toContain('grid-template-columns: none');
    expect(mobile).toContain('grid-auto-flow: column');
    expect(mobile).toContain('grid-auto-columns: minmax(154px, 74vw)');
    expect(mobile).toContain('overflow-x: auto');
    expect(mobile).toContain('overflow-y: hidden');

    expect(mobile).toContain('.ticker {');
    expect(mobile).toContain('transform: translateY(calc(100% + 160px))');
    expect(mobile).toContain('.mobile-log-open .ticker {');
    expect(mobile).toContain('pointer-events: auto');
  });

  it('has a tighter small-phone breakpoint for short portrait screens', () => {
    const smallPhone = mediaBlock('(max-width: 899px) and (max-height: 700px)');

    expect(smallPhone).toContain('padding: calc(60px + env(safe-area-inset-top)) 10px calc(132px + env(safe-area-inset-bottom))');
    expect(smallPhone).toContain('width: min(92vw, calc(100svh - 218px), 800px)');
    expect(smallPhone).toContain('height: min(92vw, calc(100svh - 218px), 800px)');
    expect(smallPhone).toContain('bottom: calc(82px + env(safe-area-inset-bottom))');
    expect(smallPhone).toContain('grid-auto-columns: minmax(64px, 1fr)');
    expect(smallPhone).toContain('bottom: calc(132px + env(safe-area-inset-bottom))');
    expect(smallPhone).toContain('max-height: min(45svh, 232px)');
    expect(smallPhone).toContain('.coach {');
    // The coach's top is driven by --hud-bottom (set in main.ts) at every
    // breakpoint now, so the small-phone block only tightens its padding.
    expect(smallPhone).toContain('padding: 9px 11px');
    expect(smallPhone).toContain('.coach-body {');
    expect(smallPhone).toContain('margin: 4px 0 0');
    expect(smallPhone).toContain('.fx-banner-title {');
    expect(smallPhone).toContain('font-size: clamp(22px, 8vw, 34px)');
  });

  it('resets desktop controls back to rack flow so the desktop layout remains unchanged', () => {
    const desktop = mediaBlock('(min-width: 900px)');

    expect(desktop).toContain('grid-auto-flow: row');
    expect(desktop).toContain('grid-auto-columns: auto');
    expect(desktop).toContain('overflow-x: visible');
    expect(desktop).toContain('overflow-y: visible');
  });

  it('keeps mobile drawer transitions scoped and reduced-motion friendly', () => {
    const mobile = mediaBlock('(max-width: 899px)');
    const reducedMotion = mediaBlock('(prefers-reduced-motion: reduce)');

    expect(mobile).toContain('transition: transform 180ms ease');
    expect(mobile).toContain('.mobile-lifeforms-open .life-panel {');
    expect(mobile).toContain('.mobile-log-open .ticker {');
    expect(reducedMotion).toContain('.life-panel,');
    expect(reducedMotion).toContain('.ticker,');
    expect(reducedMotion).toContain('.mobile-shell-button');
    expect(reducedMotion).toContain('transition: none !important');
  });

  it('repositions chrome buttons and lifts discovery toasts clear of the bottom shell on phones', () => {
    const mobile = mediaBlock('(max-width: 899px)');
    // Sound + Full screen tuck to the top-right; the Notebook tab is on the dish.
    expect(mobile).toContain('.fullscreen-button {');
    expect(mobile).toContain('.audio-button {');
    expect(mobile).toContain('.notebook-button.notebook-tab {');
    // Toasts sit above the toolbar zone so completion/discovery messages are
    // never hidden behind the bottom controls.
    expect(mobile).toContain('.fx-toasts {');
    expect(mobile).toContain('bottom: calc(212px + env(safe-area-inset-bottom))');
  });
});
