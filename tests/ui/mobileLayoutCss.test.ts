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

    expect(mobile).toContain('padding: calc(80px + env(safe-area-inset-top)) 10px calc(146px + env(safe-area-inset-bottom))');
    expect(mobile).toContain('width: min(94vw, calc(100svh - 236px), 800px)');
    expect(mobile).toContain('height: min(94vw, calc(100svh - 236px), 800px)');
    expect(mobile).toContain('width: min(94vw, calc(100dvh - 236px), 800px)');
    expect(mobile).toContain('height: min(94vw, calc(100dvh - 236px), 800px)');

    expect(mobile).toContain('.mobile-shell {');
    expect(mobile).toContain('display: grid');
    expect(mobile).toContain('grid-template-columns: minmax(72px, auto) minmax(0, 1fr) minmax(72px, auto)');
    expect(mobile).toContain('.mobile-tool-readout {');
    expect(mobile).toContain('bottom: calc(92px + env(safe-area-inset-bottom))');
    expect(mobile).toContain('.hud {');
    // The HUD drops below the top chrome buttons (Sound / Full screen) so they
    // never sit on top of the deadline / equilibrium values.
    expect(mobile).toContain('top: calc(58px + env(safe-area-inset-top))');
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
    expect(mobile).toContain('max-height: min(42dvh, 284px)');
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
    expect(smallPhone).toContain('width: min(92vw, calc(100dvh - 218px), 800px)');
    expect(smallPhone).toContain('height: min(92vw, calc(100dvh - 218px), 800px)');
    expect(smallPhone).toContain('bottom: calc(82px + env(safe-area-inset-bottom))');
    expect(smallPhone).toContain('grid-auto-columns: minmax(64px, 1fr)');
    expect(smallPhone).toContain('bottom: calc(132px + env(safe-area-inset-bottom))');
    expect(smallPhone).toContain('max-height: min(45svh, 232px)');
    expect(smallPhone).toContain('.coach {');
    expect(smallPhone).toContain('bottom: calc(138px + env(safe-area-inset-bottom))');
    expect(smallPhone).toContain('padding: 7px 9px');
    expect(smallPhone).toContain('.mobile-lifeforms-open .coach,');
    expect(smallPhone).toContain('.coach-active .fx-toasts {');
    expect(smallPhone).toContain('.coach-body {');
    expect(smallPhone).toContain('margin: 2px 0 0');
    expect(smallPhone).toContain('.fx-banner-title {');
    expect(smallPhone).toContain('font-size: clamp(21px, 7.5vw, 28px)');
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

  it('repositions chrome and choreographs one compact mobile event rail', () => {
    const mobile = mediaBlock('(max-width: 899px)');
    // Options + Full screen tuck to the top-right; the Notebook tab is on the dish.
    expect(mobile).toContain('.fullscreen-button {');
    expect(mobile).toContain('.options-button {');
    expect(mobile).toContain('.notebook-button.notebook-tab {');
    expect(mobile).toContain('.fx-toasts {');
    expect(mobile).toContain('top: calc(var(--hud-bottom, 100px) + 8px)');
    expect(mobile).toContain('bottom: auto');
    expect(mobile).toContain('.coach-active .fx-toasts {');
    expect(mobile).toContain('top: calc(var(--coach-bottom, var(--hud-bottom, 100px)) + 8px)');
    expect(mobile).toContain('.fx-toast:not(:last-child) {');
    expect(mobile).toContain('.fx-toasts.fx-toasts-banner-active {');
  });

  it('keeps mobile celebrations smaller without changing the desktop defaults', () => {
    const mobile = mediaBlock('(max-width: 899px)');

    expect(mobile).toContain('.fx-banner-inner {');
    expect(mobile).toContain('width: calc(100vw - 64px)');
    expect(mobile).toContain('.fx-banner-arcade .fx-banner-title {');
    expect(mobile).toContain('animation: fx-arcade-title-mobile 1500ms');
    expect(css.slice(0, css.indexOf('@media (max-width: 899px)'))).toContain(
      'animation: fx-arcade-title 1800ms',
    );
  });

  it('turns the mobile coach into a compact measured instruction strip', () => {
    const mobile = mediaBlock('(max-width: 899px)');

    expect(mobile).toContain('grid-template-areas:');
    expect(mobile).toContain('"head skip"');
    expect(mobile).toContain('"title skip"');
    expect(mobile).toContain('"body body"');
    expect(mobile).toContain('.coach-body:empty {');
    expect(mobile).toContain('display: none');
  });

  it('uses full touch targets and safe-area-aware mobile overlays', () => {
    const mobile = mediaBlock('(max-width: 899px)');

    expect(mobile).toContain('.fullscreen-button {');
    expect(mobile).toContain('min-height: 44px');
    expect(mobile).toContain('.screen {');
    expect(mobile).toContain('env(safe-area-inset-left)');
    expect(mobile).toContain('env(safe-area-inset-right)');
  });

  it('gives phone landscape a centered dish with separate side rails', () => {
    const landscape = mediaBlock(
      '(max-width: 899px) and (orientation: landscape) and (max-height: 520px)',
    );

    expect(landscape).toContain('--landscape-dish-size: min(48svw, calc(100dvh - 104px), 420px)');
    expect(landscape).toContain('--landscape-rail-width: clamp(');
    expect(landscape).toContain('width: var(--landscape-dish-size)');
    expect(landscape).toContain('width: var(--landscape-rail-width)');
    expect(landscape).toContain('transform: translateX(calc(100% + 24px + env(safe-area-inset-right)))');
    expect(landscape).toContain('.mobile-lifeforms-open .life-panel,');
    expect(landscape).toContain('.mobile-log-open .ticker {');
    expect(landscape).toContain('transform: translateX(0)');
  });

  it('scales the tablet portrait dish as an intentional instrument', () => {
    const tablet = mediaBlock(
      '(min-width: 600px) and (max-width: 899px) and (orientation: portrait)',
    );

    expect(tablet).toContain('width: min(78vw, calc(100dvh - 260px), 720px)');
    expect(tablet).toContain('height: min(78vw, calc(100dvh - 260px), 720px)');
    expect(tablet).toContain('.hud,');
    expect(tablet).toContain('left: 24px');
    expect(tablet).toContain('right: 24px');
  });

  it('makes the portrait arena dish-first with a compact specimen dock', () => {
    expect(css).toContain('/* ---- Dish-first mobile arena');
    expect(css).toContain('--mobile-dish-size: min(104vw, calc(100dvh - 248px), 800px)');
    expect(css).toContain('grid-template-columns: repeat(3, minmax(0, 1fr))');
    expect(css).toContain('.layout[data-screen="arena"] .fullscreen-button');
    expect(css).toContain('flex: 1 0 calc((100vw - 27px) / 4)');
    expect(css).toContain('grid-auto-columns: calc((100vw - 27px) / 4)');
    expect(css).toContain('.layout[data-screen="arena"]:not(.mobile-lifeforms-open) .life-panel');
    expect(css).toContain('.layout[data-screen="arena"]:not(.mobile-log-open) .ticker');
    expect(css).toContain('.layout[data-screen="arena"] .life-panel-head');
  });
});
