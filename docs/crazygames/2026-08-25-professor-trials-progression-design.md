# Cellular Death Match: Professor Trials Progression Design

Date: 2026-08-25  
Status: Product direction and implementation-ready design candidate  
Target: CrazyGames Basic Launch candidate using the original Cellular Death Match game  
Supersedes: `docs/superpowers/specs/2026-08-18-crazygames-merge-design.md`

## 1. Executive decision

The CrazyGames version should remain **Cellular Death Match**. The cellular
automata simulation, indirect ecosystem manipulation, reagent catalysis,
breeding, bioluminescent dish, notebook, and strain collection are the product.

The structural change is to house those systems inside a readable research
campaign led by an original eccentric professor. The campaign is made from
short authored **Cases**, each containing five bounded **Trials**. Every trial
uses the real dish mechanics, produces a result, and advances an understandable
research story. The existing open-ended ecosystem becomes an unlockable
advanced mode called the **Grand Experiment**.

This is not a new onboarding game layered in front of CDM. The first trial is
the tutorial, the first experiment, and the first real level.

### Product statement

> We are creating an authored ecosystem roguelite that makes players feel like
> reckless scientific geniuses by manipulating living cellular automata to
> complete strange medical experiments and collect the consequences.

### Primary player experience

The player should feel:

1. **Clever** — they changed conditions rather than directly commanding units.
2. **Curious** — the dish may produce a result they have never seen.
3. **Responsible, reluctantly** — they created the organism and now need to
   stabilise or contain it.
4. **Progressive mastery** — each unlocked tool creates new experimental
   possibilities rather than only larger numbers.
5. **Amused and slightly alarmed** — discoveries range from plausible fictional
   cures to elegant nonsense and contained abominations.

## 2. What must remain CDM

The following are protected product identity:

- cellular Potts simulation and cellular-automata appearance;
- indirect control through eggs, food, pressure, reagents, and agitation;
- cultures with visibly different morphology and behaviour;
- emergent reactions and discoverable recipes;
- cross-breeding and hybrid strains;
- equilibrium/homeostasis as the highest expression of mastery;
- the dark bioluminescent laboratory aesthetic;
- the Atlas/notebook and persistent strain library;
- collapse, mutation, outbreaks, and surprising dish outcomes;
- touch-first dish interaction with a viable desktop presentation.

The following are structural problems to change:

- an open-ended run is currently the first and only main path;
- fixed onboarding epochs and procedural objective epochs do not read as a
  purposeful campaign;
- unlocks are technically present but their cause, value, and next promise are
  not always visible;
- numeric upgrades dominate between-epoch rewards;
- homeostasis is too distant and abstract to carry the early game;
- the lab report summarises a run but does not clearly open the next story;
- players can leave without seeing a durable unfinished possibility.

## 3. Player fantasy and character

### Working character

**Professor E. Mergent** is a working name, not a locked public name.

The player is the Professor: director of the Institute for Questionable
Medicine, brilliant enough to create miracles and reckless enough to need a
containment wing. The Professor searches for fictional cures, useful molecules,
unusual biological materials, and entirely unnecessary organisms.

The visual archetype can evoke the universal eccentric-scientist silhouette —
wild silver hair, optical instruments, scorched coat, intense curiosity — but
must remain an original person rather than using Albert Einstein's name, face,
or iconic likeness.

### Character delivery rules

The Professor adds meaning at natural breaks and must not cover the dish during
normal play.

- One-line hypothesis before a trial.
- One short reactive line after an important discovery or accident.
- A result note after a trial.
- Handwritten annotations in the Atlas.
- A portrait on the case map, result card, and selected marketing art.
- No dialogue tree, animated cutscene, or multi-card tutorial sequence.
- No constant mascot commentary during active control.

### Voice

The voice is intelligent, dry, delighted, and ethically flexible but not cruel.

Examples:

- “Result unacceptable. Fascinating, but unacceptable.”
- “A cure! Side effects include vigorous mitosis and excellent posture.”
- “The hypothesis was wrong. Fortunately, the organism was worse.”
- “Dish Seven has learned patience. Lock Dish Seven.”
- “Common cold: solved. Common sense: pending.”

### Medical-content boundary

The world uses the common cold and invented ailments. It avoids contemporary
outbreaks, COVID, vaccination politics, named real medicines, health
misinformation, realistic clinical promises, and graphic disease imagery.

All cures and effects are clearly fictional through tone, naming, impossible
results, and the stylised microscopic world.

## 4. Core loop

### Spatial model: Lab → Case → Petri dish

The **Lab is the persistent meta-space**, not a separate onboarding game. It
tracks active Cases, sealed Trials, Methods, specimens, Atlas discoveries, and
the next unfinished possibility. A **Case** is one research docket on the Lab
bench. Each numbered sample slot on that docket opens a **Petri-dish Trial**;
the cellular automata simulation is therefore the challenge itself, not a
background visual.

The title surface doubles as the Lab bench so a new player still reaches
player-controlled biology with one click. Between Trials, the Method choice is
presented as a brief return to the same bench. This creates a coherent place
without adding a slow hub-navigation tax.

Professor beats use spatial entrance: the portrait slides into a reserved
guidance rail, delivers one hypothesis or result, then retires when the player
performs the relevant action. On mobile it becomes a compact partial bust. The
dish and required controls retain input and visual priority at all times.

### Moment-to-moment loop

```text
read condition → seed cultures → alter the environment → observe response
→ correct or exploit the response → satisfy/contain the result
```

The most frequent decision is not “which button gives more power?” It is:

> What condition should I change next, and where, to move this living system
> toward the trial result without causing collapse?

This decision must stay readable through:

- a single current hypothesis/objective;
- visible success progress;
- visible dominance, diversity, or survival signals relevant to that trial;
- immediate feedback when a reagent helps or harms;
- limited early tool sets;
- authored starting ecosystems that expose the intended decision quickly.

### Trial loop

Each Trial lasts roughly 45–120 seconds.

1. A one-line hypothesis appears over the already visible dish.
2. The player begins with one obvious enabled action.
3. The real cellular simulation responds immediately.
4. A short-term threat or complication enters.
5. The player reaches the objective, the deadline, or collapse.
6. A result card records the outcome and any discovery.
7. The player chooses a temporary Method or proceeds directly.

### Case loop

Each Case is a five-trial authored research arc lasting approximately 8–12
minutes on a successful first play.

```text
simple experiment → control problem → new reagent/reaction → crisis test
→ capstone discovery → permanent unlock → next Case teaser
```

Temporary Method upgrades persist through the current Case. Permanent tools,
strains, Atlas entries, trial mastery, and Lab access persist across sessions.

Failure in campaign mode restarts only the current Trial. The player retains
the current Case's temporary Methods. The Grand Experiment can retain the
existing harsher run-collapse structure.

### Return loop

On return, the player sees:

- the last completed Case and its result;
- the next unlocked Trial;
- one clearly silhouetted future organism or reagent;
- unfinished mastery conditions on completed Trials;
- the current Atlas and strain library;
- a direct **Continue Research** action.

No daily reward, energy timer, login prompt, or claim screen blocks play.

## 5. Product modes

### Research Program — primary campaign

- Authored Cases and Trials.
- Clear progression path.
- Contextual tool introduction.
- Fast retry of the current Trial.
- Permanent unlocks and optional mastery.
- Designed first-session cadence.

### Grand Experiment — advanced/open mode

- Unlocks after Case 2.
- Reuses the current open-ended epoch structure.
- Procedural objective choices.
- Escalating crises, mutations, and outbreaks.
- Ends through collapse or player-achieved homeostasis.
- Banks strains, biomes, records, and unusual results.
- Provides long-session depth without burdening first-time comprehension.

### Specimen Trials — later optional challenge mode

- Single unusual starting dish.
- Fixed loadout or constraint.
- High-score, fastest stabilisation, or survival record.
- Suitable for weekly rotation only after the core campaign proves retention.

This mode is not part of the first implementation slice.

## 6. Level structure

### Case anatomy

Each Case contains five jobs:

| Trial slot | Design job | Typical duration |
| --- | --- | ---: |
| 1. Culture | Teach/reinforce one primary action | 45–60s |
| 2. Control | Introduce a threat and corrective tool | 60–90s |
| 3. Reaction | Create a new combination or organism | 75–105s |
| 4. Crisis | Test the Case's learned verbs under pressure | 90–120s |
| 5. Capstone | Produce a named cure, curiosity, or contained disaster | 105–150s |

Transitions should average under eight seconds. A result with a discovery may
take longer, but the continue action is always immediately enabled.

### Trial completion and mastery

Every Trial has one required result and two optional Research Seals.

- **Hypothesis Seal** — complete the main objective; this advances the Case.
- **Discovery Seal** — find the authored hidden reaction, breed, or note.
- **Control Seal** — finish under a constraint such as low dominance, no lost
  culture, limited reagent use, or time.

Only the Hypothesis Seal is required for campaign progress. Optional seals
unlock lab conveniences, cosmetics, additional Professor notes, and advanced
trial variants. They do not force replay grinding before the next Case.

### Outcome language

Every capstone result belongs to one memorable family:

- **Cure** — a fictional beneficial result.
- **Breakthrough** — a useful organism, molecule, or process.
- **Curiosity** — scientifically impressive and practically absurd.
- **Abomination** — dangerous but containable.
- **Contained Disaster** — failed hypothesis with a valuable discovery.

A collapsed Trial can still record a first-seen organism or reaction. Failure
therefore respects discovery without granting the campaign clear.

## 7. First Case: The Common Cold Case

This Case is the complete first-session miniature game. It uses existing CDM
mechanics and content with minimal new simulation work.

### Case promise

> Create a treatment for the common cold. Try not to invent anything worse.

### Trial 1 — Culture Shock

**Hypothesis:** “A well-fed Swarmlet culture may produce a useful secretion.”

- Start with Swarmlet, Egg, and Nutrient only.
- Contextual prompts: place egg, then feed near it.
- A second safe culture/seed condition guarantees an early Bloom Mass event.
- Main success: create Bloom Mass.
- First visible consequence within seconds; first discovery within 30–45s.
- Reward: Bloom Mass Atlas entry and first temporary Method choice.

This replaces detached onboarding. Returning players can act immediately and
the contextual prompts disappear after demonstrated understanding.

### Trial 2 — Too Much of a Good Thing

**Hypothesis:** “Growth is excellent until it occupies everything.”

- Start with an overfed Bloom culture and small Swarmlets.
- Introduce Toxin contextually when dominance passes a safe threshold.
- Main success: keep Bloom below the authored dominance cap until the short
  deadline.
- Reward: permanent Toxin access and a Containment note.

### Trial 3 — Dilution Solution

**Hypothesis:** “The treatment needs to travel without consuming the patient.”

- Introduce Water.
- Ask the player to connect or spread Nutrient using a Water interaction.
- Main success: trigger Nutrient Conduit while preserving living coverage.
- Reward: Water access, reaction Atlas entry, and Paste preview/unlock.

### Trial 4 — Fever Dream

**Hypothesis:** “A cure that fails under heat is merely expensive soup.”

- Start three cultures across the dish.
- Run one clearly telegraphed crisis/outbreak.
- Use Nutrient, Toxin, Water, and Paste to preserve biodiversity.
- Main success: three cultures survive the crisis.
- Reward: a new starter strain candidate and a Case Method.

### Trial 5 — The Cure-ish

**Hypothesis:** “Stable coexistence should prevent the treatment eating the
recipient. Probably.”

- Use Swarmlet, Bloom Mass, and the introduced third culture.
- Main success: simplified early homeostasis — three living families, no severe
  dominance, stable for 10–12 seconds.
- Full homeostasis remains a later mastery condition.
- Result: **Anti-Sneeze Culture**, a fictional Cure.
- Reward: Bloom Mass egg strain, Case 2, the full Atlas, and a visible Grand
  Experiment lock with its requirement.

### First-session timing target

| Time | Expected player event |
| --- | --- |
| 0–5s | Branded dish/title response; one-click Begin Experiment available |
| 5–15s | First intentional Egg placement |
| 15–30s | First satisfying culture growth response |
| 30–60s | First Trial and first discovery complete |
| 60–75s | First meaningful Method choice |
| 1–3m | Toxin control learned and rewarded |
| 3–5m | First authored reagent reaction |
| 5–7m | First crisis survived or quickly retried |
| 7–10m | Cure-ish capstone, permanent unlock, and next Case promise |

## 8. Campaign roadmap

Only Case 1 is required for the first implementation slice. Later Cases reuse
existing content before requiring new simulation systems.

### Case 2 — Unscheduled Growth

Theme: growth treatment creates heavy, territorial cultures.

- Introduce Bruiser and Salt.
- Teach territory, resistant cultures, and crystallisation.
- Discover Glass Antibody.
- Capstone: stabilise a regenerative material without monoculture.
- Reward: Glass Antibody strain, Salt cabinet, loadout selection, and Grand
  Experiment access.

### Case 3 — The Self-Repairing Patient

Theme: regeneration becomes uncontrolled mutation.

- Introduce Acid and Agitate.
- Teach precise destruction, recovery, and reaction chaining.
- Discover Needle Swarm or Folded Anchor depending on the authored branch.
- Capstone: recover a near-extinct culture and contain the mutation.
- Reward: Acid cabinet, agitation protocol, second permanent loadout slot.

### Case 4 — Questionable Medicine

Theme: explicitly wacky discoveries.

- Cross-breeding becomes the main verb.
- Introduce hybrid recipes and multiple valid capstone results.
- Examples: Sentient Yogurt, Mood-Ring Mould, Perpetual Gravy, Polite Parasite.
- Reward: hybrid strain access and advanced Atlas clues.

### Case 5 — The Containment Vault

Theme: the Professor's worst successful experiments are escaping.

- Boss cultures, fold faults, outbreaks, and severe instability.
- Existing discoveries return as authored hazards.
- Capstone requires full homeostasis or a deliberate containment ending.
- Reward: final Lab wing, advanced Grand Experiment modifiers, and the
  Professor's sealed notebook.

## 9. Unlock architecture

### Unlock principle

Every important unlock should answer:

> What new experiment can I perform now that I could not perform before?

Pure numeric power belongs primarily to temporary Case Methods. Permanent
progress opens verbs, starting options, authored content, and knowledge.

### Unlock layers

| Layer | Examples | Persistence | Purpose |
| --- | --- | --- | --- |
| Trial | contextual Toxin, Water | current Trial then permanent award | teach at moment of need |
| Method | +egg charge, wider Nutrient, extra Agitate | current Case | roguelike variation and power curve |
| Protocol | Paste, reagent pre-load, hint reveal, retry modifier | permanent | new capability or convenience |
| Specimen | Bloom Mass, Glass Antibody, hybrids | permanent | collection and loadout strategy |
| Knowledge | recipe notes, caution notes, failed results | permanent | clues and curiosity |
| Access | Cases, Lab wings, Grand Experiment | permanent | visible medium/long-term goals |
| Mastery | Research Seals, trial variants, cosmetics | permanent | replay without blocking progress |

### Recommended early unlock order

| Milestone | Unlock |
| --- | --- |
| Start | Swarmlet, Egg, Nutrient |
| Trial 1 result | Bloom Mass Atlas entry; first Method choice |
| Trial 2 result | Toxin |
| Trial 3 result | Water and Paste |
| Trial 4 result | third culture candidate |
| Case 1 result | Bloom Mass egg, Atlas, Case 2 |
| Case 2 early | Bruiser and Salt |
| Case 2 result | Glass Antibody, loadouts, Grand Experiment |
| Case 3 | Acid and Agitate |
| Case 3 result | second loadout slot / advanced protocols |
| Case 4+ | cross-breeding and hybrid specialisation |

### Methods versus Protocols

Existing upgrades such as Spore Rack, Richer Agar, Diffusion Medium, and
Antibody Ampoule become **Methods** chosen between Trials and reset at the end
of a Case.

Permanent **Protocols** should be fewer and more behavioural:

- start one selected reagent with an extra charge;
- carry one discovered strain into authored Trials that allow loadouts;
- reveal one extra hint after a failed attempt;
- preserve one temporary Method after a Trial retry;
- unlock alternative capstone conditions;
- add a loadout slot;
- allow one Method redraw per Case.

## 10. Discovery catalogue direction

The catalogue should mix useful, absurd, and dangerous results. Names must be
short enough for cards and memorable enough to repeat to another person.

### Fictional cures and useful breakthroughs

- Anti-Sneeze Culture
- Scarless Slime
- Restorative Spore
- Universal Antidote-ish Substance
- Plastic-Eating Enzyme
- Self-Repairing Tissue
- Instant Compost Colony

### Wacky curiosities

- Sentient Yogurt
- Perpetual Gravy
- Mood-Ring Mould
- Polite Parasite
- Self-Folding Laundry Culture
- The Decaf Organism
- Extremely Local Weather Cell

### Abominations and contained disasters

- Screaming Lattice
- Bottomless Mite
- Organism That Knows Your Name
- The Thing in Dish Seven
- Recursive Rash
- Unreasonably Patient Slime
- The Colony Behind You

Not every named result needs a new controllable breed. Results may map to:

- a breed;
- a hybrid;
- a reaction recipe;
- a biome record;
- a Trial outcome;
- a Professor note;
- a cosmetic dish effect;
- a future hazard modifier.

This lets content grow without forcing every joke into the simulation layer.

## 11. Motivation and retention

### Intrinsic motivation to protect

- discovering how a living system responds;
- engineering a result indirectly;
- rescuing a dish from a mistake;
- deliberately causing a spectacular reaction;
- finding an organism or biome not seen before;
- improving at spatial reagent placement and ecological balance.

If unlocks and progress bars disappeared, these actions should still sustain a
short play session. Authored levels exist to focus that enjoyment, not replace
it.

### Extrinsic motivation that supports the game

- visible Case path and next Trial;
- Atlas silhouettes and discoverable recipes;
- persistent specimen library;
- Research Seals and mastery variants;
- unlockable Lab wings and protocols;
- Grand Experiment access;
- Professor notes and sealed results;
- named cure/curiosity/abomination outcomes.

### Return promise

The return promise is not “collect today's reward.” It is:

> I know which experiment comes next, I can see what it might unlock, and I
> still have organisms and reactions I do not understand.

Daily requests or rotating Specimen Trials may be added only after the campaign
and return promise demonstrate real value. No energy gates or missed-day
punishment.

## 12. UI and presentation

### Title and entry

- Keep the Cellular Death Match title.
- Replace “Enter Ecosystem” with **Begin Experiment** for a new campaign save.
- Returning saves use **Continue Research** and show the next Trial below it.
- One click from title to player-controlled dish is acceptable; no second menu.
- Do not force loadout selection before the player understands specimens.

### Case map

The Case map is a compact laboratory workbench, not a sprawling world map.

- Five connected Trial cards.
- Current Trial visually dominant.
- Result icon on completed Trials.
- Three seal sockets per Trial.
- Next permanent reward visible at the Case edge.
- Locked future Cases show one silhouette and one intriguing hypothesis.

### Hypothesis overlay

- One sentence.
- Appears over an already rendered dish.
- Never blocks the object being referenced.
- Continue/Skip immediately enabled.
- Dismisses on first valid action where possible.

### Result card

- Outcome family and result name.
- One Professor line.
- Permanent discoveries clearly separated from current-Case Methods.
- Immediate Continue button.
- Atlas animation is short and skippable.

### Professor asset usage

The concept portrait lives at:

`docs/assets/professor/professor-emergent-concept-v1.png`

It is concept art for Case/result screens and positioning work. It should not be
wired into or copied into the production `public/` tree until its crop, name,
mobile footprint, rights record, and final character direction are approved.

## 13. Technical mapping

The new structure should wrap existing systems rather than rewrite them.

| Existing subsystem | New responsibility |
| --- | --- |
| `src/sim/` | unchanged cellular simulation |
| `src/game/arena.ts` | run one authored Trial with supplied start/rules |
| `src/game/run.ts` | Case/Trial state and Grand Experiment state |
| `src/content/objectives.ts` | reusable objective rule definitions |
| `src/game/objectivePool.ts` | Grand Experiment procedural objectives |
| `src/game/escalation.ts` | Grand Experiment plus authored crisis tuning |
| `src/game/homeostasis.ts` | capstones and Grand Experiment win |
| `src/game/discoveryProgression.ts` | durable tools, knowledge, access graph |
| `src/game/strainLibrary.ts` | specimens, loadouts, Lab records |
| `src/content/catalysis.ts` | real reaction/breed discovery content |
| `src/ui/coach.ts` | contextual Trial 1 prompts only; no detached route |
| `src/ui/labReportScreen.ts` | Case results and Grand Experiment report |

### Proposed new content/state modules

- `src/content/researchCases.ts` — authored Case and Trial definitions.
- `src/game/campaignProgression.ts` — completed Trials, seals, access, and
  migration-safe persistent state.
- `src/content/protocols.ts` — permanent capability unlocks.
- `src/ui/caseMapScreen.ts` — compact Case navigation.
- `src/ui/trialResultScreen.ts` — trial outcome and discovery presentation.

### Suggested data shape

```ts
interface ResearchCaseDef {
  id: string;
  name: string;
  premise: string;
  trials: readonly ResearchTrialDef[];
  reward: CampaignReward;
}

interface ResearchTrialDef {
  id: string;
  name: string;
  hypothesis: string;
  objective: ObjectiveDef;
  startingEcology: readonly EnemySpawn[];
  availableTools: readonly ProgressionToolId[];
  availableLifeforms: readonly ProgressionLifeformId[];
  timeLimitTicks: number;
  crisis?: AuthoredCrisisDef;
  discoverySeal?: TrialSealDef;
  controlSeal?: TrialSealDef;
  reward: CampaignReward;
}

interface CampaignProgressionSave {
  version: number;
  currentCaseId: string;
  currentTrialId: string;
  completedTrialIds: string[];
  earnedSealIds: string[];
  unlockedCaseIds: string[];
  unlockedProtocolIds: string[];
  recordedResultIds: string[];
}
```

## 14. CrazyGames product targets

These are internal candidate targets informed by current Publishing Ops
learning, not guaranteed platform thresholds.

| Moment/signal | Design target |
| --- | --- |
| First branded response | under 1s |
| Real controllable play | under 10s |
| First intentional input | within 10s of play |
| First satisfying consequence | within 20s of play |
| First Trial complete | within 60s |
| First meaningful choice | within 75s |
| First authored reaction | by 5m |
| First Case complete | 8–12m |
| Failure-to-retry | under 5s |
| Average Basic Launch playtime goal | 10m+ |
| D1 directional goal | 10–15% |

The candidate still requires:

- five current close CrazyGames comparables;
- a written experience delta across fantasy, decisions, first minute, and ten
  minutes;
- five or more blind recognition reviews, with at least four independently
  noticing the differentiated experience;
- 5–8 uncoached sessions on one exact build;
- separate desktop and mobile evidence;
- cover-to-first-frame promise testing.

The current originality hypothesis is promising but unproven. CDM's indirect
ecosystem engineering appears difficult for a close incumbent to absorb without
changing identity, but cold observers must notice that difference in actual
play.

## 15. Scope guardrails

The first implementation slice must not include:

- a merge minigame or alternate first-play route;
- an energy system, daily reward calendar, battle pass, or hard currency;
- ads, rewarded ads, or SDK work for Basic Launch unless separately justified;
- a large dialogue system or animated story scenes;
- new simulation physics when existing reactions can prove the structure;
- more than Case 1 plus a visible Case 2 teaser;
- a full Professor animation set;
- content that references contemporary outbreaks or disputed medicine;
- a forced account or loadout screen before first play;
- a second title/brand replacing Cellular Death Match.

## 16. Honest assessment

### What is working

- The underlying simulation is intrinsically interesting and visually distinct.
- The new Professor fantasy explains why bizarre objectives and discoveries
  belong together.
- Cases convert an open system into understandable promises without flattening
  it into a generic action game.
- Existing tools, breeds, reactions, upgrades, Atlas, homeostasis, and strain
  library already supply most of the first content ladder.
- Grand Experiment preserves the open-ended game for players who want depth.

### What is risky

- The player may still watch rather than make meaningful decisions.
- Scientific terminology may obscure simple goals.
- The Professor could cheapen the premium laboratory tone if made too cartoonish
  or visually dominant.
- A five-Trial Case will expose whether objectives are genuinely varied or only
  differently worded uses of Nutrient/Toxin.
- Permanent unlocks can make early play feel artificially incomplete if too many
  existing tools are withheld.
- Distinctiveness is not formally passed until comparable and blind-player
  evidence exists.

### What is missing

- A playable Case 1 vertical slice.
- A campaign save/progression model and migration plan.
- Authored Trial parameters proven against real simulation variance.
- Final Professor name, crop, expression set, and rights/provenance record.
- Cold-player evidence for comprehension, agency, session desire, and return
  promise.
- Current comparable research beyond the early Liquid Swarm reference.

### Next three product steps

1. Implement Case 1 as a vertical slice using existing mechanics and no new
   simulation features.
2. Run 5–8 uncoached sessions and record first input, first Trial, first choice,
   abandonment, Case completion, and desire to continue/return.
3. Complete the five-comparable differentiation gate before candidate packaging,
   listing art, SDK, or monetisation work.

The design document is not the game. The Case 1 playtest determines whether the
framing creates a compelling CDM experience or merely a clearer menu around the
same open-ended uncertainty.
