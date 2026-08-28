# Plan 04 — Guidance That Recedes With Mastery

Date: 2026-08-28
Status: Implementation plan signed off by primary and adversarial reviewers

## Objective

Keep exact first-use reliability in Trials 1–2, then replace recipe execution
scripts with hypothesis-led play and layered recovery in Trials 3–5.

## Work sequence

1. **Declare guidance tiers in content.**
   - Add an explicit tier per authored Trial: `exact` for 1–2 and `hypothesis`
     for 3–5.
   - Keep exact `TRIAL_ONBOARDING_BEATS` only for the first two Trials.
2. **Rewrite later authored hints.**
   - Update Trial 3–5 description/hypothesis copy to teach relationships and
     observable evidence without enumerating each press.
   - Store two recovery hints: principle-level first, exact method second.
3. **Make Dr. E rail authoritative after Trial 2.**
   - Update Method handoff copy and ensure later Trials start without step count,
     exact pointer, or persistent coach overlay.
   - Keep live objective evidence and Notebook hypothesis available.
4. **Escalate idle recovery.**
   - Extend `onboardingIdleNudge` with tier/nudge index.
   - First 22-second idle interval shows the principle; second may show exact
     materials/order. Meaningful actions reset the interval but not the capped
     escalation count.
   - Hidden/background/menu time does not accumulate.
5. **Update automation helpers.**
   - Journey tests use known recipe outcomes and live progress for Trials 3–5,
     not old pointer/coach sentence assertions.

## Tests first / alongside

- Update onboarding-stage content tests for exactly two scripted Trials and
  three hypothesis Trials.
- Extend coach and idle-nudge unit tests for tier routing, persistence, caps, and
  lack of later pointers.
- Update pointer source tests to prove no Trial 3–5 automatic trail.
- Add a Playwright “stuck” path that waits for first and second recovery hints.
- Run the deterministic five-Trial journey and capture throughput only as
  automation timing.

## Guardrails

- Exact help remains reachable; mastery is invited, not required as a gate.
- No new difficulty toggle or permanent coach panel.
- Do not weaken recipe/scoring determinism to create artificial mystery.

## Done when

First-time Trials 1–2 remain robust, later Trials contain no step script, idle
help recovers a stuck player, and the full Case still completes reliably across
reload and mobile viewports.
