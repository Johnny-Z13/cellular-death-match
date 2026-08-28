# Adversarial Design Review Record

Date: 2026-08-28
Outcome: **DESIGN SIGN-OFF**

The primary draft was independently challenged against the repository and the
intended player experience. Sign-off was withheld on the first two passes and
granted only after the following material repairs became binding:

1. Per-Study rare-strain banking is a durability guarantee, not copy.
2. Lifeforms and reactions use different player-facing evidence ladders.
3. Open Lab feasibility uses actual current-run seedables, tool budgets, exact
   reaction/hybrid routes, and restore-time validation.
4. Active-dish checkpoints are verified and promise a clean restart, not exact
   grid restoration.
5. Global decoded-genome progress is separate from current-run seedability.
6. Authored Case protocols explicitly represent controlled reproductions of a
   prior Dr. E signal; wild observations still need a later dish.
7. Banking uses an idempotent multi-store boundary commit with verified readback,
   retry behavior, startup replay, and split-state ownership reconciliation.
8. Protocol totals derive only from canonical recipe-backed discovery notes.
9. Mobile Study entry suppresses both the central banner and full-screen wipe;
   assignment announcements use one deduplicated live node.
10. Novice comprehension and assistive announcement quality are documented as
    bounded human release validation rather than falsely “proved” by automation.

The adversarial reviewer found no remaining design blocker and authorized the
program to move to implementation planning. This is design sign-off only; plans,
code, and verification findings each receive a separate adversarial gate.
