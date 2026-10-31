// Bottom bar, timer, mistake marks, subtitle and the menu sheet form.

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
export function renderMistakes(left, limit, pawSvg) {
  const el = $('mistakes');
  if (limit === Infinity) {
    el.innerHTML = '';
    return;
  }
  const parts = [];
  for (let i = 0; i < limit; i++) parts.push(pawSvg.replace('class="paw"', i < left ? 'class="paw"' : 'class="paw spent"'));
  el.innerHTML = parts.join('');
}

// Counts up, or counts down when started with a limit (climb mode), calling
// onExpire once when the time runs out.
export function createTimer(el, format) {
  let base = 0; // elapsed ms accumulated before the current run
  let startedAt = null;
  let handle = null;
  let limit = null;
  let onExpire = null;
  function elapsed() {
    return base + (startedAt === null ? 0 : Date.now() - startedAt);
  }
  function tick() {
    clearInterval(handle);
    handle = setInterval(draw, limit === null ? 1000 : 250);
  }
  function pause() {
    if (startedAt === null) return;
    base = elapsed();
    startedAt = null;
    clearInterval(handle);
    draw();
  }
  function draw() {
    if (limit === null) {
      el.textContent = format(elapsed());
      el.classList.remove('low');
      return;
    }
    const left = Math.max(0, limit - elapsed());
    el.textContent = format(left);
    el.classList.toggle('low', left <= 30000);
    if (left === 0 && startedAt !== null) {
      pause();
      if (onExpire) onExpire();
    }
  }
  return {
    start(fromMs = 0, { limitMs = null, onExpire: expire = null } = {}) {
      base = fromMs;
      limit = limitMs;
      onExpire = expire;
      startedAt = Date.now();
      tick();
      draw();
    },
    resume() {
      if (startedAt !== null) return;
      startedAt = Date.now();
      tick();
      draw();
    },
    pause,
    elapsed,
    show(visible) {
      el.hidden = !visible;
    },
  };
}

// Fills the selects, mirrors `settings` into the form, and reports changes.
export function bindMenu({ settings, sizes, animals, palettes, onChange, onClose, onExport, onImport }) {
  fill($('set-size'), [...sizes.map((n) => [String(n), n >= 12 ? `${n} × ${n} (large)` : `${n} × ${n}`]), ['random', 'Random']]);
  fill($('set-animal'), [...animals.map(([id, a]) => [id, capital(a.name)]), ['random', 'Random each puzzle']]);
  fill($('set-palette'), [...palettes.map(([id, p]) => [id, p.name]), ['random', 'Random each puzzle']]);

  const fields = {
    n: ['set-size', 'value', (v) => (v === 'random' ? v : Number(v))],
    difficulty: ['set-difficulty', 'value', String],
    tapMode: ['set-tap', 'value', String],
    autoMark: ['set-auto-mark', 'checked', Boolean],
    relaxed: ['set-relaxed', 'checked', Boolean],
    timer: ['set-timer', 'checked', Boolean],
    animal: ['set-animal', 'value', String],
    theme: ['set-theme', 'value', String],
    palette: ['set-palette', 'value', String],
    lines: ['set-lines', 'value', String],
    advanced: ['set-advanced', 'checked', Boolean],
  };
  for (const [key, [id, prop, cast]] of Object.entries(fields)) {
    const input = $(id);
    input[prop] = settings[key];
    input.addEventListener('change', () => {
      onChange(key, cast(input[prop]));
      syncMenu(settings);
    });
  }
  // Which palettes "random" may pick: one checkbox each, at least one ticked.
  const picker = $('random-palettes');
  picker.innerHTML = palettes.map(([id, p]) => `<label class="row"><input type="checkbox" data-id="${id}"> ${p.name}</label>`).join('');
  picker.addEventListener('change', (event) => {
    const boxes = [...picker.querySelectorAll('input')];
    if (!boxes.some((b) => b.checked)) event.target.checked = true;
    onChange('randomPalettes', boxes.filter((b) => b.checked).map((b) => b.dataset.id));
  });
  syncMenu(settings);
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
  const picker = $('random-palettes');
  picker.hidden = settings.palette !== 'random';
  const chosen = Array.isArray(settings.randomPalettes) ? settings.randomPalettes : [];
  for (const box of picker.querySelectorAll('input')) box.checked = chosen.length === 0 || chosen.includes(box.dataset.id);
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
