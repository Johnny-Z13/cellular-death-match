# itch preparation — 4 November 2026

A local upload candidate is prepared. Nothing has been uploaded, published, committed or pushed.

## Changes

- Guard browser storage acquisition at boot, including getter/read/write failures and ignored writes. Preserve readable progress in temporary memory when writes are blocked. Show a reload-loss warning on the title and in Options.
- Keep later persistent-write failures on the existing verified-save/retry path. Temporary play can bank discoveries and progress between trials within the current page session.
- Shorten the first-trial success hint and Food Web hint so their instructions fit the small-phone layout.
- Fix a reproduced desktop WebKit ResizeObserver warning by scheduling HUD docking writes in the next animation frame. The same iframe journey failed before this change and passed afterward.
- Add `npm run package:itch`: build, package the contents with index.html at the ZIP root, include the project licence, omit macOS metadata, check upload limits and ZIP integrity, and write a SHA-256 manifest.
- Add `npm run test:itch`: extract the exact ZIP, serve it at a nested path inside a cross-origin iframe, and play the first trial, choose an upgrade, enter Trial 2 and reload. Check page errors and failed local HTTP responses in Chromium, Firefox and WebKit at 1280×720 and 375×667.
- Add page-copy and release-checklist drafts.

## Candidate

- ZIP: `output/itch/cellular-death-match-itch.zip`
- Size: 1,080,037 bytes; 62 files; 1,650,253 uncompressed bytes.
- SHA-256: `3fdf903679fd7a590f90bedccaf91628226015567ca097577e463d021bd3db51`
- Inventory: `output/itch/manifest.json`
- Browser results and screenshots: `output/itch/browser-check.json` and `output/itch/*-gameplay.png`

Generated candidates are ignored by Git and can be rebuilt. This checksum identifies this candidate only; a rebuild may have a different build identity or archive metadata.

## Verification

- Final `npm test`: 936 tests passed in 124 Vitest files, plus the Node security checks.
- Production build: passed typechecking, attribution-integrity and icon checks.
- Packaged ZIP: all six browser/viewport journeys passed with no page errors or local HTTP failures.
- New startup-denial journeys cover getter failure, read failure, throwing writes and silent writes across the five configured viewport projects. Existing bank-write retry behavior remains covered.
- Visually checked the temporary-play warning at 375×667 and settled gameplay in the packaged Firefox/WebKit views; the shortened first-trial instruction fits.

The first development E2E run had one Open Lab interruption while source edits were still occurring. Both Open Lab tests passed against the stable production bundle; the complete stable-code rerun passed: **124 browser tests passed, 91 intentionally skipped, zero failures** (4.5 minutes). Skips cover non-applicable input/layout combinations, live-host-only routes and optional screenshot captures.

## Remaining release work

The asset register still has 45 pending media records. Local evidence does not resolve the required visual approvals or ElevenLabs generation-plan eligibility; no clearance flags were changed. The page draft explicitly identifies generated imagery/audio for disclosure review.

The actual itch-hosted build, physical-device performance, human audio listening, and unprompted newcomer play remain unchecked. WebKit automation is not a physical iPhone test. Google Fonts is still an external HTTPS dependency.

Next: use this candidate for private itch-hosted validation, resolve the asset records, and do the phone/listening/new-player checks in `RELEASE-CHECKLIST.md` before public release.

Pre-existing package/dependency/security and arena-test edits were preserved. The package script additions share the existing modified package.json; they do not claim ownership of those earlier changes.
