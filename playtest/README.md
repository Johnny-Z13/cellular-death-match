# Cellular Death Match browser deployment

Public game link: https://cellular-death-match.vercel.app

The root URL and `/index.html` redirect immediately to `/play/`. The game plays
its Z13 studio ident and then opens its title screen. There is no alpha
information page or extra Play now step. The HTML at the root is a minimal
redirect fallback for static local previews. Existing saves and installed
shortcuts keep the same origin and `/play/` path.

The retired portal artwork, CSS and JavaScript remain in source history/workspace
but are excluded from deployment by `.vercelignore`.

## Build and preview

Commit game changes first, then run:

```sh
npm test
node scripts/stage-playtest.mjs "Alpha Build 1" alpha-1 "One-line summary"
python3 -m http.server 4191 --bind 127.0.0.1 --directory playtest
```

The staging script builds and copies the game into ignored `play/` and records
the exact source commit in `release.json`. The local server uses the HTML
redirect; Vercel uses HTTP redirects and the headers in `vercel.json`.

## Publish

From **playtest/**, verify `vercel project inspect --non-interactive --scope z13labs`
resolves to `z13labs/cellular-death-match` (`prj_pj0IXogr42aXHQWeTkNb8nGXZwX4`).
Inspect `vercel deploy --dry --format=json --scope z13labs`, deploy using
`vercel deploy --prod --skip-domain --yes --scope z13labs`, verify the deployment,
then `vercel promote <deployment-url> --yes --scope z13labs`.

Check the public root redirects to the game, the Z13 ident finishes at the title,
the cellular Dr. E favicon loads, and the game can start. The GitHub connection is off;
pushing alone does not deploy. CLI credentials and staged output are excluded
from Git. No game source or Git metadata is uploaded. The game remains public
to anyone with the link; `noindex` is not access control.
