// @ts-expect-error Vitest runs this test in Node; the app tsconfig does not ship Node types.
import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const html = readFileSync('index.html', 'utf8');
const css = readFileSync('src/styles.css', 'utf8');
const mainSource = readFileSync('src/main.ts', 'utf8');

describe('Professor onboarding pointer', () => {
  it('uses the Professor portrait as one decorative global guide', () => {
    expect(existsSync('public/art/professor/professor-emergent-v1.png')).toBe(true);
    expect(html).toContain('id="onboarding-guide-pointer"');
    expect(html).toContain('class="onboarding-professor-pointer"');
    expect(html).toContain('src="/art/professor/professor-emergent-v1.png"');
    expect(html).toContain('alt=""');
  });

  it('moves the same guide to controls, lifeforms, and exact dish positions', () => {
    expect(mainSource).toContain('const target = coach.getCurrentPointerTarget();');
    expect(mainSource).toContain("target === 'dish'");
    expect(mainSource).toContain("target.startsWith('tool:')");
    expect(mainSource).toContain("target.startsWith('lifeform:')");
    expect(mainSource).toContain('setOnboardingDishPointerTarget(arena.getLastEggCellPos() ?? pos, true)');
    expect(mainSource).toContain('onboardingDishGuideTracksLastEgg ? arena.getLastEggCellPos() : null');
    expect(mainSource).toContain("onboardingGuidePointer.classList.add('is-visible')");
    expect(css).toContain('.onboarding-professor-pointer');
    expect(css).toContain('.onboarding-professor-pointer.is-visible');
    expect(css).toContain('pointer-events: none');
  });

  it('clears the guide before a genome reveal owns the screen', () => {
    const revealStart = mainSource.indexOf('function showPhaseAfterGenomeReveals(): void {');
    const revealEnd = mainSource.indexOf('function playGenomeDecodeSounds(', revealStart);
    const revealFlow = mainSource.slice(revealStart, revealEnd);

    expect(revealFlow).toContain('syncOnboardingPointer();');
    expect(revealFlow.indexOf('syncOnboardingPointer();')).toBeLessThan(
      revealFlow.indexOf('fx.showGenomeDecode('),
    );
  });
});
