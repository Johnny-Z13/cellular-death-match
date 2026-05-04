// Player-facing config. Computed from a base + accumulated upgrade modifiers,
// then passed to the arena to spawn a fight.
export interface PlayerConfig {
  targetVol: number;
  speed: number;
  engulfMultiplier: number;        // active value when engulf is held
  bulletSize: number;
}

// A stable handle to an upgrade in the run state.
export interface UpgradeRef {
  id: string;
  stacks: number;
}

// One upgrade definition. M4 ships modifier-only upgrades; M6 adds hooks.
export interface UpgradeDef {
  id: string;
  name: string;
  description: string;
  modifiers: {
    addTargetVol?: number;        // additive flat
    pctEngulfMultiplier?: number; // additive percent (0.15 = +15%)
    pctBulletSize?: number;       // additive percent
  };
}

// The M4 stub catalogue. Three modifier-only upgrades — enough to prove the
// upgrade-pick + apply pipeline. M6 will replace this with the full pool.
export const UPGRADES: ReadonlyArray<UpgradeDef> = [
  {
    id: 'vol_1',
    name: 'Bigger Cell',
    description: '+50 max volume',
    modifiers: { addTargetVol: 50 },
  },
  {
    id: 'engulf_1',
    name: 'Faster Engulf',
    description: '+15% engulf rate',
    modifiers: { pctEngulfMultiplier: 0.15 },
  },
  {
    id: 'bullet_1',
    name: 'Bigger Bullets',
    description: '+25% bullet size',
    modifiers: { pctBulletSize: 0.25 },
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
  let pctEngulf = 0;
  let pctBullet = 0;
  for (const ref of refs) {
    const def = UPGRADES_BY_ID.get(ref.id);
    if (!def) continue;
    const m = def.modifiers;
    if (m.addTargetVol !== undefined)        addTargetVol += m.addTargetVol * ref.stacks;
    if (m.pctEngulfMultiplier !== undefined) pctEngulf    += m.pctEngulfMultiplier * ref.stacks;
    if (m.pctBulletSize !== undefined)       pctBullet    += m.pctBulletSize * ref.stacks;
  }
  return {
    targetVol: base.targetVol + addTargetVol,
    speed: base.speed,
    engulfMultiplier: base.engulfMultiplier * (1 + pctEngulf),
    bulletSize: base.bulletSize * (1 + pctBullet),
  };
}
