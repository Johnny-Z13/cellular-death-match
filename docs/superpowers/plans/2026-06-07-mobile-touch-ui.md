# Mobile Touch UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a dish-first mobile/touch UI shell while preserving the current desktop controls and layout.

**Architecture:** Keep one DOM shell, one `Screens` API, and one game state. Add a small mobile-only controls strip and selected-tool readout in `index.html`, wire mobile drawer state inside `src/ui/screens.ts`, and scope layout changes under `@media (max-width: 899px)` so desktop remains governed by existing desktop breakpoints.

**Tech Stack:** Vite, TypeScript, DOM APIs, CSS media queries, Vitest, Playwright/browser verification.

---

## File Structure

- Modify `index.html`: add mobile-only drawer toggle buttons and a mobile selected-tool readout.
- Modify `src/ui/screens.ts`: add internal mobile drawer state, close drawers when modal screens open, update mobile tool name/summary alongside existing tool summary, and wire drawer toggle buttons.
- Modify `src/styles.css`: add mobile state classes, drawer behavior, selected-tool readout, compact top buttons, and preserve desktop rules.
- Modify `tests/ui/mobileLayoutCss.test.ts`: assert the mobile shell, drawer classes, touch targets, and dish-first constraints.
- Modify `tests/ui/desktopLayoutCss.test.ts`: assert new mobile-only controls are hidden on desktop and existing desktop layout invariants remain.
- Add `tests/ui/mobileShellDom.test.ts`: verify required mobile DOM IDs exist in `index.html`.

## Task 1: Mobile Shell DOM Contract

**Files:**
- Modify: `index.html`
- Add: `tests/ui/mobileShellDom.test.ts`

- [ ] **Step 1: Write the failing DOM contract test**

Create `tests/ui/mobileShellDom.test.ts`:

```ts
// @ts-expect-error Vitest runs this test in Node; the app tsconfig does not ship Node types.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const html = readFileSync('index.html', 'utf8');

describe('mobile shell DOM', () => {
  it('provides mobile-only controls without duplicating desktop panels', () => {
    expect(html).toContain('id="mobile-shell"');
    expect(html).toContain('id="mobile-lifeforms-toggle"');
    expect(html).toContain('id="mobile-log-toggle"');
    expect(html).toContain('id="mobile-tool-readout"');
    expect(html).toContain('id="mobile-tool-name"');
    expect(html).toContain('id="mobile-tool-summary"');
    expect(html.match(/id="toolbox"/g)?.length).toBe(1);
    expect(html.match(/id="life-panel"/g)?.length).toBe(1);
    expect(html.match(/id="ticker"/g)?.length).toBe(1);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
npm test tests/ui/mobileShellDom.test.ts
```

Expected: FAIL because `mobile-shell`, `mobile-lifeforms-toggle`, `mobile-log-toggle`, `mobile-tool-readout`, `mobile-tool-name`, and `mobile-tool-summary` are not present.

- [ ] **Step 3: Add the mobile shell markup**

In `index.html`, insert this after the fullscreen button and before the toolbox:

```html
      <div id="mobile-shell" class="mobile-shell" aria-label="Mobile dish controls">
        <button id="mobile-lifeforms-toggle" class="mobile-shell-button" type="button" aria-expanded="false" aria-controls="life-panel">Lifeforms</button>
        <div id="mobile-tool-readout" class="mobile-tool-readout" aria-live="polite">
          <strong id="mobile-tool-name">Egg</strong>
          <span id="mobile-tool-summary">plants the selected lifeform strain</span>
        </div>
        <button id="mobile-log-toggle" class="mobile-shell-button" type="button" aria-expanded="false" aria-controls="ticker">Log</button>
      </div>
```

- [ ] **Step 4: Run the DOM contract test to verify it passes**

Run:

```bash
npm test tests/ui/mobileShellDom.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

Run:

```bash
git add index.html tests/ui/mobileShellDom.test.ts
git commit -m "feat: add mobile shell controls"
```

## Task 2: Mobile Drawer State Wiring

**Files:**
- Modify: `src/ui/screens.ts`
- Test: `tests/ui/mobileShellDom.test.ts`

- [ ] **Step 1: Extend the DOM contract test for ARIA defaults**

Append this test to `tests/ui/mobileShellDom.test.ts`:

```ts
  it('starts mobile drawer toggles collapsed for touch play', () => {
    expect(html).toContain('id="mobile-lifeforms-toggle" class="mobile-shell-button" type="button" aria-expanded="false" aria-controls="life-panel"');
    expect(html).toContain('id="mobile-log-toggle" class="mobile-shell-button" type="button" aria-expanded="false" aria-controls="ticker"');
  });
```

- [ ] **Step 2: Run the focused test**

Run:

```bash
npm test tests/ui/mobileShellDom.test.ts
```

Expected: PASS after Task 1. This locks the static defaults before dynamic wiring.

- [ ] **Step 3: Add mobile drawer state in `screens.ts`**

In `src/ui/screens.ts`, inside `createScreens()`, add these DOM references with the other `get(...)` calls:

```ts
  const layout = document.querySelector<HTMLElement>('.layout');
  if (!layout) throw new Error('screens: missing .layout');
  const mobileLifeformsToggle = get('mobile-lifeforms-toggle') as HTMLButtonElement;
  const mobileLogToggle = get('mobile-log-toggle') as HTMLButtonElement;
  const mobileToolName = get('mobile-tool-name');
  const mobileToolSummary = get('mobile-tool-summary');
```

Add this local type and helper state near the existing selected tool state:

```ts
  type MobileDrawer = 'none' | 'lifeforms' | 'log';
  let mobileDrawer: MobileDrawer = 'none';
```

Add these helper functions before the returned object:

```ts
  function setMobileDrawer(next: MobileDrawer): void {
    mobileDrawer = next;
    layout.dataset.mobileDrawer = mobileDrawer;
    layout.classList.toggle('mobile-lifeforms-open', mobileDrawer === 'lifeforms');
    layout.classList.toggle('mobile-log-open', mobileDrawer === 'log');
    mobileLifeformsToggle.setAttribute('aria-expanded', String(mobileDrawer === 'lifeforms'));
    mobileLogToggle.setAttribute('aria-expanded', String(mobileDrawer === 'log'));
  }

  function closeMobileDrawers(): void {
    setMobileDrawer('none');
  }
```

After helper definitions, add event listeners:

```ts
  mobileLifeformsToggle.addEventListener('click', () => {
    setMobileDrawer(mobileDrawer === 'lifeforms' ? 'none' : 'lifeforms');
  });
  mobileLogToggle.addEventListener('click', () => {
    setMobileDrawer(mobileDrawer === 'log' ? 'none' : 'log');
  });
  setMobileDrawer('none');
```

Update `show(name)` in the returned object so modal screens close mobile drawers:

```ts
    show(name) {
      if (name === 'title' || name === 'pick' || name === 'end' || name === 'notebook') closeMobileDrawers();
      elFor[name].classList.add('visible');
    },
```

Update `setTool(tool)` so mobile readout mirrors the selected tool:

```ts
      updateToolSummary(toolSummary, selectedToolId, selectedEggArchetype, optionByArchetype);
      updateMobileToolReadout(mobileToolName, mobileToolSummary, selectedToolId, selectedEggArchetype, optionByArchetype);
```

Update `setEggArchetype(archetype)` the same way after the existing `updateToolSummary(...)` call:

```ts
      updateMobileToolReadout(mobileToolName, mobileToolSummary, selectedToolId, selectedEggArchetype, optionByArchetype);
```

Add this function after `updateToolSummary(...)`:

```ts
function updateMobileToolReadout(
  nameEl: HTMLElement,
  summaryEl: HTMLElement,
  tool: ToolId,
  eggArchetype: EnemyArchetype,
  eggOptions: Map<EnemyArchetype, EggOption>,
): void {
  const eggName = eggOptions.get(eggArchetype)?.name ?? 'selected culture';
  const names: Record<ToolId, string> = {
    egg: 'Egg',
    nutrient: 'Nutrient',
    toxin: 'Toxin',
    water: 'Water',
    salt: 'Salt',
    acid: 'Acid',
  };
  const summaries: Record<ToolId, string> = {
    egg: `${eggName} seed`,
    nutrient: 'feed and attract',
    toxin: 'repel and thin',
    water: 'dilute and spread',
    salt: 'slow and dry',
    acid: 'burn tissue',
  };
  nameEl.textContent = names[tool];
  summaryEl.textContent = summaries[tool];
}
```

- [ ] **Step 4: Run TypeScript build to verify wiring**

Run:

```bash
npm run build
```

Expected: PASS.

- [ ] **Step 5: Commit**

Run:

```bash
git add src/ui/screens.ts tests/ui/mobileShellDom.test.ts
git commit -m "feat: wire mobile drawer state"
```

## Task 3: Mobile CSS Redesign

**Files:**
- Modify: `src/styles.css`
- Modify: `tests/ui/mobileLayoutCss.test.ts`
- Modify: `tests/ui/desktopLayoutCss.test.ts`

- [ ] **Step 1: Write failing mobile CSS assertions**

In `tests/ui/mobileLayoutCss.test.ts`, extend the first test to assert the new mobile shell behavior:

```ts
    expect(mobile).toContain('.mobile-shell {');
    expect(mobile).toContain('display: grid');
    expect(mobile).toContain('grid-template-columns: minmax(72px, auto) minmax(0, 1fr) minmax(72px, auto)');
    expect(mobile).toContain('.mobile-tool-readout {');
    expect(mobile).toContain('bottom: calc(92px + env(safe-area-inset-bottom))');
    expect(mobile).toContain('.mobile-lifeforms-open .life-panel {');
    expect(mobile).toContain('transform: translateY(0)');
    expect(mobile).toContain('.mobile-log-open .ticker {');
    expect(mobile).toContain('pointer-events: auto');
    expect(mobile).toContain('.life-panel {');
    expect(mobile).toContain('transform: translateY(calc(100% + 18px))');
    expect(mobile).toContain('.ticker {');
    expect(mobile).toContain('transform: translateY(calc(100% + 18px))');
```

In the small-phone test, add:

```ts
    expect(smallPhone).toContain('bottom: calc(82px + env(safe-area-inset-bottom))');
    expect(smallPhone).toContain('grid-auto-columns: minmax(64px, 1fr)');
```

In `tests/ui/desktopLayoutCss.test.ts`, add:

```ts
    expect(css).toContain('@media (min-width: 900px) {');
    expect(css).toContain('.mobile-shell {\n    display: none;\n  }');
```

- [ ] **Step 2: Run CSS tests to verify failure**

Run:

```bash
npm test tests/ui/mobileLayoutCss.test.ts tests/ui/desktopLayoutCss.test.ts
```

Expected: FAIL because the new mobile shell and drawer CSS does not exist yet.

- [ ] **Step 3: Add base mobile shell CSS**

In `src/styles.css`, add `.mobile-shell`, `.mobile-shell-button`, and `.mobile-tool-readout` to the existing no-selection list near the top:

```css
.mobile-shell,
.mobile-shell-button,
.mobile-tool-readout,
```

Add this base block after the fullscreen button styles:

```css
.mobile-shell {
  display: none;
}

.mobile-shell-button,
.mobile-tool-readout {
  border: 1px solid #2d4f55;
  background:
    linear-gradient(rgba(185, 232, 205, 0.055), rgba(70, 132, 132, 0.02)),
    repeating-linear-gradient(0deg, rgba(255, 255, 255, 0.045) 0 1px, transparent 1px 5px),
    rgba(5, 13, 15, 0.94);
  color: #d8f8ff;
  box-shadow: inset 0 0 14px rgba(87, 216, 255, 0.04), 0 6px 18px rgba(0, 0, 0, 0.28);
}

.mobile-shell-button {
  min-height: 44px;
  padding: 8px 10px;
  font: inherit;
  font-size: 11px;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

.mobile-tool-readout {
  display: grid;
  align-content: center;
  min-height: 44px;
  padding: 7px 10px;
  box-sizing: border-box;
  text-align: center;
}

.mobile-tool-readout strong,
.mobile-tool-readout span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mobile-tool-readout strong {
  font-size: 11px;
  line-height: 1.1;
}

.mobile-tool-readout span {
  color: #9fd6d2;
  font-size: 10px;
  line-height: 1.15;
}
```

- [ ] **Step 4: Replace the mobile breakpoint body**

In `src/styles.css`, update `@media (max-width: 899px)` so normal play is dish-first:

```css
@media (max-width: 899px) {
  .layout {
    padding: calc(70px + env(safe-area-inset-top)) 10px calc(146px + env(safe-area-inset-bottom));
  }

  canvas {
    width: min(94vw, calc(100svh - 236px), 800px);
    height: min(94vw, calc(100svh - 236px), 800px);
  }

  .notebook-button,
  .fullscreen-button {
    top: max(8px, env(safe-area-inset-top));
    padding: 8px 9px;
    font-size: 10px;
  }

  .fullscreen-button {
    right: calc(86px + env(safe-area-inset-right));
  }

  .mobile-shell {
    position: fixed;
    left: 10px;
    right: 10px;
    bottom: calc(92px + env(safe-area-inset-bottom));
    z-index: 7;
    display: grid;
    grid-template-columns: minmax(72px, auto) minmax(0, 1fr) minmax(72px, auto);
    gap: 8px;
    pointer-events: auto;
  }

  .mobile-shell-button[aria-expanded="true"] {
    border-color: #6bcfe8;
    color: #ffffff;
  }

  .toolbox {
    grid-template-columns: none;
    grid-auto-flow: column;
    grid-auto-columns: minmax(72px, 1fr);
    overflow-x: auto;
    overflow-y: hidden;
    overscroll-behavior-x: contain;
    scrollbar-width: none;
    padding: 8px 10px calc(10px + env(safe-area-inset-bottom));
  }

  .toolbox::-webkit-scrollbar,
  .life-list::-webkit-scrollbar {
    display: none;
  }

  .tool-button {
    min-width: 72px;
    min-height: 68px;
    padding: 8px 6px;
  }

  .life-panel {
    left: 10px;
    right: 10px;
    bottom: calc(146px + env(safe-area-inset-bottom));
    max-height: min(42svh, 284px);
    grid-template-rows: auto minmax(0, 1fr);
    overflow: hidden;
    padding: 8px;
    transform: translateY(calc(100% + 18px));
    transition: transform 180ms ease;
    box-shadow: 0 -18px 38px rgba(0, 0, 0, 0.42);
  }

  .mobile-lifeforms-open .life-panel {
    transform: translateY(0);
  }

  .life-panel-title {
    display: none;
  }

  .life-summary {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .life-list {
    grid-template-columns: none;
    grid-auto-flow: column;
    grid-auto-columns: minmax(154px, 74vw);
    overflow-x: auto;
    overflow-y: hidden;
    overscroll-behavior-x: contain;
    scrollbar-width: none;
  }

  .life-panel .life-item.tool-button {
    grid-template-columns: 24px minmax(0, 1fr) auto;
    min-width: 154px;
    min-height: 48px;
    padding: 7px 8px;
  }

  .ticker {
    display: block;
    left: 10px;
    right: 10px;
    bottom: calc(146px + env(safe-area-inset-bottom));
    transform: translateY(calc(100% + 18px));
    transition: transform 180ms ease;
    pointer-events: none;
    z-index: 6;
  }

  .mobile-log-open .ticker {
    transform: translateY(0);
    pointer-events: auto;
  }

  .mobile-log-open .ticker-line:nth-child(n + 3) {
    display: block;
  }
}
```

- [ ] **Step 5: Update the small-phone breakpoint**

In `src/styles.css`, update `@media (max-width: 899px) and (max-height: 700px)`:

```css
@media (max-width: 899px) and (max-height: 700px) {
  .layout {
    padding: calc(60px + env(safe-area-inset-top)) 10px calc(132px + env(safe-area-inset-bottom));
  }

  canvas {
    width: min(92vw, calc(100svh - 218px), 800px);
    height: min(92vw, calc(100svh - 218px), 800px);
  }

  .screen {
    padding: 12px;
  }

  .screen-card {
    position: fixed;
    left: 12px;
    right: 12px;
    width: auto;
    padding: 24px 16px;
  }

  .screen-title {
    font-size: 23px;
  }

  .mobile-shell {
    bottom: calc(82px + env(safe-area-inset-bottom));
    grid-template-columns: minmax(64px, auto) minmax(0, 1fr) minmax(64px, auto);
  }

  .toolbox {
    grid-auto-columns: minmax(64px, 1fr);
  }

  .tool-button {
    min-height: 58px;
    padding: 7px 5px;
  }

  .life-panel,
  .ticker {
    bottom: calc(132px + env(safe-area-inset-bottom));
  }

  .life-panel {
    max-height: min(45svh, 232px);
    padding: 6px 8px;
  }

  .life-panel .life-item.tool-button {
    min-height: 44px;
    padding: 6px 8px;
  }
}
```

- [ ] **Step 6: Hide mobile shell on desktop**

Inside `@media (min-width: 900px)`, add:

```css
  .mobile-shell {
    display: none;
  }
```

- [ ] **Step 7: Run CSS tests**

Run:

```bash
npm test tests/ui/mobileLayoutCss.test.ts tests/ui/desktopLayoutCss.test.ts
```

Expected: PASS.

- [ ] **Step 8: Commit**

Run:

```bash
git add src/styles.css tests/ui/mobileLayoutCss.test.ts tests/ui/desktopLayoutCss.test.ts
git commit -m "feat: redesign mobile touch layout"
```

## Task 4: Interaction And Accessibility Refinement

**Files:**
- Modify: `src/ui/screens.ts`
- Modify: `src/styles.css`
- Test: `tests/ui/mobileLayoutCss.test.ts`

- [ ] **Step 1: Add failing assertions for drawer exclusivity and reduced motion**

In `tests/ui/mobileLayoutCss.test.ts`, add a new test:

```ts
  it('keeps mobile drawer transitions scoped and reduced-motion friendly', () => {
    const mobile = mediaBlock('(max-width: 899px)');
    const reducedMotion = mediaBlock('(prefers-reduced-motion: reduce)');

    expect(mobile).toContain('transition: transform 180ms ease');
    expect(mobile).toContain('.mobile-lifeforms-open .life-panel {');
    expect(mobile).toContain('.mobile-log-open .ticker {');
    expect(reducedMotion).toContain('.life-panel,');
    expect(reducedMotion).toContain('.ticker,');
    expect(reducedMotion).toContain('.mobile-shell-button');
    expect(reducedMotion).toContain('transition: none !important');
  });
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
npm test tests/ui/mobileLayoutCss.test.ts
```

Expected: FAIL until reduced-motion coverage includes the new mobile surfaces.

- [ ] **Step 3: Update reduced-motion CSS**

In the existing `@media (prefers-reduced-motion: reduce)` block, include:

```css
  .life-panel,
  .ticker,
  .mobile-shell-button {
    transition: none !important;
    animation: none !important;
  }
```

- [ ] **Step 4: Run focused tests**

Run:

```bash
npm test tests/ui/mobileLayoutCss.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

Run:

```bash
git add src/styles.css tests/ui/mobileLayoutCss.test.ts
git commit -m "feat: refine mobile drawer accessibility"
```

## Task 5: Full Verification

**Files:**
- No planned file edits unless verification exposes defects.

- [ ] **Step 1: Run the full test suite**

Run:

```bash
npm test
```

Expected: PASS.

- [ ] **Step 2: Run the production build**

Run:

```bash
npm run build
```

Expected: PASS.

- [ ] **Step 3: Start the dev server**

Run:

```bash
npm run dev -- --host 0.0.0.0
```

Expected: Vite starts and prints a local URL.

- [ ] **Step 4: Browser verify desktop and mobile viewports**

Open the local URL and inspect:

- `390x844`: dish centered, bottom tray thumb-friendly, mobile shell visible, lifeforms/log collapsed by default, drawers open one at a time.
- `375x667`: dish still playable, no text overlap, mobile shell does not cover the dish center.
- `1280x720`: desktop rack, life panel, HUD, and log remain visible and positioned as before; mobile shell hidden.

- [ ] **Step 5: Fix verification defects with TDD where practical**

For any defect found, first add a focused CSS or DOM test that fails for the defect, then apply the smallest fix and rerun the relevant test.

- [ ] **Step 6: Final status**

Run:

```bash
git status --short --branch
```

Expected: clean except intentional commits ahead of `origin/main`.

## Self-Review

- Spec coverage: The plan covers one project, shared UI API, mobile dish-first layout, drawer disclosure, desktop preservation, tests, build, and browser verification.
- Placeholder scan: No placeholder markers or open-ended implementation steps remain.
- Type consistency: New DOM IDs match between `index.html`, tests, and `screens.ts`; mobile drawer class names match between `screens.ts` and CSS.
