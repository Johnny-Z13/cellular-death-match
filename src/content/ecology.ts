import type { EnemyArchetype } from './enemies';

export type EcologyRole = 'grazer' | 'predator' | 'propagator' | 'suppressor' | 'mimic' | 'anchor';
export type TraitId = 'fleet' | 'gelatinous' | 'toxin_resistant' | 'fragile' | 'budding';
export type CrisisId = 'heat_spike' | 'oxygen_crash' | 'contamination_bloom';

export interface TraitDef {
  id: TraitId;
  name: string;
  summary: string;
  speedMultiplier: number;
  targetVolMultiplier: number;
  toxinMultiplier: number;
}

export interface CrisisDef {
  id: CrisisId;
  name: string;
  summary: string;
  durationTicks: number;
}

export interface ArchetypeEcology {
  role: EcologyRole;
  prefers: EnemyArchetype[];
  avoids: EnemyArchetype[];
  summary: string;
}

export const MUTATION_TRAITS: Record<TraitId, TraitDef> = {
  fleet: {
    id: 'fleet',
    name: 'Fleet',
    summary: 'Moves faster but keeps less reserve mass.',
    speedMultiplier: 1.18,
    targetVolMultiplier: 0.93,
    toxinMultiplier: 1,
  },
  gelatinous: {
    id: 'gelatinous',
    name: 'Gelatinous',
    summary: 'Builds more body mass and resists sudden disruption.',
    speedMultiplier: 0.9,
    targetVolMultiplier: 1.22,
    toxinMultiplier: 0.92,
  },
  toxin_resistant: {
    id: 'toxin_resistant',
    name: 'Toxin Resistant',
    summary: 'Shrugs off toxin fields and erodes more slowly.',
    speedMultiplier: 0.98,
    targetVolMultiplier: 1,
    toxinMultiplier: 0.52,
  },
  fragile: {
    id: 'fragile',
    name: 'Fragile',
    summary: 'Rapid metabolism with poor structural integrity.',
    speedMultiplier: 1.1,
    targetVolMultiplier: 0.82,
    toxinMultiplier: 1.32,
  },
  budding: {
    id: 'budding',
    name: 'Budding',
    summary: 'Recovers volume quickly and tends to found daughter colonies.',
    speedMultiplier: 0.96,
    targetVolMultiplier: 1.16,
    toxinMultiplier: 0.95,
  },
};

export const CRISES: Record<CrisisId, CrisisDef> = {
  heat_spike: {
    id: 'heat_spike',
    name: 'Heat Spike',
    summary: 'All active lifeforms surge and collide more aggressively.',
    durationTicks: 60 * 9,
  },
  oxygen_crash: {
    id: 'oxygen_crash',
    name: 'Oxygen Crash',
    summary: 'Large colonies lose carrying capacity until the dish recovers.',
    durationTicks: 60 * 8,
  },
  contamination_bloom: {
    id: 'contamination_bloom',
    name: 'Contamination Bloom',
    summary: 'A stray colony seeds new competition into sparse dishes.',
    durationTicks: 60 * 7,
  },
};

export const ARCHETYPE_ECOLOGY: Record<EnemyArchetype, ArchetypeEcology> = {
  swarmlet: {
    role: 'grazer',
    prefers: ['splitter'],
    avoids: ['bruiser', 'boss'],
    summary: 'A grazing strain that spreads quickly, then yields to larger feeders.',
  },
  bruiser: {
    role: 'predator',
    prefers: ['swarmlet', 'splitter'],
    avoids: ['boss'],
    summary: 'A heavy feeder that hunts small colonies and pressures diversity.',
  },
  splitter: {
    role: 'propagator',
    prefers: ['swarmlet', 'mirror'],
    avoids: ['bruiser'],
    summary: 'A midweight propagator that clusters with small colonies and fragments when stressed.',
  },
  sniper: {
    role: 'suppressor',
    prefers: ['bruiser', 'boss'],
    avoids: ['swarmlet'],
    summary: 'A suppressor that prefers large targets and tries to avoid swarms.',
  },
  mirror: {
    role: 'mimic',
    prefers: ['bruiser', 'sniper'],
    avoids: [],
    summary: 'An adaptive strain that shadows dominant lineages and copies their pressure.',
  },
  boss: {
    role: 'anchor',
    prefers: ['bruiser', 'splitter', 'mirror'],
    avoids: ['sniper'],
    summary: 'A dish anchor that pulls heavy colonies into a stable but dangerous center of mass.',
  },
};

const TRAIT_IDS = Object.keys(MUTATION_TRAITS) as TraitId[];

export function pickMutationTrait(existing: readonly TraitId[] | undefined, roll: number): TraitId {
  const available = TRAIT_IDS.filter((trait) => !existing?.includes(trait));
  const pool = available.length > 0 ? available : TRAIT_IDS;
  return pool[Math.floor(clamp01(roll) * pool.length)] ?? pool[0]!;
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(0.999999, n));
}
