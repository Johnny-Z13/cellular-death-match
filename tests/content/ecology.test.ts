import { describe, it, expect } from 'vitest';
import { EGG_ARCHETYPES } from '../../src/content/enemies';
import {
  ARCHETYPE_ECOLOGY,
  CRISES,
  MUTATION_TRAITS,
  pickMutationTrait,
} from '../../src/content/ecology';

describe('ecology content', () => {
  it('defines an ecology profile for every egg archetype', () => {
    for (const archetype of EGG_ARCHETYPES) {
      expect(ARCHETYPE_ECOLOGY[archetype]).toBeDefined();
      expect(ARCHETYPE_ECOLOGY[archetype].summary.length).toBeGreaterThan(12);
    }
  });

  it('keeps relationship targets inside known archetypes', () => {
    const known = new Set(EGG_ARCHETYPES);
    for (const profile of Object.values(ARCHETYPE_ECOLOGY)) {
      for (const target of [...profile.prefers, ...profile.avoids]) {
        expect(known.has(target)).toBe(true);
      }
    }
  });

  it('defines mutation traits with mechanical multipliers', () => {
    expect(Object.keys(MUTATION_TRAITS).length).toBeGreaterThanOrEqual(5);
    for (const trait of Object.values(MUTATION_TRAITS)) {
      expect(trait.name.length).toBeGreaterThan(3);
      expect(trait.speedMultiplier).toBeGreaterThan(0);
      expect(trait.targetVolMultiplier).toBeGreaterThan(0);
      expect(trait.toxinMultiplier).toBeGreaterThan(0);
    }
  });

  it('picks a trait that is not already present when possible', () => {
    const existing = Object.keys(MUTATION_TRAITS).slice(0, -1) as Array<keyof typeof MUTATION_TRAITS>;
    const picked = pickMutationTrait(existing, 0.1);
    expect(existing).not.toContain(picked);
  });

  it('defines crisis events with useful durations', () => {
    expect(Object.keys(CRISES).length).toBeGreaterThanOrEqual(3);
    for (const crisis of Object.values(CRISES)) {
      expect(crisis.name.length).toBeGreaterThan(4);
      expect(crisis.durationTicks).toBeGreaterThanOrEqual(60 * 6);
    }
  });
});
