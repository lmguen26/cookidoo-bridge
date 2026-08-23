// ==UserScript==
// @name         Cookidoo JSON Importer DEV
// @namespace    https://github.com/lmguen26/cookidoo-bridge
// @version      0.6.1
// @description  Development channel for Cookidoo JSON importer experiments. Keep stable channel installed separately.
// @match        https://cookidoo.ca/created-recipes/*
// @updateURL    https://raw.githubusercontent.com/lmguen26/cookidoo-bridge/main/userscripts/cookidoo-importer-dev.user.js
// @downloadURL  https://raw.githubusercontent.com/lmguen26/cookidoo-bridge/main/userscripts/cookidoo-importer-dev.user.js
// @grant        none
// ==/UserScript==

/*
  DEV CHANNEL
  -----------
  Start from the stable v0.6 baseline. Changes here are experimental.
  Current next target: fix multi-step row selection/commit behavior WITHOUT
  changing ingredient import or CR-TTS generation.
*/

(function () {
  'use strict';

  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
  const log = (...args) => console.log('[Cookidoo Importer DEV]', ...args);

  function clickByText(texts) {
    const wanted = texts.map(x => x.toLowerCase());
    return [...document.querySelectorAll('button')].find(button => {
      const text = (button.innerText || button.textContent || '').trim().toLowerCase();
      return wanted.some(x => text.includes(x));
    });
  }

  function pressEnter(element) {
    ['keydown', 'keypress', 'keyup'].forEach(type => {
      element.dispatchEvent(new KeyboardEvent(type, {
        key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true
      }));
    });
  }

  function setContentEditableText(element, text) {
    element.focus();
    element.textContent = text || '';
    element.dispatchEvent(new InputEvent('input', {
      bubbles: true, inputType: 'insertText', data: text || ''
    }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function ingredientToText(item) {
    if (typeof item === 'string') return item;
    return [item.quantity ?? '', item.unit ?? '', item.ingredient ?? item.name ?? '', item.note ? `(${item.note})` : '']
      .filter(Boolean).join(' ').trim();
  }

  function findIngredientField() {
    const fields = [...document.querySelectorAll('cr-text-field[placeholder="e.g. 100 g water"]')];
    return fields.find(field => !(field.textContent || '').trim()) || fields[fields.length - 1] || null;
  }

  function getStepFields() {
    return [...document.querySelectorAll('cr-step-text-field cr-text-field[placeholder="Describe step"]')];
  }

  function findStepField() {
    const fields = getStepFields();
    return [...fields].reverse().find(field => !(field.textContent || '').trim()) || fields[fields.length - 1] || null;
  }

  function formatTime(seconds) {
    seconds = Number(seconds || 0);
    const minutes = Math.floor(seconds / 60);
    const remaining = seconds % 60;
    if (minutes && remaining) return `${minutes} min ${remaining} sec`;
    if (minutes) return `${minutes} min`;
    return `${remaining} sec`;
  }

  function applyTTS(field, tm) {
    if (!tm) return;
    let tts = field.querySelector('cr-tts');
    if (!tts) { tts = document.createElement('cr-tts'); field.appendChild(tts); }
    if (tm.duration_seconds != null) { tts.setAttribute('time', String(tm.duration_seconds)); tts.setAttribute('time-unit', 's'); }
    if (tm.temperature_c != null) { tts.setAttribute('temperature', String(tm.temperature_c)); tts.setAttribute('temperature-unit', 'C'); }
    if (tm.speed != null) tts.setAttribute('speed', String(tm.speed));
    tts.setAttribute('direction', tm.reverse ? 'CCW' : 'CW');
    const display = [];
    if (tm.duration_seconds != null) display.push(formatTime(tm.duration_seconds));
    if (tm.temperature_c != null) display.push(`${tm.temperature_c}°C`);
    if (tm.reverse) display.push('');
    if (tm.speed != null) display.push(`speed ${tm.speed}`);
    tts.textContent = display.join('/');
    field.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText' }));
    field.dispatchEvent(new Event('change', { bubbles: true }));
  }

  async function importIngredients(recipe) {
    const addButton = clickByText(['add first ingredient', 'add ingredient']);
    if (addButton) { addButton.click(); await wait(800); }
    for (const ingredient of [...recipe.ingredients].reverse()) {
      let target = findIngredientField();
      if (!target) { await wait(500); target = findIngredientField(); }
      if (!target) throw new Error('Ingredient field not found');
      setContentEditableText(target, ingredientToText(ingredient));
      await wait(250); pressEnter(target); await wait(700);
    }
  }

  async function importSteps(recipe) {
    const addButton = clickByText(['add first step', 'add step']);
    if (addButton) { addButton.click(); await wait(800); }

    const steps = [...recipe.steps].reverse();
    for (let i = 0; i < steps.length; i++) {
      const beforeCount = getStepFields().length;
      let target = findStepField();
      if (!target) { await wait(500); target = findStepField(); }
      if (!target) throw new Error(`Step field not found at step ${i + 1}`);

      const step = steps[i];
      log('Writing step', i + 1, step.instruction);
      setContentEditableText(target, step.instruction || '');
      await wait(250);
      if (step.thermomix) { applyTTS(target, step.thermomix); await wait(200); }

      pressEnter(target);

      if (i < steps.length - 1) {
        let grew = false;
        for (let attempt = 0; attempt < 10; attempt++) {
          await wait(250);
          if (getStepFields().length > beforeCount) { grew = true; break; }
        }
        if (!grew) log('Warning: no new step row detected after commit');
      }
      await wait(400);
    }
  }

  async function runImport(recipe) {
    if (!recipe || typeof recipe !== 'object') throw new Error('Invalid recipe JSON');
    if (!Array.isArray(recipe.ingredients)) throw new Error('ingredients array not found');
    if (!Array.isArray(recipe.steps)) throw new Error('steps array not found');
    await importIngredients(recipe); await wait(800); await importSteps(recipe);
    alert('DEV import complete. Review carefully before confirming.');
  }

  async function showImporter() {
    const raw = prompt('Paste recipe JSON:');
    if (!raw) return;
    try { await runImport(JSON.parse(raw)); }
    catch (error) { console.error(error); alert(`Import failed: ${error.message}`); }
  }

  function addImportButton() {
    if (document.getElementById('cookidoo-json-import-dev-button')) return;
    const button = document.createElement('button');
    button.id = 'cookidoo-json-import-dev-button';
    button.textContent = 'IMPORT JSON DEV';
    Object.assign(button.style, {
      position: 'fixed', right: '20px', bottom: '72px', zIndex: '999999', padding: '12px 18px',
      border: '0', borderRadius: '10px', background: '#6b4f9a', color: '#fff', fontWeight: '700',
      fontSize: '14px', cursor: 'pointer', boxShadow: '0 4px 18px rgba(0,0,0,.25)'
    });
    button.addEventListener('click', showImporter);
    document.body.appendChild(button);
  }

  addImportButton();
  new MutationObserver(addImportButton).observe(document.documentElement, { childList: true, subtree: true });
})();
