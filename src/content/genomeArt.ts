import { BREED_DEFS, type BreedId } from './catalysis';
import { EGG_ARCHETYPES, type EnemyArchetype } from './enemies';
import {
  LIFEFORM_IDENTITIES,
  type LifeformIdentityId,
} from './lifeformIdentity';

export type GenomeComplexityBand =
  | 'reference'
  | 'foundational'
  | 'specialized'
  | 'recombinant';

export interface GenomeArtIdentity {
  id: LifeformIdentityId;
  name: string;
  role: string;
  asset: string;
  alt: string;
  complexityBand: GenomeComplexityBand;
  primary: [number, number, number];
  accent: [number, number, number];
  soundId: string;
  parents: readonly [BreedId, BreedId] | null;
  reconstructionNote: string;
}

interface GenomeArtCopy {
  alt: string;
  complexityBand: GenomeComplexityBand;
  reconstructionNote: string;
}

const GENOME_COPY: Record<LifeformIdentityId, GenomeArtCopy> = {
  swarmlet: {
    complexityBand: 'reference',
    alt: 'Cyan pixel-cell Swarmlet reconstruction, shaped like a quick tadpole glider with loose colony cells.',
    reconstructionNote: 'A minimal reference genome expressed as a skittering glider colony.',
  },
  bruiser: {
    complexityBand: 'foundational',
    alt: 'Orange pixel-cell Bruiser reconstruction with a broad body, heavy shoulders, and blunt feeder jaws.',
    reconstructionNote: 'Dense feeder code resolves into a low, stubborn mass built to dominate space.',
  },
  splitter: {
    complexityBand: 'foundational',
    alt: 'Green pixel-cell Splitter reconstruction with a rounded body and a daughter lobe budding from its side.',
    reconstructionNote: 'A propagator genome caught in the moment one body becomes two.',
  },
  sniper: {
    complexityBand: 'foundational',
    alt: 'Hot-pink pixel-cell Sniper reconstruction with thin legs, one focused eye, and a long cellular needle.',
    reconstructionNote: 'Lean suppressor code concentrates its whole silhouette into reach and precision.',
  },
  mirror: {
    complexityBand: 'foundational',
    alt: 'Violet pixel-cell Mirror reconstruction formed from two matching moth-like halves and reflected eyes.',
    reconstructionNote: 'A bilateral mimic whose two halves continuously echo the same instruction.',
  },
  boss: {
    complexityBand: 'foundational',
    alt: 'Coral-red pixel-cell Boss reconstruction with a crowned body, rooted legs, and broad anchor claws.',
    reconstructionNote: 'Anchor code expresses as a territorial organism too large to ignore.',
  },
  needle_swarm: {
    complexityBand: 'specialized',
    alt: 'Yellow pixel-cell Needle Swarm reconstruction, a compact wasp-like colony covered in long integrated quills.',
    reconstructionNote: 'A volatile suppressor genome that turns fragile growth into a crown of firing quills.',
  },
  folded_anchor: {
    complexityBand: 'specialized',
    alt: 'Electric-blue pixel-cell Folded Anchor reconstruction with four rooted lobes and an aqua folded spiral torso.',
    reconstructionNote: 'Repeating fold instructions lock a gelatinous body into an immovable knot.',
  },
  glass_antibody: {
    complexityBand: 'specialized',
    alt: 'Icy-cyan pixel-cell Glass Antibody reconstruction with crystalline wings, an angular jaw, and a bright inner core.',
    reconstructionNote: 'Brittle resistant code builds a faceted hunter around a protected living core.',
  },
  bloom_mass: {
    complexityBand: 'specialized',
    alt: 'Lime pixel-cell Bloom Mass reconstruction with a swollen central body and several connected budding heads.',
    reconstructionNote: 'Overfed propagator code keeps writing hungry daughter lobes into its own edge.',
  },
  static_lattice: {
    complexityBand: 'specialized',
    alt: 'Teal pixel-cell Static Lattice reconstruction made from checker patterns, looped tendrils, and paired pale eyes.',
    reconstructionNote: 'A mimic genome that prefers recurring geometry to ordinary outward growth.',
  },
  quill_bloom: {
    complexityBand: 'recombinant',
    alt: 'Acid-lime pixel-cell Quill Bloom hybrid with a rounded budding body, side lobes, and a tall crown of quills.',
    reconstructionNote: 'Bloom softness and Needle Swarm aggression recombine into a budding artillery flower.',
  },
  vitric_anchor: {
    complexityBand: 'recombinant',
    alt: 'Lavender pixel-cell Vitric Anchor hybrid with rooted limbs, interlocking armor, and a crystalline crown.',
    reconstructionNote: 'Glass facets grow across a Folded Anchor plan to form a toxin-proof living fortress.',
  },
  mire_lattice: {
    complexityBand: 'recombinant',
    alt: 'Mire-green pixel-cell Mire Lattice hybrid with a curled checker-pattern body and three budding nodes.',
    reconstructionNote: 'A repeating lattice learns to bud, producing a self-copying colonial wyrm.',
  },
};

export const GENOME_IDS: readonly LifeformIdentityId[] = [
  ...EGG_ARCHETYPES,
  ...(Object.keys(BREED_DEFS) as BreedId[]),
];

export const GENOME_ART: Record<LifeformIdentityId, GenomeArtIdentity> = Object.fromEntries(
  GENOME_IDS.map((id) => {
    const identity = LIFEFORM_IDENTITIES[id];
    const copy = GENOME_COPY[id];
    const breed = id in BREED_DEFS ? BREED_DEFS[id as BreedId] : null;
    return [id, {
      id,
      name: identity.name,
      role: identity.role,
      asset: `/art/genomes/${id}.png`,
      alt: copy.alt,
      complexityBand: copy.complexityBand,
      primary: identity.colors.primary,
      accent: identity.colors.accent,
      soundId: identity.soundId,
      parents: breed?.parents ?? null,
      reconstructionNote: copy.reconstructionNote,
    } satisfies GenomeArtIdentity];
  }),
) as Record<LifeformIdentityId, GenomeArtIdentity>;

export function genomeArtFor(id: LifeformIdentityId): GenomeArtIdentity {
  return GENOME_ART[id];
}

export function isGenomeId(id: string): id is LifeformIdentityId {
  return id in GENOME_ART;
}

export function isFoundationalGenome(id: LifeformIdentityId): id is EnemyArchetype {
  return (EGG_ARCHETYPES as readonly string[]).includes(id);
}
