// Balance: the dish's living reading. A dish is in balance while at least
// three of the player's own strains are established (the player's own
// cultures of the strain, planted or a daughter or cutting of one, hold a
// real share of the living mass) and no strain, wild or not, holds more than
// half of it. Wild residents are the environment: they can tip the balance
// but never hold it for the player, and a speck planted beside a crowd of
// wild cultures of the same strain does not borrow theirs.
// The meter keeps two clocks:
//  - `heldTicks`: total time in balance this trial. Never resets; a dip only
//    pauses it (the HUD shows it as m:ss, and sustain goals count it).
//  - `streakTicks`: the current unbroken run. A dip shorter than the grace
//    window keeps the streak (without adding to it); a longer one ends it.
// A streak that reaches `stableAfterTicks` makes the dish a stable ecosystem
// (crises calm, the biome is recorded; the trial still ends on its own goal).
// It also tracks the other sustain clocks the goals read: time with N or more
// of the player's strains alive, and time with a hunter and its prey sharing
// the dish (one of the two the player's own).

export const BALANCE_TUNING = {
  /** The player's own strains that must be established. */
  minStrains: 3,
  /** An own strain is established once its own cultures hold this share of
   *  the living mass. */
  minOwnShare: 0.05,
  /** No strain may hold more than this share of the living mass. */
  maxShare: 0.5,
  /** A dip shorter than this does not break a streak. */
  graceTicks: 60 * 3,
  /** An unbroken streak this long makes the dish a stable ecosystem. */
  stableAfterTicks: 60 * 60,
  /** A hunter and its prey: neither may hold more than this share. */
  foodWebMaxShare: 0.7,
};

/** Hunter roles in the food-web life cycle (content/ecologyTuning.ts). */
export const HUNTER_ROLES = ['predator', 'anchor', 'mimic'] as const;

export interface BalanceSample {
  /** Living mass per strain. */
  strainVolumes: ReadonlyMap<string, number>;
  /** Strains whose role hunts other strains. */
  hunterStrains: ReadonlySet<string>;
  /** Living mass of the player's own cultures, per strain. */
  ownVolumes: ReadonlyMap<string, number>;
}

export interface BalanceReading {
  balanced: boolean;
  /** The player's own strains alive. */
  strains: number;
  /** The player's own strains holding at least `minOwnShare` of the dish. */
  establishedStrains: number;
  maxShare: number;
  /** The strain holding `maxShare`, wild or not; null in an empty dish. */
  dominantStrain: string | null;
  heldTicks: number;
  streakTicks: number;
  stable: boolean;
  /** Ticks with at least `n` of the player's strains alive, keyed by n (3..6). */
  aliveTicks: ReadonlyMap<number, number>;
  /** Ticks with a hunter and a non-hunter both alive, neither dominant, and
   *  one of them the player's own. */
  foodWebTicks: number;
}

export interface BalanceMeter {
  /** Advance by `ticks` ticks using this sample. */
  sample(sample: BalanceSample, ticks: number): void;
  reading(): BalanceReading;
  reset(): void;
}

export function createBalanceMeter(tuning = BALANCE_TUNING): BalanceMeter {
  let held = 0;
  let streak = 0;
  let dip = 0;
  let stable = false;
  let balanced = false;
  let strains = 0;
  let established = 0;
  let maxShare = 0;
  let dominant: string | null = null;
  let foodWeb = 0;
  const alive = new Map<number, number>([[3, 0], [4, 0], [5, 0], [6, 0]]);

  return {
    sample({ strainVolumes, hunterStrains, ownVolumes }, ticks) {
      let total = 0;
      let largest = 0;
      dominant = null;
      for (const [strain, volume] of strainVolumes) {
        if (volume <= 0) continue;
        total += volume;
        if (volume > largest) {
          largest = volume;
          dominant = strain;
        }
      }
      strains = 0;
      established = 0;
      for (const volume of ownVolumes.values()) {
        if (volume <= 0) continue;
        strains += 1;
        if (volume >= total * tuning.minOwnShare) established += 1;
      }
      maxShare = total > 0 ? largest / total : 0;
      balanced = established >= tuning.minStrains && maxShare <= tuning.maxShare;
      if (balanced) {
        held += ticks;
        streak += ticks;
        dip = 0;
      } else {
        dip += ticks;
        if (dip > tuning.graceTicks) streak = 0;
      }
      if (streak >= tuning.stableAfterTicks) stable = true;
      for (const n of alive.keys()) {
        if (strains >= n) alive.set(n, alive.get(n)! + ticks);
      }
      let hunter = false;
      let prey = false;
      let ownInWeb = false;
      for (const [strain, volume] of strainVolumes) {
        if (volume <= 0) continue;
        if (hunterStrains.has(strain)) hunter = true;
        else prey = true;
        if ((ownVolumes.get(strain) ?? 0) > 0) ownInWeb = true;
      }
      if (hunter && prey && ownInWeb && maxShare <= tuning.foodWebMaxShare) foodWeb += ticks;
    },
    reading() {
      return { balanced, strains, establishedStrains: established, maxShare, dominantStrain: dominant, heldTicks: held, streakTicks: streak, stable, aliveTicks: alive, foodWebTicks: foodWeb };
    },
    reset() {
      held = 0;
      streak = 0;
      dip = 0;
      stable = false;
      balanced = false;
      strains = 0;
      established = 0;
      maxShare = 0;
      dominant = null;
      foodWeb = 0;
      for (const n of alive.keys()) alive.set(n, 0);
    },
  };
}

/** What is keeping the Balance clock from running, in the order the player
 *  would fix it: plant the strains, grow them to a real share, then check
 *  whoever holds over half the dish. */
export type BalanceBlocker =
  | { kind: 'balanced' }
  | { kind: 'too_few_alive'; have: number; need: number }
  | { kind: 'too_small'; have: number; need: number }
  | { kind: 'dominant'; strain: string | null; share: number };

export function balanceBlocker(reading: BalanceReading, tuning = BALANCE_TUNING): BalanceBlocker {
  if (reading.balanced) return { kind: 'balanced' };
  if (reading.strains < tuning.minStrains) {
    return { kind: 'too_few_alive', have: reading.strains, need: tuning.minStrains };
  }
  if (reading.establishedStrains < tuning.minStrains) {
    return { kind: 'too_small', have: reading.establishedStrains, need: tuning.minStrains };
  }
  return { kind: 'dominant', strain: reading.dominantStrain, share: reading.maxShare };
}

/** m:ss for the HUD. */
export function formatHeld(ticks: number): string {
  const seconds = Math.floor(ticks / 60);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}
