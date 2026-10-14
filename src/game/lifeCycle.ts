import type { CellId, SimState } from '../sim/types';
import type { EnemySpawn } from '../content/enemies';
import { ARCHETYPE_ECOLOGY, type EcologyRole } from '../content/ecology';
import type { LifeCycleProfile } from '../content/ecologyTuning';

// Digestion and starvation outlast a tick, so they live across ticks.
export interface LifeCycleState {
  digestUntil: Map<CellId, number>;
  starving: Set<CellId>;
}

export function createLifeCycleState(): LifeCycleState {
  return { digestUntil: new Map(), starving: new Set() };
}

function isHunter(profile: LifeCycleProfile, role: EcologyRole): boolean {
  return (profile.hunterRoles as readonly EcologyRole[]).includes(role);
}

// Runs after the AIs choose intents. Hunters engulf until they divide, except
// while digesting; grazers engulf only when desperate. Everyone else drifts.
export function applyAppetite(
  state: SimState,
  archetypes: Map<CellId, EnemySpawn>,
  profile: LifeCycleProfile,
  life: LifeCycleState,
  tick: number,
): void {
  for (const [id, spawn] of archetypes) {
    const cell = state.cells.get(id);
    if (!cell || cell.vol <= 0) continue;
    const ratio = cell.targetVol / spawn.targetVol;
    const digesting = (life.digestUntil.get(id) ?? 0) > tick;
    const hunts = !digesting && (isHunter(profile, ARCHETYPE_ECOLOGY[spawn.archetype].role)
      ? ratio < profile.divideAt
      : ratio < profile.desperateBelow);
    if (!hunts) {
      cell.intent.engulfMultiplier = 1;
      cell.intent.speed *= profile.satedSpeed;
    } else if (cell.intent.engulfMultiplier > 1) {
      cell.intent.engulfMultiplier = 1 + (cell.intent.engulfMultiplier - 1) * profile.huntEngulfScale;
    }
  }
}

// Every culture burns a share of its genome size each tick, hunters faster.
// The agar feeds grazers in proportion to the dish's free space. A culture
// that falls below starveBelow dissolves: its target volume is held at zero.
export function applyMetabolism(
  state: SimState,
  archetypes: Map<CellId, EnemySpawn>,
  profile: LifeCycleProfile,
  life: LifeCycleState,
): void {
  let occupied = 0;
  for (const cell of state.cells.values()) {
    if (cell.vol > 0) occupied += cell.vol;
  }
  const free = Math.max(0, 1 - occupied / (state.grid.LX * state.grid.LY));
  for (const [id, spawn] of archetypes) {
    const cell = state.cells.get(id);
    if (!cell || cell.vol <= 0) continue;
    if (life.starving.has(id)) {
      cell.targetVol = 0;
      continue;
    }
    const base = spawn.targetVol;
    const hunter = isHunter(profile, ARCHETYPE_ECOLOGY[spawn.archetype].role);
    const growth = hunter ? 0 : profile.agarGrowthPerTick * free * Math.max(0, base * profile.agarCeiling - cell.targetVol);
    const burn = (hunter ? profile.hunterMetabolismPerTick : profile.grazerMetabolismPerTick) * base;
    cell.targetVol += growth - burn;
    if (cell.targetVol < base * profile.starveBelow) life.starving.add(id);
  }
}

// Cultures that have grown to divideAt × their genome size and filled most
// of that volume are ready to split.
export function readyToDivide(
  state: SimState,
  archetypes: Map<CellId, EnemySpawn>,
  profile: LifeCycleProfile,
  life: LifeCycleState,
): CellId[] {
  const ready: CellId[] = [];
  for (const [id, spawn] of archetypes) {
    const cell = state.cells.get(id);
    if (!cell || cell.vol <= 0 || life.starving.has(id)) continue;
    if (cell.targetVol >= spawn.targetVol * profile.divideAt && cell.vol >= cell.targetVol * 0.8) ready.push(id);
  }
  return ready;
}
