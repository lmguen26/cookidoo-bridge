# iOS Shortcut setup — JSON-first Cookidoo Bridge

This version assumes your ChatGPT Project already converts a recipe into the canonical Cookidoo Bridge JSON schema before the Shortcut runs.

## Architecture

Recipe/source → ChatGPT Project → validated JSON → iOS Shortcut → GitHub `data/<slug>.json` → GitHub Action → generated HTML → GitHub Pages → Cookidoo URL import.

The Shortcut does **not** generate HTML and does **not** reinterpret the recipe.

## Canonical schema

Schema:

`https://lmguen26.github.io/cookidoo-bridge/schema/recipe.schema.json`

Repository path:

`schema/recipe.schema.json`

The Project output should conform to schema version `1.0` and contain at minimum:

- `schema_version`
- `slug`
- `title`
- `servings`
- `ingredients`
- `steps`

## GitHub token

Create a fine-grained personal access token limited to only this repository:

- Resource owner: `lmguen26`
- Repository access: `Only select repositories` → `cookidoo-bridge`
- Repository permissions → Contents: `Read and write`
- Prefer a short expiration.

Never put the token in a recipe JSON or commit it to the repository.

## Shortcut actions

Create a shortcut named **Publish Cookidoo JSON**. It can accept Text from the Share Sheet or Clipboard.

1. **If** Shortcut Input has no value → **Get Clipboard**.
2. **Get Dictionary from Input** using the JSON text.
3. **Get Dictionary Value** `schema_version`; stop with an alert unless it equals `1.0`.
4. **Get Dictionary Value** `slug`.
5. **Get Text from Input** / preserve the original full JSON text as the payload.
6. **Base64 Encode** the complete JSON text, with line breaks disabled if available.
7. Store your GitHub token in a private Text action or retrieve it from your preferred secure storage.
8. **Get Contents of URL**:
   - URL: `https://api.github.com/repos/lmguen26/cookidoo-bridge/contents/data/[slug].json`
   - Method: `PUT`
   - Headers:
     - `Accept: application/vnd.github+json`
     - `Authorization: Bearer [GitHub token]`
     - `X-GitHub-Api-Version: 2022-11-28`
   - Request Body: JSON
     - `message`: `Add recipe [slug] from iOS`
     - `content`: `[Base64 encoded JSON]`
     - `branch`: `main`
9. Construct the final page URL:
   `https://lmguen26.github.io/cookidoo-bridge/recipes/[slug].html`
10. **Copy to Clipboard**.
11. **Show Result** or **Open URLs**.

## What happens after the PUT

A GitHub Action watches `data/**/*.json` and runs `node scripts/build.mjs`. The renderer creates or refreshes:

- `recipes/<slug>.html`
- `index.html`

The generated page contains visible recipe content and `schema.org/Recipe` JSON-LD for URL-based recipe importers.

## Updating an existing recipe

GitHub's Contents API requires the existing file SHA when replacing `data/<slug>.json`. The simplest MVP is to use a unique slug for new recipes. A later Shortcut revision can first GET the file metadata and include its `sha` in the PUT body when the recipe already exists.

## Recommended Project behavior

Have your ChatGPT Project return **only the canonical JSON object**, with no Markdown fences or explanation, when you invoke your publish command. Review the recipe in ChatGPT first; then share/copy the final JSON into this Shortcut.
