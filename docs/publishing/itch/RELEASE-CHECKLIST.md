# itch release candidate

## Build and package

Run `npm test`, `npm run test:e2e -- --workers=2`, then `npm run package:itch` and `npm run test:itch`.

Packaging rebuilds the game, stages the contents of `dist/` plus the project licence, checks itch's file-count/path/size limits, validates ZIP integrity, and writes:

- `output/itch/cellular-death-match-itch.zip` — upload candidate; index.html is at its root.
- `output/itch/manifest.json` — archive SHA-256, file hashes, size and pending asset-record count.

The package command uses the system `zip` and `unzip` executables. Generated artifacts stay ignored. A successful package is a technical validation candidate, not a declaration that pending asset evidence is resolved. The normal build verifies attribution digests, not distribution clearance.

## Remaining public-release checks

- Resolve the 45 pending media records in `docs/publishing/evidence/crazygames-asset-attributions.json`. Current repository evidence still leaves visual approval and ElevenLabs generation-plan eligibility outstanding. Do not invent or infer approval from a successful build.
- Review the page copy and accurately complete AI Disclosure for the final shipped materials.
- Upload the candidate to a private itch page and check initial launch, fullscreen, sound unlock, Options, trial completion, reload and background/resume.
- Test that same hosted candidate on a physical phone, including portrait/landscape, readable hints, touch input and sustained play.
- Listen to the mix with reactions active; check mute and Dr. E's voice switch.
- Have a new player attempt the Case and first Open Lab study without coaching.
- Publish only once the page has its cover, screenshots, accurate controls/save description and the above checks are resolved.

Google Fonts remains an external HTTPS dependency. Blocking it does not prevent startup, but self-hosting licensed font files remains an optional future improvement.

Sources checked during the release review: https://itch.io/docs/creators/html5 and https://itch.io/docs/creators/quality-guidelines#ai-disclosure
