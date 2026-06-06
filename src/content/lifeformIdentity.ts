import { ARCHETYPE_INFO, type EnemyArchetype, type EnemySpawn } from './enemies';
import { BREED_DEFS, type BreedId } from './catalysis';

export type LifeformRenderStyle = 'cellular' | 'needle' | 'anchor' | 'crystal' | 'glitter' | 'cycle';
export type LifeformIdentityId = EnemyArchetype | BreedId;

export interface LifeformIdentity {
  id: LifeformIdentityId;
  name: string;
  role: string;
  behavior: string;
  origin: string;
  colors: {
    primary: [number, number, number];
    accent: [number, number, number];
  };
  soundId: string;
  renderStyle: LifeformRenderStyle;
}

export const LIFEFORM_IDENTITIES: Record<LifeformIdentityId, LifeformIdentity> = {
  swarmlet: {
    id: 'swarmlet',
    name: ARCHETYPE_INFO.swarmlet.name,
    role: 'Grazer',
    behavior: ARCHETYPE_INFO.swarmlet.summary,
    origin: 'Starter egg strain.',
    colors: { primary: ARCHETYPE_INFO.swarmlet.color, accent: [106, 232, 126] },
    soundId: 'soft-scratch',
    renderStyle: 'cellular',
  },
  bruiser: {
    id: 'bruiser',
    name: ARCHETYPE_INFO.bruiser.name,
    role: 'Heavy feeder',
    behavior: ARCHETYPE_INFO.bruiser.summary,
    origin: 'Starter egg strain.',
    colors: { primary: ARCHETYPE_INFO.bruiser.color, accent: [255, 190, 82] },
    soundId: 'low-chew',
    renderStyle: 'anchor',
  },
  splitter: {
    id: 'splitter',
    name: ARCHETYPE_INFO.splitter.name,
    role: 'Propagator',
    behavior: ARCHETYPE_INFO.splitter.summary,
    origin: 'Starter egg strain.',
    colors: { primary: ARCHETYPE_INFO.splitter.color, accent: [91, 255, 154] },
    soundId: 'wet-pop',
    renderStyle: 'glitter',
  },
  sniper: {
    id: 'sniper',
    name: ARCHETYPE_INFO.sniper.name,
    role: 'Suppressor',
    behavior: ARCHETYPE_INFO.sniper.summary,
    origin: 'Research-unlocked egg strain.',
    colors: { primary: ARCHETYPE_INFO.sniper.color, accent: [255, 86, 154] },
    soundId: 'needle-click',
    renderStyle: 'needle',
  },
  mirror: {
    id: 'mirror',
    name: ARCHETYPE_INFO.mirror.name,
    role: 'Mimic',
    behavior: ARCHETYPE_INFO.mirror.summary,
    origin: 'Research-unlocked egg strain.',
    colors: { primary: ARCHETYPE_INFO.mirror.color, accent: [252, 220, 92] },
    soundId: 'glass-loop',
    renderStyle: 'cycle',
  },
  boss: {
    id: 'boss',
    name: ARCHETYPE_INFO.boss.name,
    role: 'Anchor',
    behavior: ARCHETYPE_INFO.boss.summary,
    origin: 'Research-unlocked egg strain.',
    colors: { primary: ARCHETYPE_INFO.boss.color, accent: [190, 142, 255] },
    soundId: 'deep-pulse',
    renderStyle: 'anchor',
  },
  needle_swarm: {
    id: 'needle_swarm',
    name: BREED_DEFS.needle_swarm.name,
    role: 'Rare suppressor breed',
    behavior: 'A thin, fast firing culture that appears when the dish gets sharp and crowded.',
    origin: `Discovery: ${BREED_DEFS.needle_swarm.discoveryTrigger}.`,
    colors: { primary: BREED_DEFS.needle_swarm.tint, accent: [255, 240, 120] },
    soundId: 'needle-swarm',
    renderStyle: 'needle',
  },
  folded_anchor: {
    id: 'folded_anchor',
    name: BREED_DEFS.folded_anchor.name,
    role: 'Rare folding anchor',
    behavior: 'A heavy culture that slows local movement and locks growth into repeating folds.',
    origin: `Discovery: ${BREED_DEFS.folded_anchor.discoveryTrigger}.`,
    colors: { primary: BREED_DEFS.folded_anchor.tint, accent: [72, 255, 218] },
    soundId: 'folded-bass',
    renderStyle: 'cycle',
  },
  glass_antibody: {
    id: 'glass_antibody',
    name: BREED_DEFS.glass_antibody.name,
    role: 'Rare brittle feeder',
    behavior: 'A brittle resistant feeder that cracks open lanes after violent reagent stress.',
    origin: `Discovery: ${BREED_DEFS.glass_antibody.discoveryTrigger}.`,
    colors: { primary: BREED_DEFS.glass_antibody.tint, accent: [255, 255, 255] },
    soundId: 'glass-tick',
    renderStyle: 'crystal',
  },
  bloom_mass: {
    id: 'bloom_mass',
    name: BREED_DEFS.bloom_mass.name,
    role: 'Rare bloom propagator',
    behavior: 'A soft propagator that swells quickly and sheds pressure into daughter cultures.',
    origin: `Discovery: ${BREED_DEFS.bloom_mass.discoveryTrigger}.`,
    colors: { primary: BREED_DEFS.bloom_mass.tint, accent: [246, 255, 96] },
    soundId: 'bloom-throb',
    renderStyle: 'glitter',
  },
  static_lattice: {
    id: 'static_lattice',
    name: BREED_DEFS.static_lattice.name,
    role: 'Rare pattern mimic',
    behavior: 'A flickering loop culture that prefers repeating patterns over direct growth.',
    origin: `Discovery: ${BREED_DEFS.static_lattice.discoveryTrigger}.`,
    colors: { primary: BREED_DEFS.static_lattice.tint, accent: [132, 236, 255] },
    soundId: 'static-lattice',
    renderStyle: 'cycle',
  },
};

export function lifeformIdentityForSpawn(spawn: EnemySpawn): LifeformIdentity {
  return LIFEFORM_IDENTITIES[spawn.breedId ?? spawn.archetype];
}
