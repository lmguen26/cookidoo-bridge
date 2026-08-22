# Cookidoo Bridge

A JSON-first bridge for turning ChatGPT/Thermomix recipes into public recipe pages that can be imported into Cookidoo by URL.

## Architecture

`Recipe/source → ChatGPT Project → canonical JSON → GitHub data/ → renderer → GitHub Pages → Cookidoo URL import`

The **canonical artifact is JSON**. HTML is generated automatically and should not normally be edited by hand.

## Canonical recipe schema

- Schema file: `schema/recipe.schema.json`
- Current schema version: `1.0`
- Public schema URL after GitHub Pages deployment:
  `https://lmguen26.github.io/cookidoo-bridge/schema/recipe.schema.json`

A recipe belongs in:

`data/<slug>.json`

Required fields include `schema_version`, `slug`, `title`, `servings`, `ingredients`, and `steps`.

Thermomix settings are structured per step rather than embedded in prose.

## Automatic rendering

The workflow `.github/workflows/render-recipes.yml` runs whenever canonical recipe JSON, the schema, or renderer changes.

It executes:

`node scripts/build.mjs`

and regenerates:

- `recipes/<slug>.html`
- `index.html`

Each generated recipe page includes visible recipe content plus `schema.org/Recipe` JSON-LD.

## iOS workflow

The recommended iPhone workflow is now deliberately simple:

1. Use the ChatGPT Project to convert/review a recipe and output canonical JSON only.
2. Share or copy that JSON to the **Publish Cookidoo JSON** Shortcut.
3. The Shortcut writes only `data/<slug>.json` to GitHub using a fine-grained token.
4. GitHub Actions generates the HTML automatically.
5. The Shortcut returns:
   `https://lmguen26.github.io/cookidoo-bridge/recipes/<slug>.html`
6. Paste that URL into Cookidoo → Created Recipes → Import recipe.

Detailed Shortcut instructions are in `ios/SHORTCUT_SETUP.md`.

## GitHub Pages

Publish from the `main` branch root:

**Settings → Pages → Deploy from a branch → `main` → `/ (root)`**

Site:

`https://lmguen26.github.io/cookidoo-bridge/`

Example recipe:

`https://lmguen26.github.io/cookidoo-bridge/recipes/trout-ginger-soy.html`

## Security

Use a fine-grained GitHub personal access token restricted to this repository with only **Contents: Read and write**. Never commit the token to this repository or include it inside recipe JSON.
