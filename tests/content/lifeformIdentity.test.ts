import { describe, expect, it } from 'vitest';
import { ARCHETYPE_INFO, EGG_ARCHETYPES } from '../../src/content/enemies';
import { BREED_DEFS } from '../../src/content/catalysis';
import { LIFEFORM_IDENTITIES } from '../../src/content/lifeformIdentity';

type Rgb = [number, number, number];

describe('lifeform identity', () => {
  it('defines an identity for every base archetype and hidden breed', () => {
    for (const id of EGG_ARCHETYPES) {
      expect(LIFEFORM_IDENTITIES[id]).toBeDefined();
    }
    for (const id of Object.keys(BREED_DEFS) as Array<keyof typeof BREED_DEFS>) {
      expect(LIFEFORM_IDENTITIES[id]).toBeDefined();
    }
  });

  it('keeps identities complete enough for UI, render, and audio hooks', () => {
    for (const identity of Object.values(LIFEFORM_IDENTITIES)) {
      expect(identity.name.length).toBeGreaterThan(3);
      expect(identity.role.length).toBeGreaterThan(3);
      expect(identity.behavior.length).toBeGreaterThan(8);
      expect(identity.origin.length).toBeGreaterThan(8);
      expect(identity.soundId.length).toBeGreaterThan(3);
      expect(identity.colors.primary.length).toBe(3);
      expect(identity.colors.accent.length).toBe(3);
      expect(['cellular', 'needle', 'anchor', 'crystal', 'glitter', 'cycle']).toContain(identity.renderStyle);
    }
  });

  it('labels rare lifeform origins as discovery or hybrid clues', () => {
    for (const id of Object.keys(BREED_DEFS) as Array<keyof typeof BREED_DEFS>) {
      const breed = BREED_DEFS[id];
      const prefix = breed.parents ? 'Hybrid' : 'Discovery';
      expect(LIFEFORM_IDENTITIES[id].origin).toBe(`${prefix}: ${breed.discoveryTrigger}.`);
    }
  });

  it('keeps starter lifeforms visually distinct enough to read in the dish and rack', () => {
    for (let i = 0; i < EGG_ARCHETYPES.length; i++) {
      for (let j = i + 1; j < EGG_ARCHETYPES.length; j++) {
        const a = EGG_ARCHETYPES[i]!;
        const b = EGG_ARCHETYPES[j]!;
        expect(colorDistance(ARCHETYPE_INFO[a].color, ARCHETYPE_INFO[b].color)).toBeGreaterThanOrEqual(80);
      }
    }
  });

  it('keeps rare breed tints distinct from the base archetype they mutate from', () => {
    for (const [id, breed] of Object.entries(BREED_DEFS)) {
      expect(colorDistance(breed.tint, ARCHETYPE_INFO[breed.baseArchetype].color)).toBeGreaterThanOrEqual(75);
      expect(LIFEFORM_IDENTITIES[id as keyof typeof BREED_DEFS].colors.primary).toEqual(breed.tint);
    }
  });

  it('avoids near-duplicate primary colors across the full lifeform catalogue', () => {
    const identities = Object.values(LIFEFORM_IDENTITIES);

    for (let i = 0; i < identities.length; i++) {
      for (let j = i + 1; j < identities.length; j++) {
        expect(colorDistance(identities[i]!.colors.primary, identities[j]!.colors.primary)).toBeGreaterThanOrEqual(50);
      }
    }
  });

  it('keeps starter identity colors aligned with archetype colors used by UI and render paths', () => {
    for (const id of EGG_ARCHETYPES) {
      expect(LIFEFORM_IDENTITIES[id].colors.primary).toEqual(ARCHETYPE_INFO[id].color);
    }
  });
});

function colorDistance(a: Rgb, b: Rgb): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}
