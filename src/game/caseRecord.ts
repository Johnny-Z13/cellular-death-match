import type { DiscoveryStorage } from './discoverySave';

export const CASE_RECORD_KEY = 'cellular-death-match.case-record.v1';

export interface CaseRecord {
  completedTrialIds: string[];
}

export function loadCaseRecord(storage: Pick<DiscoveryStorage, 'getItem'>): CaseRecord {
  try {
    const raw = storage.getItem(CASE_RECORD_KEY);
    if (!raw) return { completedTrialIds: [] };
    const value: unknown = JSON.parse(raw);
    if (!isObject(value) || !Array.isArray(value.completedTrialIds)) {
      return { completedTrialIds: [] };
    }
    return {
      completedTrialIds: [...new Set(value.completedTrialIds.filter((id): id is string => typeof id === 'string'))],
    };
  } catch {
    return { completedTrialIds: [] };
  }
}

export function recordCompletedTrial(
  storage: Pick<DiscoveryStorage, 'setItem'>,
  record: CaseRecord,
  trialId: string,
): CaseRecord {
  const next = {
    completedTrialIds: [...new Set([...record.completedTrialIds, trialId])],
  };
  try {
    storage.setItem(CASE_RECORD_KEY, JSON.stringify(next));
  } catch {
    // Browsers may deny storage in private/embedded contexts. The in-memory
    // record still updates for the active visit.
  }
  return next;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

