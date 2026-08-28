# Genome reconstruction assets

The fourteen images in `public/art/genomes/` are the canonical character
reconstructions for every currently seedable Cellular Death Match lifeform.
They were generated with OpenAI's built-in image generation tool on 2026-08-28
and normalized with `scripts/normalize-genome-art.mjs`.

The exact shared prompt, per-organism subject prompts, source output names,
source SHA-256 digests, canonical in-game RGB values, and output paths are stored
in `generation-manifest.json`. The six-genome concept sheet was used as the
style reference. That sheet was itself derived from a user-supplied gameplay
screenshot used only to establish CA scale, palette, and presentation language.

## Rebuilding normalized outputs

Place the fourteen digest-matching provider outputs in a local directory using
their manifest `sourceFile` names, then run:

```bash
node scripts/normalize-genome-art.mjs --source-dir /path/to/raw-genome-images
```

The script verifies every raw digest before writing. It removes the pale baked
checkerboard returned by the provider, reduces the reconstruction to a coarse
48-cell raster, maps the dominant organism pixels to the same canonical primary
RGB used by the in-game egg and CA culture, makes that exact RGB the dominant
visible shade, creates a fixed hard-edged shade ramp, adds real alpha, and
writes 384×384 palette PNGs.

The original provider outputs are not shipped. The normalized images must be
registered in `docs/publishing/evidence/crazygames-asset-attributions.json`, and
`npm run credits:crazygames:check` must remain green.

Provider terms: https://openai.com/policies/row-terms-of-use/  
Release state: provider-declared; named originality and distribution approval
remain required before commercial release.
