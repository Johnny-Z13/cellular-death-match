import { describe, it, expect } from 'vitest';
import {
  DEFAULT_PROFILE,
  BREED_PROFILES,
  REAGENT_ENERGY_SHIFTS,
  getBreedProfile,
  getReagentShift,
} from '../../src/sim/breedProfiles';
import type { BreedProfileId, ReagentShiftId } from '../../src/sim/breedProfiles';

describe('DEFAULT_PROFILE', () => {
  it('has all multipliers at 1.0', () => {
    expect(DEFAULT_PROFILE.isingMul).toBe(1.0);
    expect(DEFAULT_PROFILE.volMul).toBe(1.0);
    expect(DEFAULT_PROFILE.movMul).toBe(1.0);
    expect(DEFAULT_PROFILE.engulfMul).toBe(1.0);
  });
});

describe('getBreedProfile', () => {
  it('returns DEFAULT_PROFILE for undefined', () => {
    expect(getBreedProfile(undefined)).toBe(DEFAULT_PROFILE);
  });

  it('returns the correct named profile for swarmlet', () => {
    const p = getBreedProfile('swarmlet');
    expect(p).toBe(BREED_PROFILES['swarmlet']);
    expect(p.isingMul).toBe(0.6);
    expect(p.volMul).toBe(0.8);
    expect(p.movMul).toBe(1.4);
    expect(p.engulfMul).toBe(0.7);
  });

  it('returns the correct named profile for boss', () => {
    const p = getBreedProfile('boss');
    expect(p).toBe(BREED_PROFILES['boss']);
    expect(p.isingMul).toBe(1.8);
    expect(p.volMul).toBe(1.4);
    expect(p.movMul).toBe(0.4);
    expect(p.engulfMul).toBe(1.5);
  });

  it('returns the correct named profile for mirror', () => {
    const p = getBreedProfile('mirror');
    expect(p.isingMul).toBe(1.0);
    expect(p.volMul).toBe(1.0);
    expect(p.movMul).toBe(1.0);
    expect(p.engulfMul).toBe(1.0);
  });
});

describe('breed profile values', () => {
  it('swarmlet has low ising multiplier (below 1)', () => {
    expect(BREED_PROFILES['swarmlet'].isingMul).toBeLessThan(1.0);
  });

  it('boss has high ising multiplier (above 1)', () => {
    expect(BREED_PROFILES['boss'].isingMul).toBeGreaterThan(1.0);
  });

  it('every profile has positive numbers for all 4 fields', () => {
    const ids = Object.keys(BREED_PROFILES) as BreedProfileId[];
    for (const id of ids) {
      const p = BREED_PROFILES[id];
      expect(p.isingMul, `${id}.isingMul`).toBeGreaterThan(0);
      expect(p.volMul,   `${id}.volMul`).toBeGreaterThan(0);
      expect(p.movMul,   `${id}.movMul`).toBeGreaterThan(0);
      expect(p.engulfMul,`${id}.engulfMul`).toBeGreaterThan(0);
    }
  });

  it('DEFAULT_PROFILE also has all positive fields', () => {
    expect(DEFAULT_PROFILE.isingMul).toBeGreaterThan(0);
    expect(DEFAULT_PROFILE.volMul).toBeGreaterThan(0);
    expect(DEFAULT_PROFILE.movMul).toBeGreaterThan(0);
    expect(DEFAULT_PROFILE.engulfMul).toBeGreaterThan(0);
  });
});

describe('REAGENT_ENERGY_SHIFTS', () => {
  it('nutrient has a negative ising shift', () => {
    expect(REAGENT_ENERGY_SHIFTS['nutrient'].isingShift).toBeLessThan(0);
  });

  it('salt has a positive ising shift', () => {
    expect(REAGENT_ENERGY_SHIFTS['salt'].isingShift).toBeGreaterThan(0);
  });

  it('all reagent shifts have finite values', () => {
    const ids = Object.keys(REAGENT_ENERGY_SHIFTS) as ReagentShiftId[];
    for (const id of ids) {
      const s = REAGENT_ENERGY_SHIFTS[id];
      expect(isFinite(s.isingShift), `${id}.isingShift finite`).toBe(true);
      expect(isFinite(s.volShift),   `${id}.volShift finite`).toBe(true);
      expect(isFinite(s.movShift),   `${id}.movShift finite`).toBe(true);
    }
  });
});

describe('getReagentShift', () => {
  it('returns the correct shift for a known reagent', () => {
    const s = getReagentShift('nutrient');
    expect(s.isingShift).toBe(-0.1);
    expect(s.volShift).toBe(-0.3);
    expect(s.movShift).toBe(0.2);
  });

  it('returns zero shifts for an unknown reagent', () => {
    const s = getReagentShift('unknown_reagent');
    expect(s.isingShift).toBe(0);
    expect(s.volShift).toBe(0);
    expect(s.movShift).toBe(0);
  });

  it('returns zero shifts for an empty string', () => {
    const s = getReagentShift('');
    expect(s.isingShift).toBe(0);
    expect(s.volShift).toBe(0);
    expect(s.movShift).toBe(0);
  });

  it('returns correct shift for salt', () => {
    const s = getReagentShift('salt');
    expect(s.isingShift).toBe(0.4);
    expect(s.volShift).toBe(0.1);
    expect(s.movShift).toBe(-0.3);
  });

  it('returns correct shift for paste', () => {
    const s = getReagentShift('paste');
    expect(s.isingShift).toBe(-0.05);
    expect(s.volShift).toBe(-0.15);
    expect(s.movShift).toBe(0.1);
  });
});
