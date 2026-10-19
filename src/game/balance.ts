// Balance: the dish's living reading. A dish is in balance while at least
// three of the player's own strains are alive (strains with a culture the
// player planted, or one of its daughters or cuttings) and no strain, wild
// or not, holds more than half of the living mass. Wild residents are the
// environment: they can tip the balance but never hold it for the player.
// The meter keeps two clocks:
//  - `heldTicks`: total time in balance this trial. Never resets; a dip only
//    pauses it (the HUD shows it as m:ss, and sustain goals count it).
//  - `streakTicks`: the current unbroken run. A dip shorter than the grace
//    window keeps the streak (without adding to it); a longer one ends it.
// A streak that reaches `stableAfterTicks` makes the dish a stable ecosystem
// (crises calm, the biome is recorded, the trial may finish).
// It also tracks the other sustain clocks the goals read: time with N or more
// of the player's strains alive, and time with a hunter and its prey sharing
// the dish (one of the two the player's own).

export const BALANCE_TUNING = {
  /** Strains that must be alive. */
  minStrains: 3,
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
  /** Strains with a living culture of the player's own lineage. */
  ownStrains: ReadonlySet<string>;
}

export interface BalanceReading {
  balanced: boolean;
  /** The player's own strains alive. */
  strains: number;
  maxShare: number;
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
  let maxShare = 0;
  let foodWeb = 0;
  const alive = new Map<number, number>([[3, 0], [4, 0], [5, 0], [6, 0]]);

  return {
    sample({ strainVolumes, hunterStrains, ownStrains }, ticks) {
      let total = 0;
      let largest = 0;
      strains = 0;
      for (const [strain, volume] of strainVolumes) {
        if (volume <= 0) continue;
        if (ownStrains.has(strain)) strains += 1;
        total += volume;
        largest = Math.max(largest, volume);
      }
      maxShare = total > 0 ? largest / total : 0;
      balanced = strains >= tuning.minStrains && maxShare <= tuning.maxShare;
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
        if (ownStrains.has(strain)) ownInWeb = true;
      }
      if (hunter && prey && ownInWeb && maxShare <= tuning.foodWebMaxShare) foodWeb += ticks;
    },
    reading() {
      return { balanced, strains, maxShare, heldTicks: held, streakTicks: streak, stable, aliveTicks: alive, foodWebTicks: foodWeb };
    },
    reset() {
      held = 0;
      streak = 0;
      dip = 0;
      stable = false;
      balanced = false;
      strains = 0;
      maxShare = 0;
      foodWeb = 0;
      for (const n of alive.keys()) alive.set(n, 0);
    },
  };
}

/** m:ss for the HUD. */
export function formatHeld(ticks: number): string {
  const seconds = Math.floor(ticks / 60);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}
