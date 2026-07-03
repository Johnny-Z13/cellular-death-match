# Juice Pass v1 — Design

Date: 2026-07-03
Status: approved (design), pending implementation plan

## Problem

Diagnosis from a played run (desktop, Epoch 1, tutorial skipped):

1. **Interactions have no tactile payoff.** Placing an egg or reagent gives a
   sound but no visual kickback at the touch point. The act feels weightless.
2. **Silent state-changes.** Colony births, deaths, and discoveries happen
   with no per-position visual event (banners/toasts exist for big unlocks,
   but the dish itself stays mute).
3. **Time pressure is invisible.** The DEADLINE readout renders as static
   text ("55s") with no per-second motion, color shift, or urgency.

Scope decision: **juice pass only.** No simulation, balance, or mechanic
changes. Deadline *mechanics* and active-threat gameplay are a possible later
pass.

## Goal

Every player interaction kicks back visibly, and important sim events become
visible at their dish position — with zero changes to simulation behavior.

Success criteria:

- Tapping the dish with any tool produces an immediate ripple at the touch
  point, tinted per tool.
- Colony birth, death, and discovery each produce a particle burst at the
  event's dish position.
- The deadline readout visibly ticks (pulse) and ramps amber→red as it
  drops below thresholds.
- Outbreak/crisis/discovery/flare events trigger a brief dish shake.
- `prefers-reduced-motion` degrades every effect to a static/instant state.
- Deleting the juice module would leave gameplay identical (no sim writes).
- `npm test` and `npm run build` stay green; new particle logic has unit
  tests.

## Architecture

One new module, minimal edits to existing files.

### New: `src/ui/juice.ts`

Owns all transient per-position visual feedback. Imperative API:

```ts
interface Juice {
  ripple(pos: [number, number], tool: ToolId): void;
  burst(pos: [number, number], color: string, kind: 'birth' | 'death' | 'discovery'): void;
  shake(intensity: 'soft' | 'hard'): void;
  draw(ctx: CanvasRenderingContext2D, sx: number, sy: number): void;
}
```

- Positions are grid coordinates; `draw` receives the same grid→display
  scale factors the renderer uses.
- Particles/ripples are plain objects in a capped array (hard cap ~200
  live particles); oldest evicted first. Cheap `arc` fills only.
- Ages by `performance.now()` deltas; self-cleaning.
- `shake` toggles the existing `dish-shake` CSS class pattern on the canvas
  (re-usable intensity variants live in CSS).
- Honors the same `matchMedia('(prefers-reduced-motion: reduce)')` check the
  render/fx layers use: ripples render one static frame, bursts are skipped,
  shake falls back to the existing dish flash.

### Edits: `src/main.ts` (hook points only)

- `pointerdown` handler (~line 265): on successful `applyTool`, fire
  `juice.ripple(pos, selectedTool)`. Egg placements also get a short-lived
  "pop" overlay at the spawn position.
- Event-diff/ticker block (~line 1290): where `births`, `mutations`,
  `outbreaks` deltas are already detected, fire `juice.burst(...)` at the
  event's dish position; fire `juice.shake(...)` for outbreak / crisis /
  discovery / catalytic flare.
- Render loop (~line 637): call `juice.draw(...)` immediately after
  `renderer.render(...)` so juice draws on top of the bloom layers.

### Edits: `src/ui/screens.ts` + `src/styles.css`

- The `secondsRemaining` HUD readout (screens.ts ~line 524) gets a
  per-second pulse class and an amber→red color ramp below thresholds
  (e.g. ≤20s amber, ≤10s red). Reduced motion: color ramp only, no pulse.
- CSS: clock pulse keyframes, a second dish-shake intensity variant.

### Untouched

`src/sim/**`, `src/game/arena.ts` (no writes; may add a read-only position
on an existing event payload if one is missing), all `src/content/**`,
`src/ui/render.ts`.

## Effects (priority order)

1. **Tap feedback** — expanding, fading ring at the touch point, tinted per
   tool (cyan egg / gold nutrient / violet toxin / green paste). Egg adds a
   quick pop on the new cell.
2. **Life & death particles** — small glow-mote spray on birth, bigger
   celebratory burst on discovery, dark dissolving puff on colony death.
3. **Living countdown clock** — per-second pulse + amber→red ramp. Pure
   presentation; the deadline mechanic is unchanged.
4. **Dish shake on big events** — soft/hard variants reusing the existing
   `dish-shake` pattern (currently fired only on Agitate).

## Testing

- Unit tests for the particle system core: spawn, age-out, cap enforcement,
  reduced-motion behavior (mirroring existing fx/render test style in
  `tests/ui/`).
- Existing suite must stay green (556 tests at time of writing).
- Manual smoke: phone portrait + desktop, per project verification rules.

## Risks

- **Perf on low-end phones:** mitigated by the particle cap and cheap draw
  calls; effects layer on the existing canvas, no extra canvases or filters.
- **Visual noise:** bursts are rate-limited by the existing event-diff
  cadence (ticker already dedupes); ripples only fire on *successful* tool
  applications.
