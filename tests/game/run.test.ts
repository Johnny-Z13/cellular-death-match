import { describe, it, expect } from 'vitest';
import { createRun, FIGHTS_PER_RUN } from '../../src/game/run';
import { OBJECTIVES } from '../../src/content/objectives';

describe('createRun — initial', () => {
  it('starts in title phase', () => {
    const run = createRun(42);
    expect(run.getState().phase).toBe('title');
    expect(run.getState().fightIndex).toBe(0);
    expect(run.getState().upgrades).toEqual([]);
    expect(run.getState().outcome).toBeNull();
  });

  it('runs one ecosystem for every authored objective', () => {
    expect(FIGHTS_PER_RUN).toBe(OBJECTIVES.length);
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
    // Win and pick through every non-final epoch, then the final win ends the run.
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

describe('getPlayerConfig', () => {
  it('player config reflects accumulated upgrades', () => {
    const run = createRun(42);
    run.start();
    run.winFight();
    // Force pick of a known lab research option if available; else any.
    const choices = run.getState().pendingPickChoices;
    const researchChoice = choices.find((c) => c === 'egg_1') ?? choices[0]!;
    run.pickUpgrade(researchChoice);
    const cfg = run.getPlayerConfig();
    if (researchChoice === 'egg_1') {
      expect(cfg.eggCharges).toBe(10);   // 8 + 2
    } else {
      expect(cfg.targetVol).toBeGreaterThanOrEqual(420);
    }
  });
});

describe('getFightSpawnList', () => {
  it('returns the schedule entry for epoch 0 (bruiser ecology)', () => {
    const run = createRun(42);
    run.start();
    const list = run.getFightSpawnList();
    expect(list.length).toBe(4);
    expect(list[0]!.archetype).toBe('bruiser');
  });

  it('returns the schedule entry for epoch 4 (boss ecology)', () => {
    const run = createRun(42);
    run.start();
    // Advance to epoch 4.
    for (let i = 0; i < 4; i++) {
      run.winFight();
      run.pickUpgrade(run.getState().pendingPickChoices[0]!);
    }
    expect(run.getState().fightIndex).toBe(4);
    const list = run.getFightSpawnList();
    expect(list.map((e) => e.archetype).sort()).toEqual(['boss', 'sniper', 'splitter']);
  });

  it('returns the final boss-cultivation objective after the boss egg unlock', () => {
    const run = createRun(42);
    run.start();
    for (let i = 0; i < FIGHTS_PER_RUN - 1; i++) {
      run.winFight();
      run.pickUpgrade(run.getState().pendingPickChoices[0]!);
    }

    expect(run.getState().fightIndex).toBe(FIGHTS_PER_RUN - 1);
    expect(run.getObjective().kind).toBe('dominant_archetype');
    expect(run.getObjective().archetype).toBe('boss');
  });

  it('getEpochSpawnList returns defensive copies', () => {
    const run = createRun(42);
    run.start();
    const first = run.getEpochSpawnList();
    first[0]!.targetVol = 1;
    expect(run.getEpochSpawnList()[0]!.targetVol).not.toBe(1);
  });
});
