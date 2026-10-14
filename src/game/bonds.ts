// Bonds between cultures: which pairs stick together, and how strongly. The
// merge tracker writes them; the Monte Carlo step reads them through the
// sim's BondView. Adhesion sits just under the sim's surface tension (1), so
// partners prefer each other to bare agar without growing into each other
// (adhesion sweep, 2026-10-15: 0.95 held about 2.5x the contact of an
// unbonded pair with about one stray pixel; 1.1 and above began to mix).
import type { BondView, CellId } from '../sim/types';

export const BOND_TUNING = {
  adhesion: 0.95,
  /** Bond strength while a merge is forming, at full progress. */
  formingStrength: 0.6,
  /** How hard a locked form's cultures steer toward their shared centre. */
  cohesion: 0.5,
};

export interface BondSet extends BondView {
  link(pairs: ReadonlyArray<readonly [CellId, CellId]>, strength: number): void;
  unlink(pairs: ReadonlyArray<readonly [CellId, CellId]>): void;
  size(): number;
}

export function createBondSet(adhesion = BOND_TUNING.adhesion): BondSet {
  const partners = new Map<CellId, Map<CellId, number>>();
  const set = (a: CellId, b: CellId, strength: number | null): void => {
    let map = partners.get(a);
    if (strength === null) {
      map?.delete(b);
      if (map && map.size === 0) partners.delete(a);
      return;
    }
    if (!map) {
      map = new Map();
      partners.set(a, map);
    }
    map.set(b, strength);
  };
  return {
    adhesion,
    partners: (id) => partners.get(id),
    link(pairs, strength) {
      for (const [a, b] of pairs) {
        set(a, b, strength);
        set(b, a, strength);
      }
    },
    unlink(pairs) {
      for (const [a, b] of pairs) {
        set(a, b, null);
        set(b, a, null);
      }
    },
    size: () => partners.size,
  };
}
