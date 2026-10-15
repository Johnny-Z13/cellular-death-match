# Cellular Death Match alpha tester portal

Public tester link: https://cellular-death-match.vercel.app

Static HTML/CSS/ES module, in the game's fonts (Michroma, IBM Plex Mono, Newsreader) and palette. A brief Z13 ident, a live-dish hero captured from the title screen, a **Play now** link to the hosted build at `/play/`, compact Alpha Build notes, in-game captures, getting-started and rescue guides, and mailto feedback. No analytics, signup or autoplay audio. "Play intro with sound" replays the game's Z13 ident jingle; Escape, a second press or hiding the page stops it. Reduced motion skips the ident.

CDM is a browser game, so there are no installers: the build itself is hosted at `/play/` (desktop and phone; its manifest's `start_url` is `./`, so Add to Home Screen from `/play/` opens the game).

## Local preview

From the repository root:

```sh
node scripts/stage-playtest.mjs "Alpha Build 1" alpha-1 "One-line summary"
python3 -m http.server 4191 --bind 127.0.0.1 --directory playtest
```

The Python server previews the page and the staged game; the headers in `vercel.json` (noindex, CSP, no-cache) only apply on Vercel. `play/` is ignored by git: it is a copy of `dist/` built from a committed game, and `release.json` records that commit.

## Publishing a new alpha

1. Commit the game. `stage-playtest.mjs` refuses to run with uncommitted changes under `src/`, `public/`, `index.html`, `package.json` or `vite.config.ts`, so every staged build is reproducible from `release.json`'s `sourceCommit`.
2. Run `npm test`, then stage with a new version and id. Update the visible build notes in `index.html` (eyebrow date, title, New/Known lists, feedback subject line) to match `release.json`.
3. From **playtest/**, inspect `vercel deploy --dry --format=json --scope z13labs`, then `vercel deploy --prod --skip-domain --yes --scope z13labs`. Check the deployment with `vercel curl` (portal, `/play/`, `/release.json`) and in a browser under the real CSP, then `vercel promote <deployment-url> --yes --scope z13labs` and, if needed, `vercel alias set <deployment-url> cellular-death-match.vercel.app --scope z13labs`.

Vercel project `z13labs/cellular-death-match`. CLI credentials are local and excluded (`.vercel`, `.env*`). Never print credentials or put them in command arguments. No Git repository or game source is uploaded: only this folder, with `play/` holding the built bundle. The build is public to anyone with the link; `noindex` is not access control. Saves live in the tester's browser.

## Assets

Every image is captured from the game (`assets/*.webp`); the Z13 mark and ident jingle are the game's own (`public/branding/`).
