# Plan 06 — Genome Archive North Star

Date: 2026-08-28
Status: Implementation plan signed off by primary and adversarial reviewers

## Objective

Make the content-derived Genome Archive goal visible at the Lab and Notebook
without confusing it with the specimens seedable in the current Study.

## Work sequence

1. **Add a pure progress view.**
   - In `content/notebook.ts` or a focused view module, derive decoded/total
     genomes, observed genomes, understood/total recipe-backed protocols, and a
     stable next lead from current progression.
   - Count total genomes from the canonical lifeform registry and protocols from
     distinct `REACTION_RECIPES.discoveryNoteId` values.
2. **Choose a non-spoiling lead.**
   - Prefer observed unstabilized lifeforms, then the first locked lifeform in
     authored order.
   - Expose state and clue only; locked visible/accessibility text contains no
     canonical name or full-color alt description.
3. **Add the title Archive strip.**
   - Extend `updateCaseProgress` input with progress/lead.
   - Add compact cell track, `X / Y genomes decoded`, and a clamped lead line
     inside the existing docket.
4. **Clarify Notebook and freezer totals.**
   - Header becomes genomes decoded plus protocols understood.
   - Freezer changes `X / 14 ready` to `N specimens available in this Study`;
     optional global count has its own label.
   - Keep Atlas as the single collection browser.
5. **Enrich decode reveal.**
   - Pass the post-transition Archive position into the safe-boundary reveal,
     keeping organism name and synthesis promise primary.

## Tests first / alongside

- Content/view tests for fresh `1/14`, observed no increment, stabilized `2/14`,
  foundational unlock, loadout independence, reveal-all, clear, and future
  denominator expansion.
- Tests for recipe-backed protocol denominator and exclusion of lab/breed notes.
- Screen rendering tests for locked lead non-spoiling accessible text.
- Responsive Playwright screenshots/title overflow checks at `375x667`,
  `390x844`, and desktop. Assert separately that Archive progress is global and
  loadout-independent, while freezer availability follows the restricted saved
  loadout/current Study. Cover reload and debug reveal-all without conflating
  the two values.

## Guardrails

- No hard-coded 14 in logic or CSS-generated content.
- No collection counter permanently over the active dish.
- No new screen, reward currency, or claim step.

## Done when

Title, Notebook, reveal, and freezer tell consistent but properly scoped truths,
the starter and Bloom cadence is exactly 1→2, and small-phone title remains
immediately playable without scrolling.
