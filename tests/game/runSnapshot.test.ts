import { describe, expect, it } from 'vitest';
import { createArena } from '../../src/game/arena';
import { finalBreedCountsFor, finalBreedVolumesFor } from '../../src/game/runSnapshot';

describe('run snapshot helpers', () => {
  it('separates final breed counts from final breed volumes', () => {
    const arena = createArena({
      LX: 80,
      LY: 80,
      seed: 24,
      player: { targetVol: 100, speed: 10, engulfMultiplier: 5, bulletSize: 3 },
      enemies: [
        { archetype: 'swarmlet' as const, breedId: 'bloom_mass', targetVol: 120, speed: 8, engulfMultiplier: 4 },
        { archetype: 'swarmlet' as const, breedId: 'bloom_mass', targetVol: 80, speed: 8, engulfMultiplier: 4 },
        { archetype: 'splitter' as const, breedId: 'needle_swarm', targetVol: 300, speed: 6, engulfMultiplier: 5 },
      ],
      wrap: false,
      mode: 'ecosystem',
      includeControlSample: false,
    });
    arena.state.cells.get(2)!.vol = 120;
    arena.state.cells.get(3)!.vol = 80;
    arena.state.cells.get(4)!.vol = 300;

    expect(finalBreedCountsFor(arena)).toEqual(new Map([
      ['bloom_mass', 2],
      ['needle_swarm', 1],
    ]));
    expect(finalBreedVolumesFor(arena)).toEqual(new Map([
      ['bloom_mass', 200],
      ['needle_swarm', 300],
    ]));
  });

  it('returns empty maps when there is no arena', () => {
    expect(finalBreedCountsFor(null).size).toBe(0);
    expect(finalBreedVolumesFor(null).size).toBe(0);
  });
});
