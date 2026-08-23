# Cookidoo Bridge

A JSON-first recipe workflow for planning on iOS, versioning in GitHub, and importing into Cookidoo Created Recipes through browser automation.

## Current architecture

`Recipe/source → ChatGPT → canonical JSON → GitHub → Tampermonkey → authenticated Cookidoo Created Recipe editor → review → Confirm`

The **canonical artifact is JSON**. Cookidoo credentials are never stored in GitHub or recipe JSON.

## Canonical recipe schema

- Schema: `schema/recipe.schema.json`
- Recipes: `data/<slug>.json`
- Manifest: `data/index.json`
- Thermomix settings are structured per preparation step (`duration_seconds`, `temperature_c`, `speed`, `reverse`, etc.) rather than embedded in prose.

## Tampermonkey importer

Userscripts live in `userscripts/`.

- Stable/current baseline: `userscripts/cookidoo-importer.user.js`
- Development channel: `userscripts/cookidoo-importer-dev.user.js`
- Milestone snapshots: `userscripts/archive/`

Stable raw install URL:

`https://raw.githubusercontent.com/lmguen26/cookidoo-bridge/main/userscripts/cookidoo-importer.user.js`

Development raw install URL:

`https://raw.githubusercontent.com/lmguen26/cookidoo-bridge/main/userscripts/cookidoo-importer-dev.user.js`

The scripts include `@updateURL` and `@downloadURL` metadata so tested updates can be distributed through GitHub rather than copied manually from chat.

See `userscripts/README.md` for current DOM findings and test discipline.

## Cross-device workflow

### iPhone / iPad

1. Create, adapt or plan recipes in ChatGPT.
2. Normalize to canonical Cookidoo Bridge JSON.
3. Commit/store the recipe JSON in GitHub.
4. Use the Smart Meal Planner and human-readable recipe library as needed.

### Windows / macOS

1. Open a new blank Cookidoo Created Recipe while logged in.
2. Run the Tampermonkey importer.
3. Import the canonical recipe JSON.
4. Review ingredients, instructions, time, temperature, speed and reverse direction.
5. Confirm manually in Cookidoo.

Detailed architecture: `docs/CROSS_DEVICE_WORKFLOW.md`.

## Testing

Start importer development against a new blank Cookidoo Created Recipe using:

`tests/three-step-carrots.json`

Do not promote a dev userscript to stable until ingredients, all preparation steps and Thermomix settings persist after refresh.

## GitHub Pages

GitHub Pages remains useful, but **not as the Cookidoo import transport**. Cookidoo currently rejects `github.io` recipe URLs as an unapproved source.

Pages now serves:

- `/planner/` — Smart Meal Planner
- `/recipes/` — human-readable recipe library
- future `/tools/` — validation and recipe handoff UI

Site:

`https://lmguen26.github.io/cookidoo-bridge/`

Planner:

`https://lmguen26.github.io/cookidoo-bridge/planner/`

## Existing renderer

The existing `.github/workflows/render-recipes.yml` and `scripts/build.mjs` may continue to generate human-readable HTML from canonical JSON. Those pages are useful for review and the planner, even though Cookidoo URL import no longer accepts the GitHub Pages domain.

## Security

- Never commit Cookidoo credentials, GitHub tokens or household secrets.
- Use a fine-grained GitHub token restricted to this repository if an iOS Shortcut writes recipe JSON.
- The Tampermonkey importer runs inside your authenticated Cookidoo browser session and should leave final Confirm/review manual.
