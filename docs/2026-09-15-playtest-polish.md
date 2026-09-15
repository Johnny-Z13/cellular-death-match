# Playtest and input polish — 15 September 2026

## Baseline

Fetched `origin` and confirmed clean `main` at `e095b63`, with zero commits
ahead or behind. The live Vercel alias served the same baseline JS/CSS assets.
The baseline passed 762 unit/integration tests and 40 browser checks (35
intentional viewport skips).

## Changes

This pass preserves the simulation, progression, authored Trials and layout.

- **Phone drawing:** the dish now owns touch gestures. Previously the browser
  could interpret a Paste drag as panning/pinching, emit `pointercancel`, and
  cut the stroke short. Native scrolling remains available outside the dish.
- **Multi-touch:** only the first finger owns the stroke. A second finger can
  no longer spend stock or create an unintended connecting trail.
- **Interruptions:** opening Options, Notebook or a mobile drawer ends the
  current stroke; changing specimens, leaving the arena and losing focus also
  release its capture. No hidden painting continues behind a paused overlay.
  A deliberate dish tap still dismisses the specimen drawer and places the
  selected specimen, preserving the existing onboarding recovery path.
- **Accidental input:** secondary mouse buttons do not spend reagents; holding
  Enter/Space does not repeatedly stamp Paste after each cooldown. Each keyboard
  placement requires a fresh press.
- **Landscape toolbar:** the fully unlocked rack now uses compact vertical
  buttons. Desktop-style text columns previously grew it to 141px tall and
  covered roughly 60px of the dish. A browser regression checks the full rack
  stays below the dish and its buttons remain at most 70px tall.

The mouse-button, multi-touch, paused-drag and landscape regressions were reproduced as
failing browser tests before their fixes. Native touch-event inspection also
confirmed browser gesture cancellation as the cause of interrupted phone drags.

## Verification

- `npm test`: 100 files / 762 tests passed.
- `npm run build`: TypeScript, attribution consistency check and Vite build passed.
- Full browser suite before the final landscape CSS adjustment: 48 passed /
  52 intentional viewport skips. Final landscape touch, preview and responsive
  checks: 3 passed / 4 intentional skips. The required unit suite and production
  build were then rerun successfully.
- Fresh five-Trial Case completion, discovery reveals, Method choices, entry to
  Open Lab, rare-genome loadout, experimental protocol discovery and reload recovery.
- Incorrect/repeated onboarding inputs, abandon confirmation, failed-save retry,
  isolated preview, reduced motion and portrait/landscape rotation.
- Native touch trails on 390×844, 375×667, 844×390 and 768×1024; multi-touch on
  390×844; mouse/keyboard interruption tests on 1280×720. The 814×756 compact
  window regression also remains covered.
- Manual delayed onboarding completed after a long pause between egg and feed.
- A 90-second Open Lab idle observation advanced 5,409 simulation ticks without
  runtime errors, with mutations, replenished cultures and three accidents.
  It remained an active Study; this is not a claim that an idle dish wins.
- Representative title, gameplay, Trial 5, resumed Open Lab, touch-input and
  Notebook screenshots were inspected.
- Production verification at `cellular-death-match.vercel.app` completed the
  five-Trial journey and responsive checks. Rebuilt committed JS/CSS matched the
  deployed assets byte for byte. Three repetitions of the phone, landscape and
  desktop input paths passed all 18 applicable checks. This exposed and removed
  a test timing race: recovery now waits to see cooldown start before waiting
  for it to finish, rather than accepting the previous frame's ready state.

## Run and remaining checks

```sh
npm run dev -- --port 5199 --strictPort
npm test
npm run build
npx playwright test --workers=2
```

Phone/tablet browser emulation does not establish physical-device performance
or audio quality. The next check is a real-phone playthrough, especially a long
Paste stroke and switching away from the browser mid-drag.

There is still no service worker/offline installation. Open the game while
connected before travelling; loading or refreshing underground is not guaranteed.
Reload preserves research/assignment checkpoints but restarts active cultures.

The existing CrazyGames provenance check still reports 51 publishing blockers;
this pass does not change those approvals.
