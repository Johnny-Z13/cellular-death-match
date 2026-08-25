# Design QA — Minimal Title Screen

**Source visual truth path**

`/tmp/codex-remote-attachments/01a03a48-3e53-7321-b3bd-9f9609368afa/3E2EFF75-94D8-4454-B2C4-7F9264BA0207/1-Photo-1.jpg`

**Implementation screenshot path**

`/private/tmp/cdm-title-720x1280-final.png`

**Comparison setup**

- Viewport/state: title screen, portrait, 720 × 1280 CSS px.
- Source pixels: 720 × 1280 JPEG.
- Implementation pixels: 720 × 1280 PNG.
- Density normalization: browser device scale factor 1; both artifacts compared at identical pixel dimensions with no scaling.
- Full-view evidence: the source and rendered implementation were opened together in one comparison input. Both use a full-bleed Doctor portrait, a two-line white/cyan wordmark beginning at the same vertical region, and one wide cyan-glow action beneath it.
- Focused-region evidence: no separate crop was needed because the title and primary control are large and fully readable in the normalized full-view comparison.

**Findings**

- No actionable P0, P1, or P2 differences remain.
- Typography: Michroma retains the mockup's thin futuristic geometry; `Death Match` is explicitly kept on one line and the white/cyan hierarchy is preserved.
- Spacing/layout: the portrait remains full bleed; the title begins at approximately 61.5% of viewport height; the CTA follows with a single clear gap and remains fully visible.
- Colors/tokens: near-black, white, and bioluminescent cyan match the source hierarchy and existing game brand.
- Image quality: the established high-resolution Dr. E. Mergent brand asset is used directly with `object-fit: cover`; no placeholder or code-drawn character art is present.
- Copy/content: the visible title state contains only `Cellular`, `Death Match`, and `Run Trial`.

**Comparison history**

1. Initial render: `/private/tmp/cdm-title-720x1280-pass1.png`.
   - P1: `Death Match` wrapped to two lines, turning the intended two-line lockup into three lines and pushing the CTA too low.
   - Fix: made the cyan title line an inline-block, reduced it to `0.9em`, and prevented wrapping.
2. Post-fix render: `/private/tmp/cdm-title-720x1280-final.png`.
   - Evidence: the lockup is now exactly two lines, the button is fully visible, and document dimensions equal the viewport with no overflow.
   - Responsive checks also passed at 390 × 844, 375 × 667, and 1280 × 720.

**Primary interaction tested**

- `Run Trial` changes the app from the title screen to the arena flow.
- Browser console warnings/errors: none.

**Implementation Checklist**

- [x] Full-bleed Doctor artwork.
- [x] Two-line white/cyan game title.
- [x] One oversized `Run Trial` button.
- [x] No visible docket, quote, build label, options, fullscreen, or secondary title chrome.
- [x] No viewport overflow at required breakpoints.

**Follow-up Polish**

- The production Doctor asset is moodier and less silver-haired than the concept artwork; this is an intentional use of the game's established character asset rather than a fidelity blocker.

final result: passed
