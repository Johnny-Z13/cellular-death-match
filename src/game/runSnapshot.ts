import type { Arena } from './arena';

export function finalBreedCountsFor(arena: Arena | null): Map<string, number> {
  const counts = new Map<string, number>();
  if (!arena) return counts;
  for (const [cellId, cell] of arena.state.cells) {
    if (cell.vol <= 0) continue;
    const spawn = arena.archetypes.get(cellId);
    if (!spawn) continue;
    const id = spawn.breedId ?? spawn.archetype;
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  return counts;
}

export function finalBreedVolumesFor(arena: Arena | null): Map<string, number> {
  const volumes = new Map<string, number>();
  if (!arena) return volumes;
  for (const [cellId, cell] of arena.state.cells) {
    if (cell.vol <= 0) continue;
    const spawn = arena.archetypes.get(cellId);
    if (!spawn) continue;
    const id = spawn.breedId ?? spawn.archetype;
    volumes.set(id, (volumes.get(id) ?? 0) + cell.vol);
  }
  return volumes;
}
