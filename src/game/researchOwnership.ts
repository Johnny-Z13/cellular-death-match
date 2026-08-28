import { BREED_DEFS, type BreedId } from '../content/catalysis';
import {
  canonicalDiscoveryState,
  saveDiscoveryStateVerified,
  type DiscoverySaveState,
  type DiscoveryStorage,
} from './discoverySave';
import {
  createDiscoveryProgression,
  updateDiscoveryProgression,
} from './discoveryProgression';
import {
  canonicalStrainLibraryState,
  saveStrainLibraryStateVerified,
  type StrainLibraryState,
} from './strainLibrary';

const CANONICAL_RARE_IDS = new Set<string>(Object.keys(BREED_DEFS));

export interface OwnershipReconciliation {
  discovery: DiscoverySaveState;
  strains: StrainLibraryState;
  changed: boolean;
}

export function reconcileResearchOwnership(
  discovery: DiscoverySaveState,
  strains: StrainLibraryState,
): OwnershipReconciliation {
  const canonicalDiscovery = canonicalDiscoveryState(discovery);
  const canonicalStrains = canonicalStrainLibraryState(strains);
  if (canonicalDiscovery.revealAll) {
    return { discovery: canonicalDiscovery, strains: canonicalStrains, changed: false };
  }

  const owned = new Set<BreedId>();
  for (const record of canonicalDiscovery.breedDiscoveryRecords) {
    if (record.stage === 'stabilized') owned.add(record.id);
  }
  for (const id of canonicalStrains.availableStrains) {
    if (CANONICAL_RARE_IDS.has(id)) owned.add(id as BreedId);
  }

  let progression = createDiscoveryProgression(canonicalDiscovery);
  if (owned.size > 0) {
    progression = updateDiscoveryProgression(
      progression,
      { breedIds: [...owned] },
      earliestOwnershipDate(canonicalDiscovery),
      { breed: 'stabilized' },
    );
  }
  const nextDiscovery = canonicalDiscoveryState({
    ...canonicalDiscovery,
    discoveredBreedIds: progression.discoveredBreedIds,
    discoveredNoteIds: progression.discoveredNoteIds,
    breedDiscoveryRecords: progression.breedDiscoveryRecords.map((record) => ({
      ...record,
      // Startup repair is historical state, not a new live-session discovery.
      fresh: canonicalDiscovery.breedDiscoveryRecords.find((existing) => existing.id === record.id)?.fresh ?? false,
    })),
    noteDiscoveryRecords: progression.noteDiscoveryRecords,
  });
  const nextStrains = canonicalStrainLibraryState({
    ...canonicalStrains,
    availableStrains: [...canonicalStrains.availableStrains, ...owned],
  });
  const changed = JSON.stringify(nextDiscovery) !== JSON.stringify(canonicalDiscovery)
    || JSON.stringify(nextStrains) !== JSON.stringify(canonicalStrains);
  return { discovery: nextDiscovery, strains: nextStrains, changed };
}

export function persistResearchOwnershipReconciliation(
  storage: DiscoveryStorage,
  reconciliation: OwnershipReconciliation,
): { status: 'saved' } | { status: 'unavailable'; stage: 'discovery' | 'strains'; reason: string } {
  if (!reconciliation.changed) return { status: 'saved' };
  const discovery = saveDiscoveryStateVerified(storage, reconciliation.discovery);
  if (discovery.status !== 'saved') {
    return { status: 'unavailable', stage: 'discovery', reason: discovery.reason };
  }
  const strains = saveStrainLibraryStateVerified(storage, reconciliation.strains);
  if (strains.status !== 'saved') {
    return { status: 'unavailable', stage: 'strains', reason: strains.reason };
  }
  return { status: 'saved' };
}

function earliestOwnershipDate(discovery: DiscoverySaveState): string {
  const dates = discovery.breedDiscoveryRecords
    .map((record) => record.discoveredAt)
    .filter((value) => Number.isFinite(Date.parse(value)))
    .sort();
  return dates[0] ?? new Date().toISOString();
}
