# Genome Discovery and Character Reconstruction Design

Date: 2026-08-28  
Status: Adversarially reviewed; implemented and verified  
Scope: Genome collection identity, discovery presentation, and reuse of character reconstructions  

## 1. Executive decision

Cellular Death Match should make every reproducible lifeform feel like a
collectible genome. The player does not collect eggs as creatures. They observe
a phenotype, stabilize the organism, decode and archive its genome, and thereby
gain the ability to synthesize eggs containing that genome in future trials.

Every seedable lifeform receives a distinct character reconstruction made from
the same coarse cellular grid language as the live simulation. Early genomes
read as amoebas, spores, gliders, and simple microbial faces. Derived breeds
develop specialized anatomy. Hybrids become increasingly complex, bug-like,
and fantastical while remaining visibly assembled from occupied square cells.

This is a collection reward around the game, not a replacement for the game.

> The Petri dish is the star of the show. Genome presentation must reward what
> happened in the dish without obscuring, pausing, or trivializing the dish.

### Product statement

> Cellular Death Match is an ecosystem-cultivation roguelike that makes players
> feel like collector-scientists by provoking, stabilizing, and preserving
> strange emergent life.

### Player promise

> I created a strange organism, preserved it long enough to decode its genome,
> and can now synthesize its egg in future experiments.

## 2. Protected design priorities

In priority order:

1. **The live dish remains the primary spectacle and interaction.**
2. **A genome is earned through readable cause and effect in the dish.**
3. **Stabilization, not first sight, is the permanent collection moment.**
4. **Every seedable lifeform has a memorable character identity.**
5. **The collection uses existing progression surfaces and state.**
6. **The system can grow beyond the current roster without redesign.**

If a proposed implementation conflicts with priority 1, it does not ship.

## 3. Terminology and fiction

The following language is canonical:

| Term | Meaning |
| --- | --- |
| Phenotype | The living expression that appears in the dish. |
| Observed | The phenotype appeared, but the player has not secured it. |
| Stabilized | The organism survived the required trial condition and can be banked. |
| Genome decoded | The permanent celebratory collection event after stabilization or a base-strain research unlock. |
| Genome Archive | The lifeform collection view within the existing Notebook/Atlas. |
| Egg synthesis | Creating a seed vessel that expresses an archived genome. |
| Character reconstruction | The laboratory's stylized interpretation of the organism encoded by that genome. |

Avoid using “egg discovered.” The egg is the delivery vessel, not the creature.
Avoid describing later organisms as biologically “more advanced.” Use
**complex**, **specialized**, **derived**, or **recombinant**.

The reconstruction is intentionally interpretive. It shows what the genome
“wants to become,” which allows a portrait to suggest a beetle, larva, moth, or
crab while the real dish phenotype remains fluid cellular matter.

## 4. Core experience and motivation

The collection fantasy is triumphant ownership through scientific discovery:

> I found something wonderfully strange, and now it belongs in my laboratory's
> living collection.

The intrinsic motivation to protect is experimentation: changing a condition,
watching the simulation respond, forming a hypothesis, and correcting the dish.
The portrait and archive completion are extrinsic rewards. They must point the
player back toward another experiment rather than becoming the main activity.

Removing the collection layer should still leave an interesting dish for at
least ten minutes. If collection progress becomes the only reason to play, this
feature has damaged the product.

## 5. Collection scope and visual escalation

The collection contains every lifeform that can be synthesized as an egg. The
current roster contains fourteen genomes:

- Six foundational strains: Swarmlet, Bruiser, Splitter, Sniper, Mirror, Boss.
- Five derived breeds: Needle Swarm, Folded Anchor, Glass Antibody, Bloom Mass,
  Static Lattice.
- Three hybrid breeds: Quill Bloom, Vitric Anchor, Mire Lattice.

The design must derive totals from content rather than hard-code fourteen. New
genomes should require content, art, and completeness tests, not a new UI flow.

### Visual complexity bands

| Band | Visual language | Current examples |
| --- | --- | --- |
| Reference | Tiny gliders, amoebas, spores, tadpoles; minimal anatomy and one expressive mark. | Swarmlet |
| Foundational | Clear mass, movement, or role silhouette; still recognizably microbial. | Bruiser, Splitter, Sniper, Mirror, Boss |
| Specialized | Needles, shells, anchors, cilia, crystal growth, or repeating structures. | Five derived breeds |
| Recombinant | Composite anatomy inherited from both parents; insectoid, larval, floral, or crustacean suggestions. | Three hybrids |
| Anomalous | Future recursive, colonial, or multicellular reconstructions that remain grid-built. | Reserved for expansion |

Complexity is not a power rating. A simple early genome may remain strategically
valuable. Silhouette complexity communicates discovery depth, not numerical
superiority.

### Shared art rules

- Coarse square pixels with hard nearest-neighbor edges.
- Silhouettes remain plausible arrangements of occupied CA cells.
- Canonical lifeform primary color remains dominant.
- Use a small color ramp and sparse single-cell highlights.
- Character comes from silhouette, posture, symmetry, and one or two facial
  marks, not detailed cartoon rendering.
- No smooth vectors, painterly textures, glossy trading-card frames, detached
  weapons, or conventional chibi mascot proportions.
- Derived and hybrid art visibly retains its mechanical identity and, where
  relevant, features from its parents.
- The collection should feel biological, playful, and a little uncanny.

The existing generated chimera microscope portraits and `CHIMERA_LORE` are
valuable source material for splice fiction, but they are not the canonical
Genome Archive art direction. Keep those assets and their provenance intact
during the first implementation. The pixel-grid character reconstructions
become the consistent collection identity; existing lore may remain as copy.

## 6. Genome lifecycle

### Derived breeds and hybrids

```text
locked silhouette
  -> phenotype appears in the live dish
  -> OBSERVED notification; no ownership celebration
  -> player keeps the phenotype alive through the required completion boundary
  -> STABILIZED
  -> genome is decoded and archived
  -> egg synthesis becomes available
```

Observation is suspense. Stabilization is ownership. The full-color character
reconstruction must not be awarded at first sight.

### Foundational strains

Foundational strains enter through laboratory research progression rather than
emergent breed stabilization. When one becomes newly seedable, treat that event
as its genome-decode moment:

```text
research requirement completed
  -> GENOME DECODED
  -> reconstruction archived
  -> egg synthesis available
```

Swarmlet is the starter reference genome. It begins archived and is identified
as **REFERENCE GENOME** rather than replaying a discovery celebration on a new
save.

### Repeat and debug behavior

- A genome reveal occurs once per persistent discovery, never once per run.
- Loading or migrating an already-decoded save is not a discovery transition
  and must never emit historical reveals. Only a decoded-state transition that
  occurs after the current session has initialized is eligible.
- Re-observing an archived organism can produce ordinary dish feedback but no
  collection reveal.
- “Reveal all” must not enqueue fourteen cinematics. It updates the archive and
  shows at most one summary: **GENOME ARCHIVE COMPLETE**.
- Clearing discoveries returns the archive to the starter reference state using
  existing clear-data behavior.

## 7. Discovery presentation

### During active dish play

First observation receives only lightweight, non-blocking feedback:

> UNKNOWN PHENOTYPE OBSERVED  
> Splitter signature detected — stabilize it alive

This may use the existing ticker/toast and dish effects. It must not cover the
touch target, pause the simulation, demand dismissal, or show the full-color
character reconstruction.

If stabilization is detected while the dish remains interactive, queue the
full reveal for the next safe presentation boundary. A safe boundary is a
trial result, ended dish, paused transition, or another state in which the
player cannot lose control because of an overlay.

### Genome-decode reveal

The reveal is a short result beat, not a claim screen. Keep the primary copy
short enough to read on a phone:

> GENOME DECODED  
> SPLITTER  
> EGG SYNTHESIS UNLOCKED

Role, origin, date, and reconstruction notes belong in the Archive rather than
the timed reveal.

Presentation rules:

- Show the character reconstruction resolving from a noisy cell pattern.
- Use the genome's canonical color and sound identity.
- Target roughly 2.5–3 seconds before automatic continuation.
- Permit immediate skip/continue with pointer, keyboard, or controller input.
- Do not require a confirmation button.
- Respect reduced motion with a static reveal and brief opacity change.
- Never stack multiple full reveals. Normal one-at-a-time discoveries may queue
  at a safe boundary and remain immediately skippable. More than two unlocks
  from a bulk action or migration collapse into one Archive summary.
- Keep the surrounding dish visible enough to preserve causal continuity: the
  player should remember, “that came from my dish.”

The existing mobile notification director remains authoritative for runtime
priority. Genome decode outranks ordinary toasts but does not interrupt a live
interaction. On small screens the reveal must fit within `375x667` without
scrolling or hiding the organism name.

## 8. Archive and reuse

Do not add a new top-level screen or a second progression model. The existing
Notebook/Atlas lifeform group becomes the Genome Archive surface.

### Locked genome

- Scrambled, partial, or low-information silhouette.
- Discovery clue remains visible.
- No full character art or canonical name if that would spoil the experiment.
- Progress is expressed as decoded genomes over total genomes.

### Observed genome

- Glitching outline or incomplete reconstruction.
- Status: **PHENOTYPE OBSERVED**.
- Clear instruction: stabilize it alive to decode and bank the genome.
- Egg synthesis remains unavailable.

### Decoded genome

- Full-color character reconstruction.
- Name, role, behaviour, origin, discovery date, and stabilization status.
- Egg synthesis availability.
- Existing splice lore for derived/hybrid organisms may appear as secondary
  flavor, never as the primary name.

### Other surfaces

The same reconstruction asset may be reused in:

- the safe-boundary genome reveal;
- the decoded Genome Archive entry;
- the pre-run egg loadout screen;
- non-interactive result or marketing surfaces.

The live dish HUD and mobile lifeform drawer should continue using compact
swatches/silhouettes. Persistent large portraits beside the dish would compete
with the simulation and are explicitly out of scope.

## 9. System ownership and compatibility

Implementation must preserve current module boundaries:

- `src/sim/` remains unaware of genomes, portraits, collection state, and UI.
- `src/game/arena.ts` continues to own phenotype emergence and stabilization
  evidence; it should not render or persist collection art.
- `discoveryProgression` and existing research stages remain the authority for
  observed/stabilized status and foundational lifeform research unlocks.
- `strainLibrary` remains the authority for banked rare strains and the chosen
  pre-run loadout. Foundational lab-stock eggs continue to come from research
  progression; `lifeformLoadout` continues composing those sources for a run.
- Notebook/Atlas views derive presentation from those authorities.
- The notification director continues to serialize mobile feedback.

Do not create a parallel `genomeSave`, duplicate unlocked-lifeform list, or
portrait-specific progression flag. Reveal eligibility should be derived from
an existing transition into the decoded/seedable state. If a small persisted
“reveal acknowledged” marker proves necessary, it must be migration-safe and
must not determine actual unlock ownership.

Existing saves must load without losing discoveries, loadouts, research stages,
or archive records. Already stabilized strains should appear decoded after the
update without replaying a wall of historical reveals.

## 10. Content contract and extensibility

Every seedable lifeform must resolve to one character-art definition containing
at least:

- stable lifeform ID;
- display name and role;
- reconstruction asset path;
- accessible alt description;
- visual complexity band;
- canonical primary/accent palette;
- optional parent genome IDs;
- short reconstruction note suitable for the archive.

The implementation may place this metadata beside `LIFEFORM_IDENTITIES` or in
a derived genome-art registry, but there must be only one completeness check.
Adding a lifeform without art or accessible copy should fail a content test.

Asset filenames should use stable lifeform IDs and avoid embedding roster
counts or unlock order. Portrait layout must tolerate future names and a roster
larger than fourteen.

Generated art must have reproducible prompt/source evidence and be registered
in the human-readable asset manifest and the authoritative publishing
attribution register. Adding the new files must keep the asset-digest check
green. Runtime delivery should use appropriately compressed dimensions, lazy
load Archive/loadout portraits, and avoid blocking initial dish startup on the
full roster.

## 11. Minimum implementation slice

The first shippable slice is complete only when:

1. All fourteen current seedable lifeforms have coherent pixel-grid character
   reconstructions and accessible descriptions.
2. Observation and genome-decode copy follow the terminology in this document.
3. The full reconstruction appears only when a genome becomes permanently
   seedable/archived.
4. A safe-boundary reveal reuses existing transition and notification systems.
5. Notebook/Atlas lifeforms show locked, observed, and decoded visual states.
6. The loadout screen can reuse decoded genome art without changing loadout
   rules.
7. Old saves migrate visually without losing progress or replaying every reveal.
8. Debug reveal/clear remains useful and does not produce notification spam.

Art may be delivered in batches, but placeholder styles must not ship mixed
with final styles. A coherent collection is more important than individually
elaborate portraits.

## 12. Explicit non-goals

- No change to cellular Potts physics or lifeform balance.
- No new egg currency, DNA currency, sequencing minigame, or crafting economy.
- No duplicate specimens, rarity tiers, shiny variants, trading, or gacha.
- No individual genome stats, breeding IVs, or collectible card inventory.
- No new top-level Archive screen.
- No mandatory claim button or modal during active play.
- No bespoke full-screen animation implementation per organism.
- No replacement of the real dish phenotype with the character reconstruction.
- No hard-coded assumption that the roster ends at fourteen.

## 13. Verification and acceptance criteria

### Automated behavior

- Content test proves every progression lifeform has identity, palette, art,
  alt text, and an archive entry.
- Progression tests distinguish observed from stabilized breeds.
- Foundational unlock tests emit one genome-decode event when newly seedable.
- Repeat discovery tests do not emit another decode event.
- Existing-save tests mark historical stabilized genomes decoded without reveal
  spam or data loss.
- Session-initialization tests prove hydrated decoded genomes do not emit live
  transition events.
- Debug reveal-all produces at most one summary presentation.
- Clear-data tests return to the Swarmlet reference genome.
- Notification tests prove genome presentation cannot interrupt active mobile
  dish input and remains serialized with other banners/toasts.
- Existing strain-library, discovery, Notebook, objective, and research archive
  tests continue to pass.
- Publishing asset-provenance and digest checks include every shipped
  reconstruction.

### Visual and interaction QA

- Browser check at `390x844`, `375x667`, and `1280x720`.
- The Petri dish remains centered and fully interactive throughout observation.
- A genome reveal never obscures a required live action.
- All organism names remain readable on the smallest target viewport.
- Reduced-motion mode presents the same information without scan movement.
- Keyboard focus does not become trapped or lost.
- Loadout and Archive layouts tolerate all fourteen genomes and longer future
  names without horizontal overflow.
- Portraits remain legible at reveal, archive, and loadout sizes.

### Product success signals

Qualitative playtest questions:

- Can the player explain why they earned a genome?
- Do they understand that an archived genome enables egg synthesis?
- Do they want to attempt another experiment after seeing a locked silhouette?
- Do they remember what happened in the dish more strongly than the popup?
- Does the reveal feel earned rather than passively awarded?

The feature fails its product goal if players remember the collection screen but
cannot describe the experiment that produced the organism.

## 14. Rollout order

1. Lock the visual grammar with foundational, specialized, and recombinant
   proof portraits before producing the full roster.
2. Add the data-driven content contract and completeness tests.
3. Add a presentation-neutral genome-decode event derived from existing state
   transitions.
4. Add the safe-boundary reveal and mobile/reduced-motion behavior.
5. Update Notebook/Atlas states, then reuse art in the loadout screen.
6. Run full automated and responsive browser verification.
7. Playtest the first decode moment before adding further collection features.

## 15. Honest assessment

### What is working

- The fiction cleanly explains permanent strain unlocks and egg loadouts.
- Existing observed/stabilized stages already provide encounter-versus-catch
  structure.
- Character reconstructions give a finite roster emotional identity and create
  a scalable promise for future organisms.
- The Archive can reuse existing Notebook/Atlas and strain-library systems.

### What is risky

- Large character art can steal attention from the simulation.
- A portrait may promise a creature more anatomically literal than the dish can
  produce.
- Fourteen coherent assets are a meaningful art-direction commitment.
- Discovery feedback already has several banners, toasts, rack effects, and
  result beats; an uncoordinated reveal would create noise.

### What is deliberately missing

- No duplicate-catching loop or rarity chase.
- No reward economy attached to collection percentage.
- No second-generation inheritance system.
- No assumption that collection alone can carry retention.

The design is worth implementing because it strengthens an existing mechanical
truth rather than adding a disconnected feature. The implementation should stop
after the minimum slice and be judged in play. The design document is not the
game; the reveal succeeds only if the experiment still owns the player's memory.

## 16. Adversarial review record

The implementation-ready version was challenged against the current codebase
and product rules after its first draft. These were the material objections and
the resulting decisions:

| Attack | Failure mode | Resolution in this design |
| --- | --- | --- |
| “The portrait becomes the real game.” | Full-screen collection spectacle upstages the living simulation. | Full art is restricted to safe boundaries and meta-surfaces; active play gets non-blocking observation feedback only. |
| “The catch happens for free.” | First appearance feels like ownership, so stabilization loses meaning. | Observation shows an incomplete identity; genome decode and full art occur only at permanent seedability. |
| “The art lies about the simulation.” | Bug-like portraits promise literal bodies that the CPM dish cannot render. | Art is explicitly a laboratory character reconstruction built from the same coarse cell grammar, not a screenshot of phenotype anatomy. |
| “This creates three inventories.” | Notebook, Genome Archive, and strain library drift into duplicate state. | Genome Archive is the existing Notebook/Atlas lifeform surface; progression and strain-library authorities remain separate and unchanged. |
| “Old players receive fourteen popups.” | Save migration or reveal-all floods the notification queue. | Hydration never emits discovery transitions; bulk actions collapse into one summary. |
| “Two seconds cannot carry five lines.” | Mobile players miss the meaning of the reward. | Timed reveal is reduced to three lines and 2.5–3 seconds; detail moves to the persistent Archive. |
| “Base strains and breeds do not unlock the same way.” | A single fictional rule obscures different system ownership. | Both resolve to decoded/seedable presentation, while progression retains base lab stock and strain library retains banked rare loadouts. |
| “Fourteen images bloat startup.” | The collection delays the star attraction. | Assets are compressed and lazily loaded outside the currently needed reveal; initial dish startup cannot depend on the full roster. |
| “Generated art breaks release evidence.” | New media causes publishing digest/provenance checks to fail. | Prompt/source evidence, manifest registration, attribution records, and digest checks are acceptance requirements. |
| “Future additions become bespoke work.” | Each new genome requires UI edits and special animation. | Stable-ID content metadata and completeness tests drive one reusable reveal/archive/loadout treatment. |

The review did not find a reason to reject the feature. It did narrow it: no
new economy, no new screen, no live-play modal, no replayed history, and no
collection reward without a causal dish event. Those constraints are part of
the feature, not optional polish.
