import { BREED_DEFS } from '../content/catalysis';
import { EGG_ARCHETYPES, type EnemyArchetype } from '../content/enemies';
import type { ProgressionLifeformId } from './discoveryProgression';

const EGG_ARCHETYPE_IDS = new Set<string>(EGG_ARCHETYPES);

/**
 * During a run, researched base eggs are lab stock, while rare breeds are
 * constrained by the pre-run loadout unless they were discovered in this run.
 */
export function lifeformUnlocksForCurrentRun(
  stagedLifeforms: readonly ProgressionLifeformId[],
  currentRunLoadout: Iterable<string>,
  discoveredBreedsThisRun: Iterable<string>,
): ProgressionLifeformId[] {
  const stagedSet = new Set<ProgressionLifeformId>(stagedLifeforms);
  const baseEggs = stagedLifeforms.filter(isEggArchetypeId);
  const loadoutLifeforms = progressionLifeformIds(currentRunLoadout);
  const newDiscoveries = progressionLifeformIds(discoveredBreedsThisRun)
    .filter((id) => stagedSet.has(id));
  const unlocked = unique([
    ...baseEggs,
    ...loadoutLifeforms,
    ...newDiscoveries,
  ]);

  return unlocked.length > 0 ? unlocked : ['swarmlet'];
}

function progressionLifeformIds(values: Iterable<string>): ProgressionLifeformId[] {
  return [...values].filter(isProgressionLifeformId);
}

function isProgressionLifeformId(id: string): id is ProgressionLifeformId {
  return isEggArchetypeId(id) || id in BREED_DEFS;
}

function isEggArchetypeId(id: string): id is EnemyArchetype {
  return EGG_ARCHETYPE_IDS.has(id);
}

function unique<T>(values: readonly T[]): T[] {
  return [...new Set(values)];
}
