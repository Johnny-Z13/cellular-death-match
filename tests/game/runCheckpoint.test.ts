import { describe, expect, it } from 'vitest';
import { createMemoryStorage } from '../../src/game/discoverySave';
import {
  RUN_CHECKPOINT_KEY,
  clearRunCheckpoint,
  loadRunCheckpoint,
  saveRunCheckpoint,
  savePreparedRunCheckpoint,
  prepareRunCheckpoint,
} from '../../src/game/runCheckpoint';
import { createRun } from '../../src/game/run';

describe('active run checkpoint', () => {
  it('round-trips a between-dish choice with loadout and pending genome reveal', () => {
    const storage = createMemoryStorage();
    const run = createRun(42);
    run.start();
    run.completeEpoch();

    saveRunCheckpoint(storage, {
      run: run.getState(),
      loadout: ['swarmlet', 'bloom_mass'],
      pendingGenomeDecodeIds: ['bloom_mass'],
      runStabilizedBreedIds: ['bloom_mass', 'not-a-breed'],
    });

    const checkpoint = loadRunCheckpoint(storage);
    expect(checkpoint?.run).toMatchObject({
      phase: 'upgrade_pick',
      fightIndex: 0,
      epochResults: ['completed'],
    });
    expect(checkpoint?.run.pendingPickChoices).toHaveLength(3);
    expect(checkpoint?.loadout).toEqual(['swarmlet', 'bloom_mass']);
    expect(checkpoint?.pendingGenomeDecodeIds).toEqual(['bloom_mass']);
    expect(checkpoint?.runStabilizedBreedIds).toEqual(['bloom_mass']);
  });

  it('repairs a legacy checkpoint without run-scoped stabilized breeds', () => {
    const storage = createMemoryStorage();
    const run = createRun(17);
    run.start();
    const checkpoint = prepareRunCheckpoint({
      run: run.getState(), loadout: ['swarmlet'], pendingGenomeDecodeIds: [],
    }, '2026-08-28T12:00:00.000Z');
    const { runStabilizedBreedIds: _omitted, ...legacy } = checkpoint;
    storage.setItem(RUN_CHECKPOINT_KEY, JSON.stringify(legacy));
    expect(loadRunCheckpoint(storage)?.runStabilizedBreedIds).toEqual([]);
  });

  it('rejects terminal or malformed checkpoints instead of booting broken state', () => {
    const storage = createMemoryStorage();
    storage.setItem(RUN_CHECKPOINT_KEY, JSON.stringify({
      run: { phase: 'run_end', fightIndex: 2, seed: 7 },
    }));
    expect(loadRunCheckpoint(storage)).toBeNull();

    storage.setItem(RUN_CHECKPOINT_KEY, '{broken');
    expect(loadRunCheckpoint(storage)).toBeNull();
  });

  it('fails closed on an invalid checkpoint version or timestamp', () => {
    const storage = createMemoryStorage();
    const run = createRun(7);
    run.start();
    const valid = prepareRunCheckpoint({
      run: run.getState(), loadout: ['swarmlet'], pendingGenomeDecodeIds: [],
    }, '2026-08-28T12:00:00.000Z');

    storage.setItem(RUN_CHECKPOINT_KEY, JSON.stringify({ ...valid, version: 2 }));
    expect(loadRunCheckpoint(storage)).toBeNull();
    storage.setItem(RUN_CHECKPOINT_KEY, JSON.stringify({ ...valid, savedAt: 'not-a-date' }));
    expect(loadRunCheckpoint(storage)).toBeNull();
    expect(valid.version).toBe(1);
  });

  it('removes a checkpoint when a run ends or the player explicitly restarts', () => {
    const storage = createMemoryStorage();
    const run = createRun(9);
    run.start();
    saveRunCheckpoint(storage, {
      run: run.getState(),
      loadout: ['swarmlet'],
      pendingGenomeDecodeIds: [],
    });
    expect(storage.getItem(RUN_CHECKPOINT_KEY)).not.toBeNull();

    clearRunCheckpoint(storage);
    expect(storage.getItem(RUN_CHECKPOINT_KEY)).toBeNull();
  });

  it('does not report a throwing or silent no-op checkpoint write as saved', () => {
    const run = createRun(11);
    run.start();
    const prepared = prepareRunCheckpoint({
      run: run.getState(),
      loadout: ['swarmlet'],
      pendingGenomeDecodeIds: [],
    }, '2026-08-28T12:00:00.000Z');

    const throwing = {
      getItem: () => null,
      setItem: () => { throw new Error('denied'); },
    };
    expect(savePreparedRunCheckpoint(throwing, prepared)).toMatchObject({
      status: 'unavailable', reason: 'write-failed',
    });

    const noOp = { getItem: () => null, setItem: () => undefined };
    expect(savePreparedRunCheckpoint(noOp, prepared)).toMatchObject({
      status: 'unavailable', reason: 'readback-mismatch',
    });
  });
});
