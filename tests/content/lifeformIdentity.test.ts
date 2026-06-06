import { describe, expect, it } from 'vitest';
import { EGG_ARCHETYPES } from '../../src/content/enemies';
import { BREED_DEFS } from '../../src/content/catalysis';
import { LIFEFORM_IDENTITIES } from '../../src/content/lifeformIdentity';

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
      expect(identity.soundId.length).toBeGreaterThan(3);
      expect(identity.colors.primary.length).toBe(3);
      expect(identity.colors.accent.length).toBe(3);
      expect(['cellular', 'needle', 'anchor', 'crystal', 'glitter', 'cycle']).toContain(identity.renderStyle);
    }
  });
});
