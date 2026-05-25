# Claude Project Notes

This project is a Vite + TypeScript browser game. Use `AGENTS.md` as the canonical contributor guide; this file exists so Claude-style agent workflows have an obvious entry point.

## Current Direction

Cellular Death Match is currently a mobile-first Petri dish ecosystem game, not the older keyboard shooter described in the historical Superpowers plans. Current play revolves around selecting egg strains, applying nutrients and toxins, and completing five ecology objectives.

## Verification

Before claiming a change is ready:

```bash
npm test
npm run build
```

For UI or gameplay work, also smoke check phone portrait and desktop browser layouts.

## Useful References

- `README.md`: player-facing overview and local setup
- `AGENTS.md`: repo boundaries and agent workflow
- `docs/current-state.md`: current feature map
- `cloud.md`: static hosting notes
