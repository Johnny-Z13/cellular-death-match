import { describe, it, expect } from 'vitest';
import { createArena, type Arena } from '../../src/game/arena';
import { TOOL_TUNING, AGITATION_TUNING } from '../../src/content/ecologyTuning';

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
