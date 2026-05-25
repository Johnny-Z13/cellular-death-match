# Repository Prep Checklist

Use this checklist before uploading the repository.

## Must Pass

```bash
npm test
npm run build
git status --short
```

## Files That Should Exist

- `README.md`
- `AGENTS.md`
- `CLAUDE.md`
- `cloud.md`
- `.gitignore`
- `package.json`
- `package-lock.json`
- `vite.config.ts`
- `tsconfig.json`
- `index.html`
- `src/`
- `tests/`
- `docs/current-state.md`

## Files And Folders That Should Not Be Committed

- `node_modules/`
- `dist/`
- `.claude/`
- `.playwright-cli/`
- `.superpowers/`
- `test-results/`
- `playwright-report/`
- `*.tsbuildinfo`

## Manual QA

Desktop:

- Start a run from the title screen.
- Confirm HUD, dish, tools, lifeform guide, inspector, and log do not overlap.
- Pick at least one upgrade after an epoch.

Mobile:

- Start with `npm run dev -- --host 0.0.0.0`.
- Open the Vite network URL on iPhone.
- Confirm the dish is tappable in portrait.
- Confirm the bottom tool sheet is reachable.
- Confirm the Lifeforms panel is readable and horizontally scrollable.
- Confirm selecting egg strains changes the Egg button color.

## Known Pre-Upload Notes

- The app is static and client-only.
- No secrets are required.
- No license file has been chosen yet.
- No CI workflow has been configured yet.
