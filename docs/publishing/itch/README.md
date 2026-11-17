# itch.io page art

`cover-630x500.png` is the itch cover image, at itch's recommended size.
`cover-1260x1000.png` is the same cover at 2×.

The cover uses no generated imagery. `cover-dish.png` is a frame from the game's
own simulation: a dish grown with all 14 strains. `cover.html` sets the title
over it in the game's fonts (Michroma and IBM Plex Mono) and draws the strain
name tags in the same style as the in-game dish labels.

To re-render, open `cover.html` in a 1260 × 1000 viewport, wait for the fonts
to load, and take a screenshot. Then downscale the screenshot to 630 × 500.

## Release preparation

- [Preparation results](./2026-11-04-preparation.md)
- [Page copy](./PAGE-DRAFT.md)
- [Release checklist and packaging](./RELEASE-CHECKLIST.md)
- [Initial review](./2026-11-04-release-review.md)

`npm run package:itch` rebuilds and creates `output/itch/cellular-death-match-itch.zip`.
`npm run test:itch` extracts that exact ZIP and checks an embedded gameplay/reload
journey in Chromium, Firefox and WebKit at desktop and phone sizes. Install the
browsers with `npx playwright install chromium firefox webkit` if needed. The
check uses local port 5203, writes screenshots and a JSON result alongside the
ZIP, and fails if an engine is missing or any journey fails.

These commands prepare and validate a local candidate; they do not upload or
publish it. See the checklist for the remaining asset and hosted-device checks.
