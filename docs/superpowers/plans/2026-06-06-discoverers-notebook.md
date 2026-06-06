# Discoverer's Notebook Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Discoverer's Notebook catalogue overlay and expand the catalyst/discovery loop while preserving the current Petri dish feel.

**Architecture:** Add a derived notebook content model over the existing discovery progression state. Keep save/progression authoritative in `src/game/discoveryProgression.ts` and `src/game/discoverySave.ts`; UI renders catalogue entries passed from `src/main.ts`.

**Tech Stack:** Vite, TypeScript, DOM UI, Vitest, canvas rendering.

---

### Task 1: Notebook Content Model

**Files:**
- Create: `src/content/notebook.ts`
- Test: `tests/content/notebook.test.ts`

- [ ] Write failing tests for notebook entry completeness and starter/locked visibility.
- [ ] Implement `NOTEBOOK_ENTRIES` and `notebookViewForProgression`.
- [ ] Run `npm test -- tests/content/notebook.test.ts`.

### Task 2: Notebook UI

**Files:**
- Modify: `index.html`
- Modify: `src/ui/screens.ts`
- Modify: `src/styles.css`
- Test: `tests/ui/notebookScreen.test.ts`

- [ ] Write failing source-level UI tests for notebook DOM IDs, screen API, locked cards, close/open behaviour, and presentation-mode hiding.
- [ ] Add the notebook button and overlay screen.
- [ ] Add `Screens.updateNotebook`, `Screens.onNotebookOpen`, `Screens.onNotebookClose`, `Screens.showNotebook`, and `Screens.hideNotebook`.
- [ ] Style the notebook as a retro monitor overlay with a scrollable catalogue.
- [ ] Run `npm test -- tests/ui/notebookScreen.test.ts`.

### Task 3: Main Wiring

**Files:**
- Modify: `src/main.ts`
- Modify: `src/ui/debug.ts`
- Test: `tests/game/discoveryAnnouncementFlow.test.ts`
- Test: `tests/ui/debugDiscoveryReadout.test.ts`

- [ ] Write failing tests that debug reveal/clear and progression changes refresh notebook data.
- [ ] Wire notebook open/close state into Escape handling.
- [ ] Re-render notebook after `applyDiscoveryProgressionUi`, reveal all, clear, and organic discovery changes.
- [ ] Run focused tests.

### Task 4: New Catalyst Content

**Files:**
- Modify: `src/content/catalysis.ts`
- Modify: `tests/content/catalysis.test.ts`

- [ ] Write failing tests for Chromatic Spill, Lattice Bloom, Spore Comet, and Velvet Prison recipe matching.
- [ ] Add reaction recipe IDs, discovery note IDs, recipe content, and note copy.
- [ ] Run `npm test -- tests/content/catalysis.test.ts`.

### Task 5: Arena Reaction Coverage

**Files:**
- Modify: `src/game/arena.ts`
- Modify: `tests/game/arena.test.ts`

- [ ] Write failing arena tests for at least two new recipes creating effects and discovery notes.
- [ ] Adjust only reaction detection/event signalling needed to make the new recipes playable.
- [ ] Run `npm test -- tests/game/arena.test.ts`.

### Task 6: Verification

**Files:**
- Modify: `index.html`

- [ ] Bump static cache query strings in `index.html`.
- [ ] Run `npm test`.
- [ ] Run `npm run build`.
- [ ] Browser-check desktop and mobile layouts.
- [ ] Confirm presentation mode hides the notebook and normal mode has no horizontal overflow.
