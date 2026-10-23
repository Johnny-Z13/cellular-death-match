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

## Consistency sweep — 23 October 2026

The existing cellular Dr. E artwork was re-exported and byte-matched: the face
has not changed. Browser, touch, desktop-install and share-image references
now use icon version 5 (manifest link version 7). Both root and `/play/` icon
and manifest routes explicitly revalidate. Open Graph and Twitter use the same
512px face. The studio ident remains Z13.

Run `npm run icons:check` to verify all PNG dimensions, embedded ICO entries,
HTML/manifest/share references, versions and Vercel routes. Add `-- --staged`
after staging, or `-- --staged --live https://cellular-death-match.vercel.app`
after deployment to byte-check every root and game route against source.
The source check also runs before production builds.

There is no separate native desktop package in this repository. Desktop web-app
installs use the manifest's 192/512px icons. No Cellular Death Match app or
shortcut was found in the local Applications/Desktop folders during this sweep.
Previously installed app icons and external chat-preview caches update on their
own schedule; the audit verifies the server files, not those external caches.
