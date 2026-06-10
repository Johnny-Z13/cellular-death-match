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
    expect(screensSource).toContain("item.style.setProperty('--life-color', rgb(identity.colors.primary));");
    // Swatches are built by makeSwatch from the identity color so the rack icon
    // reads like the same organism that blooms in the dish, not a flat chip.
    expect(screensSource).toContain('makeSwatch(\'\', option.color,');
    expect(screensSource).toContain('makeSwatch(`life-swatch-${identity.renderStyle}`, identity.colors.primary,');
  });

  it('builds the swatch bloom from the identity color with a lightened core', () => {
    // The bloom must be derived from the exact identity color (no recoloring),
    // so the rack and the dish stay in lockstep.
    expect(screensSource).toContain('function bloomGradient(color: [number, number, number]): string {');
    expect(screensSource).toContain('radial-gradient(circle at 42% 38%');
    expect(screensSource).toContain('${rgb(color)} 58%');
    // makeSwatch stamps the bloom onto the swatch and tracks it for unlock.
    expect(screensSource).toContain('swatch.dataset.lifeColor = bloomGradient(color)');
    expect(screensSource).toContain('swatch.style.background = bloomGradient(color)');
  });

  it('overlays a live cellular-automata canvas on each swatch tinted to its color', () => {
    expect(screensSource).toContain("import { createIconCells } from './iconCells'");
    expect(screensSource).toContain('iconCells.register(cv, color, seed)');
    expect(screensSource).toContain("cv.className = 'life-swatch-cells'");
  });
});
