// ==UserScript==
// @name         Cookidoo JSON Importer
// @namespace    https://github.com/lmguen26/cookidoo-bridge
// @version      0.6.0
// @description  Stable baseline: import recipe JSON into Cookidoo Created Recipes. Review before Confirm.
// @match        https://cookidoo.ca/created-recipes/*
// @updateURL    https://raw.githubusercontent.com/lmguen26/cookidoo-bridge/main/userscripts/cookidoo-importer.user.js
// @downloadURL  https://raw.githubusercontent.com/lmguen26/cookidoo-bridge/main/userscripts/cookidoo-importer.user.js
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
  const log = (...args) => console.log('[Cookidoo Importer]', ...args);

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
    return [
      item.quantity ?? '', item.unit ?? '', item.ingredient ?? item.name ?? '',
      item.note ? `(${item.note})` : ''
    ].filter(Boolean).join(' ').trim();
  }

  function findIngredientField() {
    const fields = [...document.querySelectorAll(
      'cr-text-field[placeholder="e.g. 100 g water"]'
    )];
    return fields.find(field => !(field.textContent || '').trim()) || fields[fields.length - 1] || null;
  }

  function findStepField() {
    const fields = [...document.querySelectorAll(
      'cr-step-text-field cr-text-field[placeholder="Describe step"]'
    )];
    return fields.find(field => !(field.textContent || '').trim()) || fields[fields.length - 1] || null;
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
    if (!tts) {
      tts = document.createElement('cr-tts');
      field.appendChild(tts);
    }

    if (tm.duration_seconds != null) {
      tts.setAttribute('time', String(tm.duration_seconds));
      tts.setAttribute('time-unit', 's');
    }
    if (tm.temperature_c != null) {
      tts.setAttribute('temperature', String(tm.temperature_c));
      tts.setAttribute('temperature-unit', 'C');
    }
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
    log('Importing ingredients');
    const addButton = clickByText(['add first ingredient', 'add ingredient']);
    if (addButton) { addButton.click(); await wait(800); }

    const ingredients = [...recipe.ingredients].reverse();
    for (const ingredient of ingredients) {
      let target = findIngredientField();
      if (!target) { await wait(500); target = findIngredientField(); }
      if (!target) throw new Error('Ingredient field not found');
      setContentEditableText(target, ingredientToText(ingredient));
      await wait(250);
      pressEnter(target);
      await wait(700);
    }
  }

  async function importSteps(recipe) {
    log('Importing steps');
    const addButton = clickByText(['add first step', 'add step']);
    if (addButton) { addButton.click(); await wait(800); }

    const steps = [...recipe.steps].reverse();
    for (let i = 0; i < steps.length; i++) {
      let target = findStepField();
      if (!target) { await wait(500); target = findStepField(); }
      if (!target) throw new Error(`Step field not found at step ${i + 1}`);

      const step = steps[i];
      setContentEditableText(target, step.instruction || '');
      await wait(250);
      if (step.thermomix) { applyTTS(target, step.thermomix); await wait(200); }

      const row = target.closest('li.cr-manage-list__item');
      const saveButton = row?.querySelector('.cr-text-field-actions__save');
      if (saveButton && !saveButton.disabled) saveButton.click();
      else pressEnter(target);
      await wait(700);
    }
  }

  async function runImport(recipe) {
    if (!recipe || typeof recipe !== 'object') throw new Error('Invalid recipe JSON');
    if (!Array.isArray(recipe.ingredients)) throw new Error('ingredients array not found');
    if (!Array.isArray(recipe.steps)) throw new Error('steps array not found');
    await importIngredients(recipe);
    await wait(800);
    await importSteps(recipe);
    alert('Import complete. Review the recipe before confirming.');
  }

  async function showImporter() {
    const raw = prompt('Paste recipe JSON:');
    if (!raw) return;
    try { await runImport(JSON.parse(raw)); }
    catch (error) { console.error(error); alert(`Import failed: ${error.message}`); }
  }

  function addImportButton() {
    if (document.getElementById('cookidoo-json-import-button')) return;
    const button = document.createElement('button');
    button.id = 'cookidoo-json-import-button';
    button.textContent = 'IMPORT JSON';
    Object.assign(button.style, {
      position: 'fixed', right: '20px', bottom: '20px', zIndex: '999999',
      padding: '12px 18px', border: '0', borderRadius: '10px', background: '#087f5b',
      color: '#fff', fontWeight: '700', fontSize: '14px', cursor: 'pointer',
      boxShadow: '0 4px 18px rgba(0,0,0,.25)'
    });
    button.addEventListener('click', showImporter);
    document.body.appendChild(button);
  }

  addImportButton();
  new MutationObserver(addImportButton).observe(document.documentElement, { childList: true, subtree: true });
})();
