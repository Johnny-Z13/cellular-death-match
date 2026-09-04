import { describe, it, expect } from 'vitest';
import { createArena, type Arena } from '../../src/game/arena';
import { TOOL_TUNING, AGITATION_TUNING, PASTE_TUNING } from '../../src/content/ecologyTuning';

function makeArena(toolCooldownMult?: number): Arena {
  return createArena({
    LX: 50,
    LY: 50,
    wrap: true,
    seed: 1,
    player: { targetVol: 100, speed: 10, engulfMultiplier: 5, bulletSize: 3, toolCooldownMult },
    // Stable, stationary colonies so the dish stays 'running' while tests
    // tick well past the longest cooldown window.
    enemies: [
      { archetype: 'swarmlet' as const, targetVol: 520, speed: 0, engulfMultiplier: 1 },
      { archetype: 'swarmlet' as const, targetVol: 520, speed: 0, engulfMultiplier: 1 },
      { archetype: 'swarmlet' as const, targetVol: 520, speed: 0, engulfMultiplier: 1 },
    ],
  });
}

function tickPast(arena: Arena, ticks: number): void {
  for (let i = 0; i < ticks; i++) {
    arena.tick({ moveVec: [0, 0], shouldFire: false, shouldEngulf: false });
  }
}

describe('reagent cooldowns', () => {
  it('charges every short Paste stroke and stops when the stock is empty', () => {
    const arena = makeArena(0);
    for (let i = 0; i < TOOL_TUNING.paste.charges; i++) {
      expect(arena.applyTool('paste', [10, 10])).toBe(true);
      arena.endPasteStroke();
      expect(arena.getToolStates().paste.charges).toBe(TOOL_TUNING.paste.charges - i - 1);
    }
    expect(arena.applyTool('paste', [10, 10])).toBe(false);
  });

  it('lets the last charge draw its full path and rejects excess distance without spending', () => {
    const arena = makeArena(0);
    for (let i = 1; i < TOOL_TUNING.paste.charges; i++) {
      arena.applyTool('paste', [10, 10]);
      arena.endPasteStroke();
    }
    expect(arena.applyTool('paste', [10, 10])).toBe(true);
    expect(arena.getToolStates().paste.charges).toBe(0);
    // Back and forth keeps all coordinates inside the dish.
    for (let i = 0; i < PASTE_TUNING.unitsPerCharge / 8; i++) {
      expect(arena.applyTool('paste', [i % 2 === 0 ? 18 : 10, 10])).toBe(true);
    }
    const stamps = arena.getToolEffects().length;
    expect(arena.applyTool('paste', [18, 10])).toBe(false);
    expect(arena.getToolEffects()).toHaveLength(stamps);
    expect(arena.getToolStates().paste.charges).toBe(0);
  });

  it('resets paid path at stroke end and retains distance overshoot between charges', () => {
    const arena = makeArena(0);
    arena.applyTool('paste', [10, 10]);
    arena.applyTool('paste', [40, 10]);
    arena.endPasteStroke();
    arena.applyTool('paste', [10, 10]);
    for (const x of [40, 10, 20]) expect(arena.applyTool('paste', [x, 10])).toBe(true);
    expect(arena.getToolStates().paste.charges).toBe(0);
    // This stroke has used 70 of its 128 paid units, leaving 58.
    for (const x of [40, 10, 18]) expect(arena.applyTool('paste', [x, 10])).toBe(true);
    expect(arena.applyTool('paste', [26, 10])).toBe(false);
  });

  it('rejects a same-tool reuse inside the cooldown window without spending a charge', () => {
    const arena = makeArena();
    expect(arena.applyTool('nutrient', [10, 10])).toBe(true);
    const chargesAfterFirst = arena.getToolStates().nutrient.charges;
    expect(arena.applyTool('nutrient', [30, 30])).toBe(false);
    expect(arena.getToolStates().nutrient.charges).toBe(chargesAfterFirst);
  });

  it('allows reuse once the cooldown window has passed', () => {
    const arena = makeArena();
    expect(arena.applyTool('nutrient', [10, 10])).toBe(true);
    tickPast(arena, TOOL_TUNING.nutrient.cooldownTicks);
    expect(arena.applyTool('nutrient', [30, 30])).toBe(true);
  });

  it('cools each tool independently', () => {
    const arena = makeArena();
    expect(arena.applyTool('nutrient', [10, 10])).toBe(true);
    expect(arena.applyTool('water', [30, 30])).toBe(true);
    expect(arena.applyTool('egg', [40, 40])).toBe(true);
  });

  it('reports remaining cooldown ticks that count down to zero', () => {
    const arena = makeArena();
    expect(arena.getToolStates().nutrient.cooldownRemainingTicks).toBe(0);
    arena.applyTool('nutrient', [10, 10]);
    const state = arena.getToolStates().nutrient;
    expect(state.cooldownTicks).toBe(TOOL_TUNING.nutrient.cooldownTicks);
    expect(state.cooldownRemainingTicks).toBe(TOOL_TUNING.nutrient.cooldownTicks);
    tickPast(arena, TOOL_TUNING.nutrient.cooldownTicks);
    expect(arena.getToolStates().nutrient.cooldownRemainingTicks).toBe(0);
  });

  it('does not gate mid-stroke paste stamps, but gates the next stroke after stroke end', () => {
    const arena = makeArena();
    expect(arena.applyTool('paste', [10, 10])).toBe(true);
    // Mid-stroke stamps continue freely past stampSpacing regardless of cooldown.
    expect(arena.applyTool('paste', [18, 10])).toBe(true);
    expect(arena.applyTool('paste', [26, 10])).toBe(true);
    arena.endPasteStroke();
    expect(arena.applyTool('paste', [40, 40])).toBe(false);
    tickPast(arena, TOOL_TUNING.paste.cooldownTicks);
    expect(arena.applyTool('paste', [40, 40])).toBe(true);
  });

  it('does not start a paste cooldown when the stroke never stamped', () => {
    const arena = makeArena();
    arena.endPasteStroke();
    expect(arena.applyTool('paste', [10, 10])).toBe(true);
  });

  it('gates agitate re-use on its cooldown', () => {
    const arena = makeArena();
    expect(arena.agitate()).toBe(true);
    expect(arena.agitate()).toBe(false);
    tickPast(arena, AGITATION_TUNING.cooldownTicks);
    expect(arena.agitate()).toBe(true);
  });

  it('exposes agitation cooldown state for the UI', () => {
    const arena = makeArena();
    expect(arena.getAgitationState().cooldownRemainingTicks).toBe(0);
    arena.agitate();
    expect(arena.getAgitationState().cooldownRemainingTicks).toBe(AGITATION_TUNING.cooldownTicks);
  });

  it('toolCooldownMult 0 disables gating entirely', () => {
    const arena = makeArena(0);
    expect(arena.applyTool('nutrient', [10, 10])).toBe(true);
    expect(arena.applyTool('nutrient', [30, 30])).toBe(true);
    expect(arena.agitate()).toBe(true);
    expect(arena.agitate()).toBe(true);
  });

  it('toolCooldownMult scales the effective window', () => {
    const arena = makeArena(0.5);
    arena.applyTool('nutrient', [10, 10]);
    expect(arena.getToolStates().nutrient.cooldownRemainingTicks).toBe(
      Math.round(TOOL_TUNING.nutrient.cooldownTicks * 0.5),
    );
  });
});

describe('cooldown tuning drift guard', () => {
  it('every reagent has a positive cooldownTicks', () => {
    for (const [tool, tuning] of Object.entries(TOOL_TUNING)) {
      expect(tuning.cooldownTicks, `TOOL_TUNING.${tool}.cooldownTicks`).toBeGreaterThan(0);
    }
    expect(AGITATION_TUNING.cooldownTicks).toBeGreaterThan(0);
  });
});
