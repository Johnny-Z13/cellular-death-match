import { describe, expect, it } from 'vitest';
import { lifeformUnlocksForCurrentRun } from '../../src/game/lifeformLoadout';
import type { ProgressionLifeformId } from '../../src/game/discoveryProgression';

describe('lifeformUnlocksForCurrentRun', () => {
  it('keeps researched base egg strains selectable even when the loadout only has Swarmlet', () => {
    const staged: ProgressionLifeformId[] = ['swarmlet', 'bruiser', 'splitter', 'bloom_mass'];

    expect(lifeformUnlocksForCurrentRun(staged, ['swarmlet'], [])).toEqual([
      'swarmlet',
      'bruiser',
      'splitter',
    ]);
  });

  it('surfaces the first Bloom unlock bundle in the current run tray', () => {
    const staged: ProgressionLifeformId[] = ['swarmlet', 'bruiser', 'splitter', 'bloom_mass'];

    expect(lifeformUnlocksForCurrentRun(staged, ['swarmlet'], ['bloom_mass'])).toEqual([
      'swarmlet',
      'bruiser',
      'splitter',
      'bloom_mass',
    ]);
  });

  it('keeps older rare breeds constrained to the chosen loadout', () => {
    const staged: ProgressionLifeformId[] = [
      'swarmlet',
      'bruiser',
      'splitter',
      'sniper',
      'mirror',
      'boss',
      'bloom_mass',
      'needle_swarm',
      'glass_antibody',
    ];

    expect(lifeformUnlocksForCurrentRun(staged, ['swarmlet', 'needle_swarm'], [])).toEqual([
      'swarmlet',
      'bruiser',
      'splitter',
      'sniper',
      'mirror',
      'boss',
      'needle_swarm',
    ]);
  });

  it('makes a rare breed discovered this run selectable immediately', () => {
    const staged: ProgressionLifeformId[] = ['swarmlet', 'bruiser', 'glass_antibody'];

    expect(lifeformUnlocksForCurrentRun(staged, ['swarmlet'], ['glass_antibody'])).toEqual([
      'swarmlet',
      'bruiser',
      'glass_antibody',
    ]);
  });

  it('allows a banked loadout strain even if the discovery save was cleared', () => {
    const staged: ProgressionLifeformId[] = ['swarmlet'];

    expect(lifeformUnlocksForCurrentRun(staged, ['swarmlet', 'needle_swarm'], [])).toEqual([
      'swarmlet',
      'needle_swarm',
    ]);
  });
});
