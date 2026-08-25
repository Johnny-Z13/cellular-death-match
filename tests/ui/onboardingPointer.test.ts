// @ts-expect-error Vitest runs this test in Node; the app tsconfig does not ship Node types.
import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const html = readFileSync('index.html', 'utf8');
const css = readFileSync('src/styles.css', 'utf8');
const mainSource = readFileSync('src/main.ts', 'utf8');

describe('onboarding touch pointer', () => {
  it('ships the shared Bric Kinetic hand asset and marks it decorative', () => {
    expect(existsSync('public/art/ui/onboarding-pointer.png')).toBe(true);
    expect(html).toContain('id="onboarding-dish-pointer"');
    expect(html.match(/src="\/art\/ui\/onboarding-pointer\.png"/g)?.length).toBe(2);
    expect(html).toContain('class="onboarding-pointer onboarding-pointer-tool"');
  });

  it('moves guidance from the dish to Nutrient and back beside the egg', () => {
    expect(mainSource).toContain("layout.classList.add('onboarding-point-dish')");
    expect(mainSource).toContain("selectedTool === 'nutrient' ? 'onboarding-point-dish' : 'onboarding-point-nutrient'");
    expect(mainSource).toContain('setOnboardingDishPointerTarget(pos, true)');
    expect(css).toContain('.onboarding-point-dish:not(.coach-intro-active):not(.coach-prompt-active)');
    expect(css).toContain('[data-tool="nutrient"] .onboarding-pointer-tool');
    expect(css).toContain('pointer-events: none');
  });
});
