# Design 07 — Dish-First Mobile Study Introduction

Date: 2026-08-28
Status: Design signed off by primary and adversarial reviewers

## Problem

Starting a Trial or Open Lab Study currently sends the title, description, and
Dr. E guidance through overlapping presentation systems. On mobile, the central
epoch banner temporarily covers the interactive centerpiece immediately after
the player chose to enter it. The persistent Dr. E status rail already contains
the same objective.

## Decision

Ordinary mobile Trial/Study introductions live in the existing Dr. E status rail
while the dish remains visible and interactive. The rail briefly changes from
`Dish status` to `New trial` or `New study`, presents objective name and first
evidence line, then settles into its live status state.

Do not show the central epoch banner on mobile for ordinary dish starts.
Do not play the full-screen transition wipe between ordinary mobile Study
selection and its dish; the rail pulse is the transition.

## Presentation hierarchy

1. Live dish and its touch input.
2. Dr. E status rail: assignment, evidence, hypothesis.
3. Exact coach prompt only for Trials 1–2.
4. Small toasts for discoveries and state changes.
5. Safe-boundary Genome Decoded presentation.

The desktop layout may retain a brief epoch banner where it does not cover the
dish or controls, but it must not duplicate a simultaneous coach entrance. If
visual review finds duplication remains noisy, the rail becomes authoritative
on desktop too.

## Rail behavior

- A dedicated, deduplicated one-shot node announces the new assignment once.
  Continuously changing progress remains outside all live regions.
- For Trials 1–2, the coach is the sole announcer and its first message includes
  assignment identity. For later Trials/Studies, the one-shot director
  announcement owns that role; suppressed banners do not repeat it.
- A restrained border/pulse animation identifies the updated rail without
  moving it across the dish.
- Reduced motion uses a static accent change.
- The objective name never truncates to the point that two Studies become
  indistinguishable; supporting copy may clamp after two lines.
- The status rail returns to live progress automatically and does not require
  dismissal.
- Starting simulation time still respects the existing first-instruction hold
  for Trial 1; ordinary Studies begin normally.

## Notification coordination

- Phase changes clear stale banners and toasts as they do now.
- A pending safe-boundary genome reveal completes before the next Method/Study
  screen; it is not layered over the new Study rail.
- Exact Trial 1–2 coach prompts and ordinary introduction copy cannot occupy two
  competing top rails. The coach owns instruction while active; the director
  rail remains compact telemetry.
- Discovery toasts queue through the existing notification director and never
  resurrect an obsolete Study introduction.

## Acceptance criteria

- At `390x844` and `375x667`, an Open Lab Study starts with the dish visible,
  unobscured, and immediately touchable.
- The central epoch banner remains hidden for ordinary mobile starts.
- The full-screen wipe is also absent between mobile Study selection and the
  interactive dish.
- Dr. E's rail communicates Case/Study identity, objective name, and live
  progress without requiring a second status panel.
- Trial 1 exact guidance remains readable and does not collide with the rail.
- Pending genome reveals, phase changes, rapid reloads, and queued discoveries
  do not display stale or duplicated introductions.
- Desktop retains a coherent hierarchy at `1280x720`.
- Reduced-motion and keyboard modes receive the same information without motion
  or lost focus.

## Non-goals

- No new Dr. E portrait or voiceover.
- No persistent large character panel over the dish.
- No removal of important safe-boundary genome celebration.
- No redesign of the entire HUD beyond the space needed to make its existing
  status rail authoritative.
