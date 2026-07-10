# Reagent Cooldowns — Design

**Date:** 2026-07-10
**Status:** Approved

## Problem

Reagent placement has no rate limit: single-tap reagents can be spammed as fast
as `pointerdown` fires until stock runs out (`arena.applyTool` only checks
`charges <= 0`). Button-mashing flood-fills the dish and trivializes pacing.

## Decision

Add a per-tool, sim-tick cooldown that layers on top of the existing stock
counts. Stock stays the strategic budget per epoch; the cooldown adds tactical
pacing between uses. A classic radial wipe on each tool button communicates
readiness.

## Sim model

- `TOOL_TUNING` (src/content/ecologyTuning.ts) gains `cooldownTicks` per tool.
  `AGITATION_TUNING` gains `cooldownTicks` for the Agitate action.
  Starting values (60 ticks ≈ 1s nominal, retune freely):
  egg 120, nutrient 90, water 90, toxin 180, salt 180, acid 240,
  paste 180 (starts when the stroke ends), agitate 300.
- `PlayerConfig` gains optional `toolCooldownMult` (default 1) — the modifier
  target for future upgrades; effective cooldown is
  `round(cooldownTicks * toolCooldownMult)`.
- Arena keeps a `readyAtTick` per tool. `applyTool` rejects a placement while
  `tickNo < readyAtTick` (charge NOT spent); a successful charge spend starts
  the cooldown. Paste is special: mid-stroke stamps are never cooldown-gated;
  the cooldown starts at `endPasteStroke()` if the stroke stamped anything, and
  gates only the first stamp of a new stroke. `agitate()` follows the same
  ready-gate pattern.
- `ToolState`/`AgitationState` gain `cooldownRemainingTicks` and
  `cooldownTicks` so the UI can derive a 0→1 readiness fraction.

Sim-tick basis keeps the mechanic deterministic and consistent under pause and
sim-speed changes.

## UI

- The per-frame `updateToolCharges` / `updateAgitation` calls already push tool
  state every frame; screens.ts sets `--cooldown` (remaining fraction) and a
  `tool-cooling` class on each `[data-tool]` button and the Agitate button.
- CSS renders a conic-gradient radial wipe over the tool icon while cooling,
  plus a subtle dim. Same buttons power the mobile tray, so no extra work.
- A dish tap during cooldown no-ops; the sweep is the feedback.

## Tutorial

Cooldowns stay live in Epoch 1: the coach's beats are egg → nutrient
(different tools), so per-tool cooldowns cannot stall progression.

## Tests

- New tests/game/toolCooldown.test.ts: rapid same-tool reuse rejected without
  spending a charge; allowed after the window; paste stroke-end behavior;
  agitate gate; `toolCooldownMult: 0` disables gating.
- Config drift-guard: every `TOOL_TUNING` entry has `cooldownTicks > 0`.
- Existing catalysis/recipe tests that need same-tool rapid sequences set
  `toolCooldownMult: 0` (the real tuning knob) — ticking past the window would
  decay the very fields those recipes depend on. Tests asserting tool-state
  shapes gain the two new fields.
