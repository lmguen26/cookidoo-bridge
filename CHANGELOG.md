# Changelog

## 2026-08-23 — Tampermonkey architecture

- Added stable userscript channel at `userscripts/cookidoo-importer.user.js`.
- Added development channel at `userscripts/cookidoo-importer-dev.user.js`.
- Archived the v0.6 milestone under `userscripts/archive/`.
- Added raw GitHub update/download URLs to the installable userscripts.
- Added deterministic three-step carrot test fixture.
- Added cross-device workflow documentation.
- Added `data/index.json` recipe manifest as the future source for a Tampermonkey recipe picker.
- Reframed GitHub Pages as planner/human-readable UI rather than Cookidoo URL-import transport.

### Current importer status

- Ingredient DOM mapping confirmed.
- Preparation-step DOM mapping confirmed.
- Native `cr-tts` structure confirmed.
- Direct modification of an existing `cr-tts` persists after refresh.
- Remaining dev issue: reliable creation/commit of multiple new step rows without overwriting or losing previous rows.
