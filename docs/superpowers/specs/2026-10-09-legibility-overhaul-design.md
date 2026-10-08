# Legibility Overhaul — Design

Date: 2026-10-09 · Branch: `ux/legibility-overhaul` · Author: Claude (autonomous overnight pass; Johnny asleep, decisions documented here for his review)

## Problem

A cold player cannot tell what is what. Evidence from a fresh playthrough
(phone 375×812, desktop 1440×900) and the baseline captures in
`docs/ux-legibility/before/`:

1. Cultures in the dish are unnamed coloured blobs. A tap on the dish always
   spends a tool, so there is no way to ask "what is that?". The red blob (the
   control sample) is never explained.
2. Dish events (outbreaks, crises, mutations, new strains) already carry text
   labels in `DishEventMarker.label`, but the renderer draws only rings. During
   Trial 2 the Log recorded *Predator outbreak*, *Contamination Bloom* and
   *Fleet splitter dominant*. On the dish, cultures simply vanished.
3. About 20 player-facing nouns: Case, Trial, Study, Method, Genome, Specimen,
   Strain, Lifeform, Breed, Chimera, Culture, Egg strain, Reagent, Catalyst,
   Protocol, Findings, Atlas, Bank, Seal, Equilibrium. The same object changes
   name as you click through it (Eggs → Specimen freezer → egg strains →
   genomes decoded).
4. The goal disappears whenever Dr. E speaks (the desktop rule
   `.coach-active .hud { opacity: 0 }`; on phones the coach takes over the top
   rail). Objective targets are phrased as results ("Bloom Mass stabilized")
   with no progress meter. "Equilibrium 0%" is never explained.
5. Desktop type is 6.5–11px (about 120 font-size rules under 11px). The dish
   is about 40% of a 1440px screen.
6. Phone layout problems:
   - A dead band of about 100–150px sits between the dish and the controls.
   - The tool rack scrolls sideways and hides tools.
   - "Abandon trial" is truncated, and is a destructive action placed among the tools.
   - The tutorial step counter sits under the settings gear.
7. Tools don't preview their area. The upgrade screen offers upgrades for
   tools the player hasn't unlocked yet ("Volatile Toxin" before Toxin).
8. The dish is mostly flat black (160×160 grid), so the cellular automata core
   doesn't read as alive at a glance or in a thumbnail.

Why this matters: Cellular Death Match is the active CrazyGames experiment
(see `~/Projects/Operations/z13labs-publishing-ops`). Past CrazyGames
rejections were for conversion, playtime and D1 retention (Galactic Hordes)
and for weak concept differentiation (Brickinetic). If players can't read the
dish, they can't experience what makes the game different.

## Non-goals

- No changes to the CPM simulation (`src/sim/`), breed energy profiles,
  ecology balance, or objective rules. The automata core is load-bearing.
- No new progression systems, strains, or content.
- No platform/SDK/upload work.

## Decisions

### D1 · One vocabulary (player-facing text only)

| Term | Means | Replaces in UI copy |
|---|---|---|
| **Culture** | one living mass in the dish | colony, lifeform (instance), specimen (instance) |
| **Strain** | a kind of culture | lifeform (type), breed, genome, specimen, chimera, egg strain |
| **Tool** | anything you apply to the dish | reagent |
| **Reaction** | chemistry that fires when tools/strains combine | catalyst, protocol, recipe |
| **Trial** | one dish round | study, epoch, case trial |
| **Upgrade** | the pick between trials | method |
| **Notebook** | your collection and history | atlas, findings, genome archive, research notebook |
| **Balance** | 3+ strains holding steady → you may finish | equilibrium, homeostasis |

- Actions are **Finish trial** (was Bank result / Seal / Complete trial) and
  **Leave trial** (was Abandon trial/study).
- **Control sample** keeps its name. It is the red reference culture; nearby
  cultures attack it.
- **Hybrid** is allowed as an adjective ("hybrid strain").
- Chimera lore ("Wasp × Manticore") stays in Notebook flavour text, but not as
  a category noun.
- Internal identifiers (types, ids, storage keys, CSS classes) are **not**
  renamed. Only rendered text changes, which keeps saves and tests stable.
- Enforcement: a unit test scans `index.html` text plus the player-facing
  string tables, and an e2e test scans `document.body.innerText` across key
  screens for the retired nouns.

### D2 · The dish labels itself

New DOM overlay `.dish-labels` inside `.dish-stage`, exactly covering the
canvas. It is pointer-transparent and updates about 10 times a second (never
from zustand-style store writes; the module keeps its own state).

- **Strain tags:** one compact tag per strain present, placed on that strain's
  largest culture: colour dot + name. The control sample gets a "Control" tag.
  Cap: 5 tags on phones, 7 on desktop. Lower-priority tags that would overlap a
  higher-priority one are dropped.
- **Goal targets:** cultures that count toward the current objective get a
  dashed ring drawn on the canvas (shape, not just colour) and a `◎` prefix on
  their tag.
- **New strains:** when a strain first appears in the dish its tag reads
  `NEW · <name>` for 5s with a pulse.
- **Tap ping (phones):** a tap on the dish still applies the tool (no added
  latency), and the culture under the finger gets a highlighted tag for 1.6s.
- **Hover inspect (desktop):** hovering the dish shows an inspect card for the
  culture under the pointer: name, role, one-line behaviour, size and trend
  (growing/steady/shrinking), and "Counts toward goal" when relevant. The
  control sample explains itself.
- **Options toggle:** "Dish labels: On/Off", persisted (`cdm.dish-labels.v1`),
  default On.
- Tunables live in one config object (`DISH_LABEL_TUNING`), per Johnny's
  no-magic-numbers rule.

### D3 · Events appear where they happen

The same overlay renders **event callouts** from `arena.getDishEvents()`:
- short sentence-case text ("Predator outbreak", "New strain: Bloom Mass",
  "Mutation", "Rogue reagent", "Folding fault");
- an icon per kind: ▲ critical, ! caution, ★ discovery, ✓ stabilise;
- at most 2 visible at once, each for at most 3.5s;
- duplicate `… FLASH`/`… SPARK` markers filtered out;
- callouts take priority over strain tags.

The Log becomes history, not the primary channel. On phones it opens as a
solid, scrollable sheet instead of six toasts over the dish. Crises and
outbreaks are suppressed while a guided (coach-driven) trial beat is active, so
a lesson is never interrupted by an unexplained disaster. This is to be traced
and confirmed before the fix.

### D4 · The goal is always on screen

The top rail becomes a persistent **goal bar** on every viewport, and Dr. E
never hides it:
- Kicker: `TRIAL 2 / 5`, or `OPEN LAB · TRIAL 6`.
- **Goal line:** an imperative, generated per objective kind ("Grow Bloom Mass
  and keep it alive", "Grow one culture past 800"). It comes from the
  objective def, not hand-edited copy.
- **Status line:** the existing live `summary`.
- **Meter:** a new `fraction` (0–1) on `ObjectiveProgress` for every kind that
  has a measurable quantity, and a ✓ state when complete.
- **Balance chip:** `Balance 40%`, with a one-line explainer in the goal bar's
  title/aria and in the Notebook. It is hidden in the guided Trial 1.

Dr. E's coach card docks *under* the goal bar (desktop: centred above the dish;
phone: a compact card between the goal bar and the dish) instead of replacing
it.

### D5 · Readable type, a bigger dish on desktop

- Type floor: **11px absolute minimum** for any rendered text. Body copy is
  12–13px on phones and 13–14px on desktop. Implemented with type-scale tokens
  on `:root`, then a mechanical pass mapping sub-11px literals onto the tokens,
  followed by visual QA of every changed container (several have fixed heights).
- Desktop: the dish is sized from available height
  (`min(100vh − rails, 100vw − panels)`). Side panels widen slightly; the
  tool/strain panels get larger text and clearer state.

### D6 · Phone layout

- The dish grows into the dead band. The tool rack wraps into a grid that
  shows every unlocked tool with no horizontal scroll.
- "Leave trial" moves out of the tool rack into Options (with the existing
  two-step confirm). The rack's end slot appears only as a primary **Finish
  trial ✓** when the trial is finishable. The same applies to the desktop tool
  panel.
- Fix the step counter overlapping the gear, and the Dr. E pointer bubble
  covering the tool readout.

### D7 · Tools explain consequence

- Desktop: hovering the dish with a tool selected shows that tool's radius as
  a ghost ring in the tool's colour.
- The upgrade picker only offers upgrades whose tool the player has unlocked.

### D8 · The dish looks alive

- An agar substrate replaces flat black: a pre-rendered, static, cheap
  radial-falloff texture with faint grain, regenerated only on resize. Empty
  dish reads as a medium rather than void; cultures keep their contrast.
- Nothing decorative may look like a culture. That would undo D2.

### D9 · Stretch: one click to play (CrazyGames)

CrazyGames Full Launch wants gameplay within one click. Today the path is
title → Run Trial → "Tap to continue" welcome card → first instruction. If
time allows, the welcome copy folds into the first instruction so Run Trial
lands directly on "Press Egg". This touches onboarding contract tests (see
memory: *onboarding dual-completion trap*), so it ships only with all
onboarding e2e green. Otherwise it is documented as a follow-up.

## Verification

- `npm test`, `npm run build`, and the full Playwright suite (`npx playwright test`) all green.
- Before/after captures for phone 390×844, small phone 375×667, landscape
  844×390, tablet 768×1024, and desktop 1280×720 in `docs/ux-legibility/{before,after}/`
  (`CDM_UX_SHOTS=<label> npx playwright test e2e/ux-shots.spec.ts`).
- Acceptance: at every viewport, during Trial 1 and a busy Open Lab dish, a
  player can see:
  - the current goal and its progress;
  - the name of every strain on the dish;
  - what just happened and where.

  No retired noun appears in rendered text. No text is below 11px.
- An adversarial game-design review (independent agent) after implementation;
  its findings are triaged and fixed or explicitly declined.
