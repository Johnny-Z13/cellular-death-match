import { describe, it, expect } from 'vitest';
import { createRun, FIGHTS_PER_RUN } from '../../src/game/run';

describe('createRun — initial', () => {
  it('starts in title phase', () => {
    const run = createRun(42);
    expect(run.getState().phase).toBe('title');
    expect(run.getState().fightIndex).toBe(0);
    expect(run.getState().upgrades).toEqual([]);
    expect(run.getState().outcome).toBeNull();
  });
});

describe('start', () => {
  it('transitions title → arena, fightIndex = 0', () => {
    const run = createRun(42);
    run.start();
    expect(run.getState().phase).toBe('arena');
    expect(run.getState().fightIndex).toBe(0);
  });
});

describe('winFight — non-final fight', () => {
  it('transitions arena → upgrade_pick with 3 unique choices', () => {
    const run = createRun(42);
    run.start();
    run.winFight();
    const s = run.getState();
    expect(s.phase).toBe('upgrade_pick');
    expect(s.pendingPickChoices.length).toBe(3);
    expect(new Set(s.pendingPickChoices).size).toBe(3);
  });

  it('does not advance fightIndex until upgrade is picked', () => {
    const run = createRun(42);
    run.start();
    run.winFight();
    expect(run.getState().fightIndex).toBe(0);
  });
});

describe('pickUpgrade', () => {
  it('transitions upgrade_pick → arena and advances fightIndex', () => {
    const run = createRun(42);
    run.start();
    run.winFight();
    const choices = run.getState().pendingPickChoices;
    const choice = choices[0]!;
    run.pickUpgrade(choice);
    const s = run.getState();
    expect(s.phase).toBe('arena');
    expect(s.fightIndex).toBe(1);
    expect(s.upgrades.length).toBe(1);
    expect(s.upgrades[0]!.id).toBe(choice);
  });

  it('rejects an upgrade id that wasn\'t in the pick choices', () => {
    const run = createRun(42);
    run.start();
    run.winFight();
    expect(() => run.pickUpgrade('not_offered')).toThrow();
    expect(run.getState().phase).toBe('upgrade_pick');
  });
});

describe('winFight — final fight ends the run', () => {
  it(`winFight on fight ${FIGHTS_PER_RUN - 1} transitions arena → run_end (won)`, () => {
    const run = createRun(42);
    run.start();
    // Win and pick through fights 0..6, then on fight 7 (the 8th, final) winFight should end the run.
    for (let i = 0; i < FIGHTS_PER_RUN - 1; i++) {
      run.winFight();
      const choice = run.getState().pendingPickChoices[0]!;
      run.pickUpgrade(choice);
    }
    expect(run.getState().fightIndex).toBe(FIGHTS_PER_RUN - 1);
    expect(run.getState().phase).toBe('arena');
    run.winFight();
    expect(run.getState().phase).toBe('run_end');
    expect(run.getState().outcome).toBe('won');
  });
});

describe('loseFight', () => {
  it('transitions any non-end phase → run_end (lost) with fightIndex preserved', () => {
    const run = createRun(42);
    run.start();
    run.winFight();
    const choice = run.getState().pendingPickChoices[0]!;
    run.pickUpgrade(choice);
    // Now in fight 1.
    run.loseFight();
    const s = run.getState();
    expect(s.phase).toBe('run_end');
    expect(s.outcome).toBe('lost');
    expect(s.fightIndex).toBe(1);
  });
});

describe('restart', () => {
  it('returns to title phase with fresh state', () => {
    const run = createRun(42);
    run.start();
    run.winFight();
    run.pickUpgrade(run.getState().pendingPickChoices[0]!);
    run.loseFight();
    expect(run.getState().phase).toBe('run_end');
    run.restart();
    const s = run.getState();
    expect(s.phase).toBe('title');
    expect(s.fightIndex).toBe(0);
    expect(s.upgrades).toEqual([]);
    expect(s.outcome).toBeNull();
  });
});

describe('getPlayerConfig / getEnemyConfig', () => {
  it('player config reflects accumulated upgrades', () => {
    const run = createRun(42);
    run.start();
    run.winFight();
    // Force pick of "vol_1" if available; else any.
    const choices = run.getState().pendingPickChoices;
    const volChoice = choices.find((c) => c === 'vol_1') ?? choices[0]!;
    run.pickUpgrade(volChoice);
    const cfg = run.getPlayerConfig();
    if (volChoice === 'vol_1') {
      expect(cfg.targetVol).toBe(350);   // 300 + 50
    } else {
      // Any other valid choice should produce a different valid config.
      expect(cfg.targetVol).toBeGreaterThanOrEqual(300);
    }
  });

  it('enemy config scales with fightIndex (+10% per fight)', () => {
    const run = createRun(42);
    run.start();
    const fight1 = run.getEnemyConfig();
    expect(fight1.targetVol).toBe(450);
    // Advance to fight 1 (after one win + pick).
    run.winFight();
    run.pickUpgrade(run.getState().pendingPickChoices[0]!);
    const fight2 = run.getEnemyConfig();
    expect(fight2.targetVol).toBeCloseTo(450 * 1.1, 5);
  });
});
