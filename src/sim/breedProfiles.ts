export interface BreedProfile {
  readonly isingMul: number;
  readonly volMul: number;
  readonly movMul: number;
  readonly engulfMul: number;
}

export type BreedProfileId =
  | 'swarmlet' | 'bruiser' | 'splitter' | 'sniper' | 'mirror' | 'boss'
  | 'bloom_mass' | 'needle_swarm' | 'folded_anchor' | 'glass_antibody'
  | 'static_lattice' | 'quill_bloom' | 'vitric_anchor' | 'mire_lattice';

export const DEFAULT_PROFILE: BreedProfile = {
  isingMul: 1.0, volMul: 1.0, movMul: 1.0, engulfMul: 1.0,
};

export const BREED_PROFILES: Record<BreedProfileId, BreedProfile> = {
  swarmlet:       { isingMul: 0.6, volMul: 0.8, movMul: 1.4, engulfMul: 0.7 },
  bruiser:        { isingMul: 1.5, volMul: 1.2, movMul: 0.7, engulfMul: 1.3 },
  splitter:       { isingMul: 0.9, volMul: 0.9, movMul: 1.1, engulfMul: 1.0 },
  sniper:         { isingMul: 0.8, volMul: 0.7, movMul: 1.6, engulfMul: 0.5 },
  mirror:         { isingMul: 1.0, volMul: 1.0, movMul: 1.0, engulfMul: 1.0 },
  boss:           { isingMul: 1.8, volMul: 1.4, movMul: 0.4, engulfMul: 1.5 },
  bloom_mass:     { isingMul: 0.4, volMul: 0.6, movMul: 0.5, engulfMul: 0.4 },
  needle_swarm:   { isingMul: 0.8, volMul: 0.7, movMul: 1.6, engulfMul: 0.6 },
  folded_anchor:  { isingMul: 1.8, volMul: 1.4, movMul: 0.4, engulfMul: 1.4 },
  glass_antibody: { isingMul: 1.2, volMul: 1.0, movMul: 1.0, engulfMul: 0.8 },
  static_lattice: { isingMul: 0.7, volMul: 0.8, movMul: 0.8, engulfMul: 0.6 },
  quill_bloom:    { isingMul: 0.5, volMul: 0.7, movMul: 1.3, engulfMul: 0.5 },
  vitric_anchor:  { isingMul: 1.6, volMul: 1.3, movMul: 0.5, engulfMul: 1.2 },
  mire_lattice:   { isingMul: 0.7, volMul: 0.8, movMul: 0.8, engulfMul: 0.6 },
};

export function getBreedProfile(id: BreedProfileId | undefined): BreedProfile {
  if (id === undefined) return DEFAULT_PROFILE;
  return BREED_PROFILES[id] ?? DEFAULT_PROFILE;
}

export interface ReagentEnergyShift {
  readonly isingShift: number;
  readonly volShift: number;
  readonly movShift: number;
}

export type ReagentShiftId = 'nutrient' | 'toxin' | 'water' | 'salt' | 'acid' | 'paste';

const ZERO_SHIFT: ReagentEnergyShift = { isingShift: 0, volShift: 0, movShift: 0 };

export const REAGENT_ENERGY_SHIFTS: Record<ReagentShiftId, ReagentEnergyShift> = {
  nutrient: { isingShift: -0.1, volShift: -0.3, movShift:  0.2 },
  toxin:    { isingShift:  0.1, volShift:  0.4, movShift:  0.3 },
  water:    { isingShift: -0.2, volShift: -0.1, movShift:  0.1 },
  salt:     { isingShift:  0.4, volShift:  0.1, movShift: -0.3 },
  acid:     { isingShift: -0.3, volShift:  0.5, movShift:  0.2 },
  paste:    { isingShift: -0.05, volShift: -0.15, movShift: 0.1 },
};

export function getReagentShift(id: string): ReagentEnergyShift {
  return (REAGENT_ENERGY_SHIFTS as Record<string, ReagentEnergyShift>)[id] ?? ZERO_SHIFT;
}
