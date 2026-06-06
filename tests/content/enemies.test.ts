import { describe, it, expect } from 'vitest';
import {
  ECOSYSTEM_SCHEDULE,
  FIGHT_SCHEDULE,
  ARCHETYPE_DEFAULTS,
  ARCHETYPE_INFO,
  type EnemyArchetype,
} from '../../src/content/enemies';

describe('ECOSYSTEM_SCHEDULE', () => {
  it('has exactly 6 longer ecosystems', () => {
    expect(ECOSYSTEM_SCHEDULE.length).toBe(6);
  });

  it('keeps the old export as a compatibility alias', () => {
    expect(FIGHT_SCHEDULE).toBe(ECOSYSTEM_SCHEDULE);
  });

  it('every ecosystem starts with a mixed population', () => {
    for (const epoch of ECOSYSTEM_SCHEDULE) {
      expect(epoch.length).toBeGreaterThan(1);
    }
  });

  it('ramps toward a boss ecology', () => {
    expect(ECOSYSTEM_SCHEDULE[0]!.map((e) => e.archetype)).toEqual([
      'bruiser',
      'swarmlet',
      'swarmlet',
      'swarmlet',
    ]);
    expect(ECOSYSTEM_SCHEDULE[4]!.map((e) => e.archetype).sort()).toEqual([
      'boss',
      'sniper',
      'splitter',
    ]);
    expect(ECOSYSTEM_SCHEDULE[5]!.map((e) => e.archetype).sort()).toEqual([
      'bruiser',
      'mirror',
      'sniper',
      'splitter',
      'swarmlet',
      'swarmlet',
    ]);
  });

  it('later ecosystems include elite cells', () => {
    const elite = ECOSYSTEM_SCHEDULE[3]!.filter((e) => e.archetype === 'splitter');
    for (const e of elite) {
      const base = ARCHETYPE_DEFAULTS[e.archetype];
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

describe('ARCHETYPE_INFO', () => {
  it('has guide copy and colors for every archetype', () => {
    const required: EnemyArchetype[] = ['bruiser', 'sniper', 'splitter', 'swarmlet', 'mirror', 'boss'];
    for (const archetype of required) {
      const info = ARCHETYPE_INFO[archetype];
      expect(info.name.length).toBeGreaterThan(0);
      expect(info.summary.length).toBeGreaterThan(0);
      expect(info.color).toHaveLength(3);
    }
  });
});
