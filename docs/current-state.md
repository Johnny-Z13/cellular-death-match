# Current State

Last updated: 2026-10-09 (legibility overhaul, branch `ux/legibility-overhaul`)

## Summary

Cellular Death Match is a mobile-first Petri dish ecosystem roguelike. Runs are open-ended with escalating pressure:

- 3-beat guided onboarding epoch (~30s), 2 fixed progression epochs, then open-ended mid-game.
- Runs fail via ecosystem collapse. Balance is a clock of time held: 3+ of the player's own strains established (their own cultures, planted from an Egg or a daughter, cutting or bred strain of one, hold at least `BALANCE_TUNING.minOwnShare` (5%) of the living mass) and no strain, wild or not, over half of it. A speck planted beside a wild crowd of its strain does not borrow theirs. A minute unbroken makes the dish a stable ecosystem: it pauses pressure and records a biome. It is a reward, never a trial finish; each trial ends on its own goal.
- Your cultures vs the wild: goals about building a dish (Balance and the sustain clocks, Even Spread, Symbiosis, Founder Strain, Mega-Culture, Crisis Survivor, Extinction Reversal) count only the player's lineage. Symbiosis needs two of the player's own strains side by side; Mega-Culture counts a culture only once it is past its strain's full size (a Boss egg is not a Mega-Culture at hatch). A strain bred from an own culture, and a Splitter's Swarmlets, are the player's too; Mitosis Party counts own divisions. Wild residents are the environment; they can tip the balance but never hold it for the player. Tests and probes can stage a player-built dish with `CreateArenaOpts.ownEnemies`.
- Restock (`RESTOCK_TUNING` in `src/content/ecologyTuning.ts`): good moments hand charges back so long sustain trials don't run dry. Each full minute of Balance tops up every tool below full by one; the first stable ecosystem in a dish restocks the bench; a discovery new to the dish (a reaction, a strain, a lab note) or a merged friend gives a spare to the two emptiest tools, at most once every 20 s (`sparesCooldownTicks`). Never past a tool's max, never in the Trial 1 tutorial. It shows as a "Restock" toast and log line, a sparkle and count pop on the refilled tiles, and a rising drop chime. The silent resupply is now a slow safety net (one charge every 18 s, to the tool the player is shortest on). An Egg refused by a full dish (28 cultures) says so in a "Dish full" toast.
- Hatchlings: a culture planted from an Egg lives on its yolk for 20 s (`yolkTicks`): it burns no mass, no other culture can take its pixels and bullets pass through it (`SimState.shielded`); a faint gel ring shows it. Hunter eggs hatch at 0.7 of genome size, and the player's own hunters burn at half a wild hunter's rate (`ownHunterBurnScale`), so a tended Bruiser or Mirror has time to hunt.
- Oddities (`src/game/oddities.ts`): twelve hidden lab secrets that are not creatures (an empty Membrane pen, a wall to wall stroke, three cuttings of one strain, twenty shots stopped by gel, six strains at once, a still life, the long hold, a mitosis party, three biomes, tickling Dr. E, a night visit, a secret key code that makes the dish dance). Each shows as a riddle in the Notebook's Found tab until found; Dr. E scribbles a riddle into the log from Trial 3 on.
- Cosy pace: every dish after the coached onboarding runs the `culture` food web (`DISH_LIFE_CYCLE` in `src/content/ecologyTuning.ts`), case trials included. Sustain trials (Living Dish, Full House, Food Web, Even Spread, Symbiosis) pause on a dip rather than resetting, and the open-lab draw always offers one.
- Per-breed CPM energy profiles: each breed has distinct Ising/volume/movement/engulf multipliers, resolved by the arena into sim-neutral cell profiles.
- Reagent energy shifts: reagents modify CPM coefficients within field radius (salt hardens, acid fragments, etc.).
- Strain library: discovered breeds banked across runs; players choose egg loadouts before each run. Loadouts start at 2 strains and grow at biome milestones (1, 3, 6 and 10 distinct biomes, up to 6; `BIOME_SLOT_MILESTONES`).
- Procedural objective pool: mid-game epochs offer 2 objectives to choose from.
- Escalating pressure: hazard intervals shorten, outbreaks grow, mutations intensify per epoch.
- Biome classification: stable ecosystems are named from their leading strains and kept as biome cards in the Notebook's Trial tab.
- Catalytic reactions, rare breed discovery, and cross-breeding of hybrids.
- The case flows trial to trial: the upgrade screen says what comes next ("Next · Trial 3 · Carrier Medium", with a chip for each new tool, and upgrades for an arriving tool read "arrives next trial"); a trial that brings a tool pops its tile and names it ("New tool · Water · dilute and spread"); every catch says how it was found; and the last trial ends on Dr. E's "Case closed" card. Recipe trials are forgiving: while Dr. E instructs, or the trial asks for a reaction, fields fade at lesson pace (`LESSON_TUNING.fieldFadeScale`), and the trial's own reaction wins a tie with a stronger sibling (a mutated Bloom Mass no longer turns Bitter Bloom into Pressure Bloom).
- The Open Lab is a sandbox with leads: Dr. E names one friend to find next (`nextLead` in `src/game/friendsDex.ts`), under the trial chooser, in a note five seconds into each trial, and again the moment a friend is found. Merges come first (their strains must be in the Egg tray), alternating with hybrids the tray can cross; other strains follow, and the very rares once a merge has been made. The turn rotates through the next three when a lead goes unfound for 75 s of dish time (`LEAD_TUNING.patienceSeconds`), so a lead the player can't land gives way, and the chooser, the dish and the title always name the same one. Merges are made from the player's own cultures only (wild cultures neither join a group nor spoil it), and a hatchling on its yolk sits still and does not divide, so "plant them touching, then feed" works the way the hints read. A strain the player has banked is not re-spawned as a specimen beside its source (`bankedBreedIds`); one only seen before still is, so it can be kept alive and saved. Blinker needs a full window of steady pulses after the lock. Measured with headless sandbox sessions (strains bank only if alive when the trial ends): a lead-following player goes from 11 to 17-23 of 32 friends in 15 minutes, a find every minute or two, longest drought 4-6 minutes; reactions found by experimenting come on top.
- Every new creature hatches from an egg: each new strain gets its own catch, and a rescued friend's egg rises in its droplet, wobbles, cracks and bursts. From Trial 2 every caught strain is in the Egg tray; the case's finale (Brine Channel) catches the Boss.
- Pixel-bloom dish rendering: every culture's own pixels glow in their color.
- Mobile portrait touch shell: Lifeforms/Log drawers, tool readout, bottom tool bar.
- Mobile landscape side-rail composition and intentionally scaled tablet portrait layout.
- Priority-directed mobile feedback: banners and toasts deduplicate, queue, and interrupt by importance instead of stacking over the dish.
- Mobile performance profiles: 640px/45fps balanced presentation, 480px/30fps constrained presentation, fixed-tick simulation unchanged, and hidden-tab catch-up/audio suppression.
- Notch/home-indicator safe areas, dynamic viewport units, 44px mobile chrome targets, labelled keyboard-operable dish, and focus-managed modal journeys.
- Desktop layout with side panels, lifeform guide, inspector, and dish log.

## Legibility Layer (2026-10-09)

Details, evidence and open questions: [`docs/ux-legibility/README.md`](./ux-legibility/README.md).

- **One vocabulary.** Player-facing text uses Culture, Strain, Egg, Tool, Reaction, Trial, Upgrade, Notebook, Balance and Badge (`src/content/glossary.ts`). Internal ids still say breed/lifeform/genome/study/epoch/seal. `tests/content/glossary.test.ts` and `e2e/type-floor.spec.ts` keep retired words out of rendered text.
- **Goal strip.** The HUD leads with an imperative goal (`src/content/goalCopy.ts`) and a progress meter (`ObjectiveProgress.fraction`). Dr. E's coach docks over the director slot (`--hud-slot-*` published by `main.ts`) so the goal never hides.
- **Self-labelling dish.** `src/ui/dishLabels.ts` plans name tags (one per strain, on its largest culture), goal markers, new-strain tags, tap pings and event callouts. `dishLabelOverlay.ts` renders them; `dishLabelRuntime.ts` feeds them at 10Hz. Goal cultures (`src/game/goalTargets.ts`) get a dashed ring in `render.ts`. Desktop hover shows an inspect card. The Options menu has a "Dish labels" toggle (`cdm.dish-labels.v1`).
- **Calmer lessons.** `arena.setHazardsHeld()` holds crises, outbreaks and accidents while Dr. E's lesson for that dish is active.
- **Layout.** There is an 11px type floor (`--fs-min`). Wide desktop sizes the dish from the height between the goal band and the log. On phones the dish sits below the measured rail, and the tool rack wraps so every tool is visible (`--rack-height`). The rack's end slot is only "Finish trial" or "Retry save"; leaving an unfinished trial is a two-tap action in Options.
- **Smaller aids.** There is a desktop ghost ring for a field tool's reach, upgrade cards that say when their tool is not unlocked yet, a solid phone log sheet, and an agar plate background.

## Main Systems

- Simulation: cellular Potts model in `src/sim/`. Cells store generic energy coefficients; breed profile lookup stays outside the low-level sim.
- Arena: ecosystem tick loop, objective evaluation, tool effects, mutation, reseeding, homeostasis tracking, escalation, and resupply in `src/game/arena.ts`.
- Run state: open-ended state machine in `src/game/run.ts`; a run ends on collapse or when the player leaves (leaving drops the run's upgrades). A stable ecosystem never ends a trial or the run.
- Balance: time-held and stable-ecosystem clocks, plus the sustain-trial clocks, in `src/game/balance.ts`; biome naming in `src/game/homeostasis.ts`.
- Membrane: the gel wall in `src/game/agarWall.ts` (the sim reads its mask, `SimState.wall`, in `mcStep`) and the pinch in `src/game/membranePinch.ts`.
- Escalation: per-epoch pressure scaling in `src/game/escalation.ts`.
- Objective pool: procedural mid-game objectives in `src/game/objectivePool.ts`.
- Strain library: persistent strain bank and loadout in `src/game/strainLibrary.ts`.
- Lab report: end-of-run summary data in `src/game/labReport.ts`.
- Lifeform data: archetypes, colors, egg metadata, and schedules in `src/content/enemies.ts`.
- Objectives: fixed epoch objectives in `src/content/objectives.ts`; procedural pool in `src/game/objectivePool.ts`.
- UI: DOM overlays in `src/ui/screens.ts`, canvas renderer in `src/ui/render.ts`, lab report in `src/ui/labReportScreen.ts`, loadout picker in `src/ui/loadoutScreen.ts`, responsive CSS in `src/styles.css`.
- Visual identity: "Bioluminescence: Deep Lab" — glass instrument panels, Michroma display / IBM Plex Mono data / Newsreader notebook fonts, bio-cyan/amber/violet accent system. The title screen is the dish: the game's own simulation runs an open-lab culture edge to edge behind a centred wordmark, with strain name tags on the cultures (`src/ui/titleDish.ts`).
- Game feel: `src/ui/fx.ts` drives the epoch intro banner, the arcade unlock banner ("Breed/Strain Unlocked"), discovery toasts, and phase transition wipes (DOM/CSS, reduced-motion aware).
- Juice layer: `src/ui/juice.ts` adds tap ripples (tool-tinted), particle bursts on colony birth/death and discovery, soft/hard dish shake on outbreaks and critical events, and a living deadline clock (amber/red ramp + per-second pulse in `screens.ts`/CSS). Pure presentation over existing state/events; capped particle pool; reduced-motion aware. The HUD update in `main.ts` runs every frame even without the control sample (the onboarding dish removes it), so the deadline readout is live in Epoch 1 too.
- Onboarding: `src/ui/coach.ts` is a skippable first-run 3-beat coach that auto-advances on gameplay events — place egg → feed with Nutrient → watch bloom appear — then auto-ends Epoch 1 via `onOnboardingComplete` callback. First run only (`cdm.coach.seen.v5` in localStorage). The opening egg beat is a full-screen, pointer-transparent Dr. E. Mergent silhouette. Later beats give the Doctor a large 2.6-second instruction entrance before collapsing into the compact coach, keeping the dish playable. Beat 3 auto-spawns a second swarmlet to ensure bloom discovery. The same portrait remains visible as title-screen branding on desktop and mobile.
- Idle nudge: the same card doubles as a "Lab Assistant". If the player hasn't acted for ~22s and the objective isn't complete, it surfaces the objective's authored hint with a "Got it" dismiss — max twice per epoch, suppressed while the tutorial runs, re-armed only by another full idle stretch. Any dish action hides a visible nudge.
- Discovery rack: undiscovered lifeforms render as inert gray specimens (identity color stashed on the swatch, cleared while locked, restored on discovery). On discovery the card fires neon echo rings and auto-sorts above the still-locked specimens; the rack keeps discovered cards on top.
- Chimera reframe: discovered breeds are presented as chimeras (real × fantastical, e.g. "Wasp × Manticore") via `content/chimeras.ts` — a flavour/lore + portrait layer; mechanics in `BREED_DEFS` are unchanged. Each has a Nano-Banana microscope-specimen portrait (`public/art/chimera/<breed>.png`, generated by `scripts/generate-chimera-art.mjs`) shown as a round thumbnail in its notebook entry, with the splice + lore in the copy. The dish itself stays pure cells; the creature reveal lives in the notebook.
- Notebook atlas: the tablet has two tabs — "Log" (discovered entries, current) and "Atlas", a grouped progression map (Lifeforms / Catalysts / Lab Events / Field Notes). The atlas shows every entry as a node: discovered ones lit in their identity color, locked ones as dimmed "? ? ?" teasers that still show their discovery hint, with per-group X/Y counts — surfacing aspirational goals to drive discovery. `atlasViewForProgression` in `content/notebook.ts` builds it from the same discovery graph.
- Notebook: a vertical "Notebook" tab is clipped onto the dish's right edge (anchored inside `.dish-stage`, so it tracks the dish at every breakpoint). It opens a sci-fi lab tablet (bezel, sensor strip, luminous screen) that slides in/out from the dish side. Cards keep a constant footprint regardless of discovery count (`auto-fill` grid + fixed rows).
- Icon/dish color binding: rack swatches render as a `bloomGradient` of the exact identity primary color (lightened luminous core → true color → darker edge), matching how the renderer blooms each cell in the dish, so a card and its cultured colony read as the same organism. Swatches wobble like tiny cellular automata (`life-swatch-wobble`, with needle/crystal variants). The egg tool icon tracks the selected strain's color via `--egg-color`.
- UI audio: `src/audio/uiAudio.ts` plays button taps, epoch begin/win/fail stingers, and a looping ambience bed with a persisted mute toggle (the "Sound" chrome button). Distinct from `src/audio/ecologyAudio.ts`, which tracks the simulation.

## Gameplay Loop

1. Start from the title screen, then optionally choose an egg loadout when the strain library has more than one strain.
2. Epoch 1 is a guided 3-beat onboarding flow: place egg, feed colony, watch bloom (~30s, auto-advances).
3. Epochs 2-3 use fixed objectives to teach ecology building and first breed discovery.
4. Epochs 4+ present 2 procedural objective choices before the next ecology round begins.
5. During each epoch, select an egg strain or lab tool and tap the dish to seed life, feed growth, repel colonies, or trigger reactions.
6. Satisfy the objective: creation objectives latch once achieved; balance objectives reflect live state.
7. Pick an upgrade between epochs.
8. The HUD's Balance clock counts time held. After a minute of unbroken balance the dish is a stable ecosystem: a biome banner shows, the biome is recorded, pressure pauses. Finish stays tied to the trial's own goal.
9. Collapse still ends the run as a failure if all cultures die.
10. Lab Report summarizes discoveries, hybrids, reactions, biome state, ecosystem stats, notebook progress, and strains banked.
11. Strains discovered during the run are banked to the strain library for future runs.

## Current Lifeforms

Base strains (egg-seedable):

- Swarmlet: quick, small, fragile.
- Bruiser: large and slow.
- Splitter: can shed swarmlets on death.
- Sniper: ranged pressure.
- Mirror: imitates the red lineage profile.
- Boss: large anchor organism.

Base breeds (discovered from reactions): needle_swarm, folded_anchor, glass_antibody, bloom_mass, static_lattice.

Hybrid breeds (cross-bred from two discovered base breeds under a nutrient field):

- Quill Bloom: needle_swarm × bloom_mass.
- Vitric Anchor: glass_antibody × folded_anchor.
- Mire Lattice: static_lattice × bloom_mass.

## Current Tools

- Egg: places the selected lifeform strain.
- Nutrient: attracts nearby lifeforms and strongly increases their target volume.
- Membrane (tool id `paste`): drag on the dish to draw a gel wall cultures can't grow into. It fences a strain off, gives prey a refuge or pens cultures together for a merge. Drawn through a culture, it pinches it in two: each piece at least `PINCH_TUNING.minPieceShare` of the strain's genome size becomes its own culture of the same strain, sharing the mass (`src/game/membranePinch.ts`). That is the only way to copy a culture already in the dish, rare strains and hybrids included. The wall holds about 13s, leaks as it dissolves and is gone at 20s (`AGAR_TUNING`). It never feeds; a reagent dropped on a fresh membrane reacts along it. Gel absorbs bullets too, so a Membrane shields what is behind it (a dissolving wall lets them through as often as it lets cultures). One charge buys a length of drawn path; each stamp rasterises back to the last so fast strokes leave no gaps. Drawing is wired via pointer capture in `main.ts` (`endPasteStroke` resets between strokes).
- Toxin: pushes nearby lifeforms away, shrinking and eroding matter in its radius.
- Water, Salt, Acid: research-unlocked reagents that drive further reactions.
- Agitate: spreads active fields and can fold overlapping reactions into a fault.

## Rendering

`src/ui/render.ts` draws the cellular Potts grid in three GPU-friendly layers: a blurred glow underlay (the same grid image, smoothed and blur-filtered, so light bleeds past each culture's edges), the crisp per-pixel layer on top (empty pixels are transparent so the halo shows through), and a faint additive pass for inner luminosity that keeps hues true. Every culture glows in its own palette color automatically. `renderStyle` still drives the lifeform swatches in the side panels. Dish-event markers, the dish flash, and bullets draw on top.

## Cross-Breeding

`evaluateBreedDiscoveries` in `src/game/arena.ts` checks, each ecosystem tick, every `BreedDef` that declares a `parents` pair. If both parents are already discovered and a cell of each sits within ~16px of the other inside a nutrient/conduit/bloom field, the hybrid is discovered and a hybrid cell spawns. Hybrid stats derive from the hybrid's own base archetype (not the runtime parent) so they do not compound.

## Verification Baseline

As of 2026-10-09 (branch `ux/legibility-overhaul`):

```bash
npm test               # 105 files, 805 tests passing
npm run build          # clean production build (includes CrazyGames credits check)
npx playwright test    # all applicable checks across phone, small-phone, landscape, tablet, desktop
```

All three are expected to pass.

## Release Naming

The working CrazyGames release name is **Cellular Death Match**, with "Death Match" retained as two words. The title's microscopic-combat hook is deliberately paired with store copy and cover imagery that foreground ecosystem cultivation, strain breeding, reagent combinations, and collapse pressure so the release does not imply conventional PvP.

The supporting research, alternative-name shortlist, collision screen, metadata copy, and pre-release trademark checklist are recorded in [`docs/crazygames/2026-08-28-naming-and-positioning.md`](./crazygames/2026-08-28-naming-and-positioning.md).

## Historical Docs

The files under `docs/superpowers/plans/` and the original spec are retained as historical implementation records. They are useful for understanding how the project got here, but `README.md`, `AGENTS.md`, `CLAUDE.md`, `cloud.md`, and this file describe the current product shape.
