import { describe, expect, it } from 'vitest';
import { CASE_RECORD_KEY, loadCaseRecord, recordCompletedTrial } from '../../src/game/caseRecord';
import { createMemoryStorage } from '../../src/game/discoverySave';

describe('Case record', () => {
  it('falls back safely for missing or corrupt embedded storage', () => {
    const storage = createMemoryStorage();
    expect(loadCaseRecord(storage)).toEqual({ completedTrialIds: [] });
    storage.setItem(CASE_RECORD_KEY, '{broken');
    expect(loadCaseRecord(storage)).toEqual({ completedTrialIds: [] });
  });

  it('persists unique sealed Trials without touching other save keys', () => {
    const storage = createMemoryStorage();
    storage.setItem('existing-save', 'preserve');
    let record = recordCompletedTrial(storage, loadCaseRecord(storage), 'culture-shock');
    record = recordCompletedTrial(storage, record, 'culture-shock');
    record = recordCompletedTrial(storage, record, 'dilution-solution');

    expect(record.completedTrialIds).toEqual(['culture-shock', 'dilution-solution']);
    expect(loadCaseRecord(storage)).toEqual(record);
    expect(storage.getItem('existing-save')).toBe('preserve');
  });

  it('keeps an in-memory result when storage writes are denied', () => {
    const next = recordCompletedTrial({ setItem: () => { throw new Error('denied'); } }, { completedTrialIds: [] }, 'culture-shock');
    expect(next.completedTrialIds).toEqual(['culture-shock']);
  });
});

