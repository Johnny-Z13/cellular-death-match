# Professor concept asset record

## `professor-emergent-concept-v1.png`

- Created: 2026-08-25
- Status: concept only; not approved for production or listing use
- Generator: OpenAI built-in image generation tool
- SHA-256: `22428a8aa353843529aee7a9944022a6936ccb83cfded6db45a4322b03e5817c`
- Dimensions: 1145 × 1373 PNG
- Intended use: character-direction, Case-map, and Trial-result exploration
- Shipped in game build: no; stored under `docs/assets/`

### Style references

- `public/art/title-keyart-1024.png`
- `public/art/chimera/bloom_mass.png`
- `public/art/chimera/vitric_anchor.png`

The source references were used only to align the character with CDM's existing
dark bioluminescent palette and laboratory atmosphere.

### Generation history

The initial character generation produced a strong subject but rendered a
checkerboard pattern as opaque RGB pixels instead of real transparency. A
background-extraction edit repeated that failure. Neither failed output was
installed in the project.

The accepted concept uses an intentional near-black laboratory backdrop.

### Final accepted edit prompt

```text
Use case: precise-object-edit
Asset type: game UI character portrait card art
Primary request: Replace only the gray-and-white checkerboard background with an intentional deep near-black laboratory vignette that matches Cellular Death Match's existing title art.
Input images: Image 1 is the exact edit target.
Scene/backdrop: almost-black charcoal glass with extremely subtle circular Petri-dish rings, sparse cyan cellular filaments, faint particulate grain, and a soft central cyan-black radial glow; quiet enough that the professor remains dominant.
Constraints: preserve the professor, face, wild hair, goggles, clothing, amber glove, glowing Petri dish, pose, crop, lighting, proportions, and every character detail; background must extend cleanly to every image edge; no checkerboard squares anywhere; no text, logo, UI frame, watermark, extra objects, or bright background; sophisticated dark bioluminescent lab aesthetic consistent with supplied character.
Avoid: transparency grid, white or gray backdrop, busy scenery, additional laboratory equipment, character changes.
```

Before production use:

1. approve the character direction and working name;
2. decide the exact UI crop(s) and expression requirements;
3. resize/compress production variants and place only consumed variants under
   `public/`;
4. add the final asset to the repository's distribution provenance record;
5. verify small-size legibility on desktop and mobile.

## Production derivative

`public/art/professor/professor-emergent-v1.png` is the production crop derived
from this accepted concept.

- Installed: 2026-08-25
- SHA-256: `65db0f9ae845ae5066228f39469752c57200a1bfbbea0889c1fa30de9cbe5d7a`
- Generator/provider: OpenAI built-in image generation
- Distribution status: provider-declared; named human approval is still required
- Distribution evidence: `docs/publishing/evidence/crazygames-asset-attributions.json`

The former “concept only” status above applies to the unshipped source file,
not to this separately recorded production derivative.
