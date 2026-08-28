import type { DiscoveryStorage } from './discoverySave';
import { writeVerifiedJson, type VerifiedWriteResult } from './verifiedStorage';

export const CASE_RECORD_KEY = 'cellular-death-match.case-record.v1';

export interface CaseRecord {
  completedTrialIds: string[];
}

export function loadCaseRecord(storage: Pick<DiscoveryStorage, 'getItem'>): CaseRecord {
  try {
    const raw = storage.getItem(CASE_RECORD_KEY);
    if (!raw) return { completedTrialIds: [] };
    const value: unknown = JSON.parse(raw);
    return canonicalCaseRecord(value);
  } catch {
    return { completedTrialIds: [] };
  }
}

export function recordCompletedTrial(
  storage: Pick<DiscoveryStorage, 'getItem' | 'setItem'>,
  record: CaseRecord,
  trialId: string,
): CaseRecord {
  const next = canonicalCaseRecord({
    completedTrialIds: [...new Set([...record.completedTrialIds, trialId])],
  });
  return saveCaseRecordVerified(storage, next).value;
}

export function saveCaseRecordVerified(
  storage: Pick<DiscoveryStorage, 'getItem' | 'setItem'>,
  record: CaseRecord,
): VerifiedWriteResult<CaseRecord> {
  const canonical = canonicalCaseRecord(record);
  return writeVerifiedJson(storage, CASE_RECORD_KEY, canonical, () => loadCaseRecord(storage));
}

export function canonicalCaseRecord(value: unknown): CaseRecord {
  if (!isObject(value) || !Array.isArray(value.completedTrialIds)) {
    return { completedTrialIds: [] };
  }
  return {
    completedTrialIds: [...new Set(
      value.completedTrialIds.filter((id): id is string => typeof id === 'string'),
    )],
  };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
