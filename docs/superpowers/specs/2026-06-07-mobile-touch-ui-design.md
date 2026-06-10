# Mobile Touch UI Design

## Purpose

Cellular Death Match should support mobile and touch play without becoming a second project. The mobile experience needs a different interaction shell from desktop because phones have less room, thumb-driven input, smaller targets, and a higher risk of panels covering the dish. The desktop experience should keep its current richer lab layout and controls.

## Goals

- Keep one Vite + TypeScript project, one game loop, one arena state, and one screen API.
- Preserve the existing desktop controls and layout at `min-width: 900px`.
- Make mobile play dish-first, readable, and comfortable in portrait.
- Keep primary mobile actions under the thumb.
- Move secondary information into drawers, overlays, or transient messages.
- Verify the result at `390x844`, `375x667`, and `1280x720`.

## Non-Goals

- Do not fork the app into separate mobile and desktop projects.
- Do not duplicate gameplay logic for device-specific modes.
- Do not remove the desktop reagent rack, lifeform panel, HUD, log, debug controls, or notebook access.
- Do not add permanent mobile panels that cover the center or lower-middle dish during normal play.

## Current Context

The app already has the right broad structure for a shared responsive UI:

- `index.html` owns a single DOM shell with the canvas, HUD, toolbox, life panel, ticker, notebook, and modal screens.
- `src/ui/screens.ts` exposes a shared UI API for tool selection, charges, agitation, lifeform selection, HUD updates, notebook updates, and overlays.
- `src/styles.css` already separates phone and desktop behavior around a `900px` breakpoint.
- `tests/ui/mobileLayoutCss.test.ts` guards compact phone trays.
- `tests/ui/desktopLayoutCss.test.ts` guards centered desktop dish layout and rack positioning.

The design should extend this structure instead of replacing it.

## Considered Approaches

### Approach 1: Responsive Shell, Shared Components

Keep the current shared DOM and UI API. Use CSS breakpoints, state classes, and small screen-controller additions to make mobile and desktop feel different while using the same game state.

Tradeoff: some CSS becomes more deliberate, but the app remains one product with one behavior path.

### Approach 2: Separate Device Components

Render different mobile and desktop DOM fragments, both connected to the same arena state.

Tradeoff: this gives layout freedom but increases duplicated markup, wiring, and test burden. UI bugs are more likely to appear in one mode but not the other.

### Approach 3: Universal Minimal HUD

Simplify both desktop and mobile into one sparse HUD.

Tradeoff: technically clean, but it discards useful desktop density and violates the requirement to retain desktop controls.

## Approved Direction

Use Approach 1: a responsive shell with shared components.

Desktop remains a lab workstation layout. Mobile becomes a dish-first touch layout. Both modes use the same canvas, `Screens` API, arena state, and content data.

## Desktop Layout Contract

At `min-width: 900px`, preserve the current desktop control model:

- The dish remains centered.
- The reagent toolbox remains a vertical rack.
- The lifeform panel remains a right-side information and selection rack.
- The HUD can show richer objective, ecology, volume, and build information.
- The ticker remains visible below the dish on wider desktop layouts.
- Debug controls remain available without being forced into the mobile layout.

Desktop tests should continue to assert these invariants so mobile work cannot accidentally flatten the desktop experience.

## Mobile Layout Contract

At `max-width: 899px`, normal play should prioritize the dish.

Persistent mobile UI:

- A compact top status strip with epoch, timer, and current objective.
- A bottom thumb tray for primary actions: egg, nutrient, toxin, water, salt, acid, agitate, and end.
- A compact selected-tool readout close to the tray.
- Small top buttons for notebook/fullscreen where safe-area constraints allow.

Collapsed or transient mobile UI:

- Lifeform selection moves into a drawer or expandable tray.
- Dish log messages stay transient and should not become a permanent blocking panel.
- Discovery details and notebook content remain modal/fullscreen surfaces.
- Long objective hints should collapse behind a tap target or rotate through short text.

The dish should remain visually centered and playable in portrait, especially at `390x844` and `375x667`.

## Mobile Interaction States

The mobile shell should support a small set of explicit states:

- `play`: default state. Dish, top status, selected tool readout, and bottom tray are visible.
- `lifeforms-open`: lifeform drawer opens from the bottom or side while keeping enough dish visible to preserve context.
- `log-open`: recent dish events are readable in a temporary drawer.
- `notebook-open`: notebook uses the existing modal screen and blocks dish input.
- `pick` and `end`: existing modal screens remain modal, but their mobile sizing should fit short portrait screens.

Only one drawer should be open at a time. Opening notebook or modal screens should close mobile drawers.

## Touch Control Principles

- Primary buttons should have stable dimensions and comfortable hit targets around `44px` or larger.
- Horizontal overflow is acceptable for reagent trays, but selected state and charges must stay legible.
- Controls should not shift size when charges, labels, or unlock states change.
- The lower-middle dish should stay clear during normal play so taps on the dish feel intentional.
- Use icons, counts, and short labels instead of long explanatory text in persistent mobile controls.
- Keep detailed explanatory text in drawers, notebook, or modal screens.

## Architecture

The design should preserve the current boundaries:

- `src/game/arena.ts` remains UI-agnostic and owns ecosystem behavior.
- `src/content/` remains responsible for lifeform, objective, catalyst, and upgrade data.
- `src/ui/screens.ts` owns DOM state and user-facing screen controls.
- `src/styles.css` owns responsive layout and visual treatment.
- `src/main.ts` wires state, input, screens, audio, and render loop.

Expected implementation additions:

- Add a small mobile drawer state in `screens.ts` if CSS-only disclosure is not enough.
- Add data attributes or classes on the root layout for mobile UI states.
- Refactor mobile CSS around explicit states rather than stacking every panel permanently.
- Keep desktop selectors under existing desktop breakpoints.

## Testing And Verification

Automated checks:

- Keep `npm test` passing.
- Keep `npm run build` passing.
- Extend CSS tests for mobile state classes and desktop preservation.
- Add focused UI tests if new drawer state is controlled from `screens.ts`.

Browser verification:

- Mobile portrait: `390x844`.
- Small mobile portrait: `375x667`.
- Desktop: `1280x720` or larger.

Manual checks:

- Dish remains centered and playable on phones.
- Bottom tray is thumb-friendly and does not cover dish interactions.
- Desktop controls remain visible and positioned as before.
- Notebook and modal screens fit mobile viewports.
- Text does not overflow or overlap at the tested sizes.

## Risks

- Mobile drawers could still cover too much dish if they are too tall.
- Horizontal trays can hide tools if selected state and scroll position are not managed.
- Long objective or lifeform text can overflow compact mobile surfaces.
- Desktop regressions are likely if mobile CSS is not tightly scoped under `max-width: 899px`.

Mitigation:

- Keep persistent mobile text short.
- Use explicit breakpoints and state classes.
- Add CSS assertions for both mobile and desktop.
- Verify with real browser screenshots at the target sizes.

## Implementation Sequence

1. Capture current desktop and mobile behavior with tests and screenshots.
2. Define root/mobile state classes for `play`, `lifeforms-open`, and `log-open`.
3. Rework mobile CSS so normal play shows only the dish, top status, selected-tool readout, and bottom tray.
4. Move lifeform details into a mobile drawer while keeping desktop unchanged.
5. Add or refine log disclosure for mobile.
6. Verify modal sizing for notebook, pick, and end screens on short portrait screens.
7. Run tests, build, and browser verification.

## Review Gate

This spec defines the product and UX direction only. Implementation should start after review approval and a separate implementation plan.
