import { describe, expect, it } from 'vitest';
import {
  CASE_RECORD_KEY,
  loadCaseRecord,
} from '../../src/game/caseRecord';
import {
  createMemoryStorage,
  DISCOVERY_SAVE_KEY,
  loadDiscoverySave,
  type DiscoveryStorage,
} from '../../src/game/discoverySave';
import {
  MAX_BIOME_ARCHIVE_RECORDS,
  RESEARCH_ARCHIVE_KEY,
  emptyResearchArchive,
  loadResearchArchive,
} from '../../src/game/researchArchive';
import {
  executeResearchBank,
  loadPendingResearchBank,
  prepareResearchBankCommit,
  planResearchBank,
  replayPendingResearchBank,
  RESEARCH_BANK_KEY,
} from '../../src/game/researchBank';
import { prepareRunCheckpoint, RUN_CHECKPOINT_KEY } from '../../src/game/runCheckpoint';
import {
  loadStrainLibraryState,
  STRAIN_LIBRARY_KEY,
} from '../../src/game/strainLibrary';
import { createRun, planEpochCompletion } from '../../src/game/run';
import {
  createDiscoveryProgression,
  updateDiscoveryProgression,
} from '../../src/game/discoveryProgression';

function commit() {
  const run = createRun(42);
  run.start();
  const runAfter = planEpochCompletion(run.getState());
  const createdAt = '2026-08-28T12:00:00.000Z';
  return prepareResearchBankCommit({
    id: 'bank-42-0-bloom',
    createdAt,
    discovery: {
      persistenceEnabled: true,
      discoveredBreedIds: ['bloom_mass'],
      discoveredNoteIds: [],
      breedDiscoveryRecords: [{ id: 'bloom_mass', discoveredAt: createdAt, fresh: true, stage: 'stabilized' }],
      noteDiscoveryRecords: [],
      revealAll: false,
    },
    strains: {
      availableStrains: ['swarmlet', 'bloom_mass'],
      loadout: ['swarmlet'],
      loadoutSlots: 2,
      runCount: 1,
      biomeCount: 1,
    },
    caseRecord: { completedTrialIds: ['culture-shock'] },
    archive: {
      ...emptyResearchArchive(),
      biomeRecords: [{ name: 'Coral Basin', recordedAt: createdAt }],
    },
    checkpoint: prepareRunCheckpoint({
      run: runAfter,
      loadout: ['swarmlet'],
      pendingGenomeDecodeIds: ['bloom_mass'],
    }, createdAt),
  });
}

class FailOnceStorage implements DiscoveryStorage {
  private failed = false;

  constructor(
    readonly inner: DiscoveryStorage,
    private readonly operation: 'set' | 'remove',
    private readonly key: string,
  ) {}

  getItem(key: string): string | null {
    return this.inner.getItem(key);
  }

  setItem(key: string, value: string): void {
    if (!this.failed && this.operation === 'set' && key === this.key) {
      this.failed = true;
      throw new Error('injected write failure');
    }
    this.inner.setItem(key, value);
  }

  removeItem(key: string): void {
    if (!this.failed && this.operation === 'remove' && key === this.key) {
      this.failed = true;
      throw new Error('injected removal failure');
    }
    this.inner.removeItem(key);
  }
}

function maximalBiomeRecords(recordedAt: string) {
  return Array.from({ length: MAX_BIOME_ARCHIVE_RECORDS }, (_, index) => {
    const prefix = `Biome ${index} `;
    return { name: `${prefix}${'x'.repeat(80 - prefix.length)}`, recordedAt };
  });
}

describe('research bank journal', () => {
  it('purely plans ordinary specimen banking without terminal counter increments', () => {
    const run = createRun(42);
    run.start();
    const discovery = updateDiscoveryProgression(
      createDiscoveryProgression(),
      { breedIds: ['bloom_mass'] },
      '2026-08-28T11:00:00.000Z',
      { breed: 'observed' },
    );
    const before = structuredClone(discovery);
    const plan = planResearchBank({
      id: 'plan-bloom-study',
      createdAt: '2026-08-28T12:00:00.000Z',
      run: run.getState(),
      objective: {
        kind: 'stabilize_breed',
        name: 'Stabilize',
        description: 'Keep it alive.',
        target: 'Bloom alive',
        breedId: 'bloom_mass',
      },
      discovery,
      strainState: loadStrainLibraryState(createMemoryStorage()),
      caseRecord: { completedTrialIds: [] },
      archive: emptyResearchArchive(),
      discoveredNoteIds: [],
      livingBreedIds: ['bloom_mass'],
      loadout: ['swarmlet'],
      pendingGenomeDecodeIds: [],
      caseTrialId: 'culture-shock',
      allCaseTrialIds: ['culture-shock'],
    });

    expect(discovery).toEqual(before);
    expect(plan.progression.breedDiscoveryRecords[0]?.stage).toBe('stabilized');
    expect(plan.commit.strains.availableStrains).toContain('bloom_mass');
    expect(plan.commit.strains).toMatchObject({ runCount: 0, biomeCount: 0 });
    expect(plan.commit.checkpoint?.run.phase).toBe('upgrade_pick');
    expect(plan.commit.checkpoint?.runStabilizedBreedIds).toEqual(['bloom_mass']);
    expect(plan.runAfter).toEqual(plan.commit.checkpoint?.run);
    expect(plan.newGenomeDecodeIds).toEqual(['bloom_mass']);
  });

  it('plans absolute terminal counters and a terminal checkpoint removal', () => {
    const run = createRun(42);
    run.start();
    const plan = planResearchBank({
      id: 'plan-terminal-biome',
      createdAt: '2026-08-28T12:00:00.000Z',
      run: run.getState(),
      objective: { kind: 'mega_culture', name: 'Mega', description: 'Grow.', target: 'large' },
      discovery: createDiscoveryProgression(),
      strainState: {
        availableStrains: ['swarmlet'], loadout: ['swarmlet'], loadoutSlots: 2,
        runCount: 4, biomeCount: 2,
      },
      caseRecord: { completedTrialIds: [] },
      archive: emptyResearchArchive(),
      discoveredNoteIds: [],
      livingBreedIds: [],
      loadout: ['swarmlet'],
      pendingGenomeDecodeIds: [],
      terminalOutcome: 'won',
      researchEvidence: { biomeName: 'Coral Basin' },
    });

    expect(plan.commit.strains).toMatchObject({ runCount: 5, biomeCount: 3 });
    expect(plan.commit.checkpoint).toBeNull();
    expect(plan.runAfter).toMatchObject({ phase: 'run_end', outcome: 'won' });
  });

  it('accepts the largest current archive and 10,001-result checkpoint envelope', () => {
    const value = structuredClone(commit());
    value.archive.biomeRecords = maximalBiomeRecords(value.createdAt);
    value.checkpoint!.run.fightIndex = 10_000;
    value.checkpoint!.run.epochResults = Array.from({ length: 10_001 }, () => 'completed' as const);
    expect(JSON.stringify(value).length).toBeGreaterThan(128_000);
    const { version: _version, ...input } = value;

    expect(() => prepareResearchBankCommit(input)).not.toThrow();
  });

  it('compacts a first archive overflow during gameplay planning without blocking the bank', () => {
    const run = createRun(42);
    run.start();
    const createdAt = '2026-08-28T12:00:00.000Z';
    const archive = {
      ...emptyResearchArchive(),
      biomeRecords: maximalBiomeRecords(createdAt),
    };

    const plan = planResearchBank({
      id: 'plan-overflow-biome',
      createdAt,
      run: run.getState(),
      objective: { kind: 'mega_culture', name: 'Mega', description: 'Grow.', target: 'large' },
      discovery: createDiscoveryProgression(),
      strainState: loadStrainLibraryState(createMemoryStorage()),
      caseRecord: { completedTrialIds: [] },
      archive,
      discoveredNoteIds: [],
      livingBreedIds: [],
      loadout: ['swarmlet'],
      pendingGenomeDecodeIds: [],
      researchEvidence: { biomeName: 'Newest Basin' },
    });

    expect(plan.newBiome).toBe(true);
    expect(plan.commit.archive.biomeRecords).toHaveLength(MAX_BIOME_ARCHIVE_RECORDS);
    expect(plan.commit.archive.biomeRecords.at(-1)?.name).toBe('Newest Basin');
  });

  it('applies replayed terminal counters monotonically and preserves newer ownership', () => {
    const storage = createMemoryStorage();
    storage.setItem(STRAIN_LIBRARY_KEY, JSON.stringify({
      availableStrains: ['swarmlet', 'needle_swarm'],
      loadout: ['needle_swarm'],
      loadoutSlots: 3,
      runCount: 8,
      biomeCount: 5,
    }));

    expect(executeResearchBank(storage, commit()).status).toBe('saved');
    expect(loadStrainLibraryState(storage)).toMatchObject({
      availableStrains: ['swarmlet', 'needle_swarm', 'bloom_mass'],
      loadout: ['swarmlet'],
      loadoutSlots: 3,
      runCount: 8,
      biomeCount: 5,
    });
  });

  it('commits every store, target checkpoint, and then clears its journal', () => {
    const storage = createMemoryStorage();
    expect(executeResearchBank(storage, commit()).status).toBe('saved');
    expect(loadPendingResearchBank(storage)).toBeNull();
    expect(loadDiscoverySave(storage).breedDiscoveryRecords[0]?.stage).toBe('stabilized');
    expect(loadStrainLibraryState(storage)).toMatchObject({ runCount: 1, biomeCount: 1 });
    expect(loadCaseRecord(storage).completedTrialIds).toEqual(['culture-shock']);
    expect(loadResearchArchive(storage).biomeRecords).toHaveLength(1);
    expect(storage.getItem(RUN_CHECKPOINT_KEY)).not.toBeNull();
  });

  it.each([
    DISCOVERY_SAVE_KEY,
    STRAIN_LIBRARY_KEY,
    CASE_RECORD_KEY,
    RESEARCH_ARCHIVE_KEY,
    RUN_CHECKPOINT_KEY,
  ])('recovers an injected partial failure at %s without duplicate counters', (key) => {
    const inner = createMemoryStorage();
    const failed = executeResearchBank(new FailOnceStorage(inner, 'set', key), commit());
    expect(failed).toMatchObject({ status: 'unavailable' });
    expect(loadPendingResearchBank(inner)).not.toBeNull();

    expect(replayPendingResearchBank(inner)?.status).toBe('saved');
    expect(replayPendingResearchBank(inner)).toBeNull();
    expect(loadStrainLibraryState(inner)).toMatchObject({ runCount: 1, biomeCount: 1 });
    expect(loadResearchArchive(inner).biomeRecords).toHaveLength(1);
  });

  it('replays safely when journal removal fails after all target stores succeeded', () => {
    const inner = createMemoryStorage();
    const failed = executeResearchBank(
      new FailOnceStorage(inner, 'remove', RESEARCH_BANK_KEY),
      commit(),
    );
    expect(failed).toMatchObject({ status: 'unavailable', stage: 'journal-clear' });
    expect(loadPendingResearchBank(inner)).not.toBeNull();

    expect(replayPendingResearchBank(inner)?.status).toBe('saved');
    expect(loadStrainLibraryState(inner)).toMatchObject({ runCount: 1, biomeCount: 1 });
    expect(loadResearchArchive(inner).biomeRecords).toHaveLength(1);
  });

  it('does not write any target store when journal preparation fails', () => {
    const inner = createMemoryStorage();
    const result = executeResearchBank(
      new FailOnceStorage(inner, 'set', RESEARCH_BANK_KEY),
      commit(),
    );
    expect(result).toMatchObject({ status: 'unavailable', stage: 'journal' });
    expect(inner.getItem(DISCOVERY_SAVE_KEY)).toBeNull();
    expect(inner.getItem(STRAIN_LIBRARY_KEY)).toBeNull();
  });

  it('rejects a malformed journal without touching any persisted authority', () => {
    const storage = createMemoryStorage();
    const valid = commit();
    expect(executeResearchBank(storage, valid).status).toBe('saved');
    const before = new Map([
      [DISCOVERY_SAVE_KEY, storage.getItem(DISCOVERY_SAVE_KEY)],
      [STRAIN_LIBRARY_KEY, storage.getItem(STRAIN_LIBRARY_KEY)],
      [CASE_RECORD_KEY, storage.getItem(CASE_RECORD_KEY)],
      [RESEARCH_ARCHIVE_KEY, storage.getItem(RESEARCH_ARCHIVE_KEY)],
      [RUN_CHECKPOINT_KEY, storage.getItem(RUN_CHECKPOINT_KEY)],
    ]);
    storage.setItem(RESEARCH_BANK_KEY, JSON.stringify({
      version: 1,
      id: 'bad',
      createdAt: '2026-08-28T12:00:00.000Z',
      discovery: null,
      strains: null,
      caseRecord: null,
      archive: null,
      checkpoint: null,
    }));

    expect(loadPendingResearchBank(storage)).toBeNull();
    expect(replayPendingResearchBank(storage)).toBeNull();
    for (const [key, value] of before) expect(storage.getItem(key)).toBe(value);
  });

  it.each([
    ['an unknown genome', (value: ReturnType<typeof commit>) => {
      value.strains.availableStrains.push('forged_genome');
    }],
    ['an unknown Case Trial', (value: ReturnType<typeof commit>) => {
      value.caseRecord.completedTrialIds.push('forged-trial');
    }],
    ['an oversized biome name', (value: ReturnType<typeof commit>) => {
      value.archive.biomeRecords[0]!.name = 'x'.repeat(81);
    }],
    ['an unbounded lifetime counter', (value: ReturnType<typeof commit>) => {
      value.strains.runCount = 1_000_000_001;
    }],
    ['an oversized serialized payload', (value: ReturnType<typeof commit>) => {
      value.archive.biomeRecords[0]!.name = 'x'.repeat(128_001);
    }],
  ])('rejects canonical-looking journal content with %s before every target write', (_label, mutate) => {
    const storage = createMemoryStorage();
    expect(executeResearchBank(storage, commit()).status).toBe('saved');
    const authorityKeys = [
      DISCOVERY_SAVE_KEY,
      STRAIN_LIBRARY_KEY,
      CASE_RECORD_KEY,
      RESEARCH_ARCHIVE_KEY,
      RUN_CHECKPOINT_KEY,
    ];
    const before = new Map(authorityKeys.map((key) => [key, storage.getItem(key)]));
    const invalid = structuredClone(commit());
    mutate(invalid);
    storage.setItem(RESEARCH_BANK_KEY, JSON.stringify(invalid));

    expect(loadPendingResearchBank(storage)).toBeNull();
    expect(replayPendingResearchBank(storage)).toBeNull();
    for (const [key, value] of before) expect(storage.getItem(key)).toBe(value);
  });

  it('keeps a first-time Open Lab protocol observed until a later dish', () => {
    const run = createRun(22);
    run.startLateGamePreview();
    run.setChosenObjective({
      kind: 'reaction_chain',
      name: 'Reaction Chain',
      description: 'Reproduce reactions.',
      target: '3 reactions',
      recipeId: 'bitter_bloom',
    });
    const discovery = updateDiscoveryProgression(
      createDiscoveryProgression(),
      { noteIds: ['recipe_bitter_bloom'] },
      '2026-08-28T11:00:00.000Z',
      { note: 'observed' },
    );
    const plan = planResearchBank({
      id: 'open-lab-first-signal',
      createdAt: '2026-08-28T12:00:00.000Z',
      run: run.getState(),
      objective: run.getObjective(),
      discovery,
      strainState: loadStrainLibraryState(createMemoryStorage()),
      caseRecord: { completedTrialIds: [] },
      archive: emptyResearchArchive(),
      discoveredNoteIds: ['recipe_bitter_bloom'],
      livingBreedIds: [],
      loadout: ['swarmlet'],
      pendingGenomeDecodeIds: [],
    });
    expect(plan.progression.noteDiscoveryRecords[0]?.stage).toBe('observed');
  });
});
