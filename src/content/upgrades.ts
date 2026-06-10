// Player-facing lab config. Computed from a base + accumulated upgrade
// modifiers, then passed to the arena to seed each ecosystem.
export interface PlayerConfig {
  targetVol: number;
  speed: number;
  engulfMultiplier: number;        // active value when engulf is held
  bulletSize: number;
  eggCharges?: number;
  nutrientCharges?: number;
  toxinCharges?: number;
  waterCharges?: number;
  saltCharges?: number;
  acidCharges?: number;
  pasteCharges?: number;
  nutrientRadius?: number;
  toxinRadius?: number;
  waterRadius?: number;
  saltRadius?: number;
  acidRadius?: number;
  agitationCharges?: number;
}

// A stable handle to an upgrade in the run state.
export interface UpgradeRef {
  id: string;
  stacks: number;
}

// One upgrade definition. Current upgrades are modifier-only research picks.
export interface UpgradeDef {
  id: string;
  name: string;
  description: string;
  modifiers: {
    addTargetVol?: number;        // additive flat
    pctSpeed?: number;            // additive percent
    pctEngulfMultiplier?: number; // additive percent (0.15 = +15%)
    pctBulletSize?: number;       // additive percent
    addEggCharges?: number;
    addNutrientCharges?: number;
    addToxinCharges?: number;
    addAgitationCharges?: number;
    addWaterCharges?: number;
    addSaltCharges?: number;
    addAcidCharges?: number;
    pctNutrientRadius?: number;
    pctToxinRadius?: number;
    pctWaterRadius?: number;
    pctSaltRadius?: number;
    pctAcidRadius?: number;
  };
}

// The current compact catalogue focuses on the ecosystem tools and objective
// control sample.
export const UPGRADES: ReadonlyArray<UpgradeDef> = [
  {
    id: 'egg_1',
    name: 'Spore Rack',
    description: '+2 egg charges',
    modifiers: { addEggCharges: 2 },
  },
  {
    id: 'food_1',
    name: 'Richer Agar',
    description: '+1 nutrient charge',
    modifiers: { addNutrientCharges: 1 },
  },
  {
    id: 'toxin_1',
    name: 'Antibody Ampoule',
    description: '+1 toxin charge',
    modifiers: { addToxinCharges: 1 },
  },
  {
    id: 'centrifuge_1',
    name: 'Centrifuge Rotor',
    description: '+1 agitation charge',
    modifiers: { addAgitationCharges: 1 },
  },
  {
    id: 'food_radius_1',
    name: 'Diffusion Medium',
    description: '+18% nutrient spread',
    modifiers: { pctNutrientRadius: 0.18 },
  },
  {
    id: 'toxin_radius_1',
    name: 'Volatile Toxin',
    description: '+18% toxin spread',
    modifiers: { pctToxinRadius: 0.18 },
  },
  {
    id: 'water_1',
    name: 'Flood Flask',
    description: '+2 water charges',
    modifiers: { addWaterCharges: 2 },
  },
  {
    id: 'salt_1',
    name: 'Salt Lattice',
    description: '+2 salt charges',
    modifiers: { addSaltCharges: 2 },
  },
  {
    id: 'acid_1',
    name: 'Acid Pipette',
    description: '+1 acid charge',
    modifiers: { addAcidCharges: 1 },
  },
  {
    id: 'volatile_reagents_1',
    name: 'Unstable Medium',
    description: '+12% water, salt, and acid spread',
    modifiers: { pctWaterRadius: 0.12, pctSaltRadius: 0.12, pctAcidRadius: 0.12 },
  },
  {
    id: 'red_buffer_1',
    name: 'Control Buffer',
    description: '+80 control sample starting volume',
    modifiers: { addTargetVol: 80 },
  },
];

const UPGRADES_BY_ID = new Map(UPGRADES.map((u) => [u.id, u]));

export function getUpgradeDef(id: string): UpgradeDef | undefined {
  return UPGRADES_BY_ID.get(id);
}

// Compose a PlayerConfig from a base and an ordered list of upgrade refs.
// Stacking convention: flat additions sum; percentages add (so 2× +15% = +30%,
// not (1.15)^2 ≈ +32%). This matches standard roguelike behavior and is easier
// to reason about for balance.
export function applyUpgrades(base: PlayerConfig, refs: ReadonlyArray<UpgradeRef>): PlayerConfig {
  let addTargetVol = 0;
  let pctSpeed = 0;
  let pctEngulf = 0;
  let pctBullet = 0;
  let addEggCharges = 0;
  let addNutrientCharges = 0;
  let addToxinCharges = 0;
  let addAgitationCharges = 0;
  let addWaterCharges = 0;
  let addSaltCharges = 0;
  let addAcidCharges = 0;
  let pctNutrientRadius = 0;
  let pctToxinRadius = 0;
  let pctWaterRadius = 0;
  let pctSaltRadius = 0;
  let pctAcidRadius = 0;
  for (const ref of refs) {
    const def = UPGRADES_BY_ID.get(ref.id);
    if (!def) continue;
    const m = def.modifiers;
    if (m.addTargetVol !== undefined)        addTargetVol += m.addTargetVol * ref.stacks;
    if (m.pctSpeed !== undefined)            pctSpeed     += m.pctSpeed * ref.stacks;
    if (m.pctEngulfMultiplier !== undefined) pctEngulf    += m.pctEngulfMultiplier * ref.stacks;
    if (m.pctBulletSize !== undefined)       pctBullet    += m.pctBulletSize * ref.stacks;
    if (m.addEggCharges !== undefined)       addEggCharges      += m.addEggCharges * ref.stacks;
    if (m.addNutrientCharges !== undefined)  addNutrientCharges += m.addNutrientCharges * ref.stacks;
    if (m.addToxinCharges !== undefined)     addToxinCharges    += m.addToxinCharges * ref.stacks;
    if (m.addAgitationCharges !== undefined) addAgitationCharges += m.addAgitationCharges * ref.stacks;
    if (m.addWaterCharges !== undefined)     addWaterCharges    += m.addWaterCharges * ref.stacks;
    if (m.addSaltCharges !== undefined)      addSaltCharges     += m.addSaltCharges * ref.stacks;
    if (m.addAcidCharges !== undefined)      addAcidCharges     += m.addAcidCharges * ref.stacks;
    if (m.pctNutrientRadius !== undefined)   pctNutrientRadius  += m.pctNutrientRadius * ref.stacks;
    if (m.pctToxinRadius !== undefined)      pctToxinRadius     += m.pctToxinRadius * ref.stacks;
    if (m.pctWaterRadius !== undefined)      pctWaterRadius     += m.pctWaterRadius * ref.stacks;
    if (m.pctSaltRadius !== undefined)       pctSaltRadius      += m.pctSaltRadius * ref.stacks;
    if (m.pctAcidRadius !== undefined)       pctAcidRadius      += m.pctAcidRadius * ref.stacks;
  }
  const out: PlayerConfig = {
    targetVol: base.targetVol + addTargetVol,
    speed: base.speed * (1 + pctSpeed),
    engulfMultiplier: base.engulfMultiplier * (1 + pctEngulf),
    bulletSize: base.bulletSize * (1 + pctBullet),
  };
  if (base.eggCharges !== undefined || addEggCharges !== 0) {
    out.eggCharges = (base.eggCharges ?? 0) + addEggCharges;
  }
  if (base.nutrientCharges !== undefined || addNutrientCharges !== 0) {
    out.nutrientCharges = (base.nutrientCharges ?? 0) + addNutrientCharges;
  }
  if (base.toxinCharges !== undefined || addToxinCharges !== 0) {
    out.toxinCharges = (base.toxinCharges ?? 0) + addToxinCharges;
  }
  if (base.waterCharges !== undefined || addWaterCharges !== 0) {
    out.waterCharges = (base.waterCharges ?? 0) + addWaterCharges;
  }
  if (base.saltCharges !== undefined || addSaltCharges !== 0) {
    out.saltCharges = (base.saltCharges ?? 0) + addSaltCharges;
  }
  if (base.acidCharges !== undefined || addAcidCharges !== 0) {
    out.acidCharges = (base.acidCharges ?? 0) + addAcidCharges;
  }
  if (base.agitationCharges !== undefined || addAgitationCharges !== 0) {
    out.agitationCharges = (base.agitationCharges ?? 0) + addAgitationCharges;
  }
  if (base.nutrientRadius !== undefined || pctNutrientRadius !== 0) {
    out.nutrientRadius = (base.nutrientRadius ?? 20) * (1 + pctNutrientRadius);
  }
  if (base.toxinRadius !== undefined || pctToxinRadius !== 0) {
    out.toxinRadius = (base.toxinRadius ?? 24) * (1 + pctToxinRadius);
  }
  if (base.waterRadius !== undefined || pctWaterRadius !== 0) {
    out.waterRadius = (base.waterRadius ?? 28) * (1 + pctWaterRadius);
  }
  if (base.saltRadius !== undefined || pctSaltRadius !== 0) {
    out.saltRadius = (base.saltRadius ?? 18) * (1 + pctSaltRadius);
  }
  if (base.acidRadius !== undefined || pctAcidRadius !== 0) {
    out.acidRadius = (base.acidRadius ?? 17) * (1 + pctAcidRadius);
  }
  return out;
}
