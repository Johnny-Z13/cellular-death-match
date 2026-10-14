// @ts-expect-error Vitest runs this test in Node; the app tsconfig does not ship Node types.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const html = readFileSync('index.html', 'utf8');
const css = readFileSync('src/styles.css', 'utf8');
const mainSource = readFileSync('src/main.ts', 'utf8');

describe('Professor onboarding pointer', () => {
  it('uses Dr. E\'s live cell face as one decorative global guide', () => {
    const pointer = html.slice(html.indexOf('id="onboarding-guide-pointer"'), html.indexOf('</div>', html.indexOf('id="onboarding-guide-pointer"')));
    expect(html).toContain('class="onboarding-professor-pointer"');
    expect(pointer).toContain('<canvas class="dre-face" data-dre-slot="pointer" aria-hidden="true"></canvas>');
    expect(mainSource).toContain('createDrEPresence(visualProfile.additiveBloom);');
  });

  it('moves the same guide to controls, lifeforms, and exact dish positions', () => {
    expect(mainSource).toContain('const target = coach.getCurrentPointerTarget();');
    expect(mainSource).toContain("target === 'dish'");
    expect(mainSource).toContain("target.startsWith('tool:')");
    expect(mainSource).toContain("target.startsWith('lifeform:')");
    expect(mainSource).toContain("? '#mobile-lifeforms-toggle'");
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
