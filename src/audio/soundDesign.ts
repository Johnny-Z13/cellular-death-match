export type SoundEventId =
  | 'hatch'
  | 'visible_mutation'
  | 'catalytic_flare'
  | 'water_stabilize'
  | 'salt_crystal'
  | 'folding_fault'
  | 'hidden_breed'
  | 'objective_warning';

export type ProceduralLayer = 'none' | 'soft' | 'medium' | 'strong';

export interface SoundEventDef {
  id: SoundEventId;
  asset?: string;
  proceduralLayer: ProceduralLayer;
  maxVoices: number;
  cooldownMs: number;
  gain: number;
}

export interface LifeformSoundIdentity {
  id: string;
  family: 'grazer' | 'heavy' | 'propagator' | 'suppressor' | 'mimic' | 'anchor' | 'rare';
  eventId: SoundEventId;
  gain: number;
}

export const SOUND_EVENT_DEFS: Record<SoundEventId, SoundEventDef> = {
  hatch: {
    id: 'hatch',
    asset: '/audio/generated/hatch.mp3',
    proceduralLayer: 'soft',
    maxVoices: 3,
    cooldownMs: 120,
    gain: 0.42,
  },
  visible_mutation: {
    id: 'visible_mutation',
    asset: '/audio/generated/visible_mutation.mp3',
    proceduralLayer: 'medium',
    maxVoices: 2,
    cooldownMs: 180,
    gain: 0.55,
  },
  catalytic_flare: {
    id: 'catalytic_flare',
    asset: '/audio/generated/catalytic_flare.mp3',
    proceduralLayer: 'strong',
    maxVoices: 1,
    cooldownMs: 380,
    gain: 0.72,
  },
  water_stabilize: {
    id: 'water_stabilize',
    asset: '/audio/generated/water_stabilize.mp3',
    proceduralLayer: 'soft',
    maxVoices: 2,
    cooldownMs: 240,
    gain: 0.48,
  },
  salt_crystal: {
    id: 'salt_crystal',
    asset: '/audio/generated/salt_crystal.mp3',
    proceduralLayer: 'medium',
    maxVoices: 2,
    cooldownMs: 280,
    gain: 0.56,
  },
  folding_fault: {
    id: 'folding_fault',
    asset: '/audio/generated/folding_fault.mp3',
    proceduralLayer: 'strong',
    maxVoices: 1,
    cooldownMs: 520,
    gain: 0.62,
  },
  hidden_breed: {
    id: 'hidden_breed',
    asset: '/audio/generated/hidden_breed.mp3',
    proceduralLayer: 'medium',
    maxVoices: 1,
    cooldownMs: 700,
    gain: 0.58,
  },
  objective_warning: {
    id: 'objective_warning',
    asset: '/audio/generated/objective_warning.mp3',
    proceduralLayer: 'medium',
    maxVoices: 1,
    cooldownMs: 900,
    gain: 0.5,
  },
};

export const LIFEFORM_SOUND_IDENTITIES: Record<string, LifeformSoundIdentity> = {
  'soft-scratch': { id: 'soft-scratch', family: 'grazer', eventId: 'hatch', gain: 0.34 },
  'low-chew': { id: 'low-chew', family: 'heavy', eventId: 'hatch', gain: 0.38 },
  'wet-pop': { id: 'wet-pop', family: 'propagator', eventId: 'hatch', gain: 0.4 },
  'needle-click': { id: 'needle-click', family: 'suppressor', eventId: 'visible_mutation', gain: 0.36 },
  'glass-loop': { id: 'glass-loop', family: 'mimic', eventId: 'water_stabilize', gain: 0.32 },
  'deep-pulse': { id: 'deep-pulse', family: 'anchor', eventId: 'objective_warning', gain: 0.36 },
  'needle-swarm': { id: 'needle-swarm', family: 'rare', eventId: 'hidden_breed', gain: 0.46 },
  'folded-bass': { id: 'folded-bass', family: 'rare', eventId: 'folding_fault', gain: 0.48 },
  'glass-tick': { id: 'glass-tick', family: 'rare', eventId: 'salt_crystal', gain: 0.44 },
  'bloom-throb': { id: 'bloom-throb', family: 'rare', eventId: 'hidden_breed', gain: 0.44 },
  'static-lattice': { id: 'static-lattice', family: 'rare', eventId: 'folding_fault', gain: 0.42 },
};

export function soundEventForDishSignal(kind: string, label: string): SoundEventId | null {
  if (kind === 'mutation') return 'visible_mutation';
  if (kind === 'discovery') return 'hidden_breed';
  if (kind === 'fold') return 'folding_fault';
  if (kind === 'stabilize') return 'water_stabilize';
  if (label.includes('CRYSTAL') || label.includes('BRINE')) return 'salt_crystal';
  if (kind === 'critical') return 'catalytic_flare';
  if (kind === 'caution') return 'objective_warning';
  return null;
}
