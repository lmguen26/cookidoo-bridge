# Cookidoo userscripts

This folder is the browser-automation layer for Cookidoo Created Recipes.

## Channels

### Stable

`cookidoo-importer.user.js`

Purpose: closest-known-good baseline. Install this for normal use. It has a fixed raw-GitHub `@updateURL` and `@downloadURL`, so future tested releases can update through Tampermonkey.

Raw install URL:

`https://raw.githubusercontent.com/lmguen26/cookidoo-bridge/main/userscripts/cookidoo-importer.user.js`

### Development

`cookidoo-importer-dev.user.js`

Purpose: experiments and DOM debugging. Install separately only when testing. It uses a different script name/button and its own update channel.

Raw install URL:

`https://raw.githubusercontent.com/lmguen26/cookidoo-bridge/main/userscripts/cookidoo-importer-dev.user.js`

### Archive

Milestone snapshots live in `archive/`. Do not edit archived files.

## Cross-device model

- iPhone/iPad: create, adapt and plan recipes in ChatGPT; publish canonical recipe JSON to GitHub; use the meal planner.
- Windows/macOS browser: open a blank Cookidoo Created Recipe while authenticated, then run the Tampermonkey importer.
- GitHub: shared source of truth for recipe JSON, userscript versions, fixtures and changelog.

This keeps Cookidoo credentials out of GitHub and out of the recipe JSON.

## Current known-good DOM facts

Cookidoo currently exposes:

- ingredient editor: `cr-text-field[placeholder="e.g. 100 g water"]`
- preparation step editor: `cr-step-text-field cr-text-field[placeholder="Describe step"]`
- cooking settings representation: `cr-tts`
- step cooking-settings button: `.cr-text-field-actions__tts`
- step check/save button: `.cr-text-field-actions__save`

A native settings element observed in Cookidoo:

```html
<cr-tts time="150" time-unit="s" temperature="98" temperature-unit="C" speed="2.5" direction="CCW">2 min 30 sec/98°C//speed 2.5</cr-tts>
```

Direct edits to an existing `cr-tts` persisted after refresh in testing. The remaining development issue is reliable multi-step row creation/commit without overwriting the previous step.

## Testing discipline

Use a new blank Cookidoo Created Recipe for each test. Start with `tests/three-step-carrots.json` before testing full recipes. Never promote dev to stable until ingredients, all step rows and Thermomix settings persist after refresh.
