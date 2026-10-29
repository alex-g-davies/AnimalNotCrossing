// Bottom bar, timer, mistake marks, subtitle and the menu sheet form.

import { PAW_SVG } from './animals.js';

const $ = (id) => document.getElementById(id);

export function bindBar({ onUndo, onHint, onNew, onMenu }) {
  $('btn-undo').addEventListener('click', onUndo);
  $('btn-hint').addEventListener('click', onHint);
  $('btn-new').addEventListener('click', onNew);
  $('btn-menu').addEventListener('click', onMenu);
}

export function setUndoEnabled(enabled) {
  $('btn-undo').disabled = !enabled;
}

export function setSubtitle(text) {
  $('subtitle').textContent = text;
}

// Paw marks: one per allowed mistake, fading as they are spent.
export function renderMistakes(left, limit) {
  const el = $('mistakes');
  if (limit === Infinity) {
    el.innerHTML = '';
    return;
  }
  const parts = [];
  for (let i = 0; i < limit; i++) parts.push(PAW_SVG.replace('class="paw"', i < left ? 'class="paw"' : 'class="paw spent"'));
  el.innerHTML = parts.join('');
}

export function createTimer(el, format) {
  let base = 0; // elapsed ms accumulated before the current run
  let startedAt = null;
  let handle = null;
  function elapsed() {
    return base + (startedAt === null ? 0 : Date.now() - startedAt);
  }
  function draw() {
    el.textContent = format(elapsed());
  }
  return {
    start(fromMs = 0) {
      base = fromMs;
      startedAt = Date.now();
      clearInterval(handle);
      handle = setInterval(draw, 1000);
      draw();
    },
    resume() {
      if (startedAt !== null) return;
      startedAt = Date.now();
      clearInterval(handle);
      handle = setInterval(draw, 1000);
    },
    pause() {
      if (startedAt === null) return;
      base = elapsed();
      startedAt = null;
      clearInterval(handle);
      draw();
    },
    elapsed,
    show(visible) {
      el.hidden = !visible;
    },
  };
}

// Fills the selects, mirrors `settings` into the form, and reports changes.
export function bindMenu({ settings, sizes, animals, palettes, onChange, onClose, onExport, onImport }) {
  fill($('set-size'), sizes.map((n) => [String(n), n >= 12 ? `${n} × ${n} (large)` : `${n} × ${n}`]));
  fill($('set-animal'), animals.map(([id, a]) => [id, capital(a.name)]));
  fill($('set-palette'), palettes.map(([id, p]) => [id, p.name]));

  const fields = {
    n: ['set-size', 'value', Number],
    difficulty: ['set-difficulty', 'value', String],
    tapMode: ['set-tap', 'value', String],
    autoMark: ['set-auto-mark', 'checked', Boolean],
    relaxed: ['set-relaxed', 'checked', Boolean],
    timer: ['set-timer', 'checked', Boolean],
    animal: ['set-animal', 'value', String],
    theme: ['set-theme', 'value', String],
    palette: ['set-palette', 'value', String],
  };
  for (const [key, [id, prop, cast]] of Object.entries(fields)) {
    const input = $(id);
    input[prop] = settings[key];
    input.addEventListener('change', () => onChange(key, cast(input[prop])));
  }
  $('btn-menu-close').addEventListener('click', onClose);
  $('menu').addEventListener('click', (event) => {
    if (event.target === $('menu')) onClose();
  });
  $('btn-export').addEventListener('click', onExport);
  $('btn-import').addEventListener('click', () => $('import-file').click());
  $('import-file').addEventListener('change', (event) => {
    const file = event.target.files && event.target.files[0];
    if (file) onImport(file);
    event.target.value = '';
  });
}

export function syncMenu(settings) {
  $('set-size').value = String(settings.n);
  $('set-difficulty').value = settings.difficulty;
}

export function openMenu() {
  $('menu').hidden = false;
}

export function closeMenu() {
  $('menu').hidden = true;
}

export function renderStats(html) {
  $('stats').innerHTML = html;
}

function fill(select, options) {
  select.innerHTML = '';
  for (const [value, label] of options) {
    const opt = document.createElement('option');
    opt.value = value;
    opt.textContent = label;
    select.appendChild(opt);
  }
}

function capital(text) {
  return text[0].toUpperCase() + text.slice(1);
}
