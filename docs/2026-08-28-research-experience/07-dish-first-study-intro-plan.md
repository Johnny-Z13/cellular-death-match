# Plan 07 — Dish-First Mobile Study Introduction

Date: 2026-08-28
Status: Implementation plan signed off by primary and adversarial reviewers

## Objective

Route ordinary mobile Trial/Study introductions through the existing Dr. E rail
with one accessible announcement, suppressing central banner and full-screen
wipe while preserving safe-boundary genome celebration.

## Work sequence

1. **Add explicit presentation routing.**
   - Add a pure helper that chooses `coach`, `director`, or `desktop-banner` from
     viewport class, Trial guidance tier, and event type.
   - Ordinary mobile starts never enqueue an epoch banner.
2. **Add a one-shot director announcement.**
   - Add a visually minimal dedicated `aria-live` node near the rail; dedupe by
     assignment key and clear after announcement.
   - Keep per-frame director progress outside live regions.
   - Trials 1–2 include assignment identity in coach first copy and do not emit
     the director live announcement.
3. **Pulse the existing rail.**
   - Add `announceStudyStart` to screens for a short `New Trial/Study` state and
     restrained border/accent pulse; reduced motion is static.
   - Return automatically to `Dish status` without moving focus.
   - After an objective card is activated and its screen hides, restore keyboard
     focus to the now-visible dish canvas (or the first exact guided control for
     Trials 1–2). Pointer activation does not force a distracting focus ring.
     The one-shot live node never receives focus.
4. **Suppress mobile Study-entry wipe.**
   - Do not call `fx.playWipe` on ordinary mobile objective→dish transition.
   - Keep wipes where they represent safe noninteractive boundaries and keep
     desktop behavior subject to screenshot review.
5. **Coordinate notifications.**
   - Clear stale phase visuals, dedupe assignment messages, and ensure genome
     reveal completes before later selection/start states.

## Tests first / alongside

- Add pure routing tests for phone/small phone/desktop, exact coach Trials, later
  Trials, Studies, genome reveals, and reduced motion.
- Extend notification/director tests for one-shot dedupe and progress outside
  live regions.
- Browser tests assert hidden central banner and absent wipe, immediately click
  dish after Study selection, inspect Dr. E objective, and cover rapid reload.
- Keyboard browser tests choose a Study with Enter, assert the focused element is
  visible and playable, activate the focused dish/control, and prove the live
  announcement never steals focus.
- Responsive screenshots at required viewports plus reduced-motion and keyboard
  focus passes.

## Guardrails

- First-ever welcome and Genome Decoded safe-boundary presentation remain.
- No new permanent panel or larger Professor portrait over the dish.
- Do not disable input during the rail pulse.

## Done when

Mobile Study selection lands directly on an unobscured usable dish, objective
identity is clear once to sighted and assistive users, no stale duplicate appears,
and desktop/reduced-motion hierarchy remains coherent.
