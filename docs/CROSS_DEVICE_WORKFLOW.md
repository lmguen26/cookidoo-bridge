# Cross-device workflow

## Goal

Create and plan recipes primarily on iOS, keep canonical data/version history in GitHub, and perform the authenticated Cookidoo DOM import from a desktop browser without copying long userscripts through chat.

## System roles

### ChatGPT / iOS
- create or adapt recipes;
- normalize to the canonical Cookidoo Bridge JSON schema;
- plan meals and grocery needs;
- publish/commit recipe JSON to GitHub.

### GitHub
- source of truth for canonical recipe JSON;
- stable/dev/archive userscript versions;
- deterministic test fixtures;
- changelog and documentation;
- GitHub Pages for the meal planner and human-readable recipe pages.

### Tampermonkey on Windows/macOS
- runs only on Cookidoo Created Recipe editor URLs;
- imports canonical JSON into the authenticated Cookidoo DOM;
- does not store Cookidoo credentials;
- leaves final Cookidoo Confirm/review to the user.

### Cookidoo
- final recipe library and Thermomix execution environment.

## Current handoff

1. Create/adapt recipe on iOS.
2. Store canonical JSON at `data/<slug>.json`.
3. On desktop, open a new blank Cookidoo Created Recipe.
4. Run the stable or development Tampermonkey importer.
5. Import the recipe JSON.
6. Review all ingredients, steps, time, temperature, speed and reverse direction.
7. Confirm in Cookidoo.

## Planned handoff improvements

### A. Recipe picker in the userscript
Replace JSON paste with a small picker that fetches recipe JSON from GitHub raw URLs.

### B. Recipe manifest
Generate a lightweight `data/index.json` manifest containing slug, title and raw JSON path. Tampermonkey can fetch this to populate the picker.

### C. Planner → desktop handoff
The meal planner can expose a `Send to Cookidoo` action that stores/links the recipe slug. The desktop importer can then read the selected slug from a URL parameter or shared handoff file.

### D. iOS companion
A later Safari Shortcut/JavaScript workflow can reuse the same canonical JSON and DOM mapping where iOS browser automation permits it. The JSON contract stays platform-neutral.

## Pages after Tampermonkey

GitHub Pages remains useful, but not as a Cookidoo URL-import source. It is used for:

- `/planner/` — Smart Meal Planner;
- `/recipes/` — human-readable recipe library;
- future `/tools/` — JSON validation, recipe selection and handoff UI.

Cookidoo URL import from `github.io` is not part of the supported workflow because Cookidoo currently rejects that domain.
