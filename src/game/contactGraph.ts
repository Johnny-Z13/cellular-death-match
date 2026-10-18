// Which living cultures touch, and how much. Built from the grid every few
// ticks: the merge census reads it now, and merge detection will later.
// Dishes run with wrap off, so contacts across a wrapped edge are not counted.
import type { CellId, SimState } from '../sim/types';

export interface ContactGraph {
  /** Living culture -> its strain key ('control', an archetype, or a breed id). */
  strain: Map<CellId, string>;
  /** a -> (b -> touching pixel pairs), stored both ways. */
  contacts: Map<CellId, Map<CellId, number>>;
}

// Half the sim's 8-neighbourhood, so each touching pixel pair counts once.
const FORWARD: ReadonlyArray<readonly [number, number]> = [[1, 0], [0, 1], [1, 1], [1, -1]];

export function buildContactGraph(
  state: SimState,
  strainOf: (id: CellId) => string | null,
  minContact = 2,
): ContactGraph {
  const { LX, LY, cells } = state.grid;
  const strain = new Map<CellId, string>();
  for (const [id, cell] of state.cells) {
    if (cell.vol <= 0) continue;
    const key = strainOf(id);
    if (key !== null) strain.set(id, key);
  }
  const pairs = new Map<number, number>();
  for (let x = 0; x < LX; x++) {
    for (let y = 0; y < LY; y++) {
      const a = cells[x * LY + y]!;
      if (a === 0 || !strain.has(a)) continue;
      for (const [dx, dy] of FORWARD) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || nx >= LX || ny < 0 || ny >= LY) continue;
        const b = cells[nx * LY + ny]!;
        if (b === 0 || b === a || !strain.has(b)) continue;
        const key = a < b ? a * 65536 + b : b * 65536 + a;
        pairs.set(key, (pairs.get(key) ?? 0) + 1);
      }
    }
  }
  const contacts = new Map<CellId, Map<CellId, number>>();
  for (const id of strain.keys()) contacts.set(id, new Map());
  for (const [key, count] of pairs) {
    if (count < minContact) continue;
    const a = Math.floor(key / 65536);
    const b = key % 65536;
    contacts.get(a)!.set(b, count);
    contacts.get(b)!.set(a, count);
  }
  return { strain, contacts };
}

/** Groups of cultures that touch, directly or through each other; ids ascending. */
export function contactComponents(graph: ContactGraph): CellId[][] {
  const seen = new Set<CellId>();
  const out: CellId[][] = [];
  for (const start of [...graph.contacts.keys()].sort((a, b) => a - b)) {
    if (seen.has(start)) continue;
    const group: CellId[] = [];
    const queue = [start];
    seen.add(start);
    while (queue.length > 0) {
      const id = queue.pop()!;
      group.push(id);
      for (const next of graph.contacts.get(id)!.keys()) {
        if (seen.has(next)) continue;
        seen.add(next);
        queue.push(next);
      }
    }
    out.push(group.sort((a, b) => a - b));
  }
  return out;
}

/** Every connected set of 2..maxSize cultures, each exactly once, ids
 *  ascending (the ESU enumeration, emitting every size on the way up). */
export function connectedSubsets(graph: ContactGraph, maxSize: number): CellId[][] {
  const out: CellId[][] = [];
  const neighbours = (id: CellId): Iterable<CellId> => graph.contacts.get(id)!.keys();
  const extend = (subset: CellId[], extension: CellId[], root: CellId): void => {
    if (subset.length >= 2) out.push([...subset].sort((a, b) => a - b));
    if (subset.length === maxSize) return;
    const pending = [...extension];
    while (pending.length > 0) {
      const w = pending.pop()!;
      const next = [...pending];
      for (const u of neighbours(w)) {
        if (u <= root || subset.includes(u) || next.includes(u)) continue;
        // Neighbours of the subset itself were already offered as extensions.
        if (subset.some((s) => graph.contacts.get(s)!.has(u))) continue;
        next.push(u);
      }
      extend([...subset, w], next, root);
    }
  };
  for (const root of [...graph.contacts.keys()].sort((a, b) => a - b)) {
    extend([root], [...neighbours(root)].filter((u) => u > root), root);
  }
  return out;
}

function permutations(n: number): number[][] {
  if (n === 0) return [[]];
  return permutations(n - 1).flatMap((rest) => Array.from({ length: n }, (_, i) => [...rest.slice(0, i), n - 1, ...rest.slice(i)]));
}

/** A name for a set's strains and contact pattern that ignores which culture
 *  is which: the same arrangement anywhere gets the same name. Labels come
 *  first, then the touching pairs by position. Fine for sets of up to 6. */
export function canonicalShape(graph: ContactGraph, ids: readonly CellId[]): string {
  let best = '';
  for (const order of permutations(ids.length)) {
    const members = order.map((i) => ids[i]!);
    const edges: string[] = [];
    for (let a = 0; a < members.length; a++) {
      for (let b = a + 1; b < members.length; b++) {
        if (graph.contacts.get(members[a]!)!.has(members[b]!)) edges.push(`${a}-${b}`);
      }
    }
    const code = `${members.map((id) => graph.strain.get(id)!).join(',')}|${edges.join(',')}`;
    if (best === '' || code < best) best = code;
  }
  return best;
}
