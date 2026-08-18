# Cellular Death Match: CrazyGames Merge Design

Date: 2026-08-18
Status: Draft, amended after adversarial review
Target platform: CrazyGames web, mobile web, CrazyGames iOS/Android app webviews
Working platform title: Cellular Death Match
Platform-facing subtitle to test: Merge Lab

## 1. Executive Decision

Cellular Death Match should become a portrait-first, one-thumb, short-session merge survival game for CrazyGames.

The current project has strong raw material: live cellular simulation, strain discovery, persistent library, catalysts, mobile hardening, and a distinct look. The current risk is that the best parts are too abstract and delayed for portal traffic. A CrazyGames player needs to understand the first action immediately, earn a visible reward fast, and see permanent progression before closing the tab.

The design change is not "add a merge menu." Merge becomes the first verb and the main readability layer:

1. Drag or tap cell eggs into the dish.
2. Merge matching cells into stronger strains.
3. Use the merged strain to survive short outbreaks.
4. Bank DNA continuously.
5. Fill a visible atlas and incubator that create return hooks.

The CPM ecosystem remains the differentiator, but it moves behind a clear merge-survival surface.

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

Market reference pages:

- Merge category: https://www.crazygames.com/t/merge
- Tropical Merge: https://www.crazygames.com/game/tropical-merge
- Merge Galaxy: https://www.crazygames.com/game/merge-galaxy/

Important platform facts from the research:

- New users should land directly in simple gameplay or be one click from it.
- CrazyGames measures initial load until the first `gameplayStart` SDK event once SDK integration exists.
- Mobile homepage candidates should keep initial download under 20 MB; top performers often stay below that.
- CrazyGames Basic Launch watches average play time, Day 1 retention, and conversion. Their guide frames strong Day 1 retention around 10-15%, and top titles can reach 80%+ one-minute conversion.
- CrazyGames SDK gameplay events must be accurate. `gameplayStart()` should fire only when playable gameplay starts or resumes; `gameplayStop()` should fire on menus, pause, level switches, and ads.
- Ads must be SDK-driven, non-deceptive, and placed at natural breaks. Video ads must not interrupt gameplay.
- Data SDK should be used for CrazyGames save sync. Its API mirrors localStorage and uses localStorage for guests, with a 1 MB storage limit.
- CrazyGames app webviews require safe-area handling, fullscreen awareness, and legibility at devicePixelRatio 1.

### Current Codebase Implications

Local audit, 2026-08-18:

- Current `dist` is about 1.3 MB, so the existing build footprint is a strong starting point.
- There is no CrazyGames SDK wrapper today. SDK, ads, gameplay lifecycle, analytics, and storage sync must be new platform code.
- Current first-time flow still has title/loadout routing. The CrazyGames build must bypass those for true first-time users.
- Current strain banking is run-end oriented. CrazyGames retention needs immediate banking for DNA, atlas progress, merge tiers, incubator timestamps, and unlocked strains.
- Current onboarding is a 3-beat coach around egg, nutrient, and bloom. The CrazyGames first minute needs to be rebuilt around merge first, then feed.

## 3. Product Positioning

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

## 4. Core Design Pillars

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

## 5. Core Loop

### Moment-to-Moment Loop

1. Place or drag cell eggs into the dish.
2. Merge matching live cells or capsules.
3. Merged organism fights, feeds, spreads, or stabilizes.
4. Collect DNA drops and strain fragments.
5. Choose a simple upgrade.
6. Survive the next outbreak.

### Session Loop

1. Start a 3-8 minute lab trial.
2. Complete three to five outbreak waves.
3. Earn live DNA, strain XP, atlas entries, and incubator charge throughout the run.
4. End at collapse, extraction, or stabilised homeostasis.
5. Spend one obvious affordable upgrade.
6. Start again with a stronger starting egg or new strain.

### Return Loop

1. Return to see incubator growth in the dish.
2. Claim or double the growth.
3. Run the daily specimen seed.
4. Fill missing atlas silhouettes.
5. Upgrade the lab and improve future merges.

## 6. First 90 Seconds

### CrazyGames First-Time Boot Contract

For the CrazyGames build, a player with no completed-run save state must bypass:

- Title screen.
- Loadout selection.
- Settings.
- Lore.
- Any multi-step modal tutorial.

They boot into a playable dish with a first mergeable pair already visible. Audio stays muted until the first user gesture, so this does not conflict with browser audio restrictions.

Returning players may see a lightweight hub/title only after completing at least one run. Even then, the dominant action is "Play" and a resumed playable dish is no more than one tap away.

Instrumentation requirements:

- Fire `first_frame` when live dish motion is visible.
- Fire `gameplay_start` when the dish accepts input.
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

## 7. Merge Mechanic

### Merge Objects

There are two merge object types:

1. Cell eggs in the bottom tray.
2. Live compatible colonies inside the dish.

The tray handles early readability. The dish merge provides the differentiator.

### Merge MVP

MVP rule: merge two matching Tier 1 capsules of the same family.

MVP implementation:

- The first-run merge inputs are capsules, not arbitrary live CPM cells.
- The player drags one capsule into a pulsing merge ring around the matching capsule.
- On success, both input capsules are removed.
- One upgraded colony spawns at the merge centroid.
- The underlying sim receives one new owned colony with the upgraded breed/tier profile.
- DNA, atlas progress, and first-merge instrumentation fire immediately.

Reason for capsule-first MVP:

- It avoids high-risk surgery inside the CPM cell topology before the portal loop is proven.
- It keeps the first action visually obvious.
- It still lets the resulting merged organism use the current simulation.
- Live-colony merging can unlock later as a richer expression of the same verb.

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

## 8. Run Structure

### Run Length

Target run length:

- First run: 3-4 minutes.
- Normal run: 5-8 minutes.
- Daily run: 4-6 minutes.

Open-ended sandbox can exist after a successful stabilization, but the default CrazyGames run needs a clear conclusion.

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

## 9. Progression and Retention

The game needs at least three independent return mechanisms.

### Mechanism 1: Incubator Accrual

The lab incubator grows cultures while away, capped at 4 hours.

Design:

- Incubator is visible during play as three glass slots.
- A slot fills with animated culture, not just a number.
- Returning player sees the dish changed: culture growth, new egg, or mutation chance.
- Rewarded video can double the claim, but basic claim is always available.

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
- Rewarded video may grant one extra attempt, not a better reward tier.

## 10. Monetisation

### Launch Policy

During CrazyGames Basic Launch, prioritize conversion, retention, and playtime. Ads can be integrated safely but should remain conservative until the game proves the first-session loop.

### Rewarded Video Placements

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
| `firstPlayable` | live dish visible, input about to unlock | call `gameplayStart()` once input is accepted |
| `activeRun` | dish simulation accepts input | started |
| `softPaused` | pause/settings visible | stopped |
| `betweenChambers` | upgrade/extract/menu choice | stopped |
| `adPending` | ad requested, UI blocked | stopped |
| `adPlaying` | ad callback `adStarted` fired | stopped, audio muted |
| `collapsed` | run failed, restart action visible | stopped |
| `betweenRuns` | post-run summary/hub | stopped |

Transitions:

- `booting -> firstPlayable`: first live dish frame rendered; fire `first_frame`.
- `firstPlayable -> activeRun`: first input accepted; fire `first_input` and `gameplayStart()`.
- `activeRun -> betweenChambers`: chamber ends; call `gameplayStop()`.
- `betweenChambers -> activeRun`: next chamber starts; call `gameplayStart()`.
- `activeRun -> adPending`: pause simulation and input, call `gameplayStop()`, request ad.
- `adPending -> adPlaying`: mute on `adStarted`.
- `adPlaying -> activeRun`: restore prior audio preference, resume, call `gameplayStart()`.
- `adPending/adPlaying -> betweenChambers`: on error or dismissed menu path, keep gameplay stopped and recover UI.
- Do not call gameplay lifecycle events solely for browser focus loss.

## 11. Technical Plan

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

- Atlas.
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

1. CrazyGames Data SDK if initialized.
2. localStorage fallback.
3. in-memory fallback if storage is unavailable.

Rules:

- Version save keys.
- Migrate current localStorage progress into the adapter.
- Save progress at every reward, atlas reveal, merge tier unlock, incubator update, and upgrade purchase.
- Keep CrazyGames cloud data below 1 MB.

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

## 12. UI and UX Requirements

### Portrait HUD

Mobile first layout:

- Dish occupies the center and majority of viewport.
- Bottom thumb zone contains egg tray and active merge/feed controls.
- Top-left shows DNA and run progress.
- Top-right shows pause/settings icon only.
- Atlas/incubator teasers are small side tabs, not permanent panels covering the dish.

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

## 13. Instrumentation

Add a non-blocking analytics adapter with local dev logging and platform-ready batching.

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
- Ad wrapper recovers cleanly from success, cooldown, unfilled, and adblock errors.
- Storage unavailable mode does not crash.
- DPR 1 screenshots at 375x667, 390x844, and 1280x720 show no overlapping HUD and readable merge targets.
- Build output remains below the project target unless a conscious release exception is documented.

Manual gates:

- CrazyGames iOS app webview.
- CrazyGames Android app webview.
- Low-end Android Chrome or equivalent throttled profile.
- Thumbnail tested at 200 px in a portal-style grid.

## 14. Thumbnail and Store Assets

The thumbnail must sell merge before it sells simulation.

Thumbnail composition:

- Two small cells combining into one large monster cell.
- Big visible "MERGE" or visual merge arrow if text is allowed.
- Bright organism silhouette with teeth/spikes/energy ring.
- Petri dish rim.
- High contrast at 200 px.

Avoid:

- Abstract microscopic texture.
- Dense organism soup.
- Tiny UI screenshots.
- Dark, low-contrast lab ambience.

Store title guidance:

- Keep "Cellular Death Match" as the game identity if the user wants continuity.
- Test metadata/subtitle around "Merge Lab" or "Cell Merge" because the portal audience needs the verb before the lore.

## 15. Implementation Roadmap

### Phase 0: Measurement and Platform Foundation

- Add `crazyGames`, `storage`, `analytics`, and `ads` platform wrappers.
- Add data storage adapter and migration path from current localStorage saves.
- Add funnel instrumentation and local debug overlay/logging.
- Add first-frame and first-input timing.
- Add DPR 1/mobile quality checks to QA.
- Add fresh-save CG boot route that bypasses title/loadout behind a build flag.

Exit criteria:

- Existing game still builds and tests.
- Local SDK absence is safe.
- Save progress works with localStorage fallback.
- Fresh-save CG route can prove live dish first frame, first input, and first reward timings.

### Phase 1: First 90 Seconds Rebuild

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

### Phase 2: Merge System

- Add cell tier model.
- Add tray/capsule merge interactions.
- Add merge rewards and atlas progression.
- Convert hidden discoveries into visible hints after first run.
- Add first five merge families.
- Profile and decide whether live-colony merge belongs in Phase 2 or a later release.

Exit criteria:

- Merge is useful, readable, and repeatable.
- Same-family merge works in run one.
- Hybrid merge unlocks later without first-run overload.

### Phase 3: Retention Systems

- Add incubator offline accrual.
- Add daily specimen seed.
- Expand atlas gaps and hints.
- Ensure one upgrade is affordable after any first run.

Exit criteria:

- Three return hooks are visible.
- Progress saves continuously.
- Return session has changed world state, not just claim text.

### Phase 4: Monetisation

- Add rewarded slots.
- Add safe midgame interstitial boundaries.
- Ensure `gameplayStart` and `gameplayStop` are correct around every ad and menu.
- Verify ad failure paths.

Exit criteria:

- Ads never gate progression.
- First session has no interstitial.
- Ad callbacks pause, mute, restore, and resume correctly.

### Phase 5: CrazyGames Submission Hardening

- Payload audit.
- Low-end Android profiling.
- CrazyGames app webview tests.
- Thumbnail at 200 px against a real portal grid.
- Basic Launch metrics review.

Exit criteria:

- Conversion and Day 1 retention data decide next work.
- Largest funnel drop-off is reported after each release.

## 16. Key Risks

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Merge feels bolted on | Players see two games instead of one loop | Make merge the first verb and primary reward source |
| Simulation remains too abstract | First frame fails one-second legibility | Use direct cell eggs, rings, pips, and visible threats |
| First run is too long | Portal players leave before meta appears | 3-4 minute first run, rewards inside 15 seconds |
| Current terminology overwhelms users | Comprehension failure | Strict vocabulary metering |
| Performance degrades on low-end mobile | Bad reviews, rejection risk | Device quality tiers, effect caps, profiling, possible worker migration |
| Ads hurt retention | Revenue gains offset by churn | Conservative slots, no first-session interstitial, rewarded only at desire points |
| Save sync breaks existing progress | Player trust loss | Versioned adapter and migration tests |
| "Death Match" underperforms in merge category | Lower CTR or wrong expectations | Keep identity but test subtitle/thumbnail around "merge cells" |

## 17. Adversarial Review Amendments

An adversarial review pass was run against the first draft. The reviewer was asked to optimize for one-minute conversion, Day 1 retention, session length, monetisation safety, mobile performance, and platform acceptance.

Highest-risk findings:

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

Open validation questions before implementation:

- Confirm fresh-save CG boot can bypass title/loadout without breaking current run initialization.
- Confirm capsule-first merge can spawn upgraded colonies cleanly through `arena` without invasive CPM mutation.
- Confirm old discovery/strain save data can migrate into the storage adapter with tests.
- Confirm low-end mobile performance before live-colony merge or persistent VFX.
- Decide whether CrazyGames metadata should lead with "Cellular Death Match: Merge Lab" or a more direct title like "Cell Merge Lab" while preserving the internal game identity.
