import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import * as cheerio from 'cheerio';
import Ajv from 'ajv';

const SOURCE_URL = process.env.SUPERC_SOURCE_URL || 'https://www.superc.ca/en/aisles?fromEcomFlyer=true';
const OUT = process.env.SUPERC_OUT || 'data/offers/superc-current.json';
const SCHEMA = process.env.OFFER_SCHEMA || 'offers/schema/offer.schema.json';

const categoryRules = [
  ['fish', /trout|salmon|cod|haddock|tilapia|tuna|sole|fish/i],
  ['seafood', /shrimp|scallop|mussel|lobster|crab|seafood/i],
  ['meat', /chicken|turkey|beef|pork|veal|steak|ground meat|sausage/i],
  ['tofu', /tofu|tempeh/i],
  ['eggs', /\begg/i],
  ['dairy', /yogurt|milk|cheese|cottage|skyr|cream/i],
  ['vegetable', /zucchini|tomato|pepper|cucumber|lettuce|spinach|broccoli|cauliflower|carrot|onion|potato|asparagus|cabbage|bean sprout|mushroom/i],
  ['fruit', /apple|orange|banana|berry|berries|raspberry|blueberry|strawberry|grape|melon|peach|pear|mango|pineapple|lime|lemon/i],
  ['legume', /lentil|chickpea|black bean|kidney bean|white bean|legume/i],
  ['grain', /rice|quinoa|barley|oat|couscous|bulgur/i],
  ['pasta', /pasta|spaghetti|penne|linguine|macaroni/i],
  ['pantry', /olive oil|vinegar|broth|stock|canned tomato|coconut milk|soy sauce|spice|flour/i]
];

function categorize(name='') {
  for (const [cat, rx] of categoryRules) if (rx.test(name)) return cat;
  return 'other';
}

function relevance(category) {
  const scores = { fish:.98, seafood:.95, meat:.93, tofu:.92, eggs:.86, dairy:.82, vegetable:1, fruit:.78, legume:.94, grain:.8, pasta:.72, pantry:.65, other:.15 };
  return scores[category] ?? .15;
}

function parseMoney(text='') {
  const m = text.replace(',', '.').match(/\$?\s*(\d+(?:\.\d{1,2})?)/);
  return m ? Number(m[1]) : null;
}

function normalizeSpace(s='') { return s.replace(/\s+/g, ' ').trim(); }
function idFor(name, priceText) { return crypto.createHash('sha1').update(`${name}|${priceText}`).digest('hex').slice(0,16); }

function weekRange(now = new Date()) {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const day = d.getUTCDay();
  const deltaToThursday = (day - 4 + 7) % 7;
  const from = new Date(d); from.setUTCDate(d.getUTCDate() - deltaToThursday);
  const to = new Date(from); to.setUTCDate(from.getUTCDate() + 6);
  return [from.toISOString().slice(0,10), to.toISOString().slice(0,10)];
}

function extractFromJson(value, out=[]) {
  if (!value || typeof value !== 'object') return out;
  if (Array.isArray(value)) { for (const x of value) extractFromJson(x, out); return out; }
  const keys = Object.keys(value);
  const name = value.name || value.productName || value.title || value.description;
  const price = value.price ?? value.salePrice ?? value.currentPrice;
  const priceText = value.priceText || value.formattedPrice || (typeof price === 'number' ? `$${price}` : null);
  if (typeof name === 'string' && (price != null || priceText)) {
    out.push({
      name: normalizeSpace(name),
      brand: typeof value.brand === 'string' ? value.brand : (value.brand?.name || null),
      price: typeof price === 'number' ? price : parseMoney(String(priceText || '')),
      price_text: normalizeSpace(String(priceText || price || '')),
      regular_price: typeof value.regularPrice === 'number' ? value.regularPrice : null,
      quantity_text: value.size || value.quantity || null,
      image_url: value.image || value.imageUrl || value.thumbnailUrl || null,
      product_url: value.url || value.productUrl || null
    });
  }
  for (const k of keys) extractFromJson(value[k], out);
  return out;
}

function extractFromDom($) {
  const candidates = [];
  const selectors = ['article','[data-testid*="product"]','[class*="product-tile"]','[class*="product-card"]','li'];
  for (const sel of selectors) {
    $(sel).each((_, el) => {
      const text = normalizeSpace($(el).text());
      if (!/\$\s*\d/.test(text) || text.length < 8 || text.length > 900) return;
      const nameEl = $(el).find('a[href*="/aisles/"], h2, h3, h4, [class*="name"], [class*="title"]').first();
      let name = normalizeSpace(nameEl.text());
      if (!name) {
        const beforePrice = text.split(/\$\s*\d/)[0];
        name = normalizeSpace(beforePrice.replace(/regular price/ig,'').replace(/save/ig,''));
      }
      if (!name || name.length > 220) return;
      const prices = [...text.matchAll(/\$\s*(\d+(?:[.,]\d{1,2})?)/g)].map(m => Number(m[1].replace(',','.')));
      const price = prices.length ? prices[prices.length - 1] : null;
      const regular = /regular price/i.test(text) && prices.length > 1 ? prices[0] : null;
      const img = $(el).find('img').first().attr('src') || null;
      const href = nameEl.is('a') ? nameEl.attr('href') : $(el).find('a').first().attr('href');
      candidates.push({ name, price, regular_price: regular, price_text: price != null ? `$${price.toFixed(2)}` : text, quantity_text: null, image_url: img, product_url: href || null });
    });
  }
  return candidates;
}

function dedupe(items) {
  const map = new Map();
  for (const x of items) {
    if (!x.name || !x.price_text) continue;
    const key = `${x.name.toLowerCase()}|${x.price ?? x.price_text}`;
    if (!map.has(key)) map.set(key, x);
  }
  return [...map.values()];
}

const res = await fetch(SOURCE_URL, { headers: { 'user-agent': 'Mozilla/5.0 CookidooBridge/1.0', 'accept-language': 'en-CA,en;q=0.9,fr-CA;q=0.8' } });
if (!res.ok) throw new Error(`Super C fetch failed: ${res.status} ${res.statusText}`);
const html = await res.text();
const $ = cheerio.load(html);

let raw = [];
$('script[type="application/ld+json"], script[type="application/json"]').each((_, el) => {
  try { raw.push(...extractFromJson(JSON.parse($(el).text()))); } catch {}
});
raw.push(...extractFromDom($));
raw = dedupe(raw);

const offers = raw.map(x => {
  const category = categorize(x.name);
  const discount = x.regular_price && x.price ? Math.round((1 - x.price/x.regular_price)*1000)/10 : null;
  return {
    id: idFor(x.name, x.price_text),
    name: x.name,
    brand: x.brand || null,
    category,
    price: x.price ?? null,
    currency: 'CAD',
    unit: null,
    price_text: x.price_text,
    regular_price: x.regular_price ?? null,
    discount_percent: discount,
    quantity_text: x.quantity_text ?? null,
    image_url: x.image_url ?? null,
    product_url: x.product_url ? new URL(x.product_url, SOURCE_URL).href : null,
    meal_planning_relevance: relevance(category),
    tags: [category].concat(category === 'fish' || category === 'meat' || category === 'tofu' || category === 'legume' ? ['protein'] : [])
  };
}).filter(x => x.meal_planning_relevance >= .6).sort((a,b) => b.meal_planning_relevance - a.meal_planning_relevance || a.name.localeCompare(b.name));

if (!offers.length) throw new Error('Super C adapter found no meal-planning-relevant offers. Site markup may have changed.');

const [valid_from, valid_to] = weekRange();
const output = {
  schema_version: '1.0',
  banner: 'Super C',
  store: null,
  valid_from,
  valid_to,
  source_url: SOURCE_URL,
  generated_at: new Date().toISOString(),
  offers
};

const schema = JSON.parse(await fs.readFile(SCHEMA, 'utf8'));
const ajv = new Ajv({allErrors:true, strict:false});
const validate = ajv.compile(schema);
if (!validate(output)) throw new Error(`Offer schema validation failed: ${JSON.stringify(validate.errors)}`);
await fs.mkdir(new URL('../../data/offers/', import.meta.url), { recursive: true }).catch(()=>{});
await fs.mkdir(OUT.split('/').slice(0,-1).join('/'), {recursive:true});
await fs.writeFile(OUT, JSON.stringify(output, null, 2) + '\n');
console.log(`Wrote ${offers.length} normalized Super C offers to ${OUT}`);
