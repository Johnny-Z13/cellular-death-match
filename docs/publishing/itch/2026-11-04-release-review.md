# itch.io release review — 4 November 2026

Recommendation: a good candidate for a free browser release with optional donations, after a small release-hardening pass. Hold public launch until the startup failure and outstanding asset evidence are resolved. No new gameplay systems are needed for this first release.

This review tested the current working tree, including pre-existing uncommitted package/security/test changes. No game code was changed and nothing was published.

## Findings

### P1 — Storage denial leaves the title screen unusable

`src/main.ts:183` reads `window.localStorage` outside a try/catch before startup wiring completes. If the getter throws a SecurityError, the title screen renders but Run Trial does nothing. The later persistence-failure handling cannot catch this earlier failure.

Reproduced against the production bundle by injecting a throwing localStorage getter before page initialization. Normal startup entered the arena; the denied-storage case remained on the title screen with a page error. This is an injected browser-policy failure, not evidence that default itch.io storage is blocked.

Smallest fix: acquire storage behind a guarded adapter, fall back to session memory, and show an honest “progress cannot be saved” notice. Add a browser startup regression for getter failure as well as existing write-failure coverage.

### Release gate — Asset evidence is not complete

The current prebuild attribution check reports 54 digest-matched media assets, 9 cleared, and 45 pending/blocking records (`releaseReady: false`). The build still succeeds because digest integrity is distinct from release approval.

The owning evidence is `docs/publishing/evidence/crazygames-v1-rights-provenance.md` and `crazygames-asset-attributions.json`. Although named for CrazyGames, it inventories the same public media copied into this build. It records outstanding ElevenLabs plan-at-generation evidence and visual approval. This is incomplete clearance evidence, not a finding that the assets infringe rights. Reconcile existing evidence before commissioning replacements.

The game includes generated imagery and sound. Complete itch.io's AI Disclosure accurately for shipped materials. The cellular simulation itself is ordinary procedural computation and does not cause that disclosure requirement. Source: https://itch.io/docs/creators/quality-guidelines#ai-disclosure

### P2 — Small-phone guidance loses useful text

At 375×667, screenshots show the goal-complete bonus ending “Finish the trial…” and the Open Lab Food Web hint ending “so they outgro…”. Controls remain usable and the goal remains visible, but explanatory text is clipped where a novice may need it most. Shorten the compact copy or provide a way to expand it without permanently covering the dish. Keep the larger layouts unchanged.

Evidence: `test-results/playwright/responsive-keeps-the-Petri-f8b30-le-and-core-controls-usable-small-phone/gameplay.png` and `test-results/playwright/journeys-plays-the-five-Tr-05cb9-d-resumes-an-Open-Lab-study-small-phone/open-lab-study-resumed.png` (ignored test artifacts, replaceable on subsequent runs).

## Product assessment

The living pixel cultures, restrained lab interface, Dr. E, discovery reveals, and collection progression give the game a recognizable identity. The title screen clearly offers growing cultures and discovering strains. The five-trial Case successfully leads into the Open Lab in the tested interaction path. The dish remains substantial and core controls reachable on both phone sizes.

The main positioning risk is “Death Match” suggesting direct combat or PvP. Keep the name if desired, but lead the itch page with “Grow strange cultures. Discover new strains. Keep the dish alive.” Show actual cultivation and a discovery in screenshots or a short clip. Avoid promising multiplayer or a combat-first experience.

The existing 630×500 cover is usable and matches the game. Pair it with gameplay screenshots showing intervention and discovery. The automated journey demonstrates reachability, not whether an unfamiliar player understands the rules or enjoys the later-game pace. A short unprompted first-player session is more useful now than adding features.

## Verification

- `npm test`: passed; 931 Vitest tests across 123 files, plus 4 Node security test results. Initial sandbox-only run could not bind a local server; rerun with local-server permission passed.
- `npm run build`: passed, including typecheck, icon checks and attribution integrity. Asset release clearance remains false as described above.
- Production browser command: `CDM_URL=http://127.0.0.1:5199 npx playwright test e2e/responsive.spec.ts e2e/journeys.spec.ts e2e/persistence.spec.ts e2e/dish-input.spec.ts e2e/reduced-motion.spec.ts --workers=2`.
- Browser result: 21 passed, 17 intentional project/platform skips. This is a selected release suite, not the entire E2E suite.
- Layouts: 390×844, 375×667, 844×390, 768×1024, 1280×720. Inspected captured title/gameplay and small-phone Open Lab images.
- Full five-trial Case and Open Lab restart passed on phone, small phone, and desktop. Save checks include interrupted trials, reveals, upgrades and a failed bank write.
- Additional production probes: nested `/upload/game/index.html` startup passed; cross-origin local iframe startup passed; blocking Google Fonts still allowed arena startup. Normal and embedded probes had no page errors or HTTP failures.
- Distribution: approximately 1.8 MB on disk, 63 files; relative Vite base already configured. Within itch's documented HTML5 file-count and size limits.
- Not checked: actual itch-hosted build, Safari/WebKit, Firefox, physical touch devices, sustained mobile frame rate/thermal behavior, human listening, long-session retention or fresh-player comprehension.

## Release steps

1. Fix denied-storage startup and verify the warning/fallback behavior.
2. Reconcile the pending asset evidence and complete the disclosure accurately.
3. Tighten small-phone hint copy; have an unfamiliar player attempt the Case and first Open Lab study without coaching.
4. Build, zip the contents of `dist/` with `index.html` at the archive root, then validate a private itch upload on desktop and a physical phone, including audio unlock, reload behavior, fullscreen and background/resume.
5. Publish the complete page after those checks. Recommend HTML Game, click-to-launch fullscreen, free with optional donations. Enable Mobile Friendly after the physical-phone check.

itch's HTML5 documentation confirms relative asset paths, ZIP packaging, fullscreen options, mobile behavior and donation-based HTML5 payments: https://itch.io/docs/creators/html5

To reproduce locally: `npm run build`, then `npm run preview -- --host 127.0.0.1 --port 5199 --strictPort`; run the browser command above. The next concrete engineering change is the guarded storage adapter and startup regression.

## Follow-up

The storage startup and compact-copy findings were addressed during the subsequent preparation pass. See [preparation results](./2026-11-04-preparation.md) for the candidate, tests, WebKit fix and remaining release checks. This review above preserves the original findings.
