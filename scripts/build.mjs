import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const dataDir = path.join(root, 'data');
const recipesDir = path.join(root, 'recipes');
fs.mkdirSync(recipesDir, { recursive: true });

const esc = (s='') => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const iso = m => Number.isFinite(m) ? `PT${m}M` : undefined;
const ingredientText = i => [i.quantity, i.unit, i.ingredient, i.note ? `(${i.note})` : ''].filter(v => v !== null && v !== undefined && v !== '').join(' ');
const tmText = tm => {
  if (!tm) return '';
  const parts=[];
  if (tm.duration_seconds != null) parts.push(tm.duration_seconds < 60 ? `${tm.duration_seconds} sec` : `${tm.duration_seconds/60} min`);
  if (tm.temperature_c != null) parts.push(`${tm.temperature_c}°C`);
  if (tm.speed != null) parts.push(`speed ${tm.speed}`);
  if (tm.reverse) parts.push('reverse');
  if (tm.mode) parts.push(tm.mode);
  if (tm.measuring_cup) parts.push(`measuring cup: ${tm.measuring_cup}`);
  return parts.join(' / ');
};

function validate(r){
  const required=['schema_version','slug','title','servings','ingredients','steps'];
  for(const k of required) if(r[k] === undefined) throw new Error(`${r.slug || 'recipe'} missing ${k}`);
  if(r.schema_version !== '1.1') throw new Error(`${r.slug}: unsupported schema_version`);
  if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(r.slug)) throw new Error(`${r.slug}: invalid slug`);
  if(!Array.isArray(r.ingredients) || !r.ingredients.length) throw new Error(`${r.slug}: ingredients required`);
  if(!Array.isArray(r.steps) || !r.steps.length) throw new Error(`${r.slug}: steps required`);
  const ids=new Set(r.ingredients.map(i=>i.id));
  if(ids.size !== r.ingredients.length) throw new Error(`${r.slug}: ingredient ids must be unique`);
  for(const s of r.steps){
    for(const id of s.ingredient_ids || []) if(!ids.has(id)) throw new Error(`${r.slug}: unknown ingredient id ${id} in step ${s.order}`);
  }
}

function render(r){
  const ingredients=r.ingredients.map(ingredientText);
  const instructions=[...r.steps].sort((a,b)=>a.order-b.order).map(s=>({
    '@type':'HowToStep',
    name:s.action || undefined,
    text:`${s.instruction}${tmText(s.thermomix) ? ` — Thermomix: ${tmText(s.thermomix)}` : ''}`
  }));
  const total=r.total_minutes ?? ((r.prep_minutes ?? 0)+(r.cook_minutes ?? 0) || null);
  const nutrition=r.nutrition ? {
    '@type':'NutritionInformation',
    ...(r.nutrition.calories_per_serving != null ? {calories:`${r.nutrition.calories_per_serving} calories`} : {}),
    ...(r.nutrition.protein_g != null ? {proteinContent:`${r.nutrition.protein_g} g`} : {}),
    ...(r.nutrition.carbs_g != null ? {carbohydrateContent:`${r.nutrition.carbs_g} g`} : {}),
    ...(r.nutrition.fat_g != null ? {fatContent:`${r.nutrition.fat_g} g`} : {})
  } : undefined;
  const ld={
    '@context':'https://schema.org','@type':'Recipe',name:r.title,description:r.description || '',recipeYield:`${r.servings} servings`,
    ...(iso(r.prep_minutes) ? {prepTime:iso(r.prep_minutes)} : {}),
    ...(iso(r.cook_minutes) ? {cookTime:iso(r.cook_minutes)} : {}),
    ...(iso(total) ? {totalTime:iso(total)} : {}),
    ...(r.category ? {recipeCategory:r.category} : {}),...(r.cuisine ? {recipeCuisine:r.cuisine} : {}),
    ...(r.tags?.length ? {keywords:r.tags.join(', ')} : {}),recipeIngredient:ingredients,recipeInstructions:instructions,
    ...(nutrition ? {nutrition} : {})
  };
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(r.title)}</title><meta name="description" content="${esc(r.description||'')}"><script type="application/ld+json">${JSON.stringify(ld,null,2)}</script><style>body{font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;max-width:760px;margin:0 auto;padding:28px 20px;color:#222;line-height:1.55}h1{line-height:1.15}.meta{color:#666}.tm{display:block;color:#555;font-size:.95em;margin-top:.2rem}.box{background:#f6f6f6;padding:14px 16px;border-radius:10px;margin:20px 0}li{margin:.5rem 0}a{color:inherit}</style></head><body><p><a href="../index.html">← Recipe library</a></p><h1>${esc(r.title)}</h1><p class="meta">${esc(r.servings)} servings${r.prep_minutes!=null?` · Prep ${r.prep_minutes} min`:''}${r.cook_minutes!=null?` · Cook ${r.cook_minutes} min`:''}${total!=null?` · Total ${total} min`:''}</p>${r.description?`<p>${esc(r.description)}</p>`:''}${r.nutrition?.calories_per_serving!=null?`<div class="box"><strong>Approximate nutrition:</strong> ${esc(r.nutrition.calories_per_serving)} kcal${r.nutrition.protein_g!=null?` · ${esc(r.nutrition.protein_g)} g protein`:''} per serving.</div>`:''}<h2>Ingredients</h2><ul>${ingredients.map(x=>`<li>${esc(x)}</li>`).join('')}</ul><h2>Preparation</h2><ol>${[...r.steps].sort((a,b)=>a.order-b.order).map(s=>`<li>${esc(s.instruction)}${tmText(s.thermomix)?`<span class="tm"><strong>Thermomix:</strong> ${esc(tmText(s.thermomix))}</span>`:''}</li>`).join('')}</ol></body></html>`;
}

const recipes=[];
for(const file of fs.readdirSync(dataDir).filter(f=>f.endsWith('.json'))){
  const r=JSON.parse(fs.readFileSync(path.join(dataDir,file),'utf8'));
  validate(r); recipes.push(r);
  fs.writeFileSync(path.join(recipesDir,`${r.slug}.html`),render(r));
}
recipes.sort((a,b)=>a.title.localeCompare(b.title));
const cards=recipes.map(r=>`<li><a href="recipes/${esc(r.slug)}.html"><strong>${esc(r.title)}</strong></a>${r.description?`<br><span>${esc(r.description)}</span>`:''}</li>`).join('');
fs.writeFileSync(path.join(root,'index.html'),`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Cookidoo Bridge</title><style>body{font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;max-width:800px;margin:0 auto;padding:32px 20px;line-height:1.55;color:#222}li{margin:1rem 0}a{color:inherit}</style></head><body><h1>Cookidoo Bridge</h1><p>Canonical JSON recipes rendered into Cookidoo-importable pages.</p><ul>${cards}</ul></body></html>`);
console.log(`Rendered ${recipes.length} recipe(s).`);
