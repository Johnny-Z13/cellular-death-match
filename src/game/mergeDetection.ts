// Merges. Every few ticks: find isolated groups of 2-4 living cultures, name
// each group's arrangement, and match it to a form. A matching group fed in
// its form's field starts forming: a ring fills and its cultures begin to
// stick. Held for the lock window, it locks into one bonded organism that
// moves as one. A locked form whose cultures lose touch, or die, comes apart.
// The rule (isolated, fed, held) comes from the merge census:
// docs/v1/merge-census.md.
import { FORMS, type FormDef, type FormFeed } from '../content/forms';
import type { CellId, SimState } from '../sim/types';
import { BOND_TUNING, createBondSet, type BondSet } from './bonds';
import { buildContactGraph, canonicalShape, contactComponents, type ContactGraph } from './contactGraph';

export const MERGE_DETECTION = {
  scanTicks: 10,
  lockSeconds: 4,
  ticksPerSecond: 60,
  maxGroup: 4,
  /** Touching pixel pairs that count as firm contact. A passing brush with a
   *  neighbour neither isolates nor joins a group. */
  minContact: 6,
  /** A locked form whose cultures stay apart this long comes apart. */
  breakGraceTicks: 45,
};

/** A form's arrangement, named the way the contact graph names a live group. */
export function formShape(form: Pick<FormDef, 'strains' | 'touching'>): string {
  const ids = form.strains.map((_, i) => i + 1);
  const graph: ContactGraph = {
    strain: new Map(ids.map((id, i) => [id, form.strains[i]!])),
    contacts: new Map(ids.map((id) => [id, new Map<CellId, number>()])),
  };
  for (const [a, b] of form.touching) {
    graph.contacts.get(a + 1)!.set(b + 1, 1);
    graph.contacts.get(b + 1)!.set(a + 1, 1);
  }
  return canonicalShape(graph, ids);
}

const FORM_BY_SHAPE = new Map(FORMS.map((form) => [formShape(form), form]));

export interface FormingGroup {
  key: string;
  form: FormDef;
  members: CellId[];
  pairs: Array<[CellId, CellId]>;
  /** Ticks it has qualified so far; whole ticks, so it reaches the window exactly. */
  held: number;
  /** 0..1 of the lock window. */
  progress: number;
}

export interface LockedForm {
  instance: number;
  form: FormDef;
  members: CellId[];
  pairs: Array<[CellId, CellId]>;
  /** Ticks its cultures have been out of touch. */
  adrift: number;
}

export interface MergeEvent {
  kind: 'locked' | 'broke';
  form: FormDef;
  members: CellId[];
  center: [number, number];
  radius: number;
}

export interface MergeTracker {
  readonly bonds: BondSet;
  /** Detect, form, lock and break. Call every MERGE_DETECTION.scanTicks. */
  scan(state: SimState, strainOf: (id: CellId) => string | null, fedBy: (id: CellId, feed: FormFeed) => boolean): MergeEvent[];
  /** Point a locked form's cultures one way, toward their shared centre. */
  steer(state: SimState): void;
  forming(): readonly FormingGroup[];
  locked(): readonly LockedForm[];
}

function touchingPairs(graph: ContactGraph, members: readonly CellId[]): Array<[CellId, CellId]> {
  const pairs: Array<[CellId, CellId]> = [];
  for (let i = 0; i < members.length; i++) {
    for (let j = i + 1; j < members.length; j++) {
      if (graph.contacts.get(members[i]!)?.has(members[j]!)) pairs.push([members[i]!, members[j]!]);
    }
  }
  return pairs;
}

export function groupExtent(state: SimState, members: readonly CellId[]): { center: [number, number]; radius: number } {
  let x = 0;
  let y = 0;
  let n = 0;
  for (const id of members) {
    const cell = state.cells.get(id);
    if (!cell) continue;
    x += cell.center[0];
    y += cell.center[1];
    n += 1;
  }
  const center: [number, number] = n > 0 ? [x / n, y / n] : [0, 0];
  let radius = 0;
  for (const id of members) {
    const cell = state.cells.get(id);
    if (!cell) continue;
    const reach = Math.hypot(cell.center[0] - center[0], cell.center[1] - center[1]) + Math.sqrt(cell.vol / Math.PI);
    radius = Math.max(radius, reach);
  }
  return { center, radius: radius + 2 };
}

export function createMergeTracker(): MergeTracker {
  const T = MERGE_DETECTION;
  const bonds = createBondSet();
  const lockTicks = T.lockSeconds * T.ticksPerSecond;
  let forming = new Map<string, FormingGroup>();
  let locked: LockedForm[] = [];
  let nextInstance = 1;

  const event = (state: SimState, kind: MergeEvent['kind'], form: FormDef, members: CellId[]): MergeEvent => (
    { kind, form, members, ...groupExtent(state, members) }
  );

  return {
    bonds,
    scan(state, strainOf, fedBy) {
      const events: MergeEvent[] = [];
      const graph = buildContactGraph(state, strainOf, T.minContact);

      // Locked forms hold while their cultures live and keep touching.
      locked = locked.filter((form) => {
        const alive = form.members.every((id) => (state.cells.get(id)?.vol ?? 0) > 0);
        const touching = form.pairs.every(([a, b]) => graph.contacts.get(a)?.has(b));
        form.adrift = touching ? 0 : form.adrift + T.scanTicks;
        if (alive && form.adrift <= T.breakGraceTicks) return true;
        bonds.unlink(form.pairs);
        events.push(event(state, 'broke', form.form, form.members));
        return false;
      });
      const inForm = new Set(locked.flatMap((form) => form.members));

      const next = new Map<string, FormingGroup>();
      for (const group of contactComponents(graph)) {
        if (group.length < 2 || group.length > T.maxGroup || group.some((id) => inForm.has(id))) continue;
        const form = FORM_BY_SHAPE.get(canonicalShape(graph, group));
        if (!form || !group.every((id) => fedBy(id, form.feed))) continue;
        const members = [...group].sort((a, b) => a - b);
        const key = `${form.id}:${members.join(',')}`;
        const pairs = touchingPairs(graph, members);
        const held = (forming.get(key)?.held ?? 0) + T.scanTicks;
        const progress = Math.min(1, held / lockTicks);
        if (held >= lockTicks) {
          locked.push({ instance: nextInstance++, form, members, pairs, adrift: 0 });
          bonds.link(pairs, 1);
          events.push(event(state, 'locked', form, members));
          continue;
        }
        next.set(key, { key, form, members, pairs, held, progress });
        bonds.link(pairs, progress * BOND_TUNING.formingStrength);
      }
      // A group that stops qualifying lets go and starts again from nothing
      // (one that just locked keeps its full-strength bonds).
      const lockedNow = new Set(locked.flatMap((form) => form.members));
      for (const [key, group] of forming) {
        if (!next.has(key) && !group.members.some((id) => lockedNow.has(id))) bonds.unlink(group.pairs);
      }
      forming = next;
      return events;
    },
    steer(state) {
      for (const form of locked) {
        let cx = 0;
        let cy = 0;
        let vx = 0;
        let vy = 0;
        let mass = 0;
        for (const id of form.members) {
          const cell = state.cells.get(id);
          if (!cell) continue;
          cx += cell.center[0] * cell.vol;
          cy += cell.center[1] * cell.vol;
          vx += cell.intent.vec[0] * cell.intent.speed;
          vy += cell.intent.vec[1] * cell.intent.speed;
          mass += cell.vol;
        }
        if (mass <= 0) continue;
        cx /= mass;
        cy /= mass;
        vx /= form.members.length;
        vy /= form.members.length;
        for (const id of form.members) {
          const cell = state.cells.get(id);
          if (!cell) continue;
          const dx = cx - cell.center[0];
          const dy = cy - cell.center[1];
          const pull = Math.hypot(dx, dy) || 1;
          const sx = vx + (BOND_TUNING.cohesion * dx) / pull;
          const sy = vy + (BOND_TUNING.cohesion * dy) / pull;
          const speed = Math.hypot(sx, sy);
          cell.intent.vec = speed > 0 ? [sx / speed, sy / speed] : [0, 0];
          cell.intent.speed = speed;
        }
      }
    },
    forming: () => [...forming.values()],
    locked: () => locked,
  };
}
