# Claude Project Notes

This project is a Vite + TypeScript browser game. Use `AGENTS.md` as the canonical contributor guide; this file exists so Claude-style agent workflows have an obvious entry point.

## Current Direction

Cellular Death Match is currently a mobile-first Petri dish ecosystem game, not the older keyboard shooter described in the historical Superpowers plans. Current play revolves around selecting egg strains, applying reagents (nutrient, toxin, water, salt, acid), combining them into catalytic reactions, and completing six ecology objectives. The heart of the game is emergent discovery: reactions reveal rare **breeds**, and bringing two discovered breeds together under a nutrient field **cross-breeds** them into **hybrid** offspring. Every lifeform has a distinct dish silhouette (its `renderStyle`) and a discoverer's-notebook entry.

## Verification

Before claiming a change is ready:

```bash
npm test
npm run build
```

For UI or gameplay work, also smoke check phone portrait and desktop browser layouts.

**Dev-server gotcha:** port `5173` is currently occupied by an unrelated project ("Death Match Pool"). Start this game on a free port for any browser check, e.g. `npm run dev -- --port 5199 --strictPort`, and verify the page title is "Cellular Death Match" before trusting a screenshot.

## Useful References

- `README.md`: player-facing overview and local setup
- `AGENTS.md`: repo boundaries and agent workflow
- `docs/current-state.md`: current feature map
- `cloud.md`: static hosting notes
