# Legibility overhaul — morning hand-off

Branch: `ux/legibility-overhaul`, branched from `main` at `be3e1a4`. It is not pushed or merged.
Spec: [`../superpowers/specs/2026-10-09-legibility-overhaul-design.md`](../superpowers/specs/2026-10-09-legibility-overhaul-design.md) · Plan: [`../superpowers/plans/2026-10-09-legibility-overhaul.md`](../superpowers/plans/2026-10-09-legibility-overhaul.md)

The brief: make it obvious *what is what*, on phone and on desktop, without touching the cellular-automata core. `src/sim/` is unchanged.

## See it

Before and after shots of the same scripted states:

- [Phone 390×844](compare/phone.jpg)
- [Small phone 375×667](compare/small-phone.jpg)
- [Landscape 844×390](compare/phone-landscape.jpg)
- [Tablet 768×1024](compare/tablet-portrait.jpg)
- [Desktop 1280×720](compare/desktop.jpg)

The raw shots are in `before/` and `after/`.

```bash
npm run dev -- --port 5199 --strictPort
```

To play as a first-time player, open Options → "Delete all laboratory data". To jump straight to a busy, fully unlocked dish, open Options → "Reveal all", then pick a trial.

## What changed

| | Before | After |
|---|---|---|
| **Goal** | The goal was hidden whenever Dr. E spoke, its wording described a result, and there was no progress shown. | An always-visible goal strip with an imperative goal ("Feed a Swarmlet until it becomes Bloom Mass"), a meter, and "Done". Dr. E docks underneath it, and his live line gives the how-to hint. |
| **The dish** | Unnamed coloured blobs; the red one was never explained. | One name tag per strain. Goal cultures get a dashed ring and ◎. A tap (or a fresh egg) names that culture. On desktop, hovering a culture shows a card with its name, role, behaviour, size and trend. The control sample explains itself. |
| **Events** | Only rings on the dish; the text went to the Log. | Short callouts at the event ("New strain: Bloom Mass", "Predator outbreak"). They sit beside what they name, never on it, and goal-relevant ones rank first. |
| **Words** | About 20 overlapping nouns. | One vocabulary, recorded in `src/content/glossary.ts` (Culture, Strain, Egg, Tool, Reaction, Trial, Upgrade, Notebook, Balance, Badge). A unit test and the e2e readability walk fail the build if a retired word renders. |
| **Type** | 6.5–11px on desktop. | An 11px floor everywhere, guarded by an e2e check on every viewport. |
| **Phone rack** | Scrolled sideways and hid tools; Abandon sat among the tools. | Wraps to show every tool. The finish slot appears only as **Finish trial**; **Leave trial** is a two-tap action in Options. |
| **Desktop** | The dish used about 40% of the width; the rail was cramped. | The dish is sized from the available height; goal and Dr. E sit side by side above it. |
| **Lessons** | Crises could land mid-lesson, and a dead or drifting culture could soft-lock Trial 2. | Hazards are held during Dr. E's lessons. If the lesson culture dies ("It didn't take") or the result never comes ("No reaction yet"), the lesson restarts. |
| **First minute** | Nothing said what the game was. | A title pitch, Dr. E's welcome names the mutation hook, and the Trial 1 goal names the mutation. |
| **Smaller aids** | | A desktop ghost ring for a tool's reach, upgrade cards that say when their tool isn't in your rack yet, a solid phone Log sheet, and an agar plate behind the dish. |

## Adversarial review

An independent game-design reviewer played the build twice: Playwright with touch emulation, 26 guided Trial 2 runs, and every viewport.

- **Round 1** found 12 defects introduced by this pass and 10 pre-existing issues. All of the introduced defects are fixed. The worst were labels smothering the bloom moment, false "New strain" callouts, a broken tablet rack, and tags drawn over overlays.
- **Round 2** verified those fixes and found:
  - a P0 I had introduced: the title pitch pushed **Run Trial** off phone screens;
  - a rarer Trial 2 stall;
  - duplicate tags and some clipping.

  All are fixed, and the title has an e2e guard (`e2e/title-cta.spec.ts`).

Deliberately not changed. Each is your call:

1. **One-click play (CrazyGames wants ≤1 click to gameplay).** Today it's Run Trial, then Dr. E's welcome card. That card is a documented onboarding contract (`docs/onboarding-script-and-event-contract.md`), so I didn't remove it. My recommendation: fold the welcome copy into the first instruction, and consider landing first-time players straight in Trial 1.
2. **Upgrades for tools you haven't unlocked yet are flagged, not filtered.** The authored pools are seeded, and save/replay depend on that seed. The reviewer would rather filter them out.
3. **The dish empties fast.** Five planted Swarmlets are mostly gone within 8s, and one Chromatic Spill wiped an Open Lab dish in about 3s. This is sim balance, out of scope for a UI pass, but the reviewer rates it the biggest retention risk.
4. **Crisis timing is invisible**, which makes "Keep 3+ cultures alive through a crisis" hard to act on.
5. **Dr. E's pointer bubble** still covers the shell row when it points at a tool.
6. **Mutation tints were softened** (`TRAIT_TINT` in `src/ui/render.ts`) so a mutated Swarmlet stays cyan instead of reading as a Splitter. Revert it there if you preferred the stronger tints.
7. **The "drag the rack to reveal Water" lesson** no longer triggers on phones, because every tool is visible. The code is kept as a fallback.

## Verification (final head)

- `npm test`: 105 files, 805 tests passed.
- `npm run build`: clean, including the CrazyGames credits check.
- `npx playwright test`: all applicable checks passed across phone, small phone, landscape, tablet and desktop.

  New specs: `goal-bar`, `dish-labels`, `log-sheet`, `type-floor` (11px floor plus vocabulary), `title-cta`, and full-rack fit.
- Browser emulation only. This doesn't establish real-device performance or audio.

## Where things live

| File | Purpose |
|---|---|
| `src/legibility.css` | Loaded last. Goal strip, coach docking, labels, phone rack, type tokens. |
| `src/ui/dishLabels.ts` | Pure label planner. Tunables in `DISH_LABEL_TUNING`. |
| `src/ui/dishLabelOverlay.ts` | Renders the planned labels. |
| `src/ui/dishLabelRuntime.ts` | Feeds the planner from the running game. |
| `src/game/goalTargets.ts` | Which cultures count toward the goal. |
| `src/content/goalCopy.ts` | Goal headlines. |
| `src/content/glossary.ts` | The vocabulary. |
| `src/game/lessonRecovery.ts` | Guided-lesson rescue. |
| `scripts/ux-compare.mjs` | Rebuilds the comparison sheets. |
| `e2e/ux-shots.spec.ts` | Captures evidence: `CDM_UX_SHOTS=<label> npx playwright test e2e/ux-shots.spec.ts`. |
