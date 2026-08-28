import { GENOME_IDS, isFoundationalGenome } from '../content/genomeArt';
import type { LifeformIdentityId } from '../content/lifeformIdentity';
import type { DiscoveryProgressionState } from './discoveryProgression';

export type GenomeDecodeReason = 'research-unlock' | 'stabilized';

export interface GenomeDecodeEvent {
  id: LifeformIdentityId;
  reason: GenomeDecodeReason;
}

/**
 * Derive presentation events from authoritative progression transitions.
 * Calling this after save hydration would be a misuse: hydration has no
 * previous live-session state transition and must never replay old reveals.
 */
export function genomeDecodeEventsForProgressionChange(
  previous: DiscoveryProgressionState,
  next: DiscoveryProgressionState,
): GenomeDecodeEvent[] {
  const previousUnlocks = new Set(previous.unlockedLifeforms);
  const nextUnlocks = new Set(next.unlockedLifeforms);
  const previousBreedStages = new Map(previous.breedDiscoveryRecords.map((record) => [record.id, record.stage]));
  const nextBreedStages = new Map(next.breedDiscoveryRecords.map((record) => [record.id, record.stage]));

  return GENOME_IDS.flatMap((id): GenomeDecodeEvent[] => {
    if (isFoundationalGenome(id)) {
      return !previousUnlocks.has(id) && nextUnlocks.has(id)
        ? [{ id, reason: 'research-unlock' }]
        : [];
    }
    const becameStable = previousBreedStages.get(id) !== 'stabilized'
      && nextBreedStages.get(id) === 'stabilized';
    return becameStable ? [{ id, reason: 'stabilized' }] : [];
  });
}

export function appendUniqueGenomeDecodes(
  pending: readonly LifeformIdentityId[],
  events: readonly GenomeDecodeEvent[],
): LifeformIdentityId[] {
  return [...new Set([...pending, ...events.map((event) => event.id)])];
}
