# Cellular Death Match — V1 Design Spec

> Current-status note, 2026-05-25: this is a historical design spec for the original 8-fight keyboard shooter direction. The current app has shifted to a mobile-first Petri dish ecosystem game with selectable egg strains, nutrient/toxin tools, five objective epochs, and responsive phone/desktop layouts. For current project state, see `README.md`, `AGENTS.md`, `CLAUDE.md`, `cloud.md`, and `docs/current-state.md`.

**Date:** 2026-05-04
**Status:** Historical draft, superseded by current ecosystem direction
**Author:** Johnny + Claude (brainstorming session)

---

## 1. Concept

**Cellular Death Match** is a browser-based single-player roguelike built on the cellular Potts model (CPM). The player controls a single squishy blob-cell in an arena. Across 8 successive fights, they face increasingly nasty AI cells — bruisers, snipers, splitters, swarms, mirrors, and a final boss. The three player verbs are *move*, *shoot* (volume-cost bullets), and *engulf* (hold a key to absorb adjacent enemy pixels). Between fights, the player picks 1 of 3 upgrades from a pool of ~35 (mostly stat tweaks, some rare wildcards that mutate behavior). A run takes ~10–15 minutes.

The fantasy: start as a small cell, end as a misshapen apex predator that visually carries the scars of its build.

The sim is a port of [james-simon/cell-fight](https://github.com/james-simon/cell-fight) from Python/pygame to TypeScript/Canvas2D, with the game layer (run, upgrades, AI, juice) built fresh on top.

## 2. Scope

### V1 ships (polished playable)
- 8-fight linear gauntlet with final boss
- 5–6 enemy archetypes (Mirror is the scope lever — droppable)
- 35 upgrades (25 common, 10 rare) — all data-driven via hook system
- Engulf mechanic with full risk/reward design (Section 5)
- Title screen, in-fight HUD, upgrade-pick screen, run-end summary
- ~10 SFX, 2 music loops, particle/screenshake juice layer
- Visual identity: black bg, saturated cells, vignette, monospace font
- Deploys as static site to itch.io / GitHub Pages / Vercel

### V1 explicitly does NOT include
- Multiplayer (online or local)
- Mobile / touch controls
- Save/load mid-run
- Meta-progression / unlocks across runs
- Leaderboards, accounts, analytics
- Localization
- Controller support
- Re-rolls on upgrade picks

### Future (post-V1) — architecture must accommodate
- **Card/deck meta-layer.** Picked upgrades become cards; cards form a deck; meta-progression unlocks new cards across runs; possibly in-fight active card play. Constraints this puts on V1:
  - Upgrades are pure JSON-shaped data with stable IDs (already required for V1).
  - Run state stores `UpgradeRef[]` (ordered list) — does not flatten upgrades into stats.
  - Hook signature includes `onActivate` slot (unused in V1, reserved).
  - Run state is JSON-serializable from day one.
- **Species system** (start-of-run class pick, e.g. Predator / Swarmer / Parasite). A species is just a bundle of upgrades applied at run start — no engine refactor needed if upgrade system is data-driven.
- Environmental arena modifiers (toxic walls, shrinking arena, gravity wells, etc.).
- Meta-progression unlocks (new upgrades, starting traits).
- Mobile-friendly controls.

## 3. Architecture

### 3.1 Module layout

```
src/
├── sim/          # pure CPM physics. Knows nothing about runs/upgrades/UI.
│   ├── grid.ts           # LX×LY pixel grid + boundary tracking
│   ├── cell.ts           # per-cell state
│   ├── monte-carlo.ts    # one MC step
│   ├── bullets.ts        # bullet step + collision
│   └── sim.ts            # façade: tick(state, dt)
│
├── game/         # game on top of sim
│   ├── input.ts          # keyboard → intent
│   ├── player.ts         # player cell wrapper
│   ├── enemies/          # one file per archetype
│   ├── arena.ts          # single fight: spawn, run, win/loss
│   └── run.ts            # run state: fight #, upgrades, player carryover
│
├── content/      # pure data, no logic
│   ├── upgrades.ts       # 35 upgrade defs
│   ├── enemies.ts        # archetype tuning + fight schedule
│   └── balance.ts        # global numbers
│
├── ui/           # HTML/CSS overlays + canvas HUD
│   ├── menu.ts           # title, run-end, upgrade-pick
│   ├── hud.ts            # in-fight overlay
│   └── render.ts         # sim → ImageData → canvas + juice
│
├── audio/
│   └── audio.ts          # load, play, mix
│
└── main.ts       # state machine: title → arena → pick → ... → end
```

### 3.2 Boundary rules

- `sim/` has no concept of "player" or "upgrade." Cells have intent vectors set externally; the sim does not care whether intent comes from keyboard or AI.
- `content/` is the only place runtime numbers live. Rebalancing = one file, no code changes.
- `render.ts` reads sim state, never writes it.
- Upgrades are *data*, not code. The sim/game emits events; upgrade hooks subscribe.

### 3.3 Event stream

The sim emits events into a per-tick array, consumed by upgrade hooks and the juice/audio layers:

```ts
type SimEvent =
  | { type: 'pixelAbsorbed'; absorberId: CellId; victimId: CellId; pos: [number, number] }
  | { type: 'bulletFired';   ownerId: CellId; bullet: Bullet }
  | { type: 'bulletHit';     bullet: Bullet; victimId: CellId; pos: [number, number] }
  | { type: 'cellDied';      id: CellId; lastCenter: [number, number] };
```

This is the seam that makes "engulfed pixels heal you" or "particles on absorb" implementable as data, not as scattered if-statements.

## 4. Sim Layer

Port of the Python CPM sim, restructured for clarity. The original `cell_MC_step` is a 70-line god function; we'll break it into ~5–15 line helpers.

### 4.1 Data shapes

```ts
type CellId = number;  // 0 = empty; 1..N = cells

interface Grid {
  LX: number;
  LY: number;
  cells: Uint8Array;          // length LX*LY
  boundary: Set<number>;      // pixel indices on a cell boundary
  wrap: boolean;
}

interface Cell {
  id: CellId;
  vol: number;
  targetVol: number;
  center: [number, number];
  centerSum: [Complex, Complex];   // running sum for incremental center
  intent: {
    vec: [number, number];          // normalized desired direction
    speed: number;                  // multiplier
    engulfMultiplier: number;       // 1.0 normal, >1 while engulf held
    shooting: boolean;
  };
}

interface Bullet {
  pos: [number, number];
  v: [number, number];
  ownerId: CellId;
  size: number;
  age: number;
  wraps: number;
}

interface SimState {
  grid: Grid;
  cells: Map<CellId, Cell>;
  bullets: Bullet[];
  betaIsing: number;
  betaVol: number;
  betaMov: number;
  events: SimEvent[];   // cleared at the start of each tick
  rng: Rng;             // seeded for determinism
}
```

### 4.2 MC step (pseudo)

```
mcStep(state):
  (xS, yS) = pickRandomBoundaryPixel(state.grid, state.rng)
  (xT, yT, dir) = randomNeighbor(xS, yS, state.grid, state.rng)
  if grid[S] == grid[T]: return
  dH = isingTerm(state, S, T)
     + volumeTerm(state, S, T)
     + movementTerm(state, S, T, dir)
     + engulfTerm(state, S, T)        // NEW vs original — see Section 5
  if state.rng.random() > exp(-dH): return
  applyPixelTransfer(state, S, T)     // grid + vol + center + boundary + emit event
  applyMetabolism(state, sourceCell, targetCell)
```

### 4.3 Tick loop

```
tick(state):
  state.events.length = 0
  for _ in MC_STEPS_PER_FRAME:    // ~1000, like original
    mcStep(state)
  stepBullets(state)              // emit bulletHit events
  // cellDied events emitted by step that drops a cell to vol 0
```

### 4.4 Performance

- Grid is `Uint8Array` (one byte per pixel, supports up to 255 cells — ample).
- Boundary tracked incrementally on each pixel transfer.
- Center-of-mass tracked via complex circular-mean running sum (matches original Python; correct under wraparound).
- Renderer writes one `ImageData` buffer per frame, single `putImageData` + `drawImage` to scale up.
- Target: 60fps on a 2020 laptop with 100×100 grid + 1000 MC steps/frame.

## 5. Engulf Mechanic

The signature verb. Defines combat feel.

### 5.1 Behavior

- **Without engulf:** when two cells touch, normal CPM volume-preservation + Ising terms cause slow, organic, near-bidirectional pixel transfer.
- **With engulf held:** an `engulfTerm` is added to the MC step's `dH` for any pixel transfer that flows *toward* the player from a touching enemy cell. This makes those flips much more likely to accept. Net effect: ~5–10× passive absorption rate.

### 5.2 Counter-mechanics (the design that makes engulf a real choice)

1. **Volume cost while engulfing.** `targetVol` decays at ~1px/sec while engulf is held. Hold forever and you starve.
2. **Range = 1 pixel.** Must be touching. Touching = in bullet range. Engulf is positional.
3. **Shooting disabled while engulfing.** "Mouth occupied." This is the lever that trades engulf vs ranged play.
4. **Some enemies counter engulf:**
   - Snipers maintain distance — no contact = no engulf.
   - Splitters spawn 2 cells when killed — engulfing a low-vol Splitter punishes you.
   - Bruisers are the engulf food, but they engulf back — matchup is a race.

### 5.3 Surfacing in upgrades

- Common: `+1 engulf range`, `engulf doesn't disable shooting`, `engulfed pixels heal targetVol`, `engulf is faster vs cells smaller than you`.
- Rare: `engulfing instakills below 25% vol`, `engulfed enemies leave a poison field`, `your bullets engulf on contact`.

### 5.4 Implementation

The sim doesn't know "engulf" by name — it sees `cell.intent.engulfMultiplier`. The player module sets it to 1.0 normally, ~5.0 while held. The `engulfTerm` in `monte-carlo.ts` reads this multiplier and biases pixel-transfer dH accordingly. One parameter, one term, falls out cleanly.

### 5.5 Feel goals

When engulfing a Bruiser, the player should *see* the cell expand as pixels flow in. The CPM gives this for free. We add: low rumbling absorb sound rising in pitch with absorb rate; particle blip per absorbed pixel; faint pulsing ring around player center while engulf is held.

## 6. Run Loop & State Machine

### 6.1 States

```
TITLE → ARENA(0) → UPGRADE_PICK → ARENA(1) → UPGRADE_PICK → ... → ARENA(7=BOSS) → RUN_END → TITLE
                                                                       │
                                                                       └── (loss at any point) → RUN_END(loss)
```

### 6.2 Run state

```ts
interface RunState {
  fightIndex: number;            // 0..7
  upgrades: UpgradeRef[];        // ordered, last picked last
  player: {
    targetVol: number;           // carries between fights
  };
  seed: number;                  // run seed for deterministic upgrade rolls
  startedAt: number;
}

interface UpgradeRef {
  id: string;
  stacks: number;                // for stackable upgrades
}
```

### 6.3 Per-fight flow

- Enemies spawn per `content/enemies.ts` schedule (Section 7).
- Player and enemies placed at fixed start positions (circle pattern, like original).
- Sim ticks at 60Hz.
- **Win:** all enemy cells have `vol === 0`. Freeze sim ~1s, victory sound, fade to UPGRADE_PICK.
- **Loss:** player cell has `vol === 0`. Freeze, fade to RUN_END(loss).
- Player current `vol` resets to `targetVol` at start of each fight (full heal between rooms — standard roguelike pattern).

### 6.4 Upgrade pick

- 3 upgrades drawn from pool, rarity-weighted by fight index.
- No duplicates within a single pick.
- No re-rolls in V1.
- Picking writes to `run.upgrades`, returns to ARENA.

### 6.5 Run end

- Win: "You Won" + build summary (upgrades in pick order). Click → TITLE.
- Loss: "Defeated on Fight N" + build summary. Click → TITLE.
- Share-image button: V1 = upgrade list as text. Image generation = stretch goal.

### 6.6 Persistence

**None in V1.** Run state is in-memory; closing the tab ends the run. Justified: 10–15 min runs, single-sitting completion. Persistence belongs to the meta/card layer.

## 7. Enemy Roster

| # | Archetype | Behavior | Stats vs base | First fight |
|---|-----------|----------|---------------|-------------|
| 1 | Bruiser | Seeks player. Shoots rarely. Wants to engulf on contact. | +50% targetVol, –20% speed, +30% engulf rate | 1 |
| 2 | Sniper | Maintains distance. Shoots often, leads target. Flees if engulf range. | –20% targetVol, +20% speed, +50% bullet size, –30% bullet cost | 2 |
| 3 | Splitter | Bruiser-like. On death, spawns 2 swarmlets (40% targetVol each, dumb seek-player AI). | Base stats | 3 |
| 4 | Swarm | Fight = 4–6 small dumb cells (seek + occasional fire). | –60% targetVol, +20% speed, normal weapons | 4 |
| 5 | Mirror | Copies (a subset of) player's accumulated upgrades at fight start. Same toolkit as player. | Mirrors player stats | 6 |
| 6 | Boss | Multi-phase: P1 = bruiser-like; P2 (50% vol) = splits into 3 medium cells (mixed archetypes); P3 (any reaches 25%) = all turn sniper, arena gains shrinking boundary. | 3× targetVol, custom AI per phase | 8 only |

### 7.1 Fight schedule

```
Fight 1: 1× Bruiser (small)
Fight 2: 1× Sniper
Fight 3: 1× Bruiser + 1× Sniper
Fight 4: 1× Splitter
Fight 5: 1× Swarm (4 small)
Fight 6: 1× Mirror
Fight 7: 1× Splitter + 1× Sniper (elite, +20% stats)
Fight 8: Boss (alone)
```

Each fight teaches one new dynamic, then mixes them, then climaxes. Per-fight escalation also via stat scaling within `content/enemies.ts` (each archetype has fight-index-aware stats).

### 7.2 Scope lever

**Mirror is droppable.** It's the most complex archetype — projecting player upgrades onto an enemy cell requires upgrade hooks to be enemy-aware. If timeline tightens, replace Fight 6 with `1× elite Splitter + 1× elite Sniper` and ship the simpler 5-archetype roster.

## 8. Upgrade System

### 8.1 Definition

```ts
interface UpgradeDef {
  id: string;                       // stable, e.g. 'bullet_size_1'
  name: string;
  description: string;
  rarity: 'common' | 'rare';
  minFight?: number;                // earliest appearance (rares often >= 4)
  maxStacks?: number;               // default 1
  tags?: string[];                  // 'offense' | 'defense' | 'engulf' | ...

  modifiers?: Partial<{             // applied at fight start, additive across stacks
    targetVol: number;
    speed: number;
    bulletSize: number;
    bulletCost: number;
    bulletSpeed: number;
    engulfMultiplier: number;
    engulfRange: number;
    regenPerSec: number;
  }>;

  onShoot?:      (ctx: ShootCtx)    => void;
  onAbsorb?:     (ctx: AbsorbCtx)   => void;
  onBulletHit?:  (ctx: HitCtx)      => void;
  onTick?:       (ctx: TickCtx)     => void;
  onActivate?:   (ctx: ActivateCtx) => void;   // unused in V1; reserved for card layer
}
```

### 8.2 Hook contract

Hooks receive a context object: `{ player, sim, events, run }` plus call-specific data. Hooks mutate via the event system (`events.push({ type: 'spawnBullet', ... })`) rather than reaching into sim internals. This keeps upgrades from corrupting sim state and makes them unit-testable.

### 8.3 Stacking

`maxStacks: N` means the upgrade can appear in the pool up to N times in one run. Modifiers add additively. Hooks fire once per stack.

### 8.4 V1 pool — 25 commons + 10 rares = 35 total

**Commons (modifier-driven, stat tweaks):**
1. Bigger Bullets — +25% bulletSize, max 3 stacks
2. Faster Bullets — +30% bulletSpeed, max 2
3. Cheaper Bullets — −20% bulletCost, max 2
4. Bigger Cell — +50 targetVol, max 3
5. Faster Movement — +15% speed, max 2
6. Faster Engulf — +20% engulfMultiplier, max 3
7. Longer Engulf Range — +1 engulfRange, max 2
8. Slow Regen — +0.5 regenPerSec, max 3
9. Bullet Pierces One — bullets penetrate one cell before despawning, max 1
10. Start Heavier — start each fight with +30 vol over targetVol, max 2
11. Extra Bullet — onShoot fires +1 bullet at slight angle, max 2
12. Tougher Boundary — −20% incoming bullet damage, max 2
13. Sticky Engulf — engulf disables shooting penalty halved, max 1
14. Quick Reflexes — −15% MC step rejection on player movement, max 2
15. Echolocate — current enemy positions visible as faint trail, max 1
16. Adrenal Boost — at <50% vol, +10% speed and engulf, max 2
17. Patient Hunter — bullets do +25% damage if target is outside engulf range, max 2
18. Glutton — engulfed pixels increase targetVol by 0.05 each, max 2
19. Lean Build — −15% targetVol cost on bullets, max 2
20. Hardshell — first hit per fight does 0 damage, max 1
21. Bullet Spread — onShoot, bullets fire in a 15° arc when stacked, max 2
22. Memory Bullets — bullets remember last firing direction (drift toward it), max 1
23. Volume Burst — first kill in fight grants +20 vol, max 2
24. Caffeine — +10% to all sim parameters (movement, engulf, fire rate), max 1
25. Slow Metabolism — −50% targetVol decay while engulfing, max 2

**Rares (hook-driven, behavioral):**
26. Photosynthesis — regenPerSec scales with current vol/targetVol ratio
27. Vampirism — engulfed pixels heal you 2× normal
28. Mitosis — at 25% vol, split into 2 (one is you, one temporary ally for 10s)
29. Volatile — kills leave 3-pixel poison zone for 5s
30. Homing — bullets curve gently toward nearest enemy
31. Ring Burst — every 8s, fire 8 bullets in a ring
32. Carnivore Reflex — dropping below 30% vol grants +50% engulf for 5s
33. Shrapnel — bullets that hit spawn 3 tiny perpendicular bullets
34. Necrotic Touch — engulfing permanently reduces victim's max engulf rate
35. Adrenaline — getting hit grants +30% speed for 3s, stacks up to 5

### 8.5 Rarity weighting

| Fight | Common | Rare |
|-------|--------|------|
| 1–3   | 100%   | 0%   |
| 4–5   | 80%    | 20%  |
| 6–7   | 60%    | 40%  |

Fight 8 is the boss — no upgrade pick after, since the game ends.

Each pick offers 3 distinct upgrades (no duplicates within a single pick). If a stackable upgrade is already at max stacks, it's excluded from the draw.

### 8.6 Card-layer compatibility

- Every upgrade is JSON-shaped data with stable `id`.
- A future `CardSheath = { upgradeId, art, flavor, deckRules }` wraps the upgrade.
- A future deck system stores `UpgradeRef[]` (already V1's run shape).
- Active abilities use the reserved `onActivate` hook (V1 includes the slot in the type definition).

Zero refactor to sim/game layers when card layer is added.

## 9. Rendering & Juice

### 9.1 Layers (drawn in order each frame)

**Layer 1 — Grid.** One `ImageData` buffer (LX × LY × 4 bytes). Each frame: walk grid, write RGBA per pixel based on `cells[idx]` color. Boundary pixels lighten 30%. Bullet-occupied pixels lighten 60% in bullet-owner color. `putImageData` + scaled `drawImage` to display canvas (5× → 500×500). One blit. The only render hot path.

**Layer 2 — Particles + bullets.** Bullets: small bright `arc()` (1–3px). Particles: spawned from sim events. `pixelAbsorbed` → 1 short-lived particle drifting to absorber center. `cellDied` → ~30 particle burst. `bulletHit` → 3–5 particles. Particle cap: 500 (drop oldest). Particles are not sim state; they live in the renderer.

**Layer 3 — Screen effects.**
- Screenshake on `bulletHit` against player, `cellDied`, `engulfStart`. Magnitude scaled to severity. Translation applied before draw.
- Hit flash on player damage: white overlay 20% alpha, fades over 100ms.
- Engulf indicator: faint pulsing ring around player center while engulf held.
- Slow-mo: only in final fight. ~300ms half-speed sim time on boss phase transitions and final kill. Implemented as halved `MC_STEPS_PER_FRAME` for that window.

### 9.2 HUD (HTML/CSS, not canvas)

- Top-left: volume bar + numeric vol/targetVol.
- Top-center: "Fight 3 / 8" + enemy archetype name(s).
- Top-right: upgrade icon list (V1 = text initials with hover tooltip).
- Bottom-center: control hints, fade out after ~5s.

Why HTML/CSS: text rendering is easier; layouts via CSS are cheaper to iterate; HUD doesn't need 60fps redraws.

### 9.3 Visual identity

- Black background, saturated cell colors, white-flash highlights. Microscope-at-high-contrast aesthetic.
- Subtle CRT vignette (radial gradient overlay). Toggleable.
- Faint moving "noise" pixels in background (dead matter drifting). Decorative.
- One web font: monospace (Berkeley Mono / JetBrains Mono / IBM Plex Mono via Google Fonts).

### 9.4 Audio

10 SFX: shoot, bullet hit, pixel absorb (rate-limited), engulf-start, engulf-loop, cell die, fight start, fight win, upgrade pick, run end.
2 music loops: arena (tense, low) and menu (ambient).
Source: kenney.nl free assets or sfxr/jsfxr-generated. No custom audio for V1.

## 10. Tech Stack & Project Setup

### 10.1 Dependencies

Runtime: **none.**
Dev: **Vite 5+, TypeScript 5+, Vitest 2+.**

```json
{
  "devDependencies": {
    "typescript": "^5",
    "vite": "^5",
    "vitest": "^2"
  }
}
```

No React. No game framework. No state library. No animation library.

### 10.2 Project layout

```
cellular-death-match/
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── public/
│   ├── audio/
│   └── favicon.svg
├── src/
│   ├── sim/
│   ├── game/
│   ├── content/
│   ├── ui/
│   ├── audio/
│   ├── main.ts
│   └── styles.css
├── tests/
│   ├── sim/
│   ├── game/
│   └── content/
└── docs/superpowers/specs/
```

### 10.3 Coding conventions

- Strict TS: `"strict": true`, `"noUncheckedIndexedAccess": true`.
- Pure functions where possible. `SimState` mutated in place inside `sim/` only (perf).
- No classes unless state + behavior genuinely cohabit. Most modules: functions over data.
- Named exports only. No default exports. No barrel `index.ts` files.
- Files target ~150 lines; split if >250.

### 10.4 Testing strategy

- **Sim tests:** seeded RNG. "Given grid X, after MC step with seed Y, grid is Z." Catches port-from-Python bugs cheaply.
- **Upgrade tests:** every upgrade has at least one test asserting its hook fires and produces documented effect. Stops upgrades silently breaking on sim changes.
- **Run state tests:** transitions, save/load round-trips (future-proofs card layer).
- **No render or e2e tests.** Manual QA covers the rest.

### 10.5 Performance budget

- 60fps on 2020+ laptop. 30fps acceptable on 2018 mid-range.
- Bundle <500KB gzipped (well under with vanilla TS).
- Cold load to playable: <2s on broadband.

### 10.6 Browser target

Modern evergreen only — Chrome / Firefox / Safari last 2 versions. ES2020+ output.

### 10.7 Deployment

`vite build` → static `dist/`. Targets: itch.io (zip upload), GitHub Pages (Action), Vercel/Netlify (free tier). All work with same output.

## 11. Build Order

Eight milestones, each independently verifiable. Each milestone leaves the game in a playable state.

| M | Goal | Estimate (evenings) | Verify |
|---|------|---------------------|--------|
| 1 | Sim port skeleton — Vite scaffolded, types in place, one MC step, Layer 1 renderer, two static cells. | 1–2 | See two colored blobs sitting still at 60fps. |
| 2 | Movement + bullets — keyboard intent, bullets fire on space, movement-energy term works. | 1–2 | Drive cell, shoot, chip pixels off static cell. |
| 3 | Engulf + first AI — engulf term in MC step, Bruiser AI, win/loss detection. | 2–3 | Fight a bruiser end-to-end (no menus). |
| 4 | Run loop + state machine — TITLE → ARENA → PICK → ... → END, stub upgrades, stub HUD. | 2 | Complete a 3-fight stub run. |
| 5 | Enemy roster — Sniper, Splitter, Swarm, Mirror, Boss. Fight schedule data. | 3–4 | Play full 8-fight gauntlet with stub upgrades. |
| 6 | Upgrade pool — hook system wired, 25 commons + 10 rares, pick UI, rarity weighting. | 3–5 | 3 different runs with noticeably different builds. |
| 7 | Polish & juice — particles, screenshake, hit flash, engulf indicator, all SFX, 2 music loops, title + run-end screens, visual identity pass. | 4–6 | Play full run. Does it *feel* good? |
| 8 | Ship — final balance pass, build, deploy to itch. | 1+ | Friend plays, note 3 small fixes. |

**Total: ~17–25 evenings (~5–8 weeks of evening pace).**

### 11.1 Course-correction checkpoints

- After M3: is engulf actually fun? Redesign here if not.
- After M5: are archetypes distinct? Cut samey ones, add modifiers instead.
- After M7: does it feel polished enough to share? If not, do polish round 2 before M8.

## 12. Open Questions / Risks

- **Performance on lower-end hardware.** 1000 MC steps/frame in JS is a known throughput; if it falls short we'll lower step count and tune `betaIsing/Vol/Mov` to compensate. Mitigation in M1.
- **Engulf feel.** This mechanic is novel and we won't know it works until M3. Built-in checkpoint to redesign if needed.
- **Mirror complexity.** Projecting player upgrades onto enemy may force upgrade hooks to be enemy-aware earlier than planned. Scope lever: drop Mirror, replace fight 6 with elite combo.
- **Balance of 35 upgrades.** Some rares (Mitosis, Ring Burst) can interact pathologically with each other. M8 includes a balance pass; expect 2–3 sittings.
- **Audio sourcing time.** Free SFX libraries are large; finding 10 that match the aesthetic could eat an evening on its own. Budgeted in M7.
