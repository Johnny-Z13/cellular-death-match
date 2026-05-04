import { describe, it, expect } from 'vitest';
import {
  FIGHT_SCHEDULE,
  ARCHETYPE_DEFAULTS,
  type EnemyArchetype,
} from '../../src/content/enemies';

describe('FIGHT_SCHEDULE', () => {
  it('has exactly 8 fights', () => {
    expect(FIGHT_SCHEDULE.length).toBe(8);
  });

  it('every fight has at least one enemy', () => {
    for (const fight of FIGHT_SCHEDULE) {
      expect(fight.length).toBeGreaterThan(0);
    }
  });

  it('matches the spec schedule', () => {
    // Spec section 7.1 fight schedule:
    expect(FIGHT_SCHEDULE[0]!.map((e) => e.archetype)).toEqual(['bruiser']);
    expect(FIGHT_SCHEDULE[1]!.map((e) => e.archetype)).toEqual(['sniper']);
    expect(FIGHT_SCHEDULE[2]!.map((e) => e.archetype).sort()).toEqual(['bruiser', 'sniper']);
    expect(FIGHT_SCHEDULE[3]!.map((e) => e.archetype)).toEqual(['splitter']);
    expect(FIGHT_SCHEDULE[4]!.length).toBe(4);
    for (const e of FIGHT_SCHEDULE[4]!) expect(e.archetype).toBe('swarmlet');
    expect(FIGHT_SCHEDULE[5]!.map((e) => e.archetype)).toEqual(['mirror']);
    expect(FIGHT_SCHEDULE[6]!.map((e) => e.archetype).sort()).toEqual(['sniper', 'splitter']);
    expect(FIGHT_SCHEDULE[7]!.map((e) => e.archetype)).toEqual(['boss']);
  });

  it('fight 7 spawns are elite (+20% stats vs base)', () => {
    const elite = FIGHT_SCHEDULE[6]!;
    for (const e of elite) {
      const base = ARCHETYPE_DEFAULTS[e.archetype];
      // +20% targetVol applied.
      expect(e.targetVol).toBeCloseTo(base.targetVol * 1.2, 5);
    }
  });
});

describe('ARCHETYPE_DEFAULTS', () => {
  it('has defaults for every archetype', () => {
    const required: EnemyArchetype[] = ['bruiser', 'sniper', 'splitter', 'swarmlet', 'mirror', 'boss'];
    for (const a of required) {
      expect(ARCHETYPE_DEFAULTS[a]).toBeDefined();
      expect(ARCHETYPE_DEFAULTS[a].targetVol).toBeGreaterThan(0);
    }
  });

  it('boss has 3x the bruiser targetVol per spec', () => {
    expect(ARCHETYPE_DEFAULTS.boss.targetVol).toBeCloseTo(ARCHETYPE_DEFAULTS.bruiser.targetVol * 3, 5);
  });

  it('snipers have shoot fields', () => {
    const sniper = ARCHETYPE_DEFAULTS.sniper;
    expect(sniper.shootCooldown).toBeDefined();
    expect(sniper.bulletSize).toBeDefined();
    expect(sniper.bulletSpeed).toBeDefined();
  });
});
