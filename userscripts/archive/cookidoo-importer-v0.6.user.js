// Archived milestone snapshot. Install userscripts/cookidoo-importer.user.js for the stable channel.
// ==UserScript==
// @name         Cookidoo JSON Importer v0.6 Archive
// @namespace    https://github.com/lmguen26/cookidoo-bridge
// @version      0.6.0
// @description  Archived closest-working baseline from Cookidoo DOM experiments.
// @match        https://cookidoo.ca/created-recipes/*
// @grant        none
// ==/UserScript==

(function () {
  'use strict';
  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
  const log = (...args) => console.log('[Cookidoo Importer v0.6]', ...args);
  function clickByText(texts){const wanted=texts.map(x=>x.toLowerCase());return [...document.querySelectorAll('button')].find(b=>wanted.some(x=>(b.innerText||b.textContent||'').trim().toLowerCase().includes(x)));}
  function pressEnter(el){['keydown','keypress','keyup'].forEach(type=>el.dispatchEvent(new KeyboardEvent(type,{key:'Enter',code:'Enter',keyCode:13,which:13,bubbles:true})));}
  function setText(el,text){el.focus();el.textContent=text||'';el.dispatchEvent(new InputEvent('input',{bubbles:true,inputType:'insertText',data:text||''}));el.dispatchEvent(new Event('change',{bubbles:true}));}
  function ingredientToText(i){if(typeof i==='string')return i;return [i.quantity??'',i.unit??'',i.ingredient??i.name??'',i.note?`(${i.note})`:''].filter(Boolean).join(' ').trim();}
  function ingredientField(){const f=[...document.querySelectorAll('cr-text-field[placeholder="e.g. 100 g water"]')];return f.find(x=>!(x.textContent||'').trim())||f[f.length-1]||null;}
  function stepField(){const f=[...document.querySelectorAll('cr-step-text-field cr-text-field[placeholder="Describe step"]')];return f.find(x=>!(x.textContent||'').trim())||f[f.length-1]||null;}
  function formatTime(s){s=Number(s||0);const m=Math.floor(s/60),r=s%60;if(m&&r)return `${m} min ${r} sec`;if(m)return `${m} min`;return `${r} sec`;}
  function applyTTS(field,tm){if(!tm)return;let tts=field.querySelector('cr-tts');if(!tts){tts=document.createElement('cr-tts');field.appendChild(tts);}if(tm.duration_seconds!=null){tts.setAttribute('time',String(tm.duration_seconds));tts.setAttribute('time-unit','s');}if(tm.temperature_c!=null){tts.setAttribute('temperature',String(tm.temperature_c));tts.setAttribute('temperature-unit','C');}if(tm.speed!=null)tts.setAttribute('speed',String(tm.speed));tts.setAttribute('direction',tm.reverse?'CCW':'CW');const d=[];if(tm.duration_seconds!=null)d.push(formatTime(tm.duration_seconds));if(tm.temperature_c!=null)d.push(`${tm.temperature_c}°C`);if(tm.reverse)d.push('');if(tm.speed!=null)d.push(`speed ${tm.speed}`);tts.textContent=d.join('/');field.dispatchEvent(new InputEvent('input',{bubbles:true,inputType:'insertText'}));field.dispatchEvent(new Event('change',{bubbles:true}));}
  async function importIngredients(recipe){const add=clickByText(['add first ingredient','add ingredient']);if(add){add.click();await wait(800);}for(const i of [...recipe.ingredients].reverse()){let t=ingredientField();if(!t){await wait(500);t=ingredientField();}if(!t)throw new Error('Ingredient field not found');setText(t,ingredientToText(i));await wait(250);pressEnter(t);await wait(700);}}
  async function importSteps(recipe){const add=clickByText(['add first step','add step']);if(add){add.click();await wait(800);}const steps=[...recipe.steps].reverse();for(let i=0;i<steps.length;i++){let t=stepField();if(!t){await wait(500);t=stepField();}if(!t)throw new Error(`Step field not found at step ${i+1}`);const s=steps[i];setText(t,s.instruction||'');await wait(250);if(s.thermomix){applyTTS(t,s.thermomix);await wait(200);}const row=t.closest('li.cr-manage-list__item');const save=row?.querySelector('.cr-text-field-actions__save');if(save&&!save.disabled)save.click();else pressEnter(t);await wait(700);}}
  async function runImport(recipe){await importIngredients(recipe);await wait(800);await importSteps(recipe);alert('Import complete. Review before confirming.');}
  async function showImporter(){const raw=prompt('Paste recipe JSON:');if(!raw)return;try{await runImport(JSON.parse(raw));}catch(e){console.error(e);alert(`Import failed: ${e.message}`);}}
  function addButton(){if(document.getElementById('cookidoo-json-import-button'))return;const b=document.createElement('button');b.id='cookidoo-json-import-button';b.textContent='IMPORT JSON';Object.assign(b.style,{position:'fixed',right:'20px',bottom:'20px',zIndex:'999999',padding:'12px 18px',border:'0',borderRadius:'10px',background:'#087f5b',color:'#fff',fontWeight:'700',cursor:'pointer'});b.addEventListener('click',showImporter);document.body.appendChild(b);}
  addButton();new MutationObserver(addButton).observe(document.documentElement,{childList:true,subtree:true});
})();
