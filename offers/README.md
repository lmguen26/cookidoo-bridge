# Grocery offer ingestion

This subsystem converts banner-specific flyer/catalog data into one normalized JSON contract for the meal planner.

## Normalized contract

Schema: `offers/schema/offer.schema.json`

Current Super C output: `data/offers/superc-current.json`

The normalized record keeps only meal-planning-relevant food offers (proteins, produce, legumes, grains, useful pantry items, etc.) and assigns each item a category and `meal_planning_relevance` score.

## Super C adapter

Adapter: `offers/adapters/superc.mjs`

Default source:

`https://www.superc.ca/en/aisles?fromEcomFlyer=true`

The parser tries two extraction strategies:

1. structured JSON / JSON-LD embedded in the Super C page;
2. server-rendered product-card HTML as a fallback.

If no relevant offers are found, the adapter fails instead of overwriting the previous good dataset with an empty file.

Run locally from the repository root:

```bash
cd offers
npm install
cd ..
node offers/adapters/superc.mjs
```

Override the source URL when testing a specific Super C flyer/catalog page:

```bash
SUPERC_SOURCE_URL='https://www.superc.ca/...' node offers/adapters/superc.mjs
```

## GitHub Action

Workflow: `.github/workflows/update-superc-offers.yml`

It supports both:

- a scheduled Tuesday-evening refresh;
- `workflow_dispatch` for an on-demand refresh, optionally with a source URL override.

A successful run writes `data/offers/superc-current.json` and commits it only when the normalized dataset changed.

## Adapter pattern

Future banners should implement the same output contract:

- `offers/adapters/maxi.mjs`
- `offers/adapters/metro.mjs`
- etc.

The planner should consume normalized `data/offers/*-current.json` files rather than banner-specific HTML.
