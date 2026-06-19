import { type SimState, type CellId, type Cell } from '../sim/types';
import { createSim, tick as simTick, addCell } from '../sim/sim';
import { removePixel } from '../sim/cell';
import { getCell, setCell, updateBoundaryAround } from '../sim/grid';
import { type PlayerConfig } from '../content/upgrades';
import { type EnemyArchetype, type EnemySpawn, ARCHETYPE_DEFAULTS } from '../content/enemies';
import {
  ARCHETYPE_ECOLOGY,
  CRISES,
  MUTATION_TRAITS,
  pickMutationTrait,
  type CrisisId,
  type TraitId,
} from '../content/ecology';
import {
  AGITATION_TUNING,
  ARENA_TIMING,
  ECOSYSTEM_LIMITS,
  PASTE_TUNING,
  TOOL_EFFECT_TUNING,
  TOOL_TUNING,
  WORLD_EVENT_TUNING,
} from '../content/ecologyTuning';
import {
  BREED_DEFS,
  DISCOVERY_NOTES,
  reactionRecipeFor,
  type BreedId,
  type CatalysisEffectType,
  type DiscoveryNoteId,
  type ReactionContext,
} from '../content/catalysis';
import { type ObjectiveDef, objectiveForEpoch } from '../content/objectives';
import { hash2 } from './hash';
import { bruiserStep } from './enemies/bruiser';
import { sniperStep, type SniperState } from './enemies/sniper';
import { splitterStep } from './enemies/splitter';
import { swarmletStep } from './enemies/swarmlet';
import { mirrorStep } from './enemies/mirror';
import { bossStep, type BossState } from './enemies/boss';
import { displacementVec } from './geometry';
import { getReagentShift, type BreedProfileId } from '../sim/breedProfiles';
import { createHomeostasisTracker } from './homeostasis';
import { getEscalation } from './escalation';
import {
  createObjectiveRuntime,
  evaluateObjective,
  updateObjectiveRuntime,
  type ObjectiveMetrics,
  type ObjectiveProgress,
} from './objectiveScoring';

export type { PlayerConfig } from '../content/upgrades';
export type { ObjectiveProgress, ObjectiveStatus } from './objectiveScoring';

export interface ArenaInput {
  moveVec: [number, number];
  shouldFire: boolean;
  shouldEngulf: boolean;
}

export type ArenaStatus = 'running' | 'won' | 'lost';
export type LabTool = 'egg' | 'nutrient' | 'toxin' | 'water' | 'salt' | 'acid' | 'paste';
export type ToolEffectType =
  // 'paste' is a tool, not an effect — its stamps are stored as 'nutrient'.
  | Exclude<LabTool, 'egg' | 'paste'>
  | 'bloom'
  | 'brine'
  | 'lysis'
  | 'foam'
  | 'conduit'
  | 'flare'
  | 'crystal'
  | 'fold_fault'
  | 'mutation'
  | 'hatch';

export interface Arena {
  state: SimState;
  player: PlayerConfig;
  archetypes: Map<CellId, EnemySpawn>;
  getStatus(): ArenaStatus;
  getEcology(): EcologyInfo;
  getEquilibrium(): EquilibriumInfo;
  getObjectiveProgress(): ObjectiveProgress;
  getToolStates(): Record<LabTool, ToolState>;
  getAgitationState(): AgitationState;
  getToolEffects(): ToolEffect[];
  getDishEvents(): DishEventMarker[];
  applyTool(tool: LabTool, pos: [number, number], opts?: ApplyToolOpts): boolean;
  endPasteStroke(): void;
  agitate(): boolean;
  endEpochNow(): ArenaStatus;
  tick(input: ArenaInput): void;
  spawnEnemy(opts: SpawnEnemyOpts): CellId;
  getHomeostasisProgress(): number;
  isHomeostasisAchieved(): boolean;
  isEcosystemCollapsed(): boolean;
}

export interface EquilibriumInfo {
  achieved: boolean;
  progress: number;
  biomeName: string | null;
}

export interface EcologyInfo {
  tick: number;
  epochTicks: number;
  progress: number;
  secondsRemaining: number;
  livingEnemies: number;
  mutations: number;
  births: number;
  supplyDrops: number;
  reactions: number;
  accidents: number;
  outbreaks: number;
  worldEvents: number;
  dominant: string;
  signals: string[];
  crisis: string;
  discoveries: {
    breedIds: BreedId[];
    noteIds: DiscoveryNoteId[];
    latest: string[];
  };
}

export interface ToolState {
  charges: number;
  maxCharges: number;
}

export interface AgitationState extends ToolState {
  activeTicks: number;
}

export interface ToolEffect {
  type: ToolEffectType;
  pos: [number, number];
  radius: number;
  ttl: number;
  maxTtl: number;
  seed: number;
}

export type DishEventKind = 'mutation' | 'discovery' | 'caution' | 'critical' | 'stabilize' | 'fold';
export type DishEventColor = 'amber' | 'cyan' | 'green' | 'red' | 'violet';

export interface DishEventMarker {
  id: number;
  kind: DishEventKind;
  label: string;
  pos: [number, number];
  radius: number;
  ttl: number;
  maxTtl: number;
  color: DishEventColor;
}

export interface SpawnEnemyOpts {
  spawn: EnemySpawn;
  pos: [number, number];
}

export interface ApplyToolOpts {
  eggArchetype?: EnemyArchetype;
  // When set, the egg hatches this discovered breed (carrying its breedId and
  // tint) instead of a plain base archetype, so the dish cell matches the rack
  // icon the player picked.
  eggBreedId?: BreedId;
}

export interface CreateArenaOpts {
  LX: number;
  LY: number;
  seed: number;
  player: PlayerConfig;
  enemies: EnemySpawn[];
  wrap: boolean;
  wrapBullets?: boolean;
  mode?: 'elimination' | 'ecosystem';
  epochTicks?: number;
  objective?: ObjectiveDef;
  includeControlSample?: boolean;
  worldEventIntensity?: number;
  fightIndex?: number;
  knownBreedIds?: ReadonlySet<BreedId>;
}

const PLAYER_ID = 1;
const ENGULF_DECAY_PER_FRAME = 0.035;
const MC_STEPS_PER_TICK = 1100;
// Epoch ticks now comes from escalation.ts via getEscalation(fightIndex).epochTicks.
const MUTATION_INTERVAL_TICKS = ARENA_TIMING.mutationIntervalTicks;
const RESEED_INTERVAL_TICKS = ARENA_TIMING.reseedIntervalTicks;
const OUTBREAK_INTERVAL_TICKS = ARENA_TIMING.outbreakIntervalTicks;
const RESUPPLY_INTERVAL_TICKS = ARENA_TIMING.resupplyIntervalTicks;
const ACCIDENT_INTERVAL_TICKS = ARENA_TIMING.accidentIntervalTicks;
const EMERGENCY_EGG_REFILL_TICKS = ARENA_TIMING.emergencyEggRefillTicks;
const CRISIS_INTERVAL_TICKS = ARENA_TIMING.crisisIntervalTicks;
// Calm opening window: no hazard (crisis / outbreak / accident) fires for the
// first stretch of an epoch, so the player can settle in and discover.
const HAZARD_GRACE_TICKS = 60 * 25;
const ECOSYSTEM_MIN_POPULATION = ECOSYSTEM_LIMITS.minPopulation;
const QUIET_EGG_REFILL_POPULATION = ECOSYSTEM_LIMITS.quietEggRefillPopulation;
const ECOSYSTEM_MAX_POPULATION = ECOSYSTEM_LIMITS.maxPopulation;
const PLAYER_THREAT_RANGE = ECOSYSTEM_LIMITS.playerThreatRange;
const MAX_TOOL_EFFECTS = ECOSYSTEM_LIMITS.maxToolEffects;
const MAX_DISH_EVENTS = ECOSYSTEM_LIMITS.maxDishEvents;
const DEFAULT_AGITATE_CHARGES = AGITATION_TUNING.defaultCharges;
const WORLD_EVENT_INTERVAL_TICKS = WORLD_EVENT_TUNING.intervalTicks;
const WORLD_EVENT_GRACE_TICKS = WORLD_EVENT_TUNING.graceTicks;
const AGITATION_DURATION_TICKS = AGITATION_TUNING.durationTicks;
const AGITATION_MIN_SPEED = AGITATION_TUNING.minSpeed;
const AGITATION_EXTRA_SPEED = AGITATION_TUNING.extraSpeed;
const OUTBREAK_MIN_TARGET_VOL = ECOSYSTEM_LIMITS.outbreakMinTargetVol;
const OUTBREAK_HUNTER_COUNT = ECOSYSTEM_LIMITS.outbreakHunterCount;
const NUTRIENT_PULSE_GROWTH = TOOL_EFFECT_TUNING.nutrientPulseGrowth;
const NUTRIENT_GROWTH_PER_TICK = TOOL_EFFECT_TUNING.nutrientGrowthPerTick;
const NUTRIENT_PULL_SPEED = TOOL_EFFECT_TUNING.nutrientPullSpeed;
const TOXIN_PULSE_DAMAGE = TOOL_EFFECT_TUNING.toxinPulseDamage;
const TOXIN_SHRINK_PER_TICK = TOOL_EFFECT_TUNING.toxinShrinkPerTick;
const TOXIN_FLEE_SPEED = TOOL_EFFECT_TUNING.toxinFleeSpeed;
const WATER_PULSE_GROWTH = TOOL_EFFECT_TUNING.waterPulseGrowth;
const WATER_GROWTH_PER_TICK = TOOL_EFFECT_TUNING.waterGrowthPerTick;
const WATER_SPREAD_SPEED = TOOL_EFFECT_TUNING.waterSpreadSpeed;
const SALT_PULSE_DAMAGE = TOOL_EFFECT_TUNING.saltPulseDamage;
const SALT_SHRINK_PER_TICK = TOOL_EFFECT_TUNING.saltShrinkPerTick;
const SALT_MAX_SPEED = TOOL_EFFECT_TUNING.saltMaxSpeed;
const ACID_PULSE_DAMAGE = TOOL_EFFECT_TUNING.acidPulseDamage;
const ACID_SHRINK_PER_TICK = TOOL_EFFECT_TUNING.acidShrinkPerTick;
const ACID_FLEE_SPEED = TOOL_EFFECT_TUNING.acidFleeSpeed;
const BLOOM_GROWTH_PER_TICK = TOOL_EFFECT_TUNING.bloomGrowthPerTick;
const BRINE_SHRINK_PER_TICK = TOOL_EFFECT_TUNING.brineShrinkPerTick;

interface AiState {
  sniper?: SniperState;
  boss?: BossState;
  splitter?: { didSpawn: boolean };
}

interface MutationResult {
  changed: number;
  effects: ToolEffect[];
}

interface ReagentReactionResult {
  effect: ToolEffect;
  inputs: readonly ToolEffectType[];
}

function removeControlSample(state: SimState): void {
  const control = state.cells.get(PLAYER_ID);
  if (!control) return;
  const { grid } = state;
  for (let x = 0; x < grid.LX; x++) {
    for (let y = 0; y < grid.LY; y++) {
      if (getCell(grid, x, y) !== PLAYER_ID) continue;
      setCell(grid, x, y, 0);
      removePixel(control, x, y, grid.LX, grid.LY, grid.wrap);
      updateBoundaryAround(grid, x, y);
    }
  }
  state.cells.delete(PLAYER_ID);
}

export function createArena(opts: CreateArenaOpts): Arena {
  const mode = opts.mode ?? 'elimination';
  const fightIndex = opts.fightIndex ?? 0;
  const esc = getEscalation(fightIndex);
  const epochTicks = opts.epochTicks ?? esc.epochTicks;
  const objective = opts.objective ?? objectiveForEpoch(0);
  // Escalation-adjusted hazard intervals.
  const effectiveCrisisInterval = Math.max(60, Math.round(CRISIS_INTERVAL_TICKS * esc.crisisIntervalMul));
  const effectiveOutbreakInterval = Math.max(60, Math.round(OUTBREAK_INTERVAL_TICKS * esc.crisisIntervalMul));
  const effectiveAccidentInterval = Math.max(60, Math.round(ACCIDENT_INTERVAL_TICKS * esc.accidentIntervalMul));
  const effectiveOutbreakCount = esc.outbreakSeverity;
  const includeControlSample = opts.includeControlSample ?? true;
  const worldEventIntensity = clamp(opts.worldEventIntensity ?? WORLD_EVENT_TUNING.defaultIntensity, 0, 1);
  const nEnemies = opts.enemies.length;
  const state = createSim({
    LX: opts.LX,
    LY: opts.LY,
    nCells: 1 + nEnemies,
    targetVol: opts.player.targetVol,
    seed: opts.seed,
    wrap: opts.wrap,
    wrapBullets: opts.wrapBullets ?? true,
  });

  if (!includeControlSample) removeControlSample(state);

  const archetypes = new Map<CellId, EnemySpawn>();
  const aiStates = new Map<CellId, AiState>();
  let nextCellId = 2 + nEnemies;          // ids beyond initial spawns
  let tickNo = 0;
  let mutationCount = 0;
  let birthCount = 0;
  let supplyDropCount = 0;
  let reactionCount = 0;
  let accidentCount = 0;
  let outbreakCount = 0;
  let worldEventCount = 0;
  let forcedStatus: ArenaStatus | null = null;
  // Latched once a "create / breed / cultivate" objective is achieved, so the
  // experiment reads as Complete even if the player keeps cultivating after.
  // Deadline-balance objectives report live completion instead (see below).
  let objectiveAchieved = false;
  const maxAgitationCharges = opts.player.agitationCharges ?? DEFAULT_AGITATE_CHARGES;
  let agitationCharges = maxAgitationCharges;
  let agitationTicksRemaining = 0;
  let lastEmergencyEggTick = 0;
  let activeCrisis: { id: CrisisId; ttl: number } | null = null;
  const toolEffects: ToolEffect[] = [];
  // Paste trail: small nutrient-type stamps drawn along a drag. Kept separate
  // from toolEffects so a long trail never evicts catalysis effects (and so it
  // isn't mistaken for a placed reagent during reaction/accident checks).
  const trailEffects: ToolEffect[] = [];
  let lastTrailStamp: [number, number] | null = null;
  let pasteDrawnSinceCharge = 0;
  const dishEvents: DishEventMarker[] = [];
  let nextDishEventId = 1;
  const toolStates: Record<LabTool, ToolState> = toolLoadoutFor(opts.player);
  const signals: string[] = [];
  const knownBreedIds = new Set<BreedId>(opts.knownBreedIds ?? []);
  const discoveredBreedIds = new Set<BreedId>();
  const discoveredBreedTicks = new Map<BreedId, number>();
  const discoveredNoteIds = new Set<DiscoveryNoteId>();
  const discoveryMessages: string[] = [];
  const homeostasisTracker = createHomeostasisTracker();
  const objectiveRuntime = createObjectiveRuntime();

  function pushSignal(message: string): void {
    if (signals[0] === message) return;
    signals.unshift(message);
    while (signals.length > 5) signals.pop();
  }

  function discoverNote(id: DiscoveryNoteId, message: string): void {
    if (discoveredNoteIds.has(id)) return;
    discoveredNoteIds.add(id);
    discoveryMessages.unshift(message);
    pushSignal(message);
    while (discoveryMessages.length > 8) discoveryMessages.pop();
  }

  function discoverBreed(arena: Arena, id: BreedId, sourceCell?: Cell): void {
    if (discoveredBreedIds.has(id)) return;
    discoveredBreedIds.add(id);
    discoveredBreedTicks.set(id, tickNo);
    if (BREED_DEFS[id].parents && !knownBreedIds.has(id)) objectiveRuntime.hybridDiscovered = true;
    discoverNote(`breed_${id}`, `NEW LIFEFORM CREATED: ${BREED_DEFS[id].name}.`);
    if (sourceCell) {
      const marker = breedDiscoveryMarkerFor(id);
      addDishEvent(marker.kind, `NEW LIFEFORM: ${BREED_DEFS[id].name}`, sourceCell.center, marker.radius, marker.color);
    }
    if (!sourceCell || sourceCell.vol <= 0 || archetypes.size >= ECOSYSTEM_MAX_POPULATION) return;
    arena.spawnEnemy({
      spawn: breedSpawnFor(id, archetypes.get(sourceCell.id)),
      pos: [...sourceCell.center],
    });
    birthCount += 1;
  }

  function addDishEvent(
    kind: DishEventKind,
    label: string,
    pos: [number, number],
    radius: number,
    color: DishEventColor,
  ): void {
    const maxTtl = kind === 'discovery' ? 120 : kind === 'critical' || kind === 'fold' ? 96 : 78;
    dishEvents.unshift({
      id: nextDishEventId++,
      kind,
      label,
      pos: [...pos],
      radius,
      ttl: maxTtl,
      maxTtl,
      color,
    });
    while (dishEvents.length > MAX_DISH_EVENTS) dishEvents.pop();
  }

  function decayDishEvents(): void {
    for (const event of dishEvents) event.ttl -= 1;
    for (let i = dishEvents.length - 1; i >= 0; i--) {
      if (dishEvents[i]!.ttl <= 0) dishEvents.splice(i, 1);
    }
  }

  function currentObjectiveProgress(
    progressTick = tickNo,
    forceShowcase = false,
  ): ObjectiveProgress {
    return evaluateObjective(objective, objectiveMetrics(state, archetypes), {
      tickNo: progressTick,
      epochTicks,
      reactions: reactionCount,
      discoveredBreedTicks,
      runtime: objectiveRuntime,
      forceShowcase,
    });
  }

  for (let i = 0; i < nEnemies; i++) {
    const cellId = 2 + i;
    let spawn = opts.enemies[i]!;
    // Mirror adopts the player's stats.
    if (spawn.archetype === 'mirror') {
      spawn = {
        ...spawn,
        targetVol: opts.player.targetVol,
        speed: opts.player.speed,
        engulfMultiplier: opts.player.engulfMultiplier,
      };
    }
    archetypes.set(cellId, spawn);
    const cell = state.cells.get(cellId);
    if (cell) cell.targetVol = spawn.targetVol;

    const aiState: AiState = {};
    if (spawn.archetype === 'sniper')   aiState.sniper = { shootTimer: spawn.shootCooldown ?? 30 };
    if (spawn.archetype === 'boss')     aiState.boss = { phase: 1, didSpawnP2: false };
    if (spawn.archetype === 'splitter') aiState.splitter = { didSpawn: false };
    aiStates.set(cellId, aiState);
  }

  const player = state.cells.get(PLAYER_ID);
  if (player) player.intent.speed = opts.player.speed;

  function dispatchAi(self: Cell, target: Cell, ar: Arena): void {
    const spawn = archetypes.get(self.id);
    if (!spawn) return;
    const ai = aiStates.get(self.id);
    if (!ai) return;
    switch (spawn.archetype) {
      case 'bruiser':  bruiserStep(self, target, state); return;
      case 'sniper':   sniperStep(self, target, state, spawn, ai.sniper!); return;
      case 'splitter': splitterStep(self, target, state, spawn); return;
      case 'swarmlet': swarmletStep(self, target, state, spawn); return;
      case 'mirror':   mirrorStep(self, target, state, spawn); return;
      case 'boss':     bossStep(self, target, state, spawn, ai.boss!, ar); return;
    }
  }

  const arena: Arena = {
    state,
    player: opts.player,
    archetypes,
    getStatus(): ArenaStatus {
      if (forcedStatus) return forcedStatus;
      const p = state.cells.get(PLAYER_ID);
      // Ecosystem epochs resolve on the objective/deadline even if the control
      // sample dies — otherwise a dead dish would idle forever with no verdict.
      if ((!p || p.vol === 0) && mode !== 'ecosystem') return 'lost';
      if (mode === 'ecosystem') {
        const progress = currentObjectiveProgress();
        // Latch achievement for "create / breed" objectives so the dish stays
        // Complete after the moment of success.
        if (progress.met && progress.latches) objectiveAchieved = true;
        const complete = progress.latches ? objectiveAchieved : progress.met;
        // The experiment no longer auto-wins the instant it succeeds: the
        // player banks it via endEpochNow(), or the deadline banks it for them.
        // The deadline is a soft backstop — complete at the deadline wins,
        // otherwise an unmet objective fails as before.
        if (tickNo >= epochTicks) return complete || progress.status === 'satisfied' ? 'won' : 'lost';
        return 'running';
      }
      for (const [id, cell] of state.cells) {
        if (id === PLAYER_ID) continue;
        if (cell.vol > 0) return 'running';
      }
      return 'won';
    },
    getEcology(): EcologyInfo {
      let livingEnemies = 0;
      let dominant = 'none';
      let dominantVol = -1;
      for (const [id, cell] of state.cells) {
        if (id === PLAYER_ID || cell.vol <= 0) continue;
        livingEnemies += 1;
        if (cell.vol > dominantVol) {
          dominantVol = cell.vol;
          const spawn = archetypes.get(id);
          const trait = spawn?.traits?.at(-1);
          dominant = spawn
            ? trait ? `${MUTATION_TRAITS[trait].name} ${spawn.archetype}` : spawn.archetype
            : `cell ${id}`;
        }
      }
      return {
        tick: tickNo,
        epochTicks,
        progress: Math.min(1, tickNo / epochTicks),
        secondsRemaining: Math.max(0, Math.ceil((epochTicks - tickNo) / 60)),
        livingEnemies,
        mutations: mutationCount,
        births: birthCount,
        supplyDrops: supplyDropCount,
        reactions: reactionCount,
        accidents: accidentCount,
        outbreaks: outbreakCount,
        worldEvents: worldEventCount,
        dominant,
        signals: [...signals],
        crisis: activeCrisis ? CRISES[activeCrisis.id].name : 'none',
        discoveries: {
          breedIds: [...discoveredBreedIds],
          noteIds: [...discoveredNoteIds],
          latest: [...discoveryMessages],
        },
      };
    },
    getObjectiveProgress(): ObjectiveProgress {
      const progress = currentObjectiveProgress();
      if (progress.met && progress.latches) objectiveAchieved = true;
      const complete = progress.latches ? objectiveAchieved : progress.met;
      return { ...progress, complete };
    },
    getToolStates(): Record<LabTool, ToolState> {
      return {
        egg: { ...toolStates.egg },
        nutrient: { ...toolStates.nutrient },
        toxin: { ...toolStates.toxin },
        water: { ...toolStates.water },
        salt: { ...toolStates.salt },
        acid: { ...toolStates.acid },
        paste: { ...toolStates.paste },
      };
    },
    getAgitationState(): AgitationState {
      return {
        charges: agitationCharges,
        maxCharges: maxAgitationCharges,
        activeTicks: agitationTicksRemaining,
      };
    },
    getToolEffects(): ToolEffect[] {
      return [...toolEffects, ...trailEffects].map((effect) => ({
        ...effect,
        pos: [...effect.pos],
      }));
    },
    endPasteStroke(): void {
      // Called on pointerup so the next drawn stroke starts fresh (and pays its
      // opening charge) rather than continuing the previous line.
      lastTrailStamp = null;
    },
    getDishEvents(): DishEventMarker[] {
      return dishEvents.map((event) => ({
        ...event,
        pos: [...event.pos],
      }));
    },
    applyTool(tool: LabTool, pos: [number, number], applyOpts: ApplyToolOpts = {}): boolean {
      const toolState = toolStates[tool];
      if (toolState.charges <= 0) return false;
      if (tool === 'egg') {
        const seedPos = findEggSeedPos(state, pos);
        if (!seedPos) return false;
        toolState.charges -= 1;
        const spawn = applyOpts.eggBreedId
          ? breedSpawnFor(applyOpts.eggBreedId)
          : eggSpawnFor(applyOpts.eggArchetype ?? 'swarmlet', state.rng.random());
        applyEggSynergies(state, toolEffects, seedPos, spawn, pushSignal);
        this.spawnEnemy({ spawn, pos: seedPos });
        const hatchEffect: ToolEffect = {
          type: 'hatch',
          pos: seedPos,
          radius: TOOL_TUNING.egg.hatchRadius,
          ttl: TOOL_TUNING.egg.hatchTtl,
          maxTtl: TOOL_TUNING.egg.hatchTtl,
          seed: state.rng.randInt(1_000_000),
        };
        toolEffects.push(hatchEffect);
        const catalyticReaction = catalyticReactionFor(
          hatchEffect,
          toolEffects,
          state,
          archetypes,
          agitationTicksRemaining > 0,
          state.rng.randInt(1_000_000),
        );
        if (catalyticReaction) {
          if (reactionUsesAcid(catalyticReaction)) {
            objectiveRuntime.acidReactionTriggered = true;
          }
          reactionCount += 1;
          pulseToolEffect(state, catalyticReaction.effect, archetypes);
          toolEffects.push(catalyticReaction.effect);
          discoverNote(catalyticReaction.noteId, catalyticReaction.message);
          addDishEventForCatalysis(catalyticReaction, addDishEvent);
        }
        while (toolEffects.length > MAX_TOOL_EFFECTS) toolEffects.shift();
        birthCount += 1;
        return true;
      }

      if (tool === 'paste') {
        // Drawing a trail: stamp a small nutrient field, but only once the
        // pointer has travelled stampSpacing from the last stamp, so a drag
        // lays an even line. A charge is spent per unitsPerCharge of path.
        if (lastTrailStamp) {
          const dx = pos[0] - lastTrailStamp[0];
          const dy = pos[1] - lastTrailStamp[1];
          const moved = Math.hypot(dx, dy);
          if (moved < PASTE_TUNING.stampSpacing) return false;
          pasteDrawnSinceCharge += moved;
          if (pasteDrawnSinceCharge >= PASTE_TUNING.unitsPerCharge) {
            pasteDrawnSinceCharge = 0;
            toolState.charges -= 1;
          }
        } else {
          // First stamp of a stroke always costs the opening charge.
          if (toolState.charges <= 0) return false;
        }
        lastTrailStamp = [pos[0], pos[1]];
        const maxTtl = TOOL_TUNING.paste.ttl;
        trailEffects.push({
          type: 'nutrient',
          pos: [pos[0], pos[1]],
          radius: TOOL_TUNING.paste.radius,
          ttl: maxTtl,
          maxTtl,
          seed: state.rng.randInt(1_000_000),
        });
        while (trailEffects.length > PASTE_TUNING.maxTrailStamps) trailEffects.shift();
        return true;
      }

      toolState.charges -= 1;
      const effect = toolEffectFor(tool, pos, opts.player, state.rng.randInt(1_000_000));
      toolEffects.push(effect);
      const catalyticReaction = catalyticReactionFor(
        effect,
        toolEffects,
        state,
        archetypes,
        agitationTicksRemaining > 0,
        state.rng.randInt(1_000_000),
      );
      if (catalyticReaction?.effect.type === 'flare') {
        const sourceCell = sourceCellWithTraits(
          state,
          archetypes,
          catalyticReaction.effect,
          ['toxin_resistant', 'fragile'],
        );
        if (sourceCell) discoverBreed(this, 'glass_antibody', sourceCell);
      }
      if (catalyticReaction?.noteId === 'recipe_foam_lightning') {
        const sourceCell = sourceCellWithArchetypes(
          state,
          archetypes,
          catalyticReaction.effect,
          ['swarmlet', 'splitter'],
        );
        if (sourceCell) discoverBreed(this, 'static_lattice', sourceCell);
      }
      if (catalyticReaction?.noteId === 'recipe_foam_salt_rule30') {
        const sourceCell = sourceCellWithTraits(
          state,
          archetypes,
          catalyticReaction.effect,
          ['gelatinous'],
        );
        if (sourceCell) discoverBreed(this, 'folded_anchor', sourceCell);
      }
      pulseToolEffect(state, effect, archetypes);
      const waterReaction = applyWaterTransformations(
        effect,
        toolEffects,
        pushSignal,
        () => {
          discoverNote('water_dilutes', 'Lab note: water can soften dangerous fields.');
        },
        (label, eventPos, eventRadius) => {
          addDishEvent('stabilize', label, eventPos, eventRadius, 'green');
        },
        state.rng.randInt(1_000_000),
      );
      if (waterReaction) {
        reactionCount += 1;
        pulseToolEffect(state, waterReaction, archetypes);
        toolEffects.push(waterReaction);
        addDishEvent('stabilize', 'WATER CARRIED NUTRIENT', waterReaction.pos, waterReaction.radius, 'green');
      }
      const reaction = reactionFor(effect, toolEffects, state.rng.randInt(1_000_000));
      if (reaction) {
        if (reactionUsesAcid(reaction)) objectiveRuntime.acidReactionTriggered = true;
        reactionCount += 1;
        pulseToolEffect(state, reaction.effect, archetypes);
        toolEffects.push(reaction.effect);
        addDishEventForEffect(reaction.effect, addDishEvent);
      }
      // Dropping a reagent onto a drawn nutrient trail sparks a reaction along
      // the painted line — steer life with paste, then catalyse the path.
      const trailReaction = reactionFor(effect, trailEffects, state.rng.randInt(1_000_000));
      if (trailReaction) {
        if (reactionUsesAcid(trailReaction)) objectiveRuntime.acidReactionTriggered = true;
        reactionCount += 1;
        pulseToolEffect(state, trailReaction.effect, archetypes);
        toolEffects.push(trailReaction.effect);
        addDishEventForEffect(trailReaction.effect, addDishEvent);
        discoverNote('paste_catalysed', 'Lab note: reagents react along a nutrient paste trail.');
        pushSignal('Paste trail catalysed by reagent.');
        while (toolEffects.length > MAX_TOOL_EFFECTS) toolEffects.shift();
      }
      if (catalyticReaction) {
        if (reactionUsesAcid(catalyticReaction)) objectiveRuntime.acidReactionTriggered = true;
        reactionCount += 1;
        pulseToolEffect(state, catalyticReaction.effect, archetypes);
        toolEffects.push(catalyticReaction.effect);
        discoverNote(catalyticReaction.noteId, catalyticReaction.message);
        addDishEventForCatalysis(catalyticReaction, addDishEvent);
      }
      while (toolEffects.length > MAX_TOOL_EFFECTS) toolEffects.shift();
      return true;
    },
    agitate(): boolean {
      if (this.getStatus() !== 'running' || agitationCharges <= 0) return false;
      agitationCharges -= 1;
      agitationTicksRemaining = AGITATION_DURATION_TICKS;
      const hadNutrient = toolEffects.some((effect) => effect.type === 'nutrient');
      const hadToxin = toolEffects.some((effect) => effect.type === 'toxin');
      for (const effect of toolEffects) {
        effect.radius = clamp(effect.radius + 7, effect.radius, 48);
        effect.ttl = Math.min(effect.maxTtl, effect.ttl + 45);
      }
      if (hadNutrient) pushSignal('Agitation spread nutrient mist.');
      if (hadToxin) pushSignal('Agitation spread toxin pressure.');
      const overlappingReaction = findOverlappingReaction(toolEffects);
      if (overlappingReaction && !toolEffects.some((effect) => effect.type === 'fold_fault')) {
        const fault: ToolEffect = {
          type: 'fold_fault',
          pos: [...overlappingReaction.pos],
          radius: clamp(overlappingReaction.radius + 8, 18, 58),
          ttl: 60 * 5,
          maxTtl: 60 * 5,
          seed: state.rng.randInt(1_000_000),
        };
        toolEffects.push(fault);
        discoverNote('recipe_folding_fault', 'FOLDING FAULT: local rule escaped containment.');
        addDishEvent('fold', 'FOLDING FAULT', fault.pos, fault.radius, 'violet');
        while (toolEffects.length > MAX_TOOL_EFFECTS) toolEffects.shift();
      }
      return true;
    },
    endEpochNow(): ArenaStatus {
      const current = this.getStatus();
      if (current !== 'running') return current;
      if (mode !== 'ecosystem') return current;
      // The player is banking the experiment early. Evaluate as if at the
      // deadline: a complete/satisfied dish wins; an unmet one ends as a loss.
      const progress = currentObjectiveProgress(epochTicks, true);
      const complete = progress.latches ? objectiveAchieved || progress.met : progress.met;
      forcedStatus = complete || progress.status === 'satisfied' ? 'won' : 'lost';
      tickNo = Math.max(tickNo, epochTicks);
      return forcedStatus;
    },
    tick(input: ArenaInput): void {
      if (this.getStatus() !== 'running') return;
      tickNo += 1;

      // Reset per-cell energy shifts each tick (accumulated by applyToolEffects).
      for (const cell of state.cells.values()) {
        cell.energyShifts = { isingShift: 0, volShift: 0, movShift: 0 };
      }

      // The control sample is no longer directly piloted in ecosystem mode. It
      // remains a visible anchor organism, influenced by the same dish tools.
      const p = state.cells.get(PLAYER_ID);
      if (p) {
        p.intent.vec = mode === 'ecosystem' ? [0, 0] : input.moveVec;
        p.intent.speed = mode === 'ecosystem' ? 0 : opts.player.speed;
        p.intent.shooting = input.shouldFire;
        p.intent.engulfMultiplier = mode === 'ecosystem'
          ? 1
          : input.shouldEngulf ? opts.player.engulfMultiplier : 1;
        if (mode !== 'ecosystem' && input.shouldEngulf) {
          p.targetVol -= ENGULF_DECAY_PER_FRAME;
        }
      }

      // Enemy AIs.
      const playerCell = state.cells.get(PLAYER_ID);
      if (playerCell) {
        for (const [id] of archetypes) {
          const cell = state.cells.get(id);
          if (!cell || cell.vol === 0) continue;
          const target = mode === 'ecosystem'
            ? chooseEcosystemTarget(cell, playerCell, state, archetypes)
            : playerCell;
          dispatchAi(cell, target, this);
        }
      }

      if (mode === 'ecosystem') {
        const pressurePaused = homeostasisTracker.isAchieved();
        applyToolEffects(state, toolEffects, archetypes);
        // Trail stamps pull + feed cells exactly like nutrient drops, so a drawn
        // line becomes a gentle gradient colonies drift along.
        applyToolEffects(state, trailEffects, archetypes);
        if (agitationTicksRemaining > 0) {
          applyAgitation(state, agitationTicksRemaining / AGITATION_DURATION_TICKS);
          agitationTicksRemaining -= 1;
        }
        if (pressurePaused) activeCrisis = null;
        if (!pressurePaused && !activeCrisis && tickNo >= HAZARD_GRACE_TICKS && tickNo % effectiveCrisisInterval === 0) {
          const result = activateCrisis(this, state, archetypes);
          activeCrisis = { id: result.id, ttl: CRISES[result.id].durationTicks };
          birthCount += result.births;
          pushSignal(`Crisis: ${CRISES[result.id].name}.`);
        }
        if (!pressurePaused && activeCrisis) {
          applyCrisisEffects(state, activeCrisis.id);
          activeCrisis.ttl -= 1;
          if (activeCrisis.ttl <= 0) {
            if (objectiveMetrics(state, archetypes).livingLifeforms >= 3) {
              objectiveRuntime.survivedCrisis = true;
            }
            activeCrisis = null;
          }
        }
        for (const effect of toolEffects) {
          if (effect.type === 'fold_fault') applyFoldingFault(state, effect);
        }
        for (const effect of toolEffects) effect.ttl -= 1;
        for (let i = toolEffects.length - 1; i >= 0; i--) {
          if (toolEffects[i]!.ttl <= 0) toolEffects.splice(i, 1);
        }
        for (const effect of trailEffects) effect.ttl -= 1;
        for (let i = trailEffects.length - 1; i >= 0; i--) {
          if (trailEffects[i]!.ttl <= 0) trailEffects.splice(i, 1);
        }
        if (
          !pressurePaused
          && worldEventIntensity > 0
          && tickNo >= WORLD_EVENT_GRACE_TICKS
          && tickNo % WORLD_EVENT_INTERVAL_TICKS === 0
          && state.rng.random() <= worldEventIntensity
        ) {
          const event = triggerWorldEvent(this, state, archetypes);
          if (event) {
            worldEventCount += 1;
            birthCount += event.births;
            if (event.effect) {
              pulseToolEffect(state, event.effect, archetypes);
              toolEffects.push(event.effect);
              addDishEvent('stabilize', event.label, event.effect.pos, event.effect.radius, event.color);
              while (toolEffects.length > MAX_TOOL_EFFECTS) toolEffects.shift();
            } else {
              addDishEvent('stabilize', event.label, event.pos, event.radius, event.color);
            }
            pushSignal(event.signal);
          }
        }
        if (!pressurePaused && tickNo % MUTATION_INTERVAL_TICKS === 0) {
          const mutation = mutateEcology(state, archetypes, pushSignal);
          mutationCount += mutation.changed;
          for (const effect of mutation.effects) {
            toolEffects.push(effect);
            addDishEvent('mutation', 'VISIBLE MUTATION', effect.pos, effect.radius, 'amber');
          }
          while (toolEffects.length > MAX_TOOL_EFFECTS) toolEffects.shift();
        }
        if (!pressurePaused && tickNo % RESEED_INTERVAL_TICKS === 0) {
          birthCount += reseedEcology(this, state, archetypes);
        }
        if (tickNo - lastEmergencyEggTick >= EMERGENCY_EGG_REFILL_TICKS) {
          supplyDropCount += refillEggIfQuiet(toolStates, state);
          if (toolStates.egg.charges > 0) lastEmergencyEggTick = tickNo;
        }
        if (!pressurePaused && tickNo >= HAZARD_GRACE_TICKS && tickNo % effectiveOutbreakInterval === 0) {
          const outbreak = triggerPredatorOutbreak(this, state, archetypes, effectiveOutbreakCount);
          if (outbreak) {
            outbreakCount += 1;
            birthCount += outbreak.births;
            reactionCount += 1;
            pulseToolEffect(state, outbreak.effect, archetypes);
            toolEffects.push(outbreak.effect);
            addDishEvent('critical', 'PREDATOR OUTBREAK', outbreak.effect.pos, outbreak.effect.radius, 'red');
            while (toolEffects.length > MAX_TOOL_EFFECTS) toolEffects.shift();
          }
        }
        if (tickNo % RESUPPLY_INTERVAL_TICKS === 0) {
          supplyDropCount += resupplyLab(toolStates, objective);
        }
        if (!pressurePaused && tickNo >= HAZARD_GRACE_TICKS && tickNo % effectiveAccidentInterval === 0) {
          const accident = randomAccidentEffect(state);
          pulseToolEffect(state, accident, archetypes);
          toolEffects.push(accident);
          addDishEvent('caution', 'ROGUE REAGENT', accident.pos, accident.radius, 'amber');
          accidentCount += 1;
          while (toolEffects.length > MAX_TOOL_EFFECTS) toolEffects.shift();
        }
        evaluateBreedDiscoveries(state, archetypes, toolEffects, new Set([...knownBreedIds, ...discoveredBreedIds]), (id, sourceCell) => {
          discoverBreed(this, id, sourceCell);
        });
      }
      decayDishEvents();

      // On-death handlers.
      for (const [id, spawn] of archetypes) {
        if (spawn.archetype !== 'splitter') continue;
        const ai = aiStates.get(id);
        if (!ai?.splitter || ai.splitter.didSpawn) continue;
        const cell = state.cells.get(id);
        if (!cell || cell.vol > 0) continue;
        // Splitter died — spawn 2 swarmlets at its last known center. The sim
        // retains a dead cell's center, so this is its true death position.
        ai.splitter.didSpawn = true;
        const pos = cell.center;
        const swarmletSpawn = { ...ARCHETYPE_DEFAULTS.swarmlet };
        this.spawnEnemy({ spawn: swarmletSpawn, pos: [pos[0] - 3, pos[1]] });
        this.spawnEnemy({ spawn: swarmletSpawn, pos: [pos[0] + 3, pos[1]] });
      }

      simTick(state, MC_STEPS_PER_TICK);

      // Feed homeostasis with breed volume shares, not culture counts.
      const breedVolumes = new Map<string, number>();
      let totalVolume = 0;
      for (const [cellId, cell] of state.cells) {
        if (cell.vol <= 0) continue;
        const spawn = archetypes.get(cellId);
        if (!spawn) continue;
        const breed = spawn.breedId ?? spawn.archetype;
        breedVolumes.set(breed, (breedVolumes.get(breed) ?? 0) + cell.vol);
        totalVolume += cell.vol;
      }
      homeostasisTracker.tick({ breedVolumes, totalVolume });
      if (mode === 'ecosystem') {
        updateObjectiveRuntime(objectiveRuntime, objectiveMetrics(state, archetypes), objective);
      }
    },
    spawnEnemy(spawnOpts: SpawnEnemyOpts): CellId {
      const id = nextCellId++;
      addCell(state, {
        id,
        targetVol: spawnOpts.spawn.targetVol,
        pos: spawnOpts.pos,
      });
      // Assign breed energy profile: use breed-specific profile if available,
      // otherwise fall back to the archetype profile.
      const cell = state.cells.get(id);
      if (cell) {
        const profileId = (spawnOpts.spawn.breedId ?? spawnOpts.spawn.archetype) as BreedProfileId;
        cell.breedProfileId = profileId;
      }
      archetypes.set(id, spawnOpts.spawn);
      const ai: AiState = {};
      if (spawnOpts.spawn.archetype === 'sniper')   ai.sniper = { shootTimer: spawnOpts.spawn.shootCooldown ?? 30 };
      if (spawnOpts.spawn.archetype === 'boss')     ai.boss = { phase: 1, didSpawnP2: false };
      if (spawnOpts.spawn.archetype === 'splitter') ai.splitter = { didSpawn: false };
      aiStates.set(id, ai);
      return id;
    },
    getHomeostasisProgress(): number {
      return homeostasisTracker.progress();
    },
    getEquilibrium(): EquilibriumInfo {
      return {
        achieved: homeostasisTracker.isAchieved(),
        progress: homeostasisTracker.progress(),
        biomeName: homeostasisTracker.getBiome()?.name ?? null,
      };
    },
    isHomeostasisAchieved(): boolean {
      return homeostasisTracker.isAchieved();
    },
    isEcosystemCollapsed(): boolean {
      // Collapsed if no living cells remain (excluding cell 0 / background).
      let livingCount = 0;
      for (const cell of state.cells.values()) {
        if (cell.vol > 0) livingCount++;
      }
      return livingCount === 0;
    },
  };

  return arena;
}

function toolLoadoutFor(player: PlayerConfig): Record<LabTool, ToolState> {
  const eggCharges = player.eggCharges ?? TOOL_TUNING.egg.charges;
  const nutrientCharges = player.nutrientCharges ?? TOOL_TUNING.nutrient.charges;
  const toxinCharges = player.toxinCharges ?? TOOL_TUNING.toxin.charges;
  const waterCharges = player.waterCharges ?? TOOL_TUNING.water.charges;
  const saltCharges = player.saltCharges ?? TOOL_TUNING.salt.charges;
  const acidCharges = player.acidCharges ?? TOOL_TUNING.acid.charges;
  const pasteCharges = player.pasteCharges ?? TOOL_TUNING.paste.charges;
  return {
    egg: { charges: eggCharges, maxCharges: eggCharges },
    nutrient: { charges: nutrientCharges, maxCharges: nutrientCharges },
    toxin: { charges: toxinCharges, maxCharges: toxinCharges },
    water: { charges: waterCharges, maxCharges: waterCharges },
    salt: { charges: saltCharges, maxCharges: saltCharges },
    acid: { charges: acidCharges, maxCharges: acidCharges },
    paste: { charges: pasteCharges, maxCharges: pasteCharges },
  };
}

function toolEffectFor(
  tool: Exclude<LabTool, 'egg' | 'paste'>,
  pos: [number, number],
  player: PlayerConfig,
  seed: number,
): ToolEffect {
  const radius =
    tool === 'nutrient' ? player.nutrientRadius ?? TOOL_TUNING.nutrient.radius :
    tool === 'toxin' ? player.toxinRadius ?? TOOL_TUNING.toxin.radius :
    tool === 'water' ? player.waterRadius ?? TOOL_TUNING.water.radius :
    tool === 'salt' ? player.saltRadius ?? TOOL_TUNING.salt.radius :
    player.acidRadius ?? TOOL_TUNING.acid.radius;
  const maxTtl = TOOL_TUNING[tool].ttl;
  return {
    type: tool,
    pos,
    radius,
    ttl: maxTtl,
    maxTtl,
    seed,
  };
}

function reactionFor(newEffect: ToolEffect, effects: ToolEffect[], seed: number): ReagentReactionResult | null {
  for (const effect of effects) {
    if (effect === newEffect) continue;
    const dist = Math.hypot(newEffect.pos[0] - effect.pos[0], newEffect.pos[1] - effect.pos[1]);
    if (dist > Math.min(newEffect.radius, effect.radius) * 0.85) continue;
    const reactionType = reactionTypeFor(newEffect.type, effect.type);
    if (!reactionType) continue;
    const radius = Math.max(newEffect.radius, effect.radius) + 7;
    const maxTtl = reactionType === 'bloom' ? 60 * 5 : reactionType === 'brine' ? 60 * 6 : 60 * 3;
    return {
      effect: {
        type: reactionType,
        pos: [
          (newEffect.pos[0] + effect.pos[0]) / 2,
          (newEffect.pos[1] + effect.pos[1]) / 2,
        ],
        radius,
        ttl: maxTtl,
        maxTtl,
        seed,
      },
      inputs: [newEffect.type, effect.type],
    };
  }
  return null;
}

function reactionUsesAcid(reaction: { inputs: readonly string[] }): boolean {
  return reaction.inputs.includes('acid');
}

function catalyticReactionFor(
  newEffect: ToolEffect,
  effects: ToolEffect[],
  state: SimState,
  archetypes: Map<CellId, EnemySpawn>,
  agitated: boolean,
  seed: number,
): {
  effect: ToolEffect;
  inputs: readonly ToolEffectType[];
  noteId: DiscoveryNoteId;
  message: string;
  caution: 'stable' | 'volatile' | 'critical';
} | null {
  const newType = catalysisEffectTypeFor(newEffect.type);
  if (!newType) return null;
  let strongestReaction: {
    effect: ToolEffect;
    inputs: readonly ToolEffectType[];
    noteId: DiscoveryNoteId;
    message: string;
    caution: 'stable' | 'volatile' | 'critical';
  } | null = null;

  for (const effect of effects) {
    if (effect === newEffect) continue;
    const otherType = catalysisEffectTypeFor(effect.type);
    if (!otherType) continue;

    const dist = distanceBetween(state, newEffect.pos, effect.pos);
    if (dist > reagentOverlapDistance(newEffect, effect)) continue;

    const context = reactionContextFor(state, archetypes, {
      ...newEffect,
      pos: [
        (newEffect.pos[0] + effect.pos[0]) / 2,
        (newEffect.pos[1] + effect.pos[1]) / 2,
      ],
      radius: Math.max(newEffect.radius, effect.radius) + 10,
    }, agitated);
    const inputs = overlappingCatalysisTypes(newEffect, effects, state, newType);
    const recipe = reactionRecipeFor(inputs, context, newType);
    if (!recipe) continue;

    const reaction = {
      effect: derivedEffect(
        recipe.effect.type,
        newEffect,
        effect,
        seed,
        recipe.effect.ttl,
        recipe.effect.radiusBonus,
      ),
      inputs: recipe.inputs,
      noteId: recipe.discoveryNoteId,
      message: reactionMessageFor(recipe.effect.type, recipe.name),
      caution: recipe.caution,
    };
    if (
      !strongestReaction
      || catalystPriority(reaction.effect.type, reaction.caution) > catalystPriority(strongestReaction.effect.type, strongestReaction.caution)
    ) {
      strongestReaction = reaction;
    }
  }

  return strongestReaction;
}

function overlappingCatalysisTypes(
  newEffect: ToolEffect,
  effects: ToolEffect[],
  state: SimState,
  newType: CatalysisEffectType,
): CatalysisEffectType[] {
  const inputs: CatalysisEffectType[] = [newType];
  for (const effect of effects) {
    const type = catalysisEffectTypeFor(effect.type);
    if (!type || inputs.includes(type)) continue;
    const dist = distanceBetween(state, newEffect.pos, effect.pos);
    if (dist <= reagentOverlapDistance(newEffect, effect)) inputs.push(type);
  }
  return inputs;
}

function catalystPriority(type: ToolEffectType, caution: 'stable' | 'volatile' | 'critical'): number {
  const cautionScore = caution === 'critical' ? 300 : caution === 'volatile' ? 200 : 100;
  const typeScore = type === 'fold_fault' ? 40 : type === 'flare' ? 30 : type === 'crystal' ? 20 : 0;
  return cautionScore + typeScore;
}

function reactionContextFor(
  state: SimState,
  archetypes: Map<CellId, EnemySpawn>,
  effect: ToolEffect,
  agitated: boolean,
): ReactionContext {
  const traits: TraitId[] = [];
  const archetypeSet = new Set<EnemyArchetype>();
  for (const [id, cell] of state.cells) {
    if (id === PLAYER_ID || (cell.vol <= 0 && cell.targetVol <= 0)) continue;
    const dist = distanceBetween(state, cell.center, effect.pos);
    if (dist > effect.radius + 10) continue;
    const spawn = archetypes.get(id);
    if (!spawn) continue;
    archetypeSet.add(spawn.archetype);
    for (const trait of spawn.traits ?? []) traits.push(trait);
  }
  return { traits, archetypes: [...archetypeSet], agitated };
}

function reactionMessageFor(type: CatalysisEffectType, recipeName: string): string {
  if (type === 'flare') return `CATALYTIC FLARE: ${recipeName} discovered.`;
  if (type === 'crystal') return `CATALYTIC CRYSTAL: ${recipeName} discovered.`;
  if (type === 'foam') return `CATALYTIC FOAM: ${recipeName} discovered.`;
  if (type === 'fold_fault') return `FOLDING FAULT: ${recipeName} discovered.`;
  return `CATALYTIC REACTION: ${recipeName} discovered.`;
}

function catalysisEffectTypeFor(type: ToolEffectType): CatalysisEffectType | null {
  if (type === 'mutation') return null;
  return type;
}

function distanceBetween(state: SimState, a: [number, number], b: [number, number]): number {
  const v = displacementVec(a, b, state.grid.LX, state.grid.LY, state.grid.wrap);
  return Math.hypot(v[0], v[1]);
}

function applyWaterTransformations(
  newEffect: ToolEffect,
  effects: ToolEffect[],
  pushSignal: (message: string) => void,
  discoverDilution: () => void,
  pushEvent: (label: string, pos: [number, number], radius: number) => void,
  seed: number,
): ToolEffect | null {
  if (newEffect.type !== 'water') return null;

  const nutrient = nearestOverlappingEffect(newEffect, effects, 'nutrient');
  if (nutrient) {
    nutrient.radius = clamp(nutrient.radius + 10, nutrient.radius, 62);
    nutrient.maxTtl = Math.max(nutrient.maxTtl, nutrient.ttl + 60);
    nutrient.ttl = Math.min(nutrient.maxTtl, nutrient.ttl + 60);
    pushSignal('Lab note: water carried nutrient farther.');
    return derivedEffect('conduit', newEffect, nutrient, seed, 60 * 5, 12);
  }

  const acid = nearestOverlappingEffect(newEffect, effects, 'acid');
  if (acid) {
    acid.radius = clamp(acid.radius + 8, acid.radius, 54);
    acid.ttl = Math.max(30, Math.floor(acid.ttl * 0.55));
    pushSignal('Lab note: water diluted the acid field.');
    discoverDilution();
    pushEvent('WATER DILUTED ACID', acid.pos, acid.radius);
    return null;
  }

  const toxin = nearestOverlappingEffect(newEffect, effects, 'toxin');
  if (toxin) {
    toxin.radius = clamp(toxin.radius + 6, toxin.radius, 58);
    toxin.ttl = Math.max(45, Math.floor(toxin.ttl * 0.7));
    pushSignal('Lab note: water softened toxin pressure.');
    discoverDilution();
    pushEvent('WATER SOFTENED TOXIN', toxin.pos, toxin.radius);
    return null;
  }

  return null;
}

function addDishEventForCatalysis(
  reaction: {
    effect: ToolEffect;
    message: string;
    caution: 'stable' | 'volatile' | 'critical';
  },
  addDishEvent: (
    kind: DishEventKind,
    label: string,
    pos: [number, number],
    radius: number,
    color: DishEventColor,
  ) => void,
): void {
  if (reaction.effect.type === 'fold_fault') {
    addDishEvent('fold', reaction.message, reaction.effect.pos, reaction.effect.radius, 'violet');
    return;
  }
  if (reaction.caution === 'critical') {
    addDishEvent('critical', reaction.message, reaction.effect.pos, reaction.effect.radius, 'red');
    addDishEvent('critical', `${reaction.message} FLASH`, reaction.effect.pos, reaction.effect.radius * 0.58, 'amber');
    return;
  }
  if (reaction.caution === 'volatile') {
    addDishEvent('caution', reaction.message, reaction.effect.pos, reaction.effect.radius, 'amber');
    addDishEvent('caution', `${reaction.message} SPARK`, reaction.effect.pos, reaction.effect.radius * 0.48, 'amber');
    return;
  }
  addDishEvent('stabilize', reaction.message, reaction.effect.pos, reaction.effect.radius, 'green');
}

function addDishEventForEffect(
  effect: ToolEffect,
  addDishEvent: (
    kind: DishEventKind,
    label: string,
    pos: [number, number],
    radius: number,
    color: DishEventColor,
  ) => void,
): void {
  if (effect.type === 'brine' || effect.type === 'crystal') {
    addDishEvent('caution', `${effect.type.toUpperCase()} REACTION`, effect.pos, effect.radius, 'amber');
  } else if (effect.type === 'lysis' || effect.type === 'flare') {
    addDishEvent('critical', `${effect.type.toUpperCase()} REACTION`, effect.pos, effect.radius, 'red');
  } else if (effect.type === 'fold_fault') {
    addDishEvent('fold', 'FOLDING FAULT', effect.pos, effect.radius, 'violet');
  } else {
    addDishEvent('stabilize', `${effect.type.toUpperCase()} REACTION`, effect.pos, effect.radius, 'green');
  }
}

function nearestOverlappingEffect(
  newEffect: ToolEffect,
  effects: ToolEffect[],
  type: ToolEffectType,
): ToolEffect | null {
  let nearest: { effect: ToolEffect; dist: number } | null = null;
  for (const effect of effects) {
    if (effect === newEffect || effect.type !== type) continue;
    const dist = Math.hypot(newEffect.pos[0] - effect.pos[0], newEffect.pos[1] - effect.pos[1]);
    if (dist > reagentOverlapDistance(newEffect, effect)) continue;
    if (!nearest || dist < nearest.dist) nearest = { effect, dist };
  }
  return nearest?.effect ?? null;
}

function reagentOverlapDistance(a: ToolEffect, b: ToolEffect): number {
  return a.radius + b.radius;
}

function derivedEffect(
  type: ToolEffectType,
  newEffect: ToolEffect,
  source: ToolEffect,
  seed: number,
  maxTtl: number,
  radiusBonus: number,
): ToolEffect {
  return {
    type,
    pos: [
      (newEffect.pos[0] + source.pos[0]) / 2,
      (newEffect.pos[1] + source.pos[1]) / 2,
    ],
    radius: Math.max(newEffect.radius, source.radius) + radiusBonus,
    ttl: maxTtl,
    maxTtl,
    seed,
  };
}

function randomAccidentEffect(state: SimState): ToolEffect {
  const accidentTools: Array<Exclude<LabTool, 'egg' | 'nutrient' | 'toxin' | 'paste'>> = ['water', 'salt', 'acid'];
  const tool = accidentTools[state.rng.randInt(accidentTools.length)]!;
  return toolEffectFor(
    tool,
    [state.rng.randInt(state.grid.LX), state.rng.randInt(state.grid.LY)],
    {
      targetVol: 0,
      speed: 0,
      engulfMultiplier: 1,
      bulletSize: 0,
    },
    state.rng.randInt(1_000_000),
  );
}

interface WorldEventResult {
  births: number;
  effect?: ToolEffect;
  label: string;
  signal: string;
  pos: [number, number];
  radius: number;
  color: DishEventColor;
}

function triggerWorldEvent(
  arena: Arena,
  state: SimState,
  archetypes: Map<CellId, EnemySpawn>,
): WorldEventResult | null {
  const living = Array.from(state.cells)
    .filter(([id, cell]) => id !== PLAYER_ID && cell.vol > 0);
  const parentEntry = living.length > 0 ? living[state.rng.randInt(living.length)] : undefined;
  const parent = parentEntry?.[1];
  const parentSpawn = parentEntry ? archetypes.get(parentEntry[0]) : undefined;
  const pos: [number, number] = parent
    ? [
        parent.center[0] + state.rng.randInt(23) - 11,
        parent.center[1] + state.rng.randInt(23) - 11,
      ]
    : [
        state.rng.randInt(state.grid.LX),
        state.rng.randInt(state.grid.LY),
      ];
  const canSpawn = !!parentSpawn && archetypes.size < ECOSYSTEM_MAX_POPULATION;
  if (canSpawn && state.rng.random() < WORLD_EVENT_TUNING.sporeDriftChance) {
    arena.spawnEnemy({ spawn: budSpawn(parentSpawn, state.rng.random()), pos });
    return {
      births: 1,
      label: 'FERTILE DRIFT',
      signal: 'Fertile drift seeded a culture.',
      pos,
      radius: 14,
      color: 'green',
    };
  }

  const effect: ToolEffect = {
    type: 'nutrient',
    pos,
    radius: WORLD_EVENT_TUNING.agarBloomRadius,
    ttl: WORLD_EVENT_TUNING.agarBloomTtl,
    maxTtl: WORLD_EVENT_TUNING.agarBloomTtl,
    seed: state.rng.randInt(1_000_000),
  };
  return {
    births: 0,
    effect,
    label: 'AGAR BLOOM',
    signal: 'Agar bloom fed the dish.',
    pos,
    radius: effect.radius,
    color: 'green',
  };
}

function triggerPredatorOutbreak(
  arena: Arena,
  state: SimState,
  archetypes: Map<CellId, EnemySpawn>,
  outbreakHunters?: number,
): { births: number; effect: ToolEffect } | null {
  if (archetypes.size >= ECOSYSTEM_MAX_POPULATION) return null;
  const source = dominantOutbreakSource(state);
  if (!source) return null;

  const sourceArchetype = source.id === PLAYER_ID
    ? 'control_sample'
    : archetypes.get(source.id)?.archetype ?? 'culture';
  const hunterCount = Math.min(outbreakHunters ?? OUTBREAK_HUNTER_COUNT, ECOSYSTEM_MAX_POPULATION - archetypes.size);
  let births = 0;
  for (let i = 0; i < hunterCount; i++) {
    const angle = (Math.PI * 2 * i) / hunterCount + state.rng.random() * 0.45;
    const distance = 8 + state.rng.randInt(9);
    arena.spawnEnemy({
      spawn: outbreakHunterSpawn(sourceArchetype),
      pos: [
        source.cell.center[0] + Math.cos(angle) * distance,
        source.cell.center[1] + Math.sin(angle) * distance,
      ],
    });
    births += 1;
  }

  source.cell.targetVol = clamp(source.cell.targetVol * 0.82, 35, 2200);
  return {
    births,
    effect: {
      type: 'lysis',
      pos: [...source.cell.center],
      radius: 24,
      ttl: 60 * 4,
      maxTtl: 60 * 4,
      seed: state.rng.randInt(1_000_000),
    },
  };
}

function dominantOutbreakSource(state: SimState): { id: CellId; cell: Cell } | null {
  let best: { id: CellId; cell: Cell; score: number } | null = null;
  for (const [id, cell] of state.cells) {
    if (cell.vol <= 0) continue;
    const score = Math.max(cell.targetVol, cell.vol);
    if (score < OUTBREAK_MIN_TARGET_VOL) continue;
    if (!best || score > best.score) best = { id, cell, score };
  }
  return best ? { id: best.id, cell: best.cell } : null;
}

function breedDiscoveryMarkerFor(id: BreedId): {
  kind: DishEventKind;
  color: DishEventColor;
  radius: number;
} {
  const caution = DISCOVERY_NOTES[`breed_${id}`].caution;
  if (caution === 'critical') return { kind: 'critical', color: 'red', radius: 28 };
  if (caution === 'volatile') return { kind: 'caution', color: 'amber', radius: 24 };
  return { kind: 'discovery', color: 'cyan', radius: 20 };
}

function outbreakHunterSpawn(sourceArchetype: string): EnemySpawn {
  const base = ARCHETYPE_DEFAULTS.swarmlet;
  const sourceIsAnchor = sourceArchetype === 'control_sample' || sourceArchetype === 'boss' || sourceArchetype === 'bruiser';
  return {
    ...base,
    targetVol: sourceIsAnchor ? 105 : 85,
    speed: sourceIsAnchor ? 16 : 15,
    engulfMultiplier: sourceIsAnchor ? 7.8 : 7.2,
    instability: 2.15,
    traits: ['fleet'],
  };
}

function breedSpawnFor(id: BreedId, base?: EnemySpawn): EnemySpawn {
  const def = BREED_DEFS[id];
  // Hybrids derive from their base archetype defaults, not the parent cell that
  // triggered them, so their stats don't compound off an already-bred parent.
  const source = def.parents ? ARCHETYPE_DEFAULTS[def.baseArchetype] : (base ?? ARCHETYPE_DEFAULTS[def.baseArchetype]);
  return {
    ...source,
    archetype: def.baseArchetype,
    breedId: id,
    targetVol: clamp(source.targetVol * def.targetVolMultiplier, 45, 1800),
    speed: clamp(source.speed * def.speedMultiplier, 3, 20),
    engulfMultiplier: clamp(source.engulfMultiplier * def.engulfMultiplier, 1, 11),
    instability: (source.instability ?? 1) * def.instabilityMultiplier,
    traits: [...new Set([...(source.traits ?? []), ...def.traits])],
  };
}

function evaluateBreedDiscoveries(
  state: SimState,
  archetypes: Map<CellId, EnemySpawn>,
  effects: ToolEffect[],
  discoveredBreeds: ReadonlySet<BreedId>,
  discover: (id: BreedId, sourceCell?: Cell) => void,
): void {
  // Cross-breeding: any breed whose two parents are both discovered and present
  // as adjacent cells under a nutrient field hybridizes into its offspring.
  for (const def of Object.values(BREED_DEFS)) {
    if (!def.parents) continue;
    const [a, b] = def.parents;
    if (!discoveredBreeds.has(a) || !discoveredBreeds.has(b)) continue;
    const source = hybridPairSource(state, archetypes, effects, a, b);
    if (source) discover(def.id, source);
  }

  const bloomMassSource = bloomMassPairSource(state, archetypes, effects);
  if (bloomMassSource) discover('bloom_mass', bloomMassSource);

  const needleSource = needleSwarmSource(state, archetypes);
  if (needleSource) discover('needle_swarm', needleSource);

  for (const [id, spawn] of archetypes) {
    const cell = state.cells.get(id);
    if (!cell || cell.vol <= 0) continue;

    if (hasTraits(spawn, ['toxin_resistant', 'fragile']) && overlapsEffect(state, cell, effects, 'flare')) {
      discover('glass_antibody', cell);
    }

    if (hasTraits(spawn, ['toxin_resistant', 'fragile']) && overlapsEffect(state, cell, effects, 'crystal')) {
      discover('glass_antibody', cell);
    }

    if (
      hasTraits(spawn, ['budding'])
      && cell.targetVol > 420
      && (overlapsEffect(state, cell, effects, 'conduit') || overlapsEffect(state, cell, effects, 'bloom'))
    ) {
      discover('bloom_mass', cell);
    }

    if (hasTraits(spawn, ['gelatinous']) && overlapsEffect(state, cell, effects, 'crystal')) {
      discover('static_lattice', cell);
    }

    if (
      (spawn.archetype === 'boss' || spawn.archetype === 'bruiser')
      && overlapsEffect(state, cell, effects, 'fold_fault')
    ) {
      discover('folded_anchor', cell);
    }
  }
}

// Find a cell matching A and a cell matching B that sit adjacent inside a
// shared nutrient/bloom/conduit field. `pick` chooses which of the pair
// becomes the discovery's spawn source.
function nutrientPairSource(
  state: SimState,
  archetypes: Map<CellId, EnemySpawn>,
  effects: ToolEffect[],
  matchA: (spawn: EnemySpawn) => boolean,
  matchB: (spawn: EnemySpawn) => boolean,
  maxPairDistance: number,
  pick: (a: Cell, b: Cell) => Cell,
): Cell | null {
  const nutrientFields = effects.filter((effect) =>
    effect.type === 'nutrient' || effect.type === 'bloom' || effect.type === 'conduit',
  );
  if (nutrientFields.length === 0) return null;

  const aCells: Cell[] = [];
  const bCells: Cell[] = [];
  for (const [id, spawn] of archetypes) {
    const wantsA = matchA(spawn);
    const wantsB = matchB(spawn);
    if (!wantsA && !wantsB) continue;
    const cell = state.cells.get(id);
    if (!cell || cell.vol <= 0) continue;
    if (wantsA) aCells.push(cell);
    if (wantsB) bCells.push(cell);
  }

  for (const a of aCells) {
    for (const b of bCells) {
      if (a === b) continue;
      if (distanceBetween(state, a.center, b.center) > maxPairDistance) continue;
      const inNutrient = nutrientFields.some((effect) =>
        distanceBetween(state, a.center, effect.pos) <= effect.radius + 6
        && distanceBetween(state, b.center, effect.pos) <= effect.radius + 6,
      );
      if (inNutrient) return pick(a, b);
    }
  }

  return null;
}

function bloomMassPairSource(
  state: SimState,
  archetypes: Map<CellId, EnemySpawn>,
  effects: ToolEffect[],
): Cell | null {
  return nutrientPairSource(
    state,
    archetypes,
    effects,
    (spawn) => spawn.archetype === 'swarmlet',
    (spawn) => spawn.archetype === 'splitter',
    18,
    (_, splitter) => splitter,
  );
}

// Find a breed-A cell and a breed-B cell that sit adjacent inside a shared
// nutrient field. Returns the larger of the pair as the hybrid's spawn source.
function hybridPairSource(
  state: SimState,
  archetypes: Map<CellId, EnemySpawn>,
  effects: ToolEffect[],
  breedA: BreedId,
  breedB: BreedId,
): Cell | null {
  return nutrientPairSource(
    state,
    archetypes,
    effects,
    (spawn) => spawn.breedId === breedA,
    (spawn) => spawn.breedId === breedB,
    16,
    (a, b) => (a.vol >= b.vol ? a : b),
  );
}

function needleSwarmSource(
  state: SimState,
  archetypes: Map<CellId, EnemySpawn>,
): Cell | null {
  const swarmlets: Cell[] = [];
  const snipers: Cell[] = [];
  for (const [id, spawn] of archetypes) {
    const cell = state.cells.get(id);
    if (!cell || cell.vol <= 0) continue;
    if (spawn.archetype === 'swarmlet') swarmlets.push(cell);
    if (spawn.archetype === 'sniper') snipers.push(cell);
  }

  if (snipers.length > 0 && swarmlets.length >= 2) return snipers[0]!;
  return null;
}

function hasTraits(spawn: EnemySpawn, traits: readonly TraitId[]): boolean {
  return traits.every((trait) => spawn.traits?.includes(trait));
}

function sourceCellWithTraits(
  state: SimState,
  archetypes: Map<CellId, EnemySpawn>,
  effect: ToolEffect,
  traits: readonly TraitId[],
): Cell | undefined {
  for (const [id, spawn] of archetypes) {
    if (!hasTraits(spawn, traits)) continue;
    const cell = state.cells.get(id);
    if (!cell || cell.vol <= 0) continue;
    if (distanceBetween(state, cell.center, effect.pos) <= effect.radius + 4) return cell;
  }
  return undefined;
}

function sourceCellWithArchetypes(
  state: SimState,
  archetypes: Map<CellId, EnemySpawn>,
  effect: ToolEffect,
  sourceArchetypes: readonly EnemyArchetype[],
): Cell | undefined {
  for (const [id, spawn] of archetypes) {
    if (!sourceArchetypes.includes(spawn.archetype)) continue;
    const cell = state.cells.get(id);
    if (!cell || cell.vol <= 0) continue;
    if (distanceBetween(state, cell.center, effect.pos) <= effect.radius + 4) return cell;
  }
  return undefined;
}

function overlapsEffect(
  state: SimState,
  cell: Cell,
  effects: ToolEffect[],
  type: ToolEffectType,
): boolean {
  return effects.some((effect) => (
    effect.type === type && distanceBetween(state, cell.center, effect.pos) <= effect.radius + 4
  ));
}

function reactionTypeFor(a: ToolEffectType, b: ToolEffectType): ToolEffectType | null {
  if (isPair(a, b, 'water', 'nutrient')) return 'bloom';
  if (isPair(a, b, 'water', 'salt')) return 'brine';
  if (isPair(a, b, 'acid', 'toxin')) return 'lysis';
  if (isPair(a, b, 'acid', 'water')) return 'foam';
  if (isPair(a, b, 'acid', 'nutrient')) return 'bloom';
  return null;
}

function isPair(a: ToolEffectType, b: ToolEffectType, x: ToolEffectType, y: ToolEffectType): boolean {
  return (a === x && b === y) || (a === y && b === x);
}

function findOverlappingReaction(effects: ToolEffect[]): ToolEffect | null {
  const reactions = effects.filter((effect) => isReactionEffect(effect.type));
  for (const reaction of reactions) {
    if (reactions.some((other) => other !== reaction && Math.hypot(
      reaction.pos[0] - other.pos[0],
      reaction.pos[1] - other.pos[1],
    ) <= reagentOverlapDistance(reaction, other))) {
      return reaction;
    }
  }
  return reactions[0] ?? null;
}

function isReactionEffect(type: ToolEffectType): boolean {
  return type === 'bloom'
    || type === 'brine'
    || type === 'lysis'
    || type === 'foam'
    || type === 'conduit'
    || type === 'flare'
    || type === 'crystal';
}

function applyFoldingFault(state: SimState, effect: ToolEffect): void {
  const { LX, LY } = state.grid;
  const phase = effect.maxTtl - effect.ttl;
  for (const [, cell] of state.cells) {
    if (cell.vol <= 0) continue;
    const v = displacementVec(cell.center, effect.pos, LX, LY, state.grid.wrap);
    const dist = Math.hypot(v[0], v[1]);
    if (dist > effect.radius) continue;
    const x = Math.floor(cell.center[0] + phase);
    const y = Math.floor(cell.center[1]);
    const bit = rule30Bit(effect.seed, x, y, phase);
    const strength = (1 - dist / effect.radius) * (effect.ttl / effect.maxTtl);
    if (bit === 1) {
      cell.targetVol = clamp(cell.targetVol + 0.95 * strength, 25, 2400);
      cell.intent.speed = Math.max(cell.intent.speed, 7 + strength * 6);
    } else {
      cell.targetVol = clamp(cell.targetVol - 0.42 * strength, 12, 2400);
    }
  }
}

function rule30Bit(seed: number, x: number, y: number, phase: number): 0 | 1 {
  const left = hash2(seed, x - 1, y + phase) > 0.5 ? 1 : 0;
  const center = hash2(seed + 17, x, y + phase) > 0.5 ? 1 : 0;
  const right = hash2(seed + 31, x + 1, y + phase) > 0.5 ? 1 : 0;
  const pattern = (left << 2) | (center << 1) | right;
  return ((30 >> pattern) & 1) as 0 | 1;
}

function objectiveMetrics(state: SimState, archetypes: Map<CellId, EnemySpawn>): ObjectiveMetrics {
  let controlSampleVol = 0;
  let livingLifeforms = 0;
  let protectedCultureCount = 0;
  let livingVol = 0;
  let lifeformVol = 0;
  let dominantVol = 0;
  let dominantArchetype: EnemyArchetype | null = null;
  let maxLifeformVolume = 0;
  let nearbyDifferentBreedPair = false;
  const archetypeCounts = new Map<EnemyArchetype, number>();
  const breedVolumes = new Map<string, number>();
  const livingBreedCells: Array<{ cell: Cell; breedKey: string }> = [];
  for (const [id, cell] of state.cells) {
    if (cell.vol <= 0) continue;
    livingVol += cell.vol;
    if (id === PLAYER_ID) {
      controlSampleVol += Math.min(cell.vol, cell.targetVol);
      continue;
    }

    livingLifeforms += 1;
    lifeformVol += cell.vol;
    maxLifeformVolume = Math.max(maxLifeformVolume, cell.vol);
    const spawn = archetypes.get(id);
    const archetype = spawn?.archetype;
    if (archetype) {
      archetypeCounts.set(archetype, (archetypeCounts.get(archetype) ?? 0) + 1);
      const role = ARCHETYPE_ECOLOGY[archetype].role;
      if (role === 'grazer' || role === 'propagator') protectedCultureCount += 1;
      if (cell.vol > dominantVol) {
        dominantVol = cell.vol;
        dominantArchetype = archetype;
      }
    }
    const breedKey = spawn?.breedId ?? spawn?.archetype ?? `cell-${id}`;
    breedVolumes.set(breedKey, (breedVolumes.get(breedKey) ?? 0) + cell.vol);
    livingBreedCells.push({ cell, breedKey });
  }

  let maxBreedVolume = 0;
  for (const volume of breedVolumes.values()) {
    if (volume > maxBreedVolume) maxBreedVolume = volume;
  }

  for (let i = 0; i < livingBreedCells.length && !nearbyDifferentBreedPair; i++) {
    const a = livingBreedCells[i]!;
    for (let j = i + 1; j < livingBreedCells.length; j++) {
      const b = livingBreedCells[j]!;
      if (a.breedKey === b.breedKey) continue;
      if (distanceBetween(state, a.cell.center, b.cell.center) <= 28) {
        nearbyDifferentBreedPair = true;
        break;
      }
    }
  }

  return {
    controlSampleVol,
    livingLifeforms,
    protectedCultureCount,
    archetypeCounts,
    livingVol,
    lifeformVol,
    dominantVol,
    dominantArchetype,
    coverage: livingVol / (state.grid.LX * state.grid.LY),
    maxLifeformVolume,
    maxBreedDominance: lifeformVol === 0 ? 0 : maxBreedVolume / lifeformVol,
    nearbyDifferentBreedPair,
  };
}

function mutateEcology(
  state: SimState,
  archetypes: Map<CellId, EnemySpawn>,
  pushSignal?: (message: string) => void,
): MutationResult {
  let changed = 0;
  const effects: ToolEffect[] = [];
  for (const [id, spawn] of archetypes) {
    const cell = state.cells.get(id);
    if (!cell || cell.vol <= 0) continue;
    const instability = spawn.instability ?? 1;
    const drift = (state.rng.random() - 0.5) * 0.18 * instability;
    const trait = pickMutationTrait(spawn.traits, state.rng.random());
    addTraitToSpawn(spawn, trait);
    const traitDef = MUTATION_TRAITS[trait];
    spawn.targetVol = clamp(spawn.targetVol * (1 + drift), 55, 1800);
    spawn.speed = clamp(spawn.speed * (1 - drift * 0.45), 3, 16);
    spawn.engulfMultiplier = clamp(spawn.engulfMultiplier * (1 + drift * 0.6), 1, 9);
    spawn.targetVol = clamp(spawn.targetVol * traitDef.targetVolMultiplier, 55, 1800);
    spawn.speed = clamp(spawn.speed * traitDef.speedMultiplier, 3, 18);
    if (spawn.shootCooldown !== undefined) {
      spawn.shootCooldown = Math.round(clamp(spawn.shootCooldown * (1 + drift), 28, 90));
    }
    cell.targetVol = clamp((cell.targetVol + spawn.targetVol) / 2, 35, 1800);
    pushSignal?.(`${capitalize(spawn.archetype)} mutation: ${traitDef.name}.`);
    effects.push({
      type: 'mutation',
      pos: [...cell.center],
      radius: clamp(12 + instability * 5, 14, 28),
      ttl: 60 * 2,
      maxTtl: 60 * 2,
      seed: state.rng.randInt(1_000_000),
    });
    changed += 1;
  }
  return { changed, effects };
}

function addTraitToSpawn(spawn: EnemySpawn, trait: TraitId): void {
  if (spawn.traits?.includes(trait)) return;
  spawn.traits = [...(spawn.traits ?? []), trait];
}

function chooseEcosystemTarget(
  self: Cell,
  player: Cell,
  state: SimState,
  archetypes: Map<CellId, EnemySpawn>,
): Cell {
  const { LX, LY } = state.grid;
  // Only a living control sample is a threat worth reacting to — a dead one
  // must never be targeted, or cells pile up around the corpse forever.
  if (player.vol > 0) {
    const playerVec = displacementVec(self.center, player.center, LX, LY, state.grid.wrap);
    const playerDist = Math.hypot(playerVec[0], playerVec[1]);
    if (playerDist <= PLAYER_THREAT_RANGE) return player;
  }

  let best: Cell | null = null;
  let bestScore = Infinity;
  const selfArchetype = archetypes.get(self.id)?.archetype;
  const profile = selfArchetype ? ARCHETYPE_ECOLOGY[selfArchetype] : undefined;
  for (const [id, candidate] of state.cells) {
    if (id === self.id || id === PLAYER_ID || candidate.vol <= 0) continue;
    const v = displacementVec(self.center, candidate.center, LX, LY, state.grid.wrap);
    const dist = Math.hypot(v[0], v[1]);
    const targetArchetype = archetypes.get(id)?.archetype;
    let score = dist;
    if (targetArchetype && profile?.prefers.includes(targetArchetype)) score *= 0.22;
    if (targetArchetype && profile?.avoids.includes(targetArchetype)) score *= 2.5;
    if (score < bestScore) {
      best = candidate;
      bestScore = score;
    }
  }
  return best ?? self;
}

function findEggSeedPos(state: SimState, pos: [number, number]): [number, number] | null {
  const { grid } = state;
  const cx = Math.round(pos[0]);
  const cy = Math.round(pos[1]);
  for (let r = 0; r <= 24; r++) {
    for (let dx = -r; dx <= r; dx++) {
      for (let dy = -r; dy <= r; dy++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        const candidate = normalizeCoord(grid, cx + dx, cy + dy);
        if (!candidate) continue;
        if (seedablePixelCount(state, candidate) > 0) return candidate;
      }
    }
  }
  return null;
}

function seedablePixelCount(state: SimState, pos: [number, number]): number {
  let count = 0;
  const cx = Math.round(pos[0]);
  const cy = Math.round(pos[1]);
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      const candidate = normalizeCoord(state.grid, cx + dx, cy + dy);
      if (!candidate) continue;
      if (getCell(state.grid, candidate[0], candidate[1]) === 0) count += 1;
    }
  }
  return count;
}

function normalizeCoord(
  grid: SimState['grid'],
  x: number,
  y: number,
): [number, number] | null {
  if (grid.wrap) {
    return [
      ((x % grid.LX) + grid.LX) % grid.LX,
      ((y % grid.LY) + grid.LY) % grid.LY,
    ];
  }
  if (x < 0 || x >= grid.LX || y < 0 || y >= grid.LY) return null;
  return [x, y];
}

function applyEggSynergies(
  state: SimState,
  effects: ToolEffect[],
  pos: [number, number],
  spawn: EnemySpawn,
  pushSignal: (message: string) => void,
): void {
  const nutrient = nearbyToolEffect(state, effects, 'nutrient', pos);
  const toxin = nearbyToolEffect(state, effects, 'toxin', pos);
  if (nutrient) {
    addTraitToSpawn(spawn, 'budding');
    spawn.targetVol = clamp(spawn.targetVol * 1.22, 55, 760);
    spawn.instability = (spawn.instability ?? 1) * 1.08;
    pushSignal('Nutrient egg cultured a budding strain.');
  }
  if (toxin) {
    addTraitToSpawn(spawn, 'toxin_resistant');
    spawn.targetVol = clamp(spawn.targetVol * 0.9, 45, 760);
    spawn.instability = (spawn.instability ?? 1) * 1.18;
    pushSignal('Toxin egg selected a resistant strain.');
  }
}

function nearbyToolEffect(
  state: SimState,
  effects: ToolEffect[],
  type: ToolEffect['type'],
  pos: [number, number],
): ToolEffect | undefined {
  const { LX, LY } = state.grid;
  return effects.find((effect) => {
    if (effect.type !== type) return false;
    const v = displacementVec(pos, effect.pos, LX, LY, state.grid.wrap);
    return Math.hypot(v[0], v[1]) <= effect.radius;
  });
}

function pulseToolEffect(
  state: SimState,
  effect: ToolEffect,
  archetypes: Map<CellId, EnemySpawn>,
): void {
  const { LX, LY } = state.grid;
  for (const [id, cell] of state.cells) {
    if (cell.vol <= 0) continue;
    const v = displacementVec(cell.center, effect.pos, LX, LY, state.grid.wrap);
    const dist = Math.hypot(v[0], v[1]);
    if (dist > effect.radius) continue;
    const strength = 1 - dist / effect.radius;
    if (effect.type === 'hatch') {
      cell.targetVol = clamp(cell.targetVol + 10 * strength, 12, 2400);
    } else if (effect.type === 'mutation') {
      cell.targetVol = clamp(cell.targetVol + 4 * strength, 12, 2400);
    } else if (effect.type === 'nutrient') {
      cell.targetVol = clamp(cell.targetVol + NUTRIENT_PULSE_GROWTH * strength, 25, 2200);
    } else if (effect.type === 'water') {
      cell.targetVol = clamp(cell.targetVol + WATER_PULSE_GROWTH * strength, 25, 2200);
    } else if (effect.type === 'conduit') {
      cell.targetVol = clamp(cell.targetVol + WATER_PULSE_GROWTH * 1.25 * strength, 25, 2400);
    } else if (effect.type === 'bloom') {
      cell.targetVol = clamp(cell.targetVol + NUTRIENT_PULSE_GROWTH * 1.35 * strength, 25, 2400);
    } else if (effect.type === 'flare') {
      const toxinMultiplier = toxinMultiplierForCell(archetypes, id);
      cell.targetVol = clamp(cell.targetVol - ACID_PULSE_DAMAGE * 1.35 * strength * toxinMultiplier, 12, 2400);
    } else if (effect.type === 'crystal') {
      cell.targetVol = clamp(cell.targetVol - SALT_PULSE_DAMAGE * 0.7 * strength, 12, 2400);
    } else {
      const toxinMultiplier = toxinMultiplierForCell(archetypes, id);
      const damage =
        effect.type === 'acid' || effect.type === 'lysis' || effect.type === 'fold_fault' ? ACID_PULSE_DAMAGE :
        effect.type === 'salt' || effect.type === 'brine' ? SALT_PULSE_DAMAGE :
        TOXIN_PULSE_DAMAGE;
      cell.targetVol = clamp(cell.targetVol - damage * strength * toxinMultiplier, 12, 2200);
    }
  }
  if (effect.type === 'toxin' || effect.type === 'acid' || effect.type === 'lysis' || effect.type === 'flare') {
    erodePixels(state, effect, effect.type === 'acid' ? 6 : effect.type === 'lysis' || effect.type === 'flare' ? 150 : 68, archetypes);
  }
}

function erodePixels(
  state: SimState,
  effect: ToolEffect,
  maxPixels: number,
  archetypes: Map<CellId, EnemySpawn>,
): void {
  const { grid } = state;
  const cx = Math.round(effect.pos[0]);
  const cy = Math.round(effect.pos[1]);
  const r = Math.ceil(effect.radius);
  let removed = 0;
  for (let dx = -r; dx <= r && removed < maxPixels; dx++) {
    for (let dy = -r; dy <= r && removed < maxPixels; dy++) {
      const dist = Math.hypot(dx, dy);
      if (dist > effect.radius) continue;
      let x = cx + dx;
      let y = cy + dy;
      if (grid.wrap) {
        x = ((x % grid.LX) + grid.LX) % grid.LX;
        y = ((y % grid.LY) + grid.LY) % grid.LY;
      } else if (x < 0 || x >= grid.LX || y < 0 || y >= grid.LY) {
        continue;
      }
      const id = getCell(grid, x, y);
      if (id === 0) continue;
      const strength = 1 - dist / effect.radius;
      const cell = state.cells.get(id);
      if (!cell || cell.vol <= 0) continue;
      const toxinMultiplier = toxinMultiplierForCell(archetypes, id);
      if (state.rng.random() > strength * 0.9 * toxinMultiplier) continue;
      setCell(grid, x, y, 0);
      removePixel(cell, x, y, grid.LX, grid.LY, grid.wrap);
      updateBoundaryAround(grid, x, y);
      removed += 1;
    }
  }
}

function applyToolEffects(
  state: SimState,
  effects: ToolEffect[],
  archetypes: Map<CellId, EnemySpawn>,
): void {
  if (effects.length === 0) return;
  const { LX, LY } = state.grid;
  for (const [id, cell] of state.cells) {
    if (cell.vol <= 0) continue;
    let vx = 0;
    let vy = 0;
    let speedBoost = 0;
    for (const effect of effects) {
      const v = displacementVec(cell.center, effect.pos, LX, LY, state.grid.wrap);
      const dist = Math.hypot(v[0], v[1]);
      if (dist > effect.radius) continue;
      const strength = (1 - dist / effect.radius) * (effect.ttl / effect.maxTtl);
      // Accumulate reagent energy shifts (strength-weighted by distance and TTL)
      const reagentShift = getReagentShift(effect.type);
      if (cell.energyShifts) {
        cell.energyShifts.isingShift += reagentShift.isingShift * strength;
        cell.energyShifts.volShift += reagentShift.volShift * strength;
        cell.energyShifts.movShift += reagentShift.movShift * strength;
      }
      const dirX = dist > 0 ? v[0] / dist : 0;
      const dirY = dist > 0 ? v[1] / dist : 0;
      if (effect.type === 'hatch') {
        speedBoost += 1.4 * strength;
      } else if (effect.type === 'mutation') {
        speedBoost += 2.2 * strength;
      } else if (effect.type === 'nutrient' || effect.type === 'bloom') {
        vx += dirX * strength;
        vy += dirY * strength;
        speedBoost += (effect.type === 'bloom' ? NUTRIENT_PULL_SPEED * 1.4 : NUTRIENT_PULL_SPEED) * strength;
        cell.targetVol = clamp(
          cell.targetVol + (effect.type === 'bloom' ? BLOOM_GROWTH_PER_TICK : NUTRIENT_GROWTH_PER_TICK) * strength,
          25,
          2400,
        );
      } else if (effect.type === 'water') {
        vx -= dirX * strength;
        vy -= dirY * strength;
        speedBoost += WATER_SPREAD_SPEED * strength;
        cell.targetVol = clamp(cell.targetVol + WATER_GROWTH_PER_TICK * strength, 25, 2200);
      } else if (effect.type === 'conduit') {
        vx += dirX * strength * 0.4;
        vy += dirY * strength * 0.4;
        speedBoost += WATER_SPREAD_SPEED * 0.75 * strength;
        cell.targetVol = clamp(cell.targetVol + WATER_GROWTH_PER_TICK * 1.6 * strength, 25, 2400);
      } else if (effect.type === 'salt' || effect.type === 'brine' || effect.type === 'crystal') {
        cell.intent.speed = Math.min(cell.intent.speed, effect.type === 'crystal' ? 2.2 : effect.type === 'brine' ? 2.4 : SALT_MAX_SPEED);
        if (effect.type === 'crystal') speedBoost = Math.min(speedBoost, 2.2);
        cell.targetVol = clamp(
          cell.targetVol - (effect.type === 'crystal' ? SALT_SHRINK_PER_TICK * 0.55 : effect.type === 'brine' ? BRINE_SHRINK_PER_TICK : SALT_SHRINK_PER_TICK) * strength,
          12,
          2200,
        );
      } else {
        const toxinMultiplier = toxinMultiplierForCell(archetypes, id);
        vx -= dirX * strength;
        vy -= dirY * strength;
        const flee = effect.type === 'acid' || effect.type === 'lysis' || effect.type === 'foam' || effect.type === 'flare' || effect.type === 'fold_fault'
          ? ACID_FLEE_SPEED
          : TOXIN_FLEE_SPEED;
        speedBoost += flee * strength * toxinMultiplier;
        const shrink = effect.type === 'acid' || effect.type === 'lysis' || effect.type === 'foam' || effect.type === 'flare' || effect.type === 'fold_fault'
          ? ACID_SHRINK_PER_TICK
          : TOXIN_SHRINK_PER_TICK;
        cell.targetVol = clamp(cell.targetVol - shrink * strength * toxinMultiplier, 12, 2200);
      }
    }
    const len = Math.hypot(vx, vy);
    if (len > 0) {
      cell.intent.vec = [vx / len, vy / len];
      cell.intent.speed = Math.max(cell.intent.speed, speedBoost);
      if (cell.intent.engulfMultiplier <= 1) cell.intent.engulfMultiplier = 1;
    } else if (speedBoost > 0) {
      cell.intent.speed = Math.max(cell.intent.speed, speedBoost);
    }
  }
}

function toxinMultiplierForCell(archetypes: Map<CellId, EnemySpawn>, id: CellId): number {
  const spawn = archetypes.get(id);
  if (!spawn) return 1;
  return (spawn.traits ?? []).reduce((multiplier, trait) => (
    multiplier * MUTATION_TRAITS[trait].toxinMultiplier
  ), 1);
}

function applyAgitation(state: SimState, intensity: number): void {
  const speed = AGITATION_MIN_SPEED + AGITATION_EXTRA_SPEED * clamp(intensity, 0, 1);
  for (const [, cell] of state.cells) {
    if (cell.vol <= 0) continue;
    const angle = state.rng.random() * Math.PI * 2;
    cell.intent.vec = [Math.cos(angle), Math.sin(angle)];
    cell.intent.speed = Math.max(cell.intent.speed, speed);
    if (cell.intent.engulfMultiplier <= 1) cell.intent.engulfMultiplier = 1;
  }
}

function activateCrisis(
  arena: Arena,
  state: SimState,
  archetypes: Map<CellId, EnemySpawn>,
): { id: CrisisId; births: number } {
  const ids = Object.keys(CRISES) as CrisisId[];
  const id = ids[state.rng.randInt(ids.length)] ?? 'heat_spike';
  let births = 0;
  if (id === 'contamination_bloom' && archetypes.size < ECOSYSTEM_MAX_POPULATION) {
    arena.spawnEnemy({
      spawn: {
        ...ARCHETYPE_DEFAULTS.swarmlet,
        traits: ['fleet'],
        instability: (ARCHETYPE_DEFAULTS.swarmlet.instability ?? 1) * 1.25,
      },
      pos: [
        state.rng.randInt(state.grid.LX),
        state.rng.randInt(state.grid.LY),
      ],
    });
    births += 1;
  }
  return { id, births };
}

function applyCrisisEffects(state: SimState, id: CrisisId): void {
  if (id === 'heat_spike') {
    for (const [, cell] of state.cells) {
      if (cell.vol <= 0) continue;
      cell.intent.speed = Math.max(cell.intent.speed, 14);
    }
    return;
  }

  if (id === 'oxygen_crash') {
    for (const [, cell] of state.cells) {
      if (cell.vol <= 0 || cell.targetVol < 220) continue;
      cell.targetVol = clamp(cell.targetVol - 0.18, 45, 2200);
    }
  }
}

function resupplyLab(toolStates: Record<LabTool, ToolState>, objective: ObjectiveDef): number {
  const preference: LabTool[] = objective.kind === 'preserve_grazers' || objective.kind === 'breed_archetype'
    ? ['water', 'nutrient', 'egg', 'salt', 'acid', 'toxin']
    : objective.kind === 'controlled_reaction'
      ? ['water', 'nutrient', 'acid', 'toxin', 'salt', 'egg']
      : objective.kind === 'dominant_archetype'
        ? ['egg', 'nutrient', 'water', 'salt', 'acid', 'toxin']
      : ['egg', 'water', 'salt', 'acid', 'toxin', 'nutrient'];
  const refill = preference.find((tool) => toolStates[tool].charges < toolStates[tool].maxCharges);
  if (!refill) return 0;
  toolStates[refill].charges += 1;
  return 1;
}

function refillEggIfQuiet(toolStates: Record<LabTool, ToolState>, state: SimState): number {
  if (toolStates.egg.charges > 0 || toolStates.egg.maxCharges <= 0) return 0;
  const livingEnemies = Array.from(state.cells)
    .filter(([id, cell]) => id !== PLAYER_ID && cell.vol > 0).length;
  if (livingEnemies >= QUIET_EGG_REFILL_POPULATION) return 0;
  toolStates.egg.charges = 1;
  return 1;
}

function reseedEcology(
  arena: Arena,
  state: SimState,
  archetypes: Map<CellId, EnemySpawn>,
): number {
  const living = Array.from(state.cells)
    .filter(([id, cell]) => id !== PLAYER_ID && cell.vol > 0)
    .sort((a, b) => b[1].vol - a[1].vol);
  if (living.length >= ECOSYSTEM_MIN_POPULATION || archetypes.size >= ECOSYSTEM_MAX_POPULATION) return 0;

  const parentEntry = living[0];
  const parentSpawn = parentEntry ? archetypes.get(parentEntry[0]) : undefined;
  const spawn = parentSpawn
    ? budSpawn(parentSpawn, state.rng.random())
    : { ...ARCHETYPE_DEFAULTS.swarmlet };
  const parent = parentEntry?.[1];
  const pos: [number, number] = parent
    ? [
        parent.center[0] + state.rng.randInt(17) - 8,
        parent.center[1] + state.rng.randInt(17) - 8,
      ]
    : [
        state.rng.randInt(state.grid.LX),
        state.rng.randInt(state.grid.LY),
      ];
  arena.spawnEnemy({ spawn, pos });
  return 1;
}

function budSpawn(parent: EnemySpawn, roll: number): EnemySpawn {
  const archetype = roll < 0.15 ? 'swarmlet' : parent.archetype;
  const base = archetype === parent.archetype ? parent : ARCHETYPE_DEFAULTS.swarmlet;
  return {
    ...base,
    targetVol: clamp(base.targetVol * 0.42, 55, 500),
    speed: clamp(base.speed * 1.08, 4, 16),
    engulfMultiplier: clamp(base.engulfMultiplier * 0.92, 1, 8),
    instability: (base.instability ?? 1) * 1.18,
    traits: base.traits?.slice(-2),
  };
}

function eggSpawnFor(archetype: EnemyArchetype, roll: number): EnemySpawn {
  const base = ARCHETYPE_DEFAULTS[archetype];
  const spawn = budSpawn(base, 1);
  const sizeJitter = 0.9 + roll * 0.25;
  spawn.archetype = archetype;
  spawn.targetVol = clamp(spawn.targetVol * sizeJitter, 55, 620);
  spawn.instability = Math.max(spawn.instability ?? 1, (base.instability ?? 1) * 1.15);
  return spawn;
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

function capitalize(s: string): string {
  return s.length === 0 ? s : `${s[0]!.toUpperCase()}${s.slice(1)}`;
}
