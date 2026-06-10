# Cloud And Deployment Notes

Cellular Death Match is a static Vite application. It does not require a server runtime, database, secrets, background workers, or cloud functions.

## Build

```bash
npm install
npm run build
```

The production output is written to:

```text
dist/
```

## Current Deployment: Railway

The game is deployed on Railway, auto-building from the GitHub repository's `main` branch. Pushing to `main` triggers a new build and deploy — no manual step needed.

```text
Build command: npm run build
Output: dist/ (static)
```

## Other Static Hosting Options

Any static host also works:

- Vercel
- Netlify
- GitHub Pages
- Cloudflare Pages
- itch.io HTML game upload

Recommended settings:

```text
Build command: npm run build
Output directory: dist
Install command: npm install
Node version: 20 or newer
```

## Vercel

Vercel can auto-detect the Vite project. If configuring manually:

```text
Framework preset: Vite
Build command: npm run build
Output directory: dist
```

No environment variables are required.

## GitHub Pages

If deploying under a repository subpath, Vite may need a `base` path in `vite.config.ts`. For a root-domain or custom-domain deployment, the current config is fine.

## Mobile QA Before Upload

Run a network-visible dev server:

```bash
npm run dev -- --host 0.0.0.0
```

Open the printed `Network:` URL on an iPhone on the same Wi-Fi. Check:

- Title screen fits without horizontal scrolling.
- Dish remains visible and tappable in portrait.
- Lifeforms panel and bottom tools do not overlap.
- Egg strain selection updates the Egg button color.
- Nutrient and toxin effects are visible after tapping the dish.

## Current Cloud Limitations

- Run state resets on reload. Discovery progress can persist via localStorage when the player enables the persistence toggle in the dish inspector; no server-side saves.
- No analytics or telemetry.
- No service worker or offline cache.
- GitHub Actions runs tests and the build on every push to `main`; Railway deploys independently of CI status (no deploy gate).
