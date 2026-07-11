// @ts-expect-error Vitest runs this test in Node; the app tsconfig does not ship Node types.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync('src/styles.css', 'utf8');

describe('desktop layout CSS', () => {
  it('centers the dish in the viewport and snaps the right rack and log to it', () => {
    expect(css).toContain('--desktop-dish-size');
    expect(css).toContain('--desktop-rack-width');
    expect(css).toContain('padding: 0');
    expect(css).toContain('place-items: center');
    expect(css).toContain('width: var(--desktop-dish-size)');
    expect(css).toContain('height: var(--desktop-dish-size)');
    expect(css).toContain('left: calc(50vw + (var(--desktop-dish-size) / 2) + var(--desktop-gap))');
    expect(css).toContain('top: calc(50svh - (var(--desktop-dish-size) / 2))');
    expect(css).toContain('height: var(--desktop-dish-size)');
    expect(css).toContain('left: calc(50vw - (var(--desktop-dish-size) / 2) - var(--desktop-gap) - var(--desktop-rack-width))');
    expect(css).toContain('overflow-x: hidden');
    expect(css).toContain('bottom: calc(50svh + (var(--desktop-dish-size) / 2) + var(--desktop-gap))');
    // The desktop HUD sizes to its (trimmed) content instead of a fixed height
    // with overflow:hidden — that fixed height used to clip the hint's last line.
    expect(css).toContain('min-height: auto');
    expect(css).toContain('overflow-x: hidden');
    expect(css).not.toContain('width: var(--desktop-rack-width);\n  }\n\n  .hud-val');
    expect(css).toContain('top: calc(50svh + (var(--desktop-dish-size) / 2) + var(--desktop-gap))');
    expect(css).toContain('width: var(--desktop-dish-size)');
    expect(css).toContain('@media (min-width: 900px) {');
    expect(css).toContain('.mobile-shell {\n    display: none;\n  }');
    expect(css).toContain('@media (min-width: 1181px) and (max-height: 780px) {');
    expect(css).toContain('top: 8px');
    expect(css).toContain('min-height: 104px');
    expect(css).toContain('bottom: auto');
    expect(css).toContain('.hud-volume-row,');
    expect(css).toContain('.hud-ecology-row,');
  });

  it('trims the wide-desktop HUD so the band above the dish never clips it', () => {
    // Verbose ecology/volume/upgrade rows are hidden from 900px up (they live in
    // the notebook / debug panel), and the hint row is dropped on wide desktop
    // where the band above the dish is shortest — leaving Epoch/Deadline/
    // Equilibrium/Objective, which fit without the old overflow:hidden clip.
    const wideBlock = css.slice(
      css.indexOf('@media (min-width: 1181px) {'),
      css.indexOf('@media (min-width: 1181px) and (max-height: 780px) {'),
    );
    expect(wideBlock).toContain('.hud-hint-row {');
    expect(wideBlock).toContain('display: none;');
    expect(wideBlock).toContain('min-height: auto;');
  });

  it('caps the centered-layout dish log to lines that fit — hidden, not half-clipped', () => {
    // The >=900px legacy layout re-enables log lines 3-6 for its roomy bottom
    // strip, but the centered-instrument layouts box the ticker into the shallow
    // overflow:hidden band below the dish (~2 lines tall), so they must cap the
    // visible lines back down or the third line renders as a half-cut strip.
    const wideBlock = css.slice(
      css.indexOf('@media (min-width: 1181px) {'),
      css.indexOf('@media (min-width: 1181px) and (max-height: 780px) {'),
    );
    const bandBlock = css.slice(
      css.indexOf('@media (min-width: 900px) and (max-width: 1180px) {'),
      css.indexOf('@media (min-width: 900px) and (max-width: 1180px) and (max-height: 780px) {'),
    );
    expect(wideBlock).toContain('.ticker-line:nth-child(n + 3) {\n    display: none;\n  }');
    expect(bandBlock).toContain('.ticker-line:nth-child(n + 3) {\n    display: none;\n  }');
  });

  it('drops the wide-desktop log to a single pinned line on short windows', () => {
    // Mirrors the 900-1180 short-height fallback: below 780px the band under
    // the dish is too shallow even for title + two lines.
    const wideShortBlock = css.slice(
      css.indexOf('@media (min-width: 1181px) and (max-height: 780px) {'),
      css.indexOf('@media (min-width: 1600px) {'),
    );
    expect(wideShortBlock).toContain('.ticker {');
    expect(wideShortBlock).toContain('bottom: 8px;');
    expect(wideShortBlock).toContain('max-height: 76px;');
    expect(wideShortBlock).toContain('.ticker-title {\n    display: none;\n  }');
    expect(wideShortBlock).toContain('.ticker-line:nth-child(n + 2) {\n    display: none;\n  }');
  });
});
