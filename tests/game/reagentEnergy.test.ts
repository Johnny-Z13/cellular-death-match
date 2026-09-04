import { describe, expect, it } from 'vitest';
import { createArena } from '../../src/game/arena';
import { REAGENT_SHIFT_LIMITS } from '../../src/sim/breedProfiles';

describe('overlapping reagent forces', () => {
  it.each(['nutrient', 'salt', 'acid'] as const)('keeps %s stacking within stable limits', (tool) => {
    const arena = createArena({
      LX: 80, LY: 80, wrap: true, seed: 31, mode: 'ecosystem',
      player: { targetVol: 100, speed: 0, engulfMultiplier: 1, bulletSize: 3, toolCooldownMult: 0 },
      enemies: [{ archetype: 'bruiser', targetVol: 300, speed: 0, engulfMultiplier: 1 }],
    });
    const colony = arena.state.cells.get(1)!;
    const pos: [number, number] = [...colony.center];
    const charges = arena.getToolStates()[tool].charges;
    for (let i = 0; i < charges; i++) expect(arena.applyTool(tool, pos)).toBe(true);
    // Add trail fields to exercise the second accumulation pass as well.
    if (tool === 'nutrient') {
      for (let i = 0; i < 3; i++) {
        arena.applyTool('paste', pos);
        arena.endPasteStroke();
      }
    }
    arena.tick({ moveVec: [0, 0], shouldFire: false, shouldEngulf: false });
    for (const shift of Object.values(colony.energyShifts!)) {
      expect(shift).toBeGreaterThanOrEqual(REAGENT_SHIFT_LIMITS.min);
      expect(shift).toBeLessThanOrEqual(REAGENT_SHIFT_LIMITS.max);
      expect(1 + shift).toBeGreaterThan(0);
    }
    if (tool === 'nutrient') expect(colony.energyShifts!.volShift).toBe(REAGENT_SHIFT_LIMITS.min);
  });
});
