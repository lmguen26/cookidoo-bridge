# iOS Shortcut setup — Cookidoo Bridge

This MVP uses the official ChatGPT action available in Apple Shortcuts, then writes one generated HTML recipe directly to this GitHub repository through the GitHub REST API.

## What the shortcut does

1. Receives text, a URL, or selected text from the iOS Share Sheet.
2. Sends the recipe source to ChatGPT with the prompt in `ios/prompt.txt`.
3. ChatGPT returns JSON containing `slug`, `title`, and a complete standalone `html` page with schema.org Recipe metadata.
4. Shortcuts Base64-encodes the HTML.
5. Shortcuts sends one authenticated PUT request to GitHub:
   `https://api.github.com/repos/lmguen26/cookidoo-bridge/contents/recipes/<slug>.html`
6. The shortcut opens or copies:
   `https://lmguen26.github.io/cookidoo-bridge/recipes/<slug>.html`
7. Paste that URL into Cookidoo Created Recipes → Import recipe.

## GitHub token

Create a fine-grained personal access token limited to only this repository:

- Resource owner: `lmguen26`
- Repository access: `Only select repositories` → `cookidoo-bridge`
- Repository permissions → Contents: `Read and write`
- Give it a short expiration if possible.

Do not commit the token into this repository. Store it only inside the private iOS Shortcut or, preferably, retrieve it from a password/keychain action if you use one.

## Shortcut actions

Create a shortcut named **Cookidoo Bridge** and enable **Show in Share Sheet** for URLs and text.

Suggested actions:

1. **If** Shortcut Input has no value → **Ask for Input**: `Paste or describe the recipe`.
2. **Text**: paste the contents of `ios/prompt.txt`, then append the Shortcut Input under `SOURCE RECIPE:`.
3. **Ask ChatGPT** using the Text action as the message. Turn off `Show When Run` if available.
4. **Get Dictionary from Input** using the ChatGPT result.
5. **Get Dictionary Value** `slug`.
6. **Get Dictionary Value** `html`.
7. **Base64 Encode** the HTML, with line breaks disabled if that option appears.
8. **Text** containing the GitHub token. Keep this shortcut private.
9. **Get Contents of URL**:
   - URL: `https://api.github.com/repos/lmguen26/cookidoo-bridge/contents/recipes/[slug].html`
   - Method: `PUT`
   - Headers:
     - `Accept: application/vnd.github+json`
     - `Authorization: Bearer [GitHub token]`
     - `X-GitHub-Api-Version: 2026-03-10`
   - Request Body: JSON
     - `message`: `Add recipe [slug] from iOS`
     - `content`: `[Base64 encoded HTML]`
     - `branch`: `main`
10. **Text**: `https://lmguen26.github.io/cookidoo-bridge/recipes/[slug].html`
11. **Copy to Clipboard**.
12. **Show Result** with the URL, or **Open URLs** to inspect the published page.

## Important MVP limitation

The GitHub Contents API returns a conflict when a file already exists unless the current file SHA is supplied. The first version therefore works best for *new* recipes with unique slugs. Updating an existing recipe can be added later by inserting a GitHub GET step to retrieve its SHA before the PUT request.

## Testing

Start with a short recipe copied from Notes or Safari. After the shortcut succeeds, allow GitHub Pages a short propagation delay, open the generated public URL, then paste it into Cookidoo's recipe importer.
