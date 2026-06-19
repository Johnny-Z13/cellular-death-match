# CPM Energy Profiles, Onboarding Overhaul & Roguelike Meta-Progression

**Date:** 2026-06-19
**Status:** Design
**Branch:** `design/cpm-onboarding-roguelike`

## Overview

Three interlocking changes that transform Cellular Death Match from a short fixed-length experience (~8 minutes, 6 epochs) into a replayable roguelike with emergent physics, crisp onboarding, and a living-visualiser endgame.

1. **Onboarding overhaul** — guided, auto-advancing Epoch 1 (~30 seconds), fixed Epochs 2-3
2. **CPM energy profiles** — breed-specific physics coefficients + reagent energy shifts
3. **Roguelike run structure** — open-ended epochs, escalating pressure, homeostasis win state, strain library meta-progression

## 1. Onboarding — "Lab Induction"

### Problem

Current onboarding is functional but sluggish. Epoch 1 runs an 80-second timer with a 25-second hazard grace window. The player has `[egg, nutrient]` and must discover Bloom Mass, but there's dead time waiting for the timer even after the objective is met. The coach teaches two steps ("place egg", "feed colony") but doesn't guide the Bloom discovery moment, and never explains how to end the epoch.

### Design

**Epoch 1 is guided and auto-advancing. No timer. No hazards.**

Three beats:

#### Beat 1: "Place a Swarmlet egg" (~5 seconds)
- Egg button pulses (existing `updateButtonHint` system)
- Coach card: "Place a Swarmlet egg in the dish"
- Advances the moment the egg hatches
- No other tools visible yet

#### Beat 2: "Feed your colony" (~5 seconds)
- Nutrient button pulses
- Coach card: "Drop a nutrient near your culture"
- Advances the moment nutrient is applied within range of a living cell

#### Beat 3: "Watch it bloom" (~10-15 seconds)
- A second swarmlet auto-spawns near the player's culture (scripted, not player-placed)
- Under the active nutrient field, the two cultures interact
- Bloom Mass forms — coach celebrates: "You created a new lifeform!"
- Discovery notebook flashes to show the new entry
- Epoch 1 ends automatically

**Total time: ~20-30 seconds. No waiting.**

#### What unlocks after Epoch 1:
- Tools expand: `[egg, nutrient, toxin, water, paste]`
- Bloom Mass banked to strain library (introduced as concept)
- Notebook opens briefly to show the entry

### Epoch 2: "Build an Ecology" (~60 seconds)

- Player has 5 tools
- Objective: sustain 3+ distinct living cultures simultaneously
- Teaches multi-culture management and reagent differentiation
- Mild hazards begin (low-frequency mutations, gentle reseeding)
- Soft timer but auto-completes when objective met
- No coach — contextual idle nudges only if stuck for 15+ seconds
- On completion: first upgrade pick screen

### Epoch 3: "First Breed" (~70 seconds)

- Objective: discover any breed via catalytic reaction
- Salt and Acid unlock via research grants at epoch start
- Pressure increases slightly (outbreaks begin, accidents start)
- Soft timer, auto-completes on first breed discovery
- On completion: discovered breed banked to strain library

**After Epoch 3, onboarding is complete.** Player understands: place eggs, apply reagents, discover breeds, bank strains.

## 2. CPM Energy Profiles

### Problem

The existing CPM simulation (`src/sim/monte-carlo.ts`) uses global beta coefficients for all cells. A bruiser and a swarmlet move through the same energy landscape — their visual and mechanical differences come from hardcoded per-tick modifiers in `arena.ts`, not from physics. Reagents also apply hardcoded effects rather than modifying the energy system. This means:
- All breeds have the same visual "texture" of movement
- Reagent combos need explicit logic rather than emerging from physics
- The fullscreen late-game dish lacks visual richness

### Design

#### Breed Energy Profiles

Each breed gets a `BreedProfile` — multipliers on the base CPM beta coefficients:

```typescript
interface BreedProfile {
  isingMul: number;    // surface tension → shape compactness
  volMul: number;      // volume preservation strength
  movMul: number;      // movement responsiveness
  engulfMul: number;   // predation aggression
}
```

Reference profiles (tuning values, will need iteration):

| Breed | isingMul | volMul | movMul | engulfMul | Visual character |
|-------|----------|--------|--------|-----------|-----------------|
| Swarmlet | 0.6 | 0.8 | 1.4 | 0.7 | Loose, thin, pseudopods extend |
| Bruiser | 1.5 | 1.2 | 0.7 | 1.3 | Compact blob, holds shape |
| Splitter | 0.9 | 0.9 | 1.1 | 1.0 | Moderate, slightly irregular |
| Sniper | 0.8 | 0.7 | 1.6 | 0.5 | Quick, jagged edges |
| Mirror | 1.0 | 1.0 | 1.0 | 1.0 | Neutral baseline, copies context |
| Boss | 1.8 | 1.4 | 0.4 | 1.5 | Dense, rock-like, barely deforms |
| Bloom Mass | 0.4 | 0.6 | 0.5 | 0.4 | Amorphous film, spreads wide |
| Needle Swarm | 0.8 | 0.7 | 1.6 | 0.6 | Spiky, fast, jagged |
| Folded Anchor | 1.8 | 1.4 | 0.4 | 1.4 | Ultra-dense, immovable |
| Glass Antibody | 1.2 | 1.0 | 1.0 | 0.8 | Smooth, round, crystalline |
| Quill Bloom | 0.5 | 0.7 | 1.3 | 0.5 | Spiked film, reaching tendrils |
| Vitric Anchor | 1.6 | 1.3 | 0.5 | 1.2 | Dense with smooth facets |
| Mire Lattice | 0.7 | 0.8 | 0.8 | 0.6 | Spreading network, web-like |

#### Reagent Energy Shifts

Reagents modify energy coefficients within their field radius, applied additively to the breed's base multipliers:

| Reagent | isingShift | volShift | movShift | Visible effect |
|---------|------------|----------|----------|----------------|
| Nutrient | -0.1 | -0.3 | +0.2 | Cells loosen, expand, reach toward source |
| Toxin | +0.1 | +0.4 | +0.3 | Cells tighten, contract, flee |
| Water | -0.2 | -0.1 | +0.1 | Cells spread, flow, become amorphous |
| Salt | +0.4 | +0.1 | -0.3 | Cells harden, compact, freeze |
| Acid | -0.3 | +0.5 | +0.2 | Cells fragment, boundaries dissolve |
| Paste | -0.05 | -0.15 | +0.1 | Gentle version of nutrient trail |

#### Integration with existing MC step

The existing `mcStep()` in `src/sim/monte-carlo.ts` uses:
- `betaIsing` (global constant)
- `betaVol` (global constant)
- `betaMov` (global constant)

These become per-cell effective values:

```
effectiveIsing = betaIsing * cell.breedProfile.isingMul * (1 + sum of active reagent isingShifts)
effectiveVol   = betaVol   * cell.breedProfile.volMul   * (1 + sum of active reagent volShifts)
effectiveMov   = betaMov   * cell.breedProfile.movMul   * (1 + sum of active reagent movShifts)
```

The Boltzmann acceptance calculation remains unchanged: `P = exp(-deltaH)` where `deltaH` now uses per-cell effective betas instead of globals.

#### Coexistence with hardcoded effects

Existing per-tick reagent effects in `applyToolEffects()` (targetVol adjustments, speed changes, directional biasing) remain. The energy profiles operate at the MC step level and the hardcoded effects operate at the game tick level. They complement each other:
- Energy profiles determine *shape and texture* of movement
- Hardcoded effects determine *speed and growth rate*

Over time, hardcoded effects can be migrated into energy terms, but this is not required for the initial implementation.

## 3. Roguelike Run Structure

### Current structure
Fixed 6 epochs, ~80 seconds each, one objective per epoch, ~8 minutes total. Run always ends after Epoch 6.

### New structure

#### Epochs 1-3: Fixed progression (onboarding)
See Section 1 above. ~3-4 minutes total.

#### Epochs 4+: Open-ended with escalating pressure

**No fixed epoch count.** The run continues until ecosystem collapse or homeostasis.

**Objective selection:** At the start of each mid-game epoch, the player chooses from 2 objectives drawn from a procedural pool. The pool grows as the player discovers more breeds. Objectives get harder as epochs progress.

Example objective pool:

| Objective | Requirement | Available when |
|-----------|------------|----------------|
| Cross-breed | Bring two discovered breeds together under nutrient to create a hybrid | 2+ breeds discovered |
| Mega-culture | Sustain a single culture above 800 volume | Always |
| Reaction chain | Trigger 3 catalytic reactions in one epoch | 2+ reagent types unlocked |
| Balance keeper | Keep no breed above 40% population share for 30 seconds | 3+ breeds in dish |
| Crisis survivor | Maintain 3+ cultures through a crisis event | Epoch 5+ |
| Protector | Keep a fragile culture alive through an outbreak | Outbreaks active |
| Acid sculptor | Use acid to reduce a culture below 100 vol without killing it | Acid unlocked |
| Colony founder | Establish 5+ cultures from a single egg type | Always |
| Symbiosis | Maintain 2 breeds within 20px of each other for 30 seconds | 2+ breeds discovered |
| Extinction reversal | Recover from having only 1 living culture to 4+ | Epoch 4+ |

**Escalating pressure (per epoch after Epoch 3):**

| Parameter | Change per epoch | Effect |
|-----------|-----------------|--------|
| Crisis interval | -5% | Crises come faster |
| Outbreak severity | +1 predator per spawn | More hunters per outbreak |
| Mutation strength | +10% trait magnitude | Wilder mutations |
| Accident frequency | -8% interval | More rogue reagent events |
| New hazard types | Unlock at epoch thresholds | Agar drought (Epoch 6), pH cascade (Epoch 8), thermal shock (Epoch 10) |

**Epoch timing:** Soft timer starts at ~70 seconds (Epoch 4) and shortens by ~5 seconds per epoch (minimum 40 seconds). Always auto-completes on objective met.

### Ecosystem Collapse (Fail State)

All living cultures die. The dish goes dark. Run ends immediately.

- Player keeps all discoveries and strains banked up to that point
- Lab Report shows what was achieved before collapse
- Tone: "the experiment ended early but here's what we learned" — not punitive

### Homeostasis (Win State)

The ecosystem reaches self-sustaining equilibrium. The game detects this — the player doesn't press a button.

**Three conditions must hold simultaneously for ~20 seconds:**

1. **Biodiversity:** 3+ distinct breeds alive
2. **Population stability:** No breed's population share swinging more than ~10% over the measurement window
3. **Energy settlement:** CPM energy variance across the dish is low (cells aren't thrashing — measured as standard deviation of per-cell deltaH acceptance rates dropping below threshold)

**Player experience of homeostasis:**

The game does NOT announce it with a popup. Instead:
1. Dish border gains a slow, soft glow — almost imperceptible at first, building over the 20-second window
2. HUD text quietly shifts: epoch label changes from "Epoch N" to "Equilibrium"
3. Pressure stops escalating — no new crises, outbreaks fade
4. If in fullscreen, HUD fades to near-invisible

After 20-second sustain: gentle notification. "Stable ecosystem achieved."

The notebook records the **biome** — a named equilibrium state based on which breeds are present and their ratios. Biome names become collectibles:

| Example biome | Composition | Character |
|---------------|-------------|-----------|
| Coral Basin | Bloom Mass dominant + 2 grazers | Slow-spreading, peaceful |
| Needle Garden | Needle Swarm + Swarmlet clusters | Fast, jagged, aggressive |
| Glass Reef | Glass Antibody + Folded Anchor | Dense, crystalline, stable |
| Spore Drift | Bloom Mass + Mire Lattice + swarmlets | Sprawling, web-like |
| Iron Crucible | Bruiser + Boss + Glass Antibody | Compact, high-tension |

Biome detection is based on the top 2-3 breeds by population share at homeostasis. Each unique combination is a new biome entry in the notebook.

**Post-homeostasis:** The run does not end. Player can keep watching, experimenting, pushing toward a different equilibrium. When ready, they exit voluntarily. Everything is banked.

### Lab Report (End-of-Run Summary)

Appears on voluntary exit (post-homeostasis) or on collapse. Single screen, styled like a research notebook.

**Contents:**

- **Header:** Run number, outcome ("Stable Ecosystem — *Needle Garden*" or "Ecosystem Collapse — Epoch 6"), duration (epochs + wall time)
- **Discoveries this run:** New breeds discovered (with silhouettes), new hybrids created, new biome achieved, catalytic reactions triggered
- **Ecosystem snapshot:** Final breed population ratios (simple bar chart), peak biodiversity reached, longest stability streak
- **Strain bank update:** New strains banked (count + icons), total collection progress ("14/22 strains discovered")
- **Notebook progress:** New entries added, overall completion percentage

Tone: matter-of-fact, like a scientist reviewing lab notes. On collapse runs, the report still celebrates what was achieved — it's not a failure screen.

## 4. Meta-Progression — Strain Library & Notebook

### Notebook (existing, extended)

The discovery notebook already persists breed entries, discovery notes, and reaction records in localStorage. Extensions:

- **Biome entries:** Named equilibrium states achieved during homeostasis. Each is a collectible with a description, the breeds involved, and the run it was first achieved in.
- **Reaction notes:** Observed reagent-on-breed interactions (visible shape changes from energy profile shifts). Populated automatically when the player uses a reagent on a breed for the first time.
- **Completion percentage:** Visible from the title screen. "Lab Notebook: 34% documented."

### Strain Library (new system)

- When a lifeform is discovered or bred during a run, it is **banked** at run end (or at homeostasis moment)
- From the title screen, before starting a run, the player chooses an **egg loadout** — which strains to bring
- New players start with `[swarmlet]` only
- **Loadout slots:** Start with 2 slots. Gain a slot on first biome discovery, then every 3rd biome discovery thereafter. Maximum ~6 slots.
- Strains in the loadout are available as egg types from Epoch 2 onward (Epoch 1 is always scripted with swarmlet)
- Strains NOT in the loadout can still be discovered during a run via catalytic reactions — the loadout just lets you skip the discovery step

**Run progression example:**

| Run | Loadout | Discoveries | Banked |
|-----|---------|-------------|--------|
| 1 | [swarmlet] | Bloom Mass | +bloom_mass |
| 2 | [swarmlet, bloom_mass] | Needle Swarm, Glass Antibody | +needle_swarm, +glass_antibody |
| 3 | [needle_swarm, bloom_mass] | Quill Bloom (hybrid), first homeostasis "Spore Basin" | +quill_bloom, +spore_basin biome |
| 5+ | [3-4 chosen strains] | Targeting undiscovered biomes and hybrids | Strategic loadout crafting |

**No currency, no XP, no upgrade shop.** Progression is purely discovery-driven.

### Persistence

Both notebook and strain library persist in localStorage, extending the existing `discovery.v2` save format:

```typescript
interface DiscoverySave {
  // existing fields
  persistenceEnabled: boolean;
  discoveredBreedIds: BreedId[];
  discoveredNoteIds: DiscoveryNoteId[];
  breedDiscoveryRecords: DiscoveryRecord[];
  noteDiscoveryRecords: DiscoveryRecord[];
  revealAll: boolean;

  // new fields
  strainLibrary: BreedId[];           // banked strains available for loadout
  loadoutSlots: number;               // current max loadout size
  biomeDiscoveries: BiomeRecord[];    // achieved equilibrium states
  runCount: number;                   // total runs completed
}
```

## 5. Fullscreen Visualiser Mode

When homeostasis is achieved and the player enters fullscreen:

- HUD elements fade to ~10% opacity over 3 seconds, then hide entirely on no input
- Dish fills the viewport edge-to-edge
- Any touch/mouse movement brings HUD back briefly (3 seconds), then fades again
- Dish border glow (from homeostasis detection) remains as subtle ambient light
- Simulation continues — cells move, interact, breed, flow
- CPM energy profiles make this visually rich: compact bruiser blobs hold ground while swarmlet pseudopods reach between them and bloom mass films spread across open space

**Exit:** Tap/click anywhere, HUD returns, "End Run" button available. Takes to Lab Report.

## 6. Implementation Scope

### What changes

| Area | Files affected | Nature of change |
|------|---------------|-----------------|
| Onboarding | `src/game/onboardingStage.ts`, `src/ui/coach.ts`, `src/game/run.ts` | Rewrite Epoch 1 flow, auto-advance logic |
| CPM profiles | `src/sim/monte-carlo.ts`, `src/sim/types.ts`, `src/content/catalysis.ts` | Add per-cell beta multipliers, breed profile data |
| Reagent energy | `src/game/arena.ts` | Add energy shift calculation alongside existing effects |
| Run structure | `src/game/run.ts`, `src/content/objectives.ts` | Open-ended epochs, objective pool, escalation |
| Homeostasis | `src/game/arena.ts` (new module) | Detection algorithm, biome classification |
| Strain library | `src/game/discoverySave.ts`, `src/game/discoveryProgression.ts` | New persistence fields, loadout selection |
| Lab Report | `src/ui/screens.ts` | New end-of-run screen |
| Visualiser | `src/ui/render.ts`, `src/main.ts` | Fullscreen HUD fade, ambient mode |
| Title screen | `src/ui/screens.ts` | Loadout selection, notebook %, collection preview |

### What stays the same

- Rendering pipeline (3-layer glow system)
- Grid and cell primitives (`src/sim/grid.ts`, `src/sim/cell.ts`)
- Bullet system
- Enemy AI per-archetype files
- Audio system
- Touch/mouse input handling
- Existing breed definitions and catalytic reaction recipes
- Discovery notebook core UI

### Risks and mitigations

| Risk | Mitigation |
|------|-----------|
| Energy profile tuning destabilises gameplay | Profiles are multipliers on existing betas — start at 1.0 (no change) and tune incrementally per breed |
| Homeostasis detection false positives/negatives | 20-second sustain window + three independent conditions. Tune thresholds via playtesting. Add debug overlay for energy variance |
| Open-ended runs feel aimless | Chosen objectives give structure. Escalating pressure ensures runs can't stall indefinitely. Collapse provides natural end. |
| Strain library makes early game too easy | Loadout strains only available from Epoch 2. Epoch 1 is always scripted. Loadout slot count is limited. |
| Save format migration | Version the save key (`discovery.v3`). Old saves get `strainLibrary: []`, `loadoutSlots: 2`, `biomeDiscoveries: []`, `runCount: 0`. |
