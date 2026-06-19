# Claude Project Notes

This project is a Vite + TypeScript browser game. Use `AGENTS.md` as the canonical contributor guide; this file exists so Claude-style agent workflows have an obvious entry point.

## Current Direction

Cellular Death Match is a mobile-first Petri dish ecosystem game with roguelike meta-progression. Each run is open-ended: Epoch 1 is a guided 3-beat onboarding (~30s), Epochs 2-3 teach ecology and breeding, then mid-game epochs continue with escalating pressure until the ecosystem either collapses (fail) or reaches homeostasis (win). Reagents modify CPM energy coefficients so breeds have distinct physics (compact bruisers, loose swarmlets, spreading bloom). Discovered breeds are banked to a strain library; players choose egg loadouts before each run. The heart of the game is emergent discovery: reagent combos reveal rare **breeds**, cross-breeding produces **hybrids**, and stable equilibrium states are classified as named **biomes** — all logged in the discoverer's notebook.

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
