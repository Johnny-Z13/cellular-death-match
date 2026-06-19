import { describe, it, expect } from 'vitest';
import type { ObjectiveDef } from '../../src/content/objectives';
import { createRun, FIXED_EPOCH_COUNT } from '../../src/game/run';

function pickFirstUpgradeAndObjective(run: ReturnType<typeof createRun>): void {
  run.pickUpgrade(run.getState().pendingPickChoices[0]!);
  if (run.getState().phase === 'objective_pick') {
    run.setChosenObjective(run.getObjectiveChoices(new Set(['needle_swarm', 'bloom_mass']), ['nutrient', 'toxin', 'water', 'salt'])[0]!);
  }
}

describe('createRun — initial', () => {
  it('starts in title phase', () => {
    const run = createRun(42);
    expect(run.getState().phase).toBe('title');
    expect(run.getState().fightIndex).toBe(0);
    expect(run.getState().upgrades).toEqual([]);
    expect(run.getState().outcome).toBeNull();
  });

  it('has 3 fixed epochs', () => {
    expect(FIXED_EPOCH_COUNT).toBe(3);
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

describe('open-ended run', () => {
  it('does not end after epoch 6 — continues to epoch 7+', () => {
    const run = createRun(42);
    run.start();
    for (let i = 0; i < 7; i++) {
      run.completeEpoch();
      if (run.getState().phase === 'upgrade_pick') {
        pickFirstUpgradeAndObjective(run);
      }
    }
    expect(run.getState().phase).not.toBe('run_end');
  });

  it('failEpoch still ends the run (collapse)', () => {
    const run = createRun(42);
    run.start();
    run.failEpoch();
    expect(run.getState().phase).toBe('run_end');
    expect(run.getState().outcome).toBe('lost');
  });

  it('achieveHomeostasis ends the run as won', () => {
    const run = createRun(42);
    run.start();
    for (let i = 0; i < 4; i++) {
      run.completeEpoch();
      pickFirstUpgradeAndObjective(run);
    }
    run.achieveHomeostasis();
    expect(run.getState().phase).toBe('run_end');
    expect(run.getState().outcome).toBe('won');
  });
});

describe('skipEpoch — forgiving lapse', () => {
  it('advances past a lapsed objective and records completed-vs-lapsed results', () => {
    const run = createRun(42);
    run.start();
    run.skipEpoch();
    expect(run.getState().phase).toBe('upgrade_pick');
    pickFirstUpgradeAndObjective(run);
    run.completeEpoch();
    expect(run.getState().epochResults).toEqual(['lapsed', 'completed']);
  });
});

describe('loseFight', () => {
  it('transitions any non-end phase → run_end (lost) with fightIndex preserved', () => {
    const run = createRun(42);
    run.start();
    run.winFight();
    const choice = run.getState().pendingPickChoices[0]!;
    run.pickUpgrade(choice);
    if (run.getState().phase === 'objective_pick') {
      run.setChosenObjective(run.getObjectiveChoices(new Set(['needle_swarm', 'bloom_mass']), ['nutrient', 'toxin', 'water', 'salt'])[0]!);
    }
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
    pickFirstUpgradeAndObjective(run);
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
    const choices = run.getState().pendingPickChoices;
    const researchChoice = choices.find((c) => c === 'egg_1') ?? choices[0]!;
    run.pickUpgrade(researchChoice);
    const cfg = run.getPlayerConfig();
    if (researchChoice === 'egg_1') {
      expect(cfg.eggCharges).toBe(10);
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

  it('getEpochSpawnList returns defensive copies', () => {
    const run = createRun(42);
    run.start();
    const first = run.getEpochSpawnList();
    first[0]!.targetVol = 1;
    expect(run.getEpochSpawnList()[0]!.targetVol).not.toBe(1);
  });
});

describe('first-run onboarding spawn list', () => {
  it('starts epoch 0 with the hidden Bloom pairing for the guided first dish', () => {
    const run = createRun(42);
    run.start();
    const list = run.getOnboardingSpawnList();
    expect(list.map((spawn) => spawn.archetype)).toEqual(['swarmlet', 'splitter']);
  });
});

describe('objectives', () => {
  it('epoch 0 is discover_breed (onboarding)', () => {
    const run = createRun(42);
    run.start();
    expect(run.getObjective().kind).toBe('discover_breed');
    expect(run.getObjective().breedId).toBe('bloom_mass');
  });

  it('mid-game uses chosen objective when set', () => {
    const run = createRun(42);
    run.start();
    for (let i = 0; i < 2; i++) {
      run.completeEpoch();
      run.pickUpgrade(run.getState().pendingPickChoices[0]!);
    }
    run.completeEpoch();
    run.pickUpgrade(run.getState().pendingPickChoices[0]!);
    expect(run.getState().fightIndex).toBe(3);
    expect(run.getState().phase).toBe('objective_pick');
    const obj: ObjectiveDef = { kind: 'mega_culture', name: 'Test', description: 'Test', target: 'Test' };
    run.setChosenObjective(obj);
    expect(run.getState().phase).toBe('arena');
    expect(run.getObjective().kind).toBe('mega_culture');
  });

  it('enters objective_pick after the upgrade that opens mid-game', () => {
    const run = createRun(42);
    run.start();
    for (let i = 0; i < FIXED_EPOCH_COUNT - 1; i++) {
      run.completeEpoch();
      run.pickUpgrade(run.getState().pendingPickChoices[0]!);
      expect(run.getState().phase).toBe('arena');
    }

    run.completeEpoch();
    run.pickUpgrade(run.getState().pendingPickChoices[0]!);

    expect(run.getState().fightIndex).toBe(FIXED_EPOCH_COUNT);
    expect(run.getState().phase).toBe('objective_pick');
    expect(() => run.getObjective()).toThrow(/objective/i);
  });

  it('getObjectiveChoices returns 2 choices for mid-game', () => {
    const run = createRun(42);
    run.start();
    for (let i = 0; i < 2; i++) {
      run.completeEpoch();
      run.pickUpgrade(run.getState().pendingPickChoices[0]!);
    }
    run.completeEpoch();
    run.pickUpgrade(run.getState().pendingPickChoices[0]!);
    expect(run.getState().phase).toBe('objective_pick');
    const choices = run.getObjectiveChoices(new Set(['bloom_mass']), ['egg', 'nutrient', 'toxin', 'water']);
    expect(choices.length).toBe(2);
  });
});
