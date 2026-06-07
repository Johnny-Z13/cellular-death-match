// @ts-expect-error Vitest runs this test in Node; the app tsconfig does not ship Node types.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const renderSource = readFileSync('src/ui/render.ts', 'utf8');
const screensSource = readFileSync('src/ui/screens.ts', 'utf8');

describe('lifeform color consistency', () => {
  it('renders dish lifeforms from the same primary color advertised by the UI identity', () => {
    expect(renderSource).toContain('rgba(lifeformIdentityForSpawn(spawn).colors.primary)');
    expect(renderSource).not.toContain('if (spawn?.breedId) base = mixColor(base, lifeformIdentityForSpawn(spawn).colors.accent');
    expect(renderSource).toContain('spawn?.breedId ? base : traitColor(base, spawn?.traits)');
  });

  it('sets lifeform rack swatches from archetype and rare identity colors', () => {
    expect(screensSource).toContain("button.style.setProperty('--life-color', rgb(option.color));");
    expect(screensSource).toContain("swatch.style.background = rgb(option.color);");
    expect(screensSource).toContain("item.style.setProperty('--life-color', rgb(identity.colors.primary));");
    expect(screensSource).toContain('itemSwatch.style.background = rgb(identity.colors.primary);');
  });
});
