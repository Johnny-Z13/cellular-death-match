// @ts-expect-error Vitest runs this test in Node; the app tsconfig intentionally omits Node types.
import { existsSync } from 'node:fs';
// @ts-expect-error Sharp's current package exports do not expose its bundled declarations to this tsconfig.
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { BREED_DEFS } from '../../src/content/catalysis';
import { EGG_ARCHETYPES, ARCHETYPE_INFO } from '../../src/content/enemies';
import { GENOME_ART, GENOME_IDS } from '../../src/content/genomeArt';
import { LIFEFORM_IDENTITIES } from '../../src/content/lifeformIdentity';
import { NOTEBOOK_ENTRIES } from '../../src/content/notebook';
import { ALL_PROGRESSION_LIFEFORMS } from '../../src/game/discoveryProgression';

describe('genome reconstruction content contract', () => {
  it('covers every progression lifeform with stable art and accessible archive copy', () => {
    expect(GENOME_IDS).toEqual(ALL_PROGRESSION_LIFEFORMS);
    expect(Object.keys(GENOME_ART)).toHaveLength(14);

    for (const id of GENOME_IDS) {
      const genome = GENOME_ART[id];
      const archiveEntry = NOTEBOOK_ENTRIES.find((entry) => (
        entry.unlock.lifeformId === id || entry.unlock.breedId === id
      ));
      expect(genome.id).toBe(id);
      expect(genome.name).toBe(LIFEFORM_IDENTITIES[id].name);
      expect(genome.soundId).toBe(LIFEFORM_IDENTITIES[id].soundId);
      expect(genome.alt.length).toBeGreaterThan(30);
      expect(genome.reconstructionNote.length).toBeGreaterThan(30);
      expect(genome.asset).toBe(`/art/genomes/${id}.png`);
      expect(existsSync(`public${genome.asset}`)).toBe(true);
      expect(archiveEntry?.category).toBe('lifeform');
    }
  });

  it('derives the same primary RGB used by eggs, rack identities, and live CA cultures', () => {
    for (const id of GENOME_IDS) {
      const canonical = (EGG_ARCHETYPES as readonly string[]).includes(id)
        ? ARCHETYPE_INFO[id as keyof typeof ARCHETYPE_INFO].color
        : BREED_DEFS[id as keyof typeof BREED_DEFS].tint;
      expect(GENOME_ART[id].primary).toEqual(canonical);
      expect(GENOME_ART[id].primary).toEqual(LIFEFORM_IDENTITIES[id].colors.primary);
    }
  });

  it('ships transparent 384px pixel art whose dominant visible shade is the exact canonical RGB', async () => {
    for (const id of GENOME_IDS) {
      const image = sharp(`public${GENOME_ART[id].asset}`).ensureAlpha();
      const metadata = await image.metadata();
      const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });
      const counts = new Map<string, number>();
      let transparent = 0;
      let opaque = 0;

      for (let offset = 0; offset < data.length; offset += info.channels) {
        const alpha = data[offset + 3]!;
        if (alpha === 0) {
          transparent += 1;
          continue;
        }
        if (alpha === 255) opaque += 1;
        const key = `${data[offset]},${data[offset + 1]},${data[offset + 2]}`;
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }

      const canonicalKey = GENOME_ART[id].primary.join(',');
      const largestPaletteCount = Math.max(...counts.values());
      expect(metadata.width).toBe(384);
      expect(metadata.height).toBe(384);
      expect(metadata.hasAlpha).toBe(true);
      expect(transparent).toBeGreaterThan(0);
      expect(opaque).toBeGreaterThan(0);
      expect(counts.get(canonicalKey)).toBe(largestPaletteCount);
    }
  });
});
