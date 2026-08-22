# Cookidoo Bridge

A minimal static recipe library intended to bridge ChatGPT-generated Thermomix recipes into Cookidoo using Cookidoo's URL import feature.

## Current recipe

- Pan-Seared Trout with Ginger-Soy Sauce

## How it works

1. A recipe is stored as JSON under `data/`.
2. A public HTML page under `recipes/` contains the human-readable recipe and `schema.org/Recipe` JSON-LD metadata.
3. GitHub Pages serves the site publicly over HTTPS.
4. Copy the recipe page URL into Cookidoo → Created Recipes → Import recipe.

## GitHub Pages

This repository is designed to be published from the `main` branch root.

In GitHub, open **Settings → Pages**, then choose **Deploy from a branch**, select `main` and `/ (root)`, and save.

Expected site URL:

`https://lmguen26.github.io/cookidoo-bridge/`

Expected trout import URL:

`https://lmguen26.github.io/cookidoo-bridge/recipes/trout-ginger-soy.html`

## Adding recipes

For each recipe, create:

- `data/<slug>.json`
- `recipes/<slug>.html`
- an entry on `index.html`

The recipe HTML should include valid `schema.org/Recipe` JSON-LD with `recipeIngredient` and `recipeInstructions` fields so recipe importers can parse it reliably.
