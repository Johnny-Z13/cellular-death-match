import { describe, expect, it } from 'vitest';
import { FORMS } from '../../src/content/forms';
import { layoutCultures } from '../../src/ui/specimen';

// In the dex art, cultures that touch in a form must touch, and ones that do
// not must sit apart, so a chain never reads as a triangle.
describe('specimen layout', () => {
  it('draws every form with exactly its touching pairs touching', () => {
    for (const form of FORMS) {
      const spots = layoutCultures(form.strains.length, form.touching);
      for (let a = 0; a < spots.length; a++) {
        for (let b = a + 1; b < spots.length; b++) {
          const A = spots[a]!;
          const B = spots[b]!;
          const gap = Math.hypot(A.x - B.x, A.y - B.y) - (A.r + B.r);
          const touching = form.touching.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
          if (touching) expect(gap, `${form.id} ${a}-${b}`).toBeLessThan(0);
          else expect(gap, `${form.id} ${a}-${b}`).toBeGreaterThan(0);
        }
      }
    }
  });
});
