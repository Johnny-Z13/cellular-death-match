import { describe, expect, it } from 'vitest';
import type { EnemySpawn } from '../../src/content/enemies';
import type { ObjectiveDef } from '../../src/content/objectives';
import { goalCultureIds } from '../../src/game/goalTargets';

const base = { name: '', description: '', target: '' };

function spawn(archetype: EnemySpawn['archetype'], breedId?: EnemySpawn['breedId']): EnemySpawn {
  return { archetype, breedId, targetVol: 100, speed: 1, engulfMultiplier: 1 };
}

const cultures = new Map<number, { spawn: EnemySpawn; vol: number }>([
  [2, { spawn: spawn('swarmlet'), vol: 120 }],
  [3, { spawn: spawn('splitter', 'bloom_mass'), vol: 300 }],
  [4, { spawn: spawn('bruiser'), vol: 500 }],
  [5, { spawn: spawn('splitter'), vol: 80 }],
  [6, { spawn: spawn('swarmlet'), vol: 0 }],
]);

describe('goalCultureIds', () => {
  it('marks the named strain for strain goals', () => {
    const def: ObjectiveDef = { ...base, kind: 'stabilize_breed', breedId: 'bloom_mass' };
    expect([...goalCultureIds(def, cultures)]).toEqual([3]);
  });

  it('marks every living culture of the asked archetype', () => {
    const def: ObjectiveDef = { ...base, kind: 'breed_archetype', archetype: 'splitter', targetCount: 4 };
    expect([...goalCultureIds(def, cultures)].sort()).toEqual([3, 5]);
  });

  it('marks grazers and propagators for protection goals', () => {
    const def: ObjectiveDef = { ...base, kind: 'preserve_grazers', minCount: 3 };
    expect([...goalCultureIds(def, cultures)].sort()).toEqual([2, 3, 5]);
  });

  it('marks the single largest culture for size goals', () => {
    const def: ObjectiveDef = { ...base, kind: 'mega_culture', volumeTarget: 800 };
    expect([...goalCultureIds(def, cultures)]).toEqual([4]);
  });

  it('marks nothing for goals about the whole dish or about reactions', () => {
    for (const kind of ['reaction_chain', 'balanced_ecology', 'cross_breed', 'understand_recipe'] as const) {
      expect(goalCultureIds({ ...base, kind }, cultures).size, kind).toBe(0);
    }
  });
});
