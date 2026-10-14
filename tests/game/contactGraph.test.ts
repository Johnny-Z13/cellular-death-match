import { describe, expect, it } from 'vitest';
import { addCell, createSim } from '../../src/sim/sim';
import { buildContactGraph, canonicalShape, connectedSubsets, contactComponents, type ContactGraph } from '../../src/game/contactGraph';

// Three 3x3 cultures in a row (x 2-4, 5-7, 8-10 at y 3-5), touching edge to
// edge, plus one (x 11-13, y 0-2) touching the third at a single diagonal pixel.
function rowOfThree() {
  const state = createSim({ LX: 14, LY: 8, nCells: 0, targetVol: 9, seed: 1, wrap: false });
  addCell(state, { id: 2, targetVol: 9, pos: [3, 4] });
  addCell(state, { id: 3, targetVol: 9, pos: [6, 4] });
  addCell(state, { id: 4, targetVol: 9, pos: [9, 4] });
  addCell(state, { id: 5, targetVol: 9, pos: [12, 1] });
  const labels: Record<number, string> = { 2: 'sniper', 3: 'splitter', 4: 'sniper', 5: 'swarmlet' };
  return { state, strainOf: (id: number) => labels[id] ?? null };
}

function graphOf(edges: Array<[number, number]>, labels: Record<number, string>): ContactGraph {
  const strain = new Map(Object.entries(labels).map(([id, label]) => [Number(id), label]));
  const contacts = new Map([...strain.keys()].map((id) => [id, new Map<number, number>()]));
  for (const [a, b] of edges) {
    contacts.get(a)!.set(b, 5);
    contacts.get(b)!.set(a, 5);
  }
  return { strain, contacts };
}

describe('contact graph', () => {
  it('counts each touching pixel pair once across the 8-neighbourhood', () => {
    const { state, strainOf } = rowOfThree();
    const graph = buildContactGraph(state, strainOf);
    expect(graph.contacts.get(2)!.get(3)).toBe(7);
    expect(graph.contacts.get(3)!.get(4)).toBe(7);
    expect(graph.contacts.get(2)!.has(4)).toBe(false);
  });

  it('ignores a single diagonal touch unless minContact allows it', () => {
    const { state, strainOf } = rowOfThree();
    expect(buildContactGraph(state, strainOf).contacts.get(4)!.has(5)).toBe(false);
    expect(buildContactGraph(state, strainOf, 1).contacts.get(4)!.get(5)).toBe(1);
  });

  it('leaves out dead and unlabelled cultures', () => {
    const { state, strainOf } = rowOfThree();
    state.cells.get(3)!.vol = 0;
    const graph = buildContactGraph(state, (id) => (id === 4 ? null : strainOf(id)));
    expect(graph.strain.has(3)).toBe(false);
    expect(graph.strain.has(4)).toBe(false);
    expect(graph.contacts.get(2)!.size).toBe(0);
  });

  it('finds connected components', () => {
    const { state, strainOf } = rowOfThree();
    expect(contactComponents(buildContactGraph(state, strainOf))).toEqual([[2, 3, 4], [5]]);
  });

  it('enumerates every connected set once', () => {
    const path = graphOf([[1, 2], [2, 3]], { 1: 'a', 2: 'b', 3: 'c' });
    expect(connectedSubsets(path, 3)).toEqual(expect.arrayContaining([[1, 2], [2, 3], [1, 2, 3]]));
    expect(connectedSubsets(path, 3)).toHaveLength(3);
    const triangle = graphOf([[1, 2], [2, 3], [1, 3]], { 1: 'a', 2: 'b', 3: 'c' });
    expect(connectedSubsets(triangle, 3)).toHaveLength(4);
    const star = graphOf([[1, 2], [1, 3], [1, 4]], { 1: 'a', 2: 'b', 3: 'c', 4: 'd' });
    const sets = connectedSubsets(star, 4).map((s) => s.join(','));
    expect(sets).toHaveLength(7);
    expect(new Set(sets).size).toBe(7);
  });

  it('names an arrangement the same way whichever cultures form it', () => {
    const { state, strainOf } = rowOfThree();
    const graph = buildContactGraph(state, strainOf);
    expect(canonicalShape(graph, [2, 3, 4])).toBe('sniper,sniper,splitter|0-2,1-2');
    expect(canonicalShape(graph, [4, 2, 3])).toBe('sniper,sniper,splitter|0-2,1-2');
    const triangle = graphOf([[7, 8], [8, 9], [7, 9]], { 7: 'sniper', 8: 'splitter', 9: 'sniper' });
    expect(canonicalShape(triangle, [7, 8, 9])).toBe('sniper,sniper,splitter|0-1,0-2,1-2');
  });
});
