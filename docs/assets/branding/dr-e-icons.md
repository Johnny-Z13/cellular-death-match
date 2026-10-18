# Cellular Dr. E browser and app icons

On 2026-10-15 Johnny selected **Dr. E / Cellular Death Match** for the browser
and link icons. These replace the old painted professor and the interim Z13
favicon. The Z13 studio ident is unchanged.

The icons are deterministic exports of the actual game renderer:

- `src/ui/drEFace/faceRenderer.ts` and `faceModel.ts`
- `src/content/drETuning.ts`: current `DR_E_DIRECTION` (colony), happy expression
- Fixed time: 4000 ms; dark game background; a close crop for tiny-size legibility
- Generator: `node scripts/export-dre-icons.mjs` with Vite running on port 5199

The generator writes 32/48px PNG favicons, an ICO containing 16/32/48px PNG
entries, the 180px touch icon, and 192/512/1024px app icons. These use the game's
own procedural face, with no external image-generation service or source art.
The attribution register records each output's SHA-256.

Vercel rewrites conventional root favicon and app-icon URLs to the same files
under `/play/`. HTML and manifest references use new cache versions. External
chat/search preview caches can retain an older icon after the live files change.
