# Cellular Death Match: CrazyGames Merge Design

Date: 2026-08-18
Status: Pre-code sign-off candidate, refined after second adversarial review
Target platform: CrazyGames web, mobile web, CrazyGames iOS/Android app webviews
Internal project identity: Cellular Death Match
Recommended CrazyGames listing candidate: Merge Lab: Cellular Death Match
Short cover lockup to test: Merge Lab

## 1. Executive Decision

Cellular Death Match should become a portrait-first, one-thumb, short-session merge survival game for CrazyGames, listed and presented with "Merge Lab" first because the portal player must understand the mechanic before they care about the internal identity.

The current project has strong raw material: live cellular simulation, strain discovery, persistent library, catalysts, mobile hardening, and a distinct look. The current risk is that the best parts are too abstract and delayed for portal traffic. A CrazyGames player needs to understand the first action immediately, earn a visible reward fast, and see permanent progression before closing the tab.

The design change is not "add a merge menu." Merge becomes the first verb and the main readability layer:

1. Drag or tap cell eggs into the dish.
2. Merge matching cells into stronger strains.
3. Use the merged strain to survive short outbreaks.
4. Bank DNA continuously.
5. Fill a visible atlas and incubator that create return hooks.

The CPM ecosystem remains the differentiator, but it moves behind a clear merge-survival surface.

### Product Thesis

We are trying to create a mobile portal merge survival game that makes players feel clever and powerful by combining simple living cells into escalating organisms under readable pressure.

This is the tradeoff that should govern every implementation decision:

- The player-facing game is merge survival.
- The simulation is the hidden depth and visual distinction.
- Any system that delays the first merge, first reward, or first permanent progress is out of scope for the first CrazyGames build.

### Product Sign-Off Standard

The design is ready for implementation only when these statements are true:

- The CrazyGames listing and cover strategy are compliant with CrazyGames cover rules and sell merge at small size.
- A first-time CrazyGames player starts in live gameplay, not a menu.
- The first action is obvious from a still frame.
- The first reward is designed to happen inside 15 seconds.
- The first run has a real 3-4 minute endpoint.
- Permanent progress is saved at the moment it is earned.
- The MVP scope is small enough to ship and measure before adding advanced systems.
- Every retained system maps to at least one CrazyGames metric: one-minute conversion, average play time, D1 retention, runs per session, or rewarded engagement.
- Ads do not appear in the Basic Launch user experience.

### Locked Product Decisions

These decisions are intentionally fixed for the CrazyGames build unless measured data disproves them:

| Decision | Locked Choice | Reason |
| --- | --- | --- |
| Platform-facing promise | Merge Lab | The platform listing must communicate the verb before the lore. |
| First verb | Merge | Merge is more immediately readable than ecology management or hidden discovery. |
| First input | Drag/tap a matching capsule into a merge ring | The player can infer this from a still frame. |
| First run | Designed 3-4 minute trial | Portal users need a conclusion and permanent gain quickly. |
| First merge implementation | Capsule-first, not live CPM-cell fusion | Reduces simulation risk and makes the first action legible. |
| Save model | Immediate continuous banking | Tab closes must not erase progress. |
| Monetisation priority | No ads in Basic Launch gameplay | Basic Launch is about conversion, play time, and D1 retention. |
| Expansion rule | Metric-gated | New systems must answer measured funnel problems. |

Unresolved design choices must be resolved in this document before code starts. Do not use implementation as a way to decide the core loop.

## 2. Research Inputs

CrazyGames official requirements and guidance:

- Technical requirements: https://docs.crazygames.com/requirements/technical/
- Gameplay requirements: https://docs.crazygames.com/requirements/gameplay/
- Quality guidelines: https://docs.crazygames.com/requirements/quality/
- Game loading tips: https://docs.crazygames.com/resources/getting-to-the-first-frame/
- Basic Launch metrics: https://docs.crazygames.com/resources/basic-launch-metrics/
- SDK intro: https://docs.crazygames.com/sdk/intro/
- Game SDK: https://docs.crazygames.com/sdk/game/
- Video ads: https://docs.crazygames.com/sdk/video-ads/
- Ads requirements: https://docs.crazygames.com/requirements/ads/
- Data SDK: https://docs.crazygames.com/sdk/data/
- CrazyGames app notes: https://docs.crazygames.com/resources/crazygames-app/
- Game covers: https://docs.crazygames.com/requirements/game-covers/

Market reference pages:

- Merge category: https://www.crazygames.com/t/merge
- Tropical Merge: https://www.crazygames.com/game/tropical-merge
- Merge Galaxy: https://www.crazygames.com/game/merge-galaxy/

Market takeaways:

- Merge games sell curiosity: the player wants to know what the next merge becomes.
- The merge chain must be visible before it is owned; silhouettes and next-tier previews matter.
- Input needs to be physically simple: drag, tap, aim, or stack. Do not make the first merge a rules puzzle.
- Space pressure works well for merge because it creates urgency without requiring text.
- Quest/checklist structures can guide progression, but the first minute should not feel like task admin.
- Some merge games use energy gates; this project should reject hard energy gating because portal players can leave permanently.

Important platform facts from the research:

- New users should land directly in simple gameplay or be one click from it.
- CrazyGames measures initial load until the first `gameplayStart` SDK event once SDK integration exists.
- Mobile homepage candidates should keep initial download under 20 MB; top performers often stay below that.
- CrazyGames Basic Launch watches average play time, Day 1 retention, and conversion. Their guide frames successful average play time as often 10+ minutes, strong Day 1 retention around 10-15%, and top titles as capable of 80%+ one-minute conversion.
- CrazyGames SDK gameplay events must be accurate. `gameplayStart()` should fire only when playable gameplay starts or resumes; `gameplayStop()` should fire on menus, pause, level switches, and ads.
- Ads must be SDK-driven, non-deceptive, and placed at natural breaks. Video ads must not interrupt gameplay.
- Data SDK should be used for CrazyGames save sync. Its API mirrors localStorage and uses localStorage for guests, with a 1 MB storage limit.
- CrazyGames app webviews require safe-area handling, fullscreen awareness, and legibility at devicePixelRatio 1.
- Game covers require landscape, portrait, and square assets. They should be simple, professional, non-blurry, and not just screenshots. Cover text should be the game title only, so the merge mechanic must be communicated through title choice and art, not extra promo copy.

### Current Codebase Implications

Local audit, 2026-08-18:

- Current `dist` is about 1.3 MB, so the existing build footprint is a strong starting point.
- There is no CrazyGames SDK wrapper today. SDK, ads, gameplay lifecycle, analytics, and storage sync must be new platform code.
- Current first-time flow still has title/loadout routing. The CrazyGames build must bypass those for true first-time users.
- Current strain banking is run-end oriented. CrazyGames retention needs immediate banking for DNA, atlas progress, merge tiers, incubator timestamps, and unlocked strains.
- Current onboarding is a 3-beat coach around egg, nutrient, and bloom. The CrazyGames first minute needs to be rebuilt around merge first, then feed.

## 3. Success Metrics

The project should treat these as product gates, not vanity metrics.

### Basic Launch Targets

| Metric | Strong Target | Minimum Viable | Failure Signal | Design Response |
| --- | ---: | ---: | ---: | --- |
| First interaction | median under 5s | p90 under 8s | median over 8s | Rework first frame and input affordance |
| First reward | median under 15s | p90 under 25s | median over 25s | Move reward earlier or simplify merge |
| One-minute conversion | 80%+ | 70%+ | under 65% | Rebuild onboarding before adding content |
| 90-second reach | 80%+ | 65%+ | under 60% | Reduce early confusion, deaths, or waiting |
| Average play time | 10+ min | 5+ min | under 4 min | Improve loop depth, retry, and short-run chaining |
| Runs per session | 2.2+ | 1.8+ | under 1.5 | Improve death-to-retry and first upgrade |
| First meta upgrade purchase | 60%+ of one-minute converters | 40%+ | under 30% | Make upgrade clearer and cheaper |
| D1 retention | 10-15%+ | 8%+ | under 7% | Strengthen open loops and return claim |
| Load failure/crash | under 1% | under 2% | over 2% | Stop feature work and fix stability |

Ad metrics are secondary until core retention clears minimum viable thresholds.

### Release Rule

After every CrazyGames candidate release, report the single largest funnel drop-off and make the next design/code iteration address that drop-off first. Do not add new systems while first input, first reward, one-minute conversion, or save reliability are failing.

CrazyGames Basic Launch should be treated as a product test window: at least 7 days and 500 plays, or up to 21 days if 500 plays is not reached. Do not interpret early dashboard noise before the game has enough plays to expose the real drop-off.

## 4. Product Positioning

### Player Promise

"Merge living cells, grow bizarre organisms, and survive a five-minute lab outbreak."

The player should understand this from the first still frame:

- A petri dish full of moving cells.
- Two matching cells being pulled together.
- A bright merged organism appearing.
- Threat cells closing in.
- A visible collection strip with missing slots.

### Target Audience

Primary:

- CrazyGames mobile and school/work desktop players.
- Players who understand merge games quickly and like visible collection progress.
- Casual roguelike/survivors players who want fast power growth without a 20-minute commitment.

Secondary:

- Players who enjoy ecosystem simulations and discovery systems.

### Competitive Angle

Most merge games on CrazyGames are board, farm, city, or object-stack games. Cellular Death Match can own "living merge survival": the joy of merge chains plus the spectacle of organisms behaving in a real simulated dish.

## 5. Core Design Pillars

1. First frame is playable.
   The first-time player starts inside the dish, not on a title screen.

2. Merge is the first verb.
   The player sees two matching cell eggs and one obvious merge target before seeing any deeper terminology.

3. Survival is the pressure.
   Merged strains are not just collection objects; they fight, digest, block, or stabilize outbreaks in the dish.

4. Progress banks live.
   DNA, atlas unlocks, merge tiers, and incubator progress persist when earned, not when a run ends.

5. One-thumb portrait is the default.
   Desktop gets shortcuts and denser panels, but the primary interface must work at 375px width, DPR 1, muted.

6. Every close leaves an open loop.
   The player should leave with an incubator growing, a daily specimen unresolved, or an atlas silhouette visible.

## 6. Core Loop

### Moment-to-Moment Loop

1. Place or drag cell eggs into the dish.
2. Merge matching capsules in the MVP; live-colony merge is later.
3. Merged organism fights, feeds, spreads, or stabilizes.
4. Collect DNA drops and strain fragments.
5. Choose a simple upgrade.
6. Survive the next outbreak.

### Session Loop

1. Start a 3-8 minute lab trial.
2. Complete three to five outbreak waves.
3. Earn live DNA, strain XP, atlas entries, and incubator charge throughout the run.
4. End at collapse or extraction; stabilised homeostasis is a later premium success state.
5. Spend one obvious affordable upgrade.
6. Start again with a stronger starting egg or new strain.

### Return Loop

1. Return to see incubator growth in the dish.
2. Claim the growth; Full Launch can optionally offer a rewarded double.
3. Run the daily specimen seed.
4. Fill missing atlas silhouettes.
5. Upgrade the lab and improve future merges.

## 7. CrazyGames MVP Scope

This section separates the internal prototype from the actual CrazyGames Basic Launch candidate. The internal MVP proves the first minute. The Basic Launch candidate must satisfy the platform retention architecture.

### First Playable Slice

This is the first implementation slice and is not a release candidate:

- One merge family.
- Tier 1 to Tier 2 only.
- Fresh-save boot into live dish.
- First prompt, first merge, first reward, and first saved DNA event.
- One local save/reload test proving the reward survives tab close.
- No daily, no incubator, no ads, no live-colony merge, no hybrid recipes, no deep atlas.

Exit rule:

- Do not build the wider MVP until 4 out of 5 cold players complete the first merge without verbal help.

### Internal MVP v1 Must Ship

- CrazyGames first-time boot route that starts in live dish gameplay.
- Capsule-first merge MVP.
- Three merge families, Tier 1 through Tier 4.
- First 3-4 minute run with a real endpoint.
- Live DNA meter with immediate persistence.
- First atlas page with visible silhouettes and partial reveals.
- Three lab upgrades: Merge Magnet, Starter Cell II, Nutrient Radius.
- Storage adapter with CrazyGames Data SDK/localStorage/memory fallback.
- Local analytics adapter with required funnel events.
- DPR 1 portrait UI support at 375x667 and 390x844.
- Clean desktop controls and keyboard/mouse fallback.

Internal MVP v1 is not a CrazyGames submission candidate. It is the smallest complete local product loop that can answer whether the first run and second-run pull work.

### CrazyGames Basic Launch Candidate Must Ship

- Five merge families.
- Incubator slot 1 and slot 2 with offline accrual capped at 4 hours.
- Daily specimen seed visible after the first run, not in the first 90 seconds.
- Three independent return hooks: atlas collection, incubator accrual, daily specimen.
- Basic Launch build may omit the SDK entirely because CrazyGames tracks Basic Launch KPIs automatically. If SDK is integrated for Basic Launch, use the Game module only unless CrazyGames explicitly confirms Data module usage; keep Ads fully disabled.
- Three cover assets and preview video plan.
- Submission-safe privacy/cross-promotion posture: no external analytics endpoint, no outbound store links, no custom fullscreen button.

Basic Launch is still ads-off. If the Ads SDK is integrated, ad buttons remain hidden because CrazyGames disables ads in Basic Launch and rejects dead ad UI.

### Cut From MVP v1

These are specifically cut from the internal MVP even if they are attractive:

- Playable daily mode.
- Incubator depth beyond a visible teaser.
- Any user-facing ad or rewarded button.
- Interstitial logic.
- More than three families.
- More than Tier 4.
- Hybrid recipe UI.
- Catalyst terminology.
- Live-colony fusion.
- Cosmetic collection depth.

### Explicitly Deferred

- Live-colony merge inside the CPM topology.
- Hybrid/catalyst recipes in the first session.
- Homeostasis sandbox as a primary endpoint.
- Full lab hub.
- Deep atlas pages.
- Prestige, crafting, or specialist terminology.
- Interstitial monetisation tuning.
- Large audio/music pass.
- Any system requiring a backend or account.

### Non-Goals

- A scientific simulation game that expects players to read before acting.
- A 20-minute survivors run.
- A title/menu-first web game.
- A landscape-first control scheme.
- An energy system that gates play.
- A monetisation-first build.

### Scope Kill Rule

If a proposed feature does not improve first input, first reward, one-minute conversion, first-session length, D1 retention, or rewarded engagement, it does not enter the CrazyGames MVP.

### Metric-Gated Expansion

Only expand after the relevant metric is healthy:

| Expansion | Required Signal |
| --- | --- |
| More merge families | One-minute conversion and first reward timing are healthy |
| Daily depth beyond one seeded specimen | Basic Launch D1 retention is below target but first-session metrics are healthy |
| Incubator depth | D1 retention is below target but first-session metrics are healthy |
| Hybrid recipes | Players complete multiple runs and understand base merge |
| Live-colony merge | Main-thread performance stays inside budget after MVP VFX |
| Rewarded ad UI | Full Launch path approved and runs per session/play time are healthy enough to absorb offers |
| Interstitials | Only after platform guidance and after first-session retention is stable |

### Phase Dependency Rule

Do not start a later phase if an earlier phase exit criterion is failing. Specifically:

- No additional merge families until first input and first reward timings pass.
- No Daily prompt in the first 90 seconds; the lightweight daily seed surfaces only after the first run.
- No rewarded buttons until CrazyGames Full Launch monetisation is being prepared.
- No live-colony merge until target-device profiling passes with MVP VFX enabled.

## 8. First 90 Seconds

### CrazyGames First-Time Boot Contract

For the CrazyGames build, a player with no completed-run save state must bypass:

- Title screen.
- Loadout selection.
- Settings.
- Lore.
- Any multi-step modal tutorial.

They boot into a playable dish with a first mergeable pair already visible. Audio stays muted until the first user gesture, so this does not conflict with browser audio restrictions.

Returning players may see a lightweight hub/title only after completing at least one run. Even then, the dominant action is "Play" and a resumed playable dish is no more than one tap away.

Exact first-time condition:

- Use `save.flags.cgFirstRunComplete !== true` as the product condition.
- If there is no save, corrupt save, storage unavailable, or migration failure, default to the first-time dish route.
- If a player closes during the first run, reload into the current first-run dish state when possible; otherwise reload into the first-time dish with already-earned DNA/atlas progress preserved.
- Do not show title, loadout, settings, notebook, atlas, lab report, or daily screens before the first accepted merge input.

Implementation entrypoint:

- `main.ts` should route through a single boot decision function before showing any screen.
- Current title and loadout routes remain available for normal/local builds and returning players.
- The CrazyGames first-time route uses a fixed starter loadout and ignores user loadout selection until after the first run endpoint.

Instrumentation requirements:

- Fire `first_frame` when live dish motion is visible.
- Fire local `gameplay_start` when the dish accepts input.
- If the CrazyGames SDK is integrated, call SDK `gameplayStart()` at the same moment.
- Fire `first_input` on the first drag/tap that affects the merge state.
- A clean install must not render the title or loadout before `first_input`.

### 0-1 Second

The dish is visible and alive. No splash, no logo, no static loading screen.

First-time state:

- Two Level 1 cells float near each other.
- A pulsing merge ring sits between them.
- A faint threat colony approaches from the edge.
- Bottom tray shows one large draggable egg.
- The only text: "Merge cells."

### 1-5 Seconds

First meaningful input:

- Desktop: drag one cell into the matching cell or click/tap the pulsing merge.
- Mobile: tap-and-drag or tap matching cell pair.

If the player does nothing by 3 seconds, the UI previews the drag path with a ghost motion. It does not open a modal.

### 5-15 Seconds

First reward:

- Merge completes.
- The cell grows visually, gets a roman tier badge or simple pip count, and emits DNA.
- HUD DNA meter fills immediately.
- Atlas slot flashes from silhouette to partial reveal.

### 15-30 Seconds

Second verb:

- "Feed it." A nutrient bubble appears within thumb reach.
- Tap or drag nutrient to the merged cell.
- The cell spreads and pushes back the threat colony.

### 30-90 Seconds

Full loop:

- Player merges a second pair.
- First upgrade choice appears as two large buttons, not a dense card set.
- First wave ends with a lab gate opening.
- Meta upgrade meter is already visibly filling.
- The player sees at least one locked atlas slot and one incubator slot.

Target funnel:

- Median time to first input: under 5 seconds.
- Median time to first reward: under 15 seconds.
- 80%+ of new players reach 90 seconds.

### Exact First-Run Beats

| Time | Beat | Player Action | Reward/State Change | Save Timing |
| --- | --- | --- | --- | --- |
| 0-5s | Live dish and merge prompt | Drag or tap matching pair | Input accepted | `first_input` immediately |
| 5-15s | First merge | Merge two Cell I capsules | Cell II spawns, +70 DNA including novice bonus, atlas reveal 1/3 | Save DNA and atlas immediately |
| 15-45s | Feed and stabilize | Tap nutrient bubble | Cell II expands, threat pushed back, +10 DNA | Save DNA immediately |
| 45-90s | First upgrade choice | Pick one of two upgrades | Upgrade applies instantly, +30 DNA chamber clear | Save upgrade and DNA immediately |
| 90-180s | Outbreak chamber | Merge/feed under pressure | Second atlas hint, incubator slot starts filling | Save each event |
| 180-240s | First extraction or boss | Survive or collapse | Run complete screen, one meta upgrade affordable | No end-only banking |

First-run minimum:

- If the player completes the first merge, they must be able to buy the cheapest meta upgrade after the run.
- If they collapse after 45 seconds but before earning enough DNA, grant a one-time novice stabilization bonus that tops them up to the cheapest upgrade cost. This bonus is saved immediately on collapse.

### First-Session Playtest Script

Use this test before implementation expands beyond MVP v1.

Setup:

- Fresh save.
- Sound muted.
- Mobile portrait viewport first, then desktop.
- No explanation from the observer.
- Let the player play for five minutes or until they quit.

Pass/fail checklist:

| Moment | Pass Condition | Fail Condition |
| --- | --- | --- |
| First still frame | Player can point to what they would interact with | Player asks "what is this?" or scans menus |
| First 5s | Player attempts merge or taps the merge target | Player waits, reads, or opens pause/settings |
| First 15s | First reward fires | Player has not completed a rewarding action |
| First 45s | Player understands feed/stabilize as second action | Player cannot distinguish owned cell from threat |
| First 90s | Player has picked an upgrade and predicts next wave | Player thinks the game is over or aimless |
| First run end | Player sees permanent gain and obvious retry | Player sees stats but no reason to return |

Minimum qualitative bar:

- 4 out of 5 cold players complete the first merge without verbal help.
- 4 out of 5 understand that merging made them stronger.
- 3 out of 5 voluntarily start a second run.
- Any player who closes the tab after a reward must keep that reward on reload.

If this playtest fails, do not add content. Fix the first-frame composition, merge affordance, reward timing, or retry loop.

## 9. Merge Mechanic

### Merge Objects

There are two merge object types:

1. Cell eggs in the bottom tray.
2. Live compatible colonies inside the dish.

The tray handles early readability. The dish merge provides the differentiator.

### Merge MVP

MVP rule: merge two matching Tier 1 capsules of the same family.

MVP object model:

| Field | Required Values |
| --- | --- |
| `familyId` | `sprinter`, `bulwark`, `grazer` for internal MVP; add `spark`, `medic` for Basic Launch |
| `tier` | `1`, `2`, `3`, `4` |
| `capsuleId` | Stable per spawned capsule during a run |
| `position` | Dish-space x/y plus screen-space hit target |
| `state` | `idle`, `dragging`, `validTarget`, `merging`, `spent` |
| `spawnSource` | `scriptedFirstRun`, `tray`, `drop`, `upgrade`, `incubator` |

MVP implementation:

- The first-run merge inputs are capsules, not arbitrary live CPM cells.
- The player drags one capsule into a pulsing merge ring around the matching capsule.
- On success, both input capsules are removed.
- One upgraded colony spawns at the merge centroid.
- The underlying sim receives one new owned colony with the upgraded breed/tier profile.
- DNA, atlas progress, and first-merge instrumentation fire immediately.
- The merge capsule does not mutate existing CPM cells in place during MVP.
- The output colony is a normal arena-owned entity after spawn.
- The merge system owns capsule input/readability; `arena` owns spawned colony behavior.

Reason for capsule-first MVP:

- It avoids high-risk surgery inside the CPM cell topology before the portal loop is proven.
- It keeps the first action visually obvious.
- It still lets the resulting merged organism use the current simulation.
- Live-colony merging can unlock later as a richer expression of the same verb.

### Merge Visual Prototype Spec

First-frame layout, mobile portrait:

- Dish centered, occupying roughly 70% of viewport width.
- Two matching Tier 1 capsules visible inside the lower half of the dish.
- Pulsing merge ring centered between them.
- Bottom tray contains one large spare capsule in the thumb zone.
- Threat colony appears near the upper rim, moving slowly toward the owned cells.
- DNA meter is visible but secondary.
- Atlas/incubator teasers are visible as small locked silhouettes, not panels.

Touch and pointer behavior:

- Minimum draggable capsule target: 52 CSS px.
- Minimum merge ring target: 56 CSS px.
- Mobile magnetic radius: at least 48 CSS px.
- Dragged capsule scales to 1.08x and casts a clear shadow/ring.
- Valid target pulses and shows matching pips.
- Invalid drop snaps back within 180 ms and briefly highlights the correct target.
- If idle for 3 seconds, show a ghost drag path once.

Animation timing:

- Successful merge anticipation: 150 ms inward pull.
- Merge flash and tier reveal: 300-450 ms.
- DNA burst reaches the HUD within 600 ms.
- Atlas partial reveal starts within 800 ms.
- Total time from valid drop to clear reward: under 1 second.

Text limit:

- First prompt: "Merge cells."
- Second prompt: "Feed it."
- No other tutorial copy in the first 30 seconds.

### Merge Rules

Default rule:

- Two matching objects of the same family and tier merge into one object of the next tier.
- Matching is shown by identical shape, color accent, and pip count.
- Valid targets use a minimum 48 CSS px magnetic radius on mobile.
- Invalid drags snap back quickly, pulse the correct matching target, and never punish the player.
- Tier cap for the first release is Tier 4. Merging two Tier 4 objects produces DNA, strain XP, and a temporary overcharge rather than Tier 5.
- Chain merge bonus unlocks later: 3+ compatible objects in one merge field pay extra DNA and a visual burst, but do not change the base two-object rule.

Live colony merge, later:

- Two compatible Tier 2+ colonies inside a catalyst field can fuse.
- The output colony inherits a percentage of combined mass and a new profile.
- This must wait until profiling proves it does not destabilize simulation performance or readability.

### Merge Output

Merging creates:

- Next-tier strain of the same family.
- DNA burst.
- Atlas progress.
- Temporary survival effect.

Reward values:

| Merge | DNA | Extra |
| --- | ---: | --- |
| First lifetime Tier 1 merge | 70 | Includes +60 novice bonus and first atlas reveal |
| Tier 1 to Tier 2 | 10 | Atlas progress |
| Tier 2 to Tier 3 | 20 | Strain XP |
| Tier 3 to Tier 4 | 40 | Strain XP and stronger survival effect |
| Tier 4 overcharge | 25 | Temporary effect, no new tier |

Examples:

| Family | Tier 1 | Tier 2 | Tier 3 | Survival Role |
| --- | --- | --- | --- | --- |
| Sprinter | Spore | Dart Cell | Needle Swarm | Fast hunter |
| Bulwark | Wall Cell | Shield Bloom | Bastion Ring | Defensive stabilizer |
| Grazer | Mouth Cell | Grinder | Devourer | Consumes hazards |
| Spark | Charge Cell | Arc Cluster | Storm Colony | Chain damage |
| Medic | Nurse Cell | Repair Bloom | Revival Mat | Repairs allies |

These names are placeholders. The first minute should use generic names like "Cell I" and "Cell II"; family identity can arrive after the player has merged successfully.

### Hybrid Merge

Hybrid discovery exists later and should reuse current catalysis/cross-breeding logic.

Unlock timing:

- First run: same-family merge only.
- Second run: first hybrid hint.
- Third run and beyond: catalytic merge recipes.

Rule:

- Hybrid merge requires two compatible Tier 2+ colonies and one catalyst field.
- Result is a new atlas silhouette reveal.

The current hidden discovery system becomes a visible "try this pair" goal instead of a background surprise.

## 10. Run Structure

### Run Length

Target run length:

- First run: 3-4 minutes.
- Normal run: 5-8 minutes.
- Daily run: 4-6 minutes.

Open-ended sandbox can exist after a successful stabilization, but the default CrazyGames run needs a clear conclusion.

Run endpoint rule:

- The first run endpoint is a scripted extraction gate at 180-240 seconds.
- The endpoint is not dependent on hidden homeostasis detection.
- The player may collapse earlier, but collapse still shows permanent gains and retry within 3 seconds.
- Normal runs may include optional continue/sandbox, but the default action after a chapter is extraction or next short chamber, not indefinite observation.

### First Run Structure

The first run is not open-ended. It is a designed 3-4 minute trial:

| Segment | Duration | Purpose | Completion |
| --- | ---: | --- | --- |
| Merge start | 0-15s | Teach first verb and pay first reward | First Tier 2 colony spawned |
| Stabilize | 15-45s | Teach feed and owned/threat contrast | Threat pushed away or consumed |
| Upgrade | 45-90s | Show run investment | One upgrade selected |
| Outbreak | 90-180s | Let merged colony matter under pressure | Clear pressure meter |
| Extraction | 180-240s | Give a real ending | Extract, collapse, or novice rescue result |

After this run, the player sees:

- DNA total.
- One affordable lab upgrade.
- One incubator slot with visible partial growth.
- At least three atlas silhouettes, including one partially revealed.
- One dominant "Run again" action.

### Chapters

Each run is built from short lab chambers:

1. Incubation: merge and grow.
2. Outbreak: survive pressure.
3. Stabilization: choose upgrade or extract.
4. Mutation event: optional risk-reward.
5. Final outbreak: boss colony or pressure spike.

Each chamber lasts roughly 45-75 seconds and is a natural save point, reward beat, and ad-safe boundary.

### End States

Collapse:

- Show permanent gains first.
- Dominant action: "Run again."
- Time from collapse to playable next run: under 3 seconds.

Extraction:

- Player can end after a chamber and keep current gains.
- Good for short portal sessions.

Homeostasis:

- Current equilibrium concept becomes the premium success state.
- Pressure pauses.
- Player gets an atlas reveal and optional "End Trial" action.

## 11. Progression and Retention

The game needs at least three independent return mechanisms.

### Retention Priority

Build retention in this order:

1. Live DNA and first affordable lab upgrade.
2. Atlas silhouettes and partial reveals.
3. Incubator offline accrual.
4. Daily specimen.
5. Rewarded accelerators.

Reason:

- Live DNA and the first upgrade protect second-run conversion.
- Atlas gaps create the clearest early "unfinished collection" loop.
- Incubator creates return intent, but it only matters if players already understand why DNA is valuable.
- Daily specimens matter after the player has enough context to care about a daily variant.
- Rewarded engagement should accelerate a healthy loop, not compensate for a weak one.

Do not build Daily before Atlas and the first upgrade are working. Do not tune rewarded ads before the first session retains.

### Mechanism 1: Incubator Accrual

The lab incubator grows cultures while away, capped at 4 hours.

Design:

- Incubator is visible during play as three glass slots.
- A slot fills with animated culture, not just a number.
- Returning player sees the dish changed: culture growth, new egg, or mutation chance.
- Full Launch can offer a rewarded double claim, but the basic claim is always available.

Persistence:

- Save timestamp and incubator slot state continuously.
- Use CrazyGames Data SDK when available, localStorage fallback otherwise.

### Mechanism 2: Daily Specimen

One daily seeded trial derived from UTC date.

Design:

- Same seed for all players.
- One special starting organism and one modifier.
- Reward: atlas fragment, cosmetic dish stain, or DNA.
- Missed days do not wipe a streak immediately. Use a forgiving streak with one grace miss.

### Mechanism 3: Atlas Collection

The Cell Atlas shows visible gaps.

Design:

- Locked cells show silhouettes and one hint.
- First atlas slot partially reveals in the first 30 seconds.
- Merge tiers have visible chains, so the player sees "Cell II" and "Cell III" before owning them.
- Hybrids sit in a separate late-game tab to avoid first-run overload.

### Mechanism 4: Lab Upgrades

At least one upgrade must be affordable after the first run, even after poor play.

Example upgrades:

- Start with one Level 2 egg.
- Incubator slot yield +10%.
- Nutrient radius +5%.
- Merge field cooldown -5%.
- First reroll free once per run.

Cost rule:

- There should always be one desirable purchase within one more run.
- Avoid long currency gaps.

### Economy Baseline

These are starting values for implementation and telemetry, not final tuning.

DNA sources:

| Source | DNA | Save Timing |
| --- | ---: | --- |
| First lifetime merge | 70 | Immediately |
| Normal Tier 1 merge | 10 | Immediately |
| Tier 2 merge | 20 | Immediately |
| Tier 3 merge | 40 | Immediately |
| Feed success | 10 | Immediately |
| Chamber clear | 30 | Immediately |
| First run extraction | 60 | Immediately on extraction |
| Daily specimen clear | 80 | Immediately |
| Atlas entry completed | 50 | Immediately |

Upgrade costs:

| Upgrade | Cost | Unlock Timing | Purpose |
| --- | ---: | --- | --- |
| Merge magnet +10% | 100 | After first run | Makes mobile merge easier |
| Starter Cell II | 150 | After first run | Faster opening reward |
| Incubator slot 2 | 180 | After two runs | Return hook |
| Nutrient radius +5% | 220 | After two runs | Survivability |
| Upgrade reroll token | 260 | After daily unlock | Rewarded/reroll economy bridge |

First-run affordability rule:

- Cheapest upgrade cost starts at 100 DNA.
- The first lifetime merge plus first chamber clear yields 100 DNA before the run ends.
- If a player collapses after engaging but before 100 DNA, apply one novice top-up to exactly 100 DNA.
- The top-up can only happen once per save.

Offline incubator:

- Base yield: 20 DNA per hour per active slot.
- Cap: 4 hours.
- Minimum visible claim: 5 DNA after 15 minutes.
- Slot 1 is unlocked in the first run.
- Slot 2 unlocks through upgrade.
- Slot 3 unlocks after daily specimen completion.

Daily streak:

- UTC-date seed.
- One grace miss is allowed before streak reset.
- Daily completion gives 80 DNA and one atlas fragment.
- Full Launch rewarded video may grant one extra attempt, not a better reward tier.

## 12. Monetisation

### Launch Policy

During CrazyGames Basic Launch, prioritize conversion, retention, and playtime. Ads are disabled by CrazyGames during Basic Launch. The code may contain safe wrappers, but the player must not see rewarded buttons, interstitial paths, or dead ad UI until Full Launch monetisation is being prepared.

Revenue rule:

- Do not optimize revenue until one-minute conversion, average play time, save reliability, and first meta upgrade purchase clear minimum viable thresholds.
- Rewarded placements may be implemented behind feature flags for platform verification.
- Interstitials stay disabled during first-session testing and any build where one-minute conversion is below target.
- If an ad placement lowers retry rate, runs per session, or D1 retention, remove or delay it even if short-term revenue rises.

### Rewarded Video Placements

Full Launch only.

Rewarded ads accelerate, rescue, or reroll. They never unlock required progression.

Allowed placements:

| Placement | When Offered | Reward | Guardrail |
| --- | --- | --- | --- |
| Double incubator | On return claim | 2x offline culture | Always allow normal claim |
| Rescue | Collapse after 90+ seconds | revive one colony or restore dish | Never on early failure |
| Upgrade reroll | Upgrade choice screen | redraw choices | Max once per upgrade |
| Daily extension | After daily fail | one extra attempt | Once per day |
| Mutation boost | Between chambers | +60s stronger merge drops | Not during active play |

Frequency:

- No rewarded offer more than once per 90 seconds.
- No interstitial in the first session.
- Interstitials only between runs and never before the third run of a session.
- Rely on SDK frequency capping for midgame ads.

### SDK Requirements

Implement a platform wrapper:

- Load SDK script only in CrazyGames build.
- Await `window.CrazyGames.SDK.init()`.
- Call `gameplayStart()` when the dish becomes playable.
- Call `gameplayStop()` for menus, pause, level transitions, and ad breaks.
- Pause simulation and input during ads.
- Mute game audio on `adStarted`.
- Restore prior audio state on ad finish or error.
- Treat ad errors as no-reward/no-penalty, with clean UI recovery.
- Honor SDK `muteAudio` above the player's own audio preference.
- Do not add an in-game fullscreen button; CrazyGames provides fullscreen.
- Do not show rewarded buttons during Basic Launch because ads are disabled there.

### Adapter Contracts

All platform code must be behind narrow adapters so local development, Basic Launch, and Full Launch behave predictably.

`crazyGames` adapter:

| Method | Requirement |
| --- | --- |
| `init()` | Safe no-op when SDK script is absent; resolves once. |
| `isAvailable()` | True only after SDK init succeeds. |
| `getSystemInfo()` | Returns SDK system info when available; otherwise local browser fallback. |
| `startGameplay(reason)` | Idempotent; calls SDK `gameplayStart()` only on stopped-to-started transition. |
| `stopGameplay(reason)` | Idempotent; calls SDK `gameplayStop()` only on started-to-stopped transition. |
| `applySettings(listener)` | Applies `muteAudio`; local fallback returns default settings. |

`storage` adapter:

| Method | Requirement |
| --- | --- |
| `load()` | Returns validated save or default save; never throws to caller. |
| `save(patch, reason)` | Synchronously commits to active store where possible; queues retry if SDK store is temporarily unavailable. |
| `flush(reason)` | Attempts to write all queued changes on pause, chamber end, visibility change, and run end. |
| `migrate()` | Imports existing discovery/strain saves once and records migration version. |
| `health()` | Reports active backend: `crazygames-data`, `localstorage`, or `memory`. |

`analytics` adapter:

| Method | Requirement |
| --- | --- |
| `track(name, payload)` | Non-blocking; never delays first frame or input. |
| `mark(name)` | Stores high-resolution local timing marks for funnel durations. |
| `flush()` | Batches asynchronously; local/dev builds log to console/debug overlay. |
| `largestDropoff(report)` | Computes release review summary from captured funnel counts. |

`ads` adapter:

| Method | Requirement |
| --- | --- |
| `isEnabled()` | False during Basic Launch and local builds unless explicitly enabled. |
| `offerRewarded(placement)` | Returns disabled state instead of rendering dead buttons when unavailable. |
| `requestRewarded(placement)` | Blocks UI, stops gameplay, requests SDK ad, handles finish/error. |
| `requestMidgame(reason)` | Full Launch only; natural breaks only; SDK cap handles frequency. |

### Save Schema

Use one versioned CrazyGames save root:

`cellular-death-match.cg.v1`

Minimum shape:

| Field | Purpose |
| --- | --- |
| `version` | Save schema version. |
| `createdAt`, `lastSeenAt` | Return-session and incubator calculations. |
| `dna` | Live currency, saved immediately. |
| `metaUpgrades` | Purchased lab upgrades and levels. |
| `atlas` | Entry states: `locked`, `hinted`, `partial`, `complete`. |
| `mergeTiers` | Highest tier seen per family. |
| `incubator` | Slot states, last update time, accrued DNA. |
| `daily` | UTC date seed, attempts, completion, forgiving streak. |
| `run` | Current first-run checkpoint if `cgFirstRunComplete` is false. |
| `flags` | `cgFirstRunComplete`, `noviceTopUpUsed`, migration markers. |

Save acceptance tests:

- Reload after first merge preserves DNA, atlas partial reveal, and `mergeTiers`.
- Reload after upgrade purchase preserves the upgrade and subtracts DNA exactly once.
- Reload after first-run collapse preserves novice top-up state and does not grant it twice.
- LocalStorage blocked/private mode does not crash and clearly degrades to session-only memory.
- CrazyGames Data unavailable locally does not change game behavior.

### Platform State Machine

Create explicit platform modules:

- `src/platform/crazyGames.ts`: SDK init, system info, gameplay lifecycle.
- `src/platform/storage.ts`: CrazyGames Data SDK, localStorage fallback, memory fallback.
- `src/platform/analytics.ts`: non-blocking funnel/event queue.
- `src/platform/ads.ts`: rewarded and midgame ad requests with pause/mute handling.

Runtime states:

| State | Meaning | SDK Gameplay State |
| --- | --- | --- |
| `booting` | JS loaded, no live gameplay | stopped |
| `firstPlayable` | live dish visible and accepting input | call `gameplayStart()` when this state begins |
| `activeRun` | dish simulation accepts input | started |
| `softPaused` | pause/settings visible | stopped |
| `betweenChambers` | upgrade/extract/menu choice | stopped |
| `adPending` | ad requested, UI blocked | stopped |
| `adPlaying` | ad callback `adStarted` fired | stopped, audio muted |
| `collapsed` | run failed, restart action visible | stopped |
| `betweenRuns` | post-run summary/hub | stopped |

Transitions:

- `booting -> firstPlayable`: first live dish frame rendered and input enabled; fire `first_frame`, local `gameplay_start`, and SDK `gameplayStart()` if integrated.
- `firstPlayable -> activeRun`: first input accepted; fire `first_input`.
- `activeRun -> betweenChambers`: chamber ends; call `gameplayStop()`.
- `betweenChambers -> activeRun`: next chamber starts; call `gameplayStart()`.
- `activeRun -> adPending`: pause simulation and input, call `gameplayStop()`, request ad.
- `adPending -> adPlaying`: mute on `adStarted`.
- `adPlaying -> activeRun`: restore prior audio preference, resume, call `gameplayStart()`.
- `adPending/adPlaying -> betweenChambers`: on error or dismissed menu path, keep gameplay stopped and recover UI.
- Do not call gameplay lifecycle events solely for browser focus loss.

## 13. Technical Plan

### Performance Targets

- First interaction: under 2 seconds on mid-tier Android over 4G.
- Initial critical payload: target under 1.5 MB compressed for this project, comfortably under CrazyGames mobile homepage limits.
- Sustained 30 FPS on 4-core / 4 GB Android.
- No frame above 100 ms during normal play.
- Legible and playable at DPR 1.
- Current local `dist` audit is about 1.3 MB total. Protect this advantage.

### Boot Strategy

Ship only the first playable dish:

- Core renderer.
- First two cell visuals.
- Merge interaction.
- First wave data.
- Minimal HUD.

Lazy-load after first input:

- Full Atlas screen.
- Lab upgrades.
- Daily trial.
- Audio.
- Advanced organism art.
- Debug tools.
- End-of-run report.

### Device Quality

At boot, detect:

- `navigator.hardwareConcurrency`
- `navigator.deviceMemory`
- `window.devicePixelRatio`
- viewport size
- CrazyGames app application type when SDK exists

Set:

- canvas resolution scale
- particle budget
- max colonies
- effect layer cap
- simulation tick budget
- visual bloom/shader budget

If average frame time exceeds budget for 3 seconds, step quality down once and do not step it back up during the session.

### Simulation

The current simulation is a differentiator but also a risk on low-end phones.

Initial approach:

- Profile current main-thread sim/render before adding merge VFX.
- Keep first-run dish small.
- Cap organism count hard in onboarding.
- Use cheaper render styles in first 30 seconds.
- Keep merge VFX as short sprite/canvas bursts, not persistent particle fields.
- Main-thread sim is acceptable for MVP only if target-device profiling stays inside budget.

MVP budgets:

| Budget | First Run | Normal Run | Low-End Step-Down |
| --- | ---: | ---: | ---: |
| Owned colonies | 8 | 18 | 10 |
| Threat colonies | 6 | 24 | 12 |
| Active VFX bursts | 8 | 16 | 6 |
| Canvas resolution scale | 1.0 | 1.0 | 0.75 |
| Simulation ms/frame average | 8 ms | 12 ms | 10 ms |
| Render ms/frame average | 10 ms | 12 ms | 10 ms |

Worker migration trigger:

- Input stalls or frame spikes above 100 ms on target Android during busy waves.
- Browser profiling shows simulation blocking render/input.
- 90th percentile frame time exceeds 33 ms for 3 consecutive seconds after quality step-down.

### Storage

Implement a storage adapter:

1. CrazyGames Data SDK for Full Launch or approved Basic Launch if initialized and Progress Save is enabled.
2. localStorage fallback for local/non-CG builds or when SDK Data is unavailable.
3. in-memory fallback if all persistent storage is unavailable.

Rules:

- Version save keys.
- Migrate current localStorage progress into the adapter.
- Save progress at every reward, atlas reveal, merge tier unlock, incubator update, and upgrade purchase.
- Keep CrazyGames cloud data below 1 MB.
- On CrazyGames with Data SDK enabled, the Data module is the authoritative store. localStorage is only a migration source or verified backup, not a separate competing save.

Continuous banking contract:

- DNA is committed before the reward animation finishes.
- Atlas progress is committed when the reveal event starts.
- Merge tier unlock is committed when the output colony is spawned.
- Unlocked strains are committed on discovery, not at run end.
- Incubator `lastUpdatedAt` is committed whenever the app backgrounds, pauses, enters a menu, or completes a chamber.
- A reload after any rewarded event must preserve that event.

Migration requirements:

- Preserve current discovery/notebook data.
- Preserve current strain library data.
- Convert old localStorage-only data into the storage adapter once, then mark migration complete.
- If CrazyGames Data SDK is available after guest progress already exists, merge guest progress into SDK data without deleting the local backup until a successful SDK write is confirmed.

## 14. UI and UX Requirements

### Portrait HUD

Mobile first layout:

- Dish occupies the center and majority of viewport.
- Bottom thumb zone contains egg tray and active merge/feed controls.
- Top-left shows DNA and run progress.
- Top-right shows pause/settings icon only.
- Atlas/incubator teasers are small side tabs, not permanent panels covering the dish.

### CrazyGames UI Compliance

- Do not render a custom fullscreen button in the CrazyGames build. CrazyGames provides fullscreen.
- Do not require landscape. Configure supported orientations in the submission flow and keep portrait as the primary experience.
- Add `user-select: none` and related touch handling to prevent long-press selection/context-menu friction in the game surface.
- All core controls must have at least 44 CSS px targets; first-run merge targets are larger.
- All important UI must respect safe-area insets in CrazyGames app webviews.
- The game must be playable with sound muted and with `devicePixelRatio` forced to 1.
- Owned/threat distinction cannot rely on color alone.
- Keep the game PEGI 12 compliant: stylized cellular conflict, no gore, no realistic disease panic, no graphic body horror.
- English is the first required localization. Any later localization must fall back cleanly to English.

### Visual Readability

Requirements:

- Player-owned cells have persistent outline or ring.
- Threat cells have distinct shape language, not just color.
- Mergeable matches pulse with the same icon/pip count.
- Damage is visual: flashes, pulses, or dish cracks.
- Effects never obscure the active merge target.
- Text is not the primary carrier for core actions.

### Vocabulary Metering

First 60 seconds:

- Merge.
- Feed.
- DNA.

First run:

- Upgrade.
- Atlas.
- Incubator.

Second run:

- Daily.
- Strain.

Later:

- Catalyst.
- Hybrid.
- Homeostasis.

## 15. Instrumentation

Add a non-blocking analytics adapter with local dev logging and platform-ready batching.

No external analytics endpoint is required for Basic Launch. CrazyGames provides the platform KPIs in the developer dashboard. The local analytics adapter exists to verify funnel timing and event order during development and QA.

Event payload minimum:

| Field | Requirement |
| --- | --- |
| `sessionId` | Random per browser session; not personally identifying. |
| `saveId` | Locally generated ID; no account dependency. |
| `buildMode` | `local`, `cg-basic`, or `cg-full`. |
| `deviceTier` | `low`, `mid`, `high` from boot detector. |
| `viewport` | Width, height, DPR. |
| `elapsedMs` | Milliseconds since `load_started`. |
| `runId` | Current run identifier where applicable. |

Required funnel events:

- `load_started`
- `first_frame`
- `gameplay_start`
- `first_input`
- `first_merge`
- `first_reward`
- `first_upgrade_choice`
- `survived_90s`
- `first_run_complete`
- `second_run_started`
- `meta_upgrade_purchased`
- `session_end`
- `return_session`

Ad events:

- `rewarded_offer_shown`
- `rewarded_offer_accepted`
- `rewarded_completed`
- `rewarded_error`
- `midgame_requested`
- `midgame_completed`

Merge events:

- `merge_attempted`
- `merge_completed`
- `merge_tier_unlocked`
- `hybrid_hint_seen`
- `hybrid_discovered`

Headline metrics:

- Time to first input.
- Time to first reward.
- 90-second survival/reach rate.
- One-minute conversion.
- Runs per session.
- Average play time.
- Day 1 retention.
- Rewarded offer accept and complete rate by placement.
- Largest funnel drop-off after each release.

### QA Gates

Automated gates before a CrazyGames candidate build:

- Fresh save starts with live dish, not title or loadout.
- Synthetic first input can happen within 5 seconds of page load.
- First merge reward can happen within 15 seconds after load.
- `survived_90s` or equivalent 90-second reach event fires during the first run.
- Reload immediately after first merge preserves DNA, atlas progress, and merge tier.
- Reload immediately after chamber clear preserves upgrade eligibility.
- Full Launch only: ad wrapper recovers cleanly from success, cooldown, unfilled, and adblock errors.
- Storage unavailable mode does not crash.
- DPR 1 screenshots at 375x667, 390x844, and 1280x720 show no overlapping HUD and readable merge targets.
- Desktop iframe screenshots at 907x510, 1216x684, 821x462, and 1280x720 are readable at DPR 1.
- Touch targets for first merge are at least 44x44 CSS px; target spec is 52-56 CSS px.
- `user-select: none` and equivalent touch-callout prevention are applied to the game surface.
- `muteAudio` SDK setting, if present, overrides in-game audio state.
- Build output remains below the project target unless a conscious release exception is documented.

Manual gates:

- CrazyGames iOS app webview.
- CrazyGames Android app webview.
- Low-end Android Chrome or equivalent throttled profile.
- Cover tested at 200 px in a portal-style grid.

Evidence required for sign-off:

- Fresh-save first-frame screenshot at 375x667 DPR 1.
- First-merge success screenshot at 375x667 DPR 1.
- First-run endpoint screenshot.
- Reload-after-first-merge proof from storage state.
- Performance trace or frame-time log from a low-end Android target or an agreed throttled substitute.
- Build size report showing total files, total size, and initial critical assets.

## 16. Cover and Store Assets

The cover must sell merge before it sells simulation while staying compliant with CrazyGames cover rules.

CrazyGames cover constraints:

- Prepare landscape 16:9, portrait 2:3, and square 1:1 cover assets.
- Do not use blurry, pixelated, copyrighted, bordered, or store-logo visuals.
- Do not use promo copy such as "Play now", "New", or "Merge cells" unless it is the actual game title.
- Do not submit a raw gameplay screenshot as the cover.
- Use the game title on the cover and make it legible at small size.

Cover composition:

- Two small cells combining into one large monster cell.
- A visual merge arrow, motion trail, or collision burst.
- Bright organism silhouette with teeth/spikes/energy ring.
- Petri dish rim.
- High contrast at 200 px.
- Title lockup with "Merge Lab" dominant.

Avoid:

- Abstract microscopic texture.
- Dense organism soup.
- Tiny UI screenshots.
- Dark, low-contrast lab ambience.
- Any non-title promotional text.

Store title guidance:

- Keep "Cellular Death Match" as the internal game identity.
- Preferred listing candidate: "Merge Lab: Cellular Death Match."
- Mechanic-led alternate: "Cell Merge Lab."
- Cover lockup should use the game title only, with "Merge Lab" dominant.
- Do not submit or test "Cellular Death Match" alone unless CrazyGames advises it; the merge verb is too commercially important to hide.

Metadata variants to prepare:

| Variant | Title | Cover Promise | Risk |
| --- | --- | --- | --- |
| Recommended | Merge Lab: Cellular Death Match | Merge cells into living monsters | Longer title needs careful cover typography |
| Short lockup | Merge Lab | Immediate merge promise | Less continuity with current project identity |
| Mechanic-led fallback | Cell Merge Lab | Merge cells into monsters | Generic, but highly legible |

Preview video:

- 15-20 seconds maximum.
- No sound dependency.
- Opening frame should match the static cover.
- Show first merge, first reward, a short outbreak, and upgrade/atlas progress.
- No black-screen logo transition, black bars, default cursor, or promo text.

The first cover review should happen before implementation reaches Phase 2. If the merge promise is not visible at 200 px without prohibited text, the art direction is wrong for CrazyGames.

## 17. Implementation Roadmap

### Phase 0: Platform Foundation, No Gameplay Expansion

- Add `crazyGames`, `storage`, `analytics`, and `ads` platform wrappers.
- Add data storage adapter and migration path from current localStorage saves.
- Add funnel instrumentation and local debug overlay/logging.
- Add first-frame and first-input timing.
- Add DPR 1/mobile quality checks to QA.
- Add fresh-save CG boot decision behind a build flag, but do not add new content yet.

Exit criteria:

- Existing game still builds and tests.
- Local SDK absence is safe.
- Save progress works with localStorage fallback.
- Boot decision can route to CG first-run mode without showing title/loadout.
- No regression to current non-CG route.

### Phase 1: First 90 Seconds Internal MVP

- First-time users boot directly into playable dish.
- Add capsule-first merge MVP.
- Add first reward inside 15 seconds with DNA and atlas save.
- Add live DNA meter and visible atlas teaser.
- Simplify first-run vocabulary.
- Add 3-4 minute first-run endpoint and novice top-up rule.

Exit criteria:

- New user can complete first loop without reading more than one sentence.
- Mobile portrait has no blocked dish area.
- 375x667 and 390x844 pass visual checks.
- Cheapest meta upgrade is affordable after first run.
- Reload-after-first-merge preserves progress.

### Phase 2: Internal MVP Completion

- Add cell tier model.
- Add tray/capsule merge interactions.
- Add merge rewards and atlas progression.
- Convert hidden discoveries into visible hints after first run.
- Add first three merge families.
- Add three lab upgrades.
- Profile MVP VFX on target device class.

Exit criteria:

- Merge is useful, readable, and repeatable.
- Same-family merge works in run one.
- First 90-second playtest passes the qualitative bar.
- Hybrid and live-colony merge remain deferred.

### Phase 3: CrazyGames Basic Launch Candidate

- Add incubator offline accrual.
- Add daily specimen seed.
- Expand atlas gaps and hints.
- Expand from three to five merge families.
- Ensure one upgrade is affordable after any first run.
- Prepare cover and metadata variants.
- Hide all ad buttons and interstitial paths.

Exit criteria:

- Three return hooks are visible.
- Progress saves continuously.
- Return session has changed world state, not just claim text.
- Candidate satisfies CrazyGames Basic Launch constraints and has no dead ad UI.

### Phase 4: CrazyGames Submission Hardening

- Payload audit.
- Low-end Android profiling.
- CrazyGames app webview tests.
- Cover at 200 px against a real portal grid.
- Fresh-save and reload persistence QA.
- Basic Launch ad-disabled QA.

Exit criteria:

- Candidate satisfies technical, gameplay, quality, app, and Basic Launch constraints.
- Evidence package exists for screenshots, storage, performance, build size, and first-run funnel.

### Phase 5: Basic Launch Review and Iteration

- Basic Launch metrics review.

Exit criteria:

- Conversion, average play time, and Day 1 retention data decide next work.
- Largest funnel drop-off is reported after each release.
- No new systems are added until the largest funnel drop-off has an explicit fix.

### Phase 6: Full Launch Monetisation, Metric-Gated

- Add rewarded slots.
- Add safe midgame interstitial boundaries.
- Ensure `gameplayStart` and `gameplayStop` are correct around every ad and menu.
- Verify ad failure paths.

Exit criteria:

- Full Launch path is approved or actively being prepared.
- Ads never gate progression.
- First session has no interstitial.
- Ad callbacks pause, mute, restore, and resume correctly.
- Monetisation does not reduce retry rate, runs per session, or D1 retention below thresholds.

## 18. Pre-Code Sign-Off Checklist

Implementation should not begin until this checklist is accepted as the product contract. These are design commitments; the QA gates above are the later proof that implementation satisfies them.

Product:

- [ ] The CrazyGames listing candidate is accepted: "Merge Lab: Cellular Death Match."
- [ ] The player promise is accepted: merge living cells, grow organisms, survive a five-minute lab outbreak.
- [ ] The distinction between Internal MVP v1 and CrazyGames Basic Launch candidate is accepted.
- [ ] The explicitly deferred scope is accepted.
- [ ] The non-goals are accepted.

First session:

- [ ] Fresh-save CrazyGames boot must bypass title/loadout.
- [ ] First frame must contain live dish, two matching capsules, merge ring, visible threat, and minimal HUD.
- [ ] First prompt is exactly "Merge cells."
- [ ] First reward target is under 15 seconds.
- [ ] First run endpoint is 3-4 minutes.
- [ ] First meta upgrade is guaranteed affordable after engaged play.

Retention:

- [ ] Live DNA and atlas progress must save immediately.
- [ ] First atlas page must have visible missing silhouettes.
- [ ] Incubator must be visible during play before it becomes a deep system.
- [ ] Daily specimen is required for Basic Launch, but not Internal MVP v1.

Platform:

- [ ] SDK wrapper state machine is accepted.
- [ ] Storage adapter and migration strategy are accepted.
- [ ] Analytics events and metric gates are accepted.
- [ ] Ads remain secondary until core retention thresholds are healthy.
- [ ] DPR 1 mobile portrait requirements are accepted.
- [ ] CrazyGames build removes custom fullscreen UI and respects safe areas.
- [ ] PEGI 12/stylized cellular conflict tone is accepted.

Commercial:

- [ ] Basic Launch success/failure thresholds are accepted.
- [ ] Cover promise is merge-first at 200 px without non-title promo copy.
- [ ] Any added feature must map to a target metric.
- [ ] The next iteration after release addresses the largest measured funnel drop-off.

## 19. Key Risks

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Merge feels bolted on | Players see two games instead of one loop | Make merge the first verb and primary reward source |
| Simulation remains too abstract | First frame fails one-second legibility | Use direct cell eggs, rings, pips, and visible threats |
| First run is too long | Portal players leave before meta appears | 3-4 minute first run, rewards inside 15 seconds |
| Current terminology overwhelms users | Comprehension failure | Strict vocabulary metering |
| Performance degrades on low-end mobile | Bad reviews, rejection risk | Device quality tiers, effect caps, profiling, possible worker migration |
| Ads hurt retention | Revenue gains offset by churn | Conservative slots, no first-session interstitial, rewarded only at desire points |
| Save sync breaks existing progress | Player trust loss | Versioned adapter and migration tests |
| "Death Match" underperforms in merge category | Lower CTR or wrong expectations | Put "Merge Lab" first in title and cover; keep Cellular Death Match as internal identity |

## 20. Adversarial Review Amendments

Adversarial review passes were run against the draft with two lenses:

1. Product/platform lens: optimize for one-minute conversion, Day 1 retention, session length, monetisation safety, mobile performance, and CrazyGames acceptance.
2. Implementation/spec precision lens: identify any ambiguity likely to cause code churn around boot flow, merge MVP, adapters, performance, QA, and phase boundaries.

First-pass highest-risk findings:

1. Progression was not concrete enough and the current game banks key progress too late for portal behavior.
2. First-frame gameplay conflicted with the current title/loadout route.
3. Merge was still too abstract and needed exact MVP rules.
4. The run structure inherited too much open-ended homeostasis DNA and needed a designed first-run endpoint.
5. Retention systems were named but not economized.
6. Performance planning was too optimistic for a main-thread cellular simulation plus new VFX.
7. SDK, ads, and gameplay lifecycle needed a state machine, not just requirements.

Amendments incorporated:

- Added current-code audit showing no SDK wrapper, current `dist` size, current title/loadout route, and run-end strain banking risk.
- Added hard CrazyGames first-time boot contract: no title, no loadout, live dish first.
- Added exact first-run beat table from 0 to 240 seconds.
- Changed merge MVP to capsule-first with exact valid/invalid behavior and tier caps.
- Added DNA source values, upgrade costs, first-run top-up rule, incubator formula, and daily streak rule.
- Added platform wrapper boundaries and a runtime state machine for gameplay lifecycle, ads, and pause.
- Added stricter performance budgets and a worker-migration trigger.
- Added continuous banking contract and migration requirements.
- Added automated and manual CrazyGames QA gates.

Second-pass blockers found:

1. Internal MVP and CrazyGames Basic Launch were not clearly separated.
2. Ad wrappers and rewarded placements could be misread as Basic Launch scope, even though CrazyGames disables ads during Basic Launch.
3. Average play-time targets were too soft for a successful CrazyGames product.
4. The roadmap put monetisation before Basic Launch review.
5. The pre-code checklist mixed design commitments with future implementation proof.
6. Platform adapters needed method-level contracts to prevent SDK/storage/analytics churn.
7. Save schema needed a named versioned root and reload acceptance tests.
8. Cover direction allowed non-title promo copy, which conflicts with CrazyGames cover guidance.
9. The recommended title still buried "Merge" after the internal identity.
10. `gameplayStart()` timing risked being tied to first input rather than the moment the dish becomes playable.
11. Custom fullscreen UI, PEGI 12 tone, and DPR 1 readability needed explicit platform gates.

Second-pass amendments incorporated:

- Separated Internal MVP v1 from CrazyGames Basic Launch candidate.
- Added a smaller First Playable Slice before Internal MVP v1 to prove first merge comprehension before building wider systems.
- Required the Basic Launch candidate to ship the three return hooks: atlas, incubator, and daily specimen.
- Raised strong average play-time target to 10+ minutes, with 5+ minutes as minimum viable.
- Moved monetisation to a Full Launch phase after Basic Launch review.
- Stated that Basic Launch must show no rewarded buttons, interstitial paths, or dead ad UI.
- Added adapter method contracts for `crazyGames`, `storage`, `analytics`, and `ads`.
- Added versioned save schema `cellular-death-match.cg.v1`.
- Added exact first-time boot condition based on `save.flags.cgFirstRunComplete`.
- Added evidence requirements for screenshot, reload, performance, and build-size sign-off.
- Converted pre-code sign-off into explicit product commitments rather than implementation proof.
- Changed the preferred CrazyGames title to "Merge Lab: Cellular Death Match" so the mechanic leads.
- Removed standalone "MERGE CELLS" cover copy and required the cover to sell merge through compliant title/art.
- Added cover asset and preview-video requirements.
- Corrected SDK lifecycle language so `gameplayStart()` fires when the dish is playable, not after the player hesitates.
- Added CrazyGames UI compliance gates: no custom fullscreen button, safe-area support, muted play, DPR 1, non-color-only reads, and PEGI 12 tone.

Cut from Internal MVP v1:

- Playable daily mode.
- Incubator depth beyond a visible teaser.
- Any user-facing ad or rewarded button.
- Interstitial logic.
- More than three merge families.
- More than Tier 4.
- Hybrid recipe UI.
- Catalyst terminology.
- Live-colony fusion.
- Cosmetic collection depth.

Remaining validation gates are implementation checks, not unresolved design decisions:

- Prove fresh-save CG boot bypasses title/loadout without breaking current run initialization.
- Prove capsule-first merge can spawn upgraded colonies cleanly through `arena` without invasive CPM mutation.
- Prove old discovery/strain save data migrates into the storage adapter with tests.
- Prove low-end mobile performance before live-colony merge or persistent VFX.
- Test title/cover variants, with "Merge Lab: Cellular Death Match" as the preferred listing candidate.
