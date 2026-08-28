# Implementation and Verification Findings

Date: 2026-08-28
Status: Implemented, verified, and signed off by primary and adversarial reviewers

## Delivered program

The seven signed designs were integrated in dependency order rather than as
isolated UI patches:

1. capability-solvable Open Lab Studies with truthful `Uses` requirements and
   resume-time revalidation;
2. category-specific lifeform and reaction evidence ladders;
3. verified journaled banking, explicit bank/abandon consequences, and
   immediate specimen ownership at every completed Study boundary;
4. exact coaching for Trials 1–2 followed by hypothesis and layered recovery
   guidance;
5. honest macro-boundary saves that explicitly restart active cultures;
6. a content-derived Genome Archive north star separate from Study seedability;
7. dish-first Trial/Study introductions through Dr. E's rail.

## Findings that reopened implementation

The harness and adversarial review found and closed defects that the first
green pass missed:

- abandoning Trial 2 returned to a stale Trial 1 title state;
- a procedural Study could be offered, saved, then rejected after reload
  because run-scoped stabilized specimens were not checkpointed;
- telemetry reset order erased the newly checkpointed run specimen set;
- a first-time Open Lab reaction could be over-promoted to understood;
- a failed bank left the simulation and tools live against a frozen retry plan;
- permissive journal canonicalization could replay malformed null stores over
  valid research state;
- mechanical Notebook abbreviations obscured the two evidence ladders;
- authored mobile Trials still duplicated the coach with a central banner;
- an armed abandon survived Notebook navigation;
- restarting an unsealed Case could incorrectly open the Open Lab loadout UI;
- valid-shaped but unknown or oversized journal content could exceed its
  authority and overwrite current research stores;
- the first defensive journal envelope was smaller than a legitimate long-term
  biome archive and maximum checkpoint;
- one-shot assignment announcements could remain stale in the accessibility
  tree, and Method-card focus could remain on a hidden screen;
- several surrounding messages still instructed the player to press `End`
  after the action had become `Bank result`.

Every item above now has either a focused deterministic regression or a real
browser assertion. The false-green browser checks were strengthened to assert
the active screen and live interaction state, not hidden stale DOM text.

## Automated evidence

- Vitest: 94 files, 726 tests passed.
- Complete Playwright corpus: 16/16 passed across phone and the five-layout
  responsive matrix.
- Final critical save/discovery soak: 21/21 passed across three repetitions
  after the last adversarial correction.
- Strengthened save/Open Lab path after fixes: 6/6 passed.
- Full five-Trial Case into Open Lab after fixes: passed, including reload and
  seeding Bloom Mass as a run-earned specimen.
- Maximum 256-entry archive plus 10,001-result checkpoint: accepted and banked;
  first overflow compacts the oldest biome without blocking the result.
- TypeScript typecheck, production build, and `git diff --check`: passed.
- Runtime monitors reported no uncaught page errors in the browser journeys.

The adversarial reviewer independently reran the focused persistence and
keyboard paths and issued final program sign-off with no remaining blockers.

Journey timing output is harness throughput, not a human play-length metric.
The scripted Case completes in roughly 7–21 seconds of accelerated active
automation; the current design expectation for a first human Case remains a
moderated-playtest question rather than a claim derived from automation.

## Manual release questions

Automation does not replace these bounded release checks:

- physical iOS/Android touch and browser-chrome interruption;
- VoiceOver/TalkBack announcement quality;
- audio unlock, mute, and haptic behavior on real devices;
- three-player novice teach-back for the difference between observing,
  reproducing, stabilizing, and owning evidence;
- real-player Case duration and whether Trials 3–5 provide enough recovery help
  without returning to recipe-following.
