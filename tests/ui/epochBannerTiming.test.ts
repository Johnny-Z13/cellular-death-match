// @ts-expect-error Vitest runs this test in Node; the app tsconfig does not ship Node types.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync('src/styles.css', 'utf8');
const fxSource = readFileSync('src/ui/fx.ts', 'utf8');
const mainSource = readFileSync('src/main.ts', 'utf8');

describe('epoch intro banner timing', () => {
  it('keeps the first epoch popup readable for about one second longer', () => {
    expect(css).toContain('animation: fx-banner-cycle 3200ms');
    expect(fxSource).toContain('accent ? 1900 : 2600');
  });

  it('clears queued dish banners before showing a non-arena decision screen', () => {
    expect(fxSource).toContain('clearPhaseVisuals()');
    expect(fxSource).toContain('mobileDirector.clear()');
    expect(mainSource).toContain("if (state.phase !== 'arena') fx.clearPhaseVisuals();");
    expect(css).toContain('.layout:not([data-screen="arena"]) .fx-banner');
  });

  it('removes the transition class when a wipe finishes', () => {
    expect(fxSource).toContain("wipe?.addEventListener('animationend'");
    expect(fxSource).toContain("wipe.classList.remove('fx-wipe-play')");
  });

  it('keeps ordinary Trial and Study introductions in a deduplicated visible rail', () => {
    expect(mainSource).toContain('studyIntroductionRoute({');
    expect(mainSource).toContain("if (introduction.owner === 'director')");
    expect(mainSource).toContain('if (introduction.showCentralBanner)');
    expect(css).toContain('.hud-director.hud-director-intro');
    expect(css).toContain('@keyframes hud-director-intro-pulse');
  });
});
