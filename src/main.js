// Wiring: owns the current game, settings, the worker and persistence.

import { MAX_SIZE, MIN_SIZE } from './core/generator.js';
import { randomSeed } from './core/rng.js';
import * as game from './core/game.js';
import { hintFor } from './core/hints.js';
import { dailySpec, liveStreak, recordDailySolve } from './core/daily.js';
import { LOSS_MESSAGES, WIN_MESSAGES, fillAnimal, nextMessage } from './messages.js';
import { KEYS, dumpAll, load, requestPersistence, restoreAll, save } from './store/storage.js';
import { ANIMALS, DEFAULT_ANIMAL, PAW_SVG } from './ui/animals.js';
import { PIXEL_PAW, PIXEL_SPRITES } from './ui/animals-pixel.js';
import { DEFAULT_PALETTE, PALETTES, applyPalette } from './ui/palettes.js';
import { createBoard } from './ui/board.js';
import { confetti, formatTime, hideEnd, hideHint, showEnd, showHint, showLoading } from './ui/screens.js';
import {
  bindBar, bindMenu, closeMenu, createTimer, openMenu, renderMistakes, renderStats, setSubtitle, setUndoEnabled, syncMenu,
} from './ui/controls.js';

const DEFAULT_SETTINGS = {
  n: 8,
  difficulty: 'medium',
  tapMode: 'hold',
  autoMark: false,
  relaxed: false,
  timer: false,
  animal: DEFAULT_ANIMAL,
  theme: 'auto',
  palette: DEFAULT_PALETTE,
};

const settings = { ...DEFAULT_SETTINGS, ...(load(KEYS.settings, {}) || {}) };
if (settings.tapMode === 'mark-first' || settings.tapMode === 'animal-first') settings.tapMode = 'hold';

// Look settings can be previewed from the URL (?palette=valley&animal=cow&theme=dark)
// without being saved; handy for sharing a look and for screenshots.
const params = new URLSearchParams(location.search);
for (const key of ['palette', 'animal', 'theme']) if (params.has(key)) settings[key] = params.get(key);
let current = null; // game state
let hint = null; // { tier, data }
let nextPuzzle = null; // pre-generated { key, puzzle }
let pendingKey = null;

const board = createBoard(document.getElementById('board'));
const timer = createTimer(document.getElementById('timer'), formatTime);

// --- Theme and palette -----------------------------------------------------

const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');
function isDark() {
  return settings.theme === 'dark' || (settings.theme === 'auto' && darkQuery.matches);
}
// The icon style follows the theme: Valley uses the pixel sprites.
function pixelLook() {
  return settings.palette === 'valley';
}
function animalSvg(id) {
  const key = id in ANIMALS ? id : DEFAULT_ANIMAL;
  return pixelLook() ? PIXEL_SPRITES[key] : ANIMALS[key].svg;
}
function pawSvg() {
  return pixelLook() ? PIXEL_PAW : PAW_SVG;
}
function applyLook() {
  document.documentElement.dataset.theme = settings.theme;
  document.documentElement.dataset.palette = settings.palette;
  applyPalette(settings.palette, isDark());
  board.setAnimal(animalSvg(settings.animal));
  if (current) renderMistakes(game.mistakesLeft(current), current.mistakeLimit, pawSvg());
}
darkQuery.addEventListener('change', applyLook);

// --- Worker ----------------------------------------------------------------

const worker = new Worker(new URL('./worker/generate.worker.js', import.meta.url), { type: 'module' });
const waiting = new Map();
let nextId = 1;
worker.onmessage = (event) => {
  const { id, puzzle, error } = event.data;
  const entry = waiting.get(id);
  if (!entry) return;
  waiting.delete(id);
  if (error) entry.reject(new Error(error));
  else entry.resolve(puzzle);
};

function freshSeed() {
  const played = new Set(load(KEYS.seeds, []) || []);
  let seed = randomSeed();
  while (played.has(seed)) seed = randomSeed();
  return seed;
}

function generate(n, difficulty, seed = freshSeed()) {
  const id = nextId++;
  return new Promise((resolve, reject) => {
    waiting.set(id, { resolve, reject });
    worker.postMessage({ id, n, seed, difficulty });
  });
}

function keyFor(n, difficulty) {
  return `${n}:${difficulty}`;
}

// Keeps one puzzle ready for the current size and difficulty.
async function prepareNext() {
  const key = keyFor(settings.n, settings.difficulty);
  if ((nextPuzzle && nextPuzzle.key === key) || pendingKey === key) return;
  pendingKey = key;
  try {
    const puzzle = await generate(settings.n, settings.difficulty);
    if (pendingKey === key) nextPuzzle = { key, puzzle };
  } catch (error) {
    console.error('generation failed', error);
  } finally {
    if (pendingKey === key) pendingKey = null;
  }
}

async function takePuzzle() {
  const key = keyFor(settings.n, settings.difficulty);
  if (nextPuzzle && nextPuzzle.key === key) {
    const { puzzle } = nextPuzzle;
    nextPuzzle = null;
    return puzzle;
  }
  nextPuzzle = null;
  showLoading(true);
  try {
    return await generate(settings.n, settings.difficulty);
  } finally {
    showLoading(false);
  }
}

// --- Game lifecycle --------------------------------------------------------

function gameSettings() {
  return { tapMode: settings.tapMode, autoMark: settings.autoMark, relaxed: settings.relaxed };
}

function startGame(puzzle, saved = null) {
  current = saved || game.newGame(puzzle, gameSettings());
  hint = null;
  hideHint();
  hideEnd();
  board.setPuzzle(puzzle, { onTap, onHold });
  showTip();
  board.setAnimal(animalSvg(settings.animal));
  setSubtitle(puzzle.daily ? `Daily · ${puzzle.daily}` : `${puzzle.n} × ${puzzle.n} · ${capital(puzzle.difficulty)}`);
  timer.show(settings.timer);
  timer.start(current.elapsedMs);
  render();
  rememberSeed(puzzle.seed);
  persist();
  prepareNext();
}

async function startNew() {
  timer.pause();
  const puzzle = await takePuzzle();
  startGame(puzzle);
}

// Today's puzzle: same board for everyone that day, tracked as a streak.
async function startDaily() {
  const spec = dailySpec();
  closeMenu();
  if (current && current.puzzle.daily === spec.key) return;
  timer.pause();
  showLoading(true);
  try {
    const puzzle = await generate(spec.n, spec.difficulty, spec.seed);
    puzzle.daily = spec.key;
    startGame(puzzle);
  } catch (error) {
    console.error('daily generation failed', error);
  } finally {
    showLoading(false);
  }
}

function dailyStreakText() {
  const stats = load(KEYS.stats, {}) || {};
  const today = dailySpec().key;
  const live = liveStreak(stats.daily, today);
  const best = stats.daily ? stats.daily.best : 0;
  const done = stats.daily && stats.daily.last === today;
  return `${done ? 'Solved today. ' : ''}Streak: ${live} day${live === 1 ? '' : 's'} · Best: ${best}`;
}

function render() {
  let hintView = null;
  if (hint && hint.data.kind === 'deduction') hintView = { area: hint.data.area, move: hint.tier >= 3 ? hint.data.move : null };
  else if (hint && hint.data.kind === 'mistake') hintView = { area: hint.data.cells, move: null };
  board.render({
    board: current.board,
    conflicts: game.conflicts(current),
    wrong: game.wrongAnimals(current),
    hint: hintView,
  });
  renderMistakes(game.mistakesLeft(current), current.mistakeLimit, pawSvg());
  setUndoEnabled(current.status === 'playing' && current.history.length > 0);
}

function onTap(r, c) {
  applyMove(game.tap, r, c);
}

function onHold(r, c) {
  applyMove(game.hold, r, c);
}

function applyMove(move, r, c) {
  if (!current || current.status !== 'playing') return;
  const before = current;
  current = move(current, r, c);
  if (current === before) return;
  hideTip();
  const last = current.history[current.history.length - 1];
  if (last && last.mistake) board.shake(r, c);
  clearHint();
  render();
  persist();
  if (current.status !== 'playing') finish();
}

function onUndo() {
  if (!current) return;
  current = game.undo(current);
  clearHint();
  render();
  persist();
}

// Shown on the first few puzzles until the player has placed an animal by holding.
function showTip() {
  if (settings.tapMode !== 'hold' || (load(KEYS.settings, {}) || {}).tipDone) return;
  const animal = ANIMALS[settings.animal] || ANIMALS[DEFAULT_ANIMAL];
  const tip = document.getElementById('tip');
  tip.textContent = `Tap a cell for an X. Press and hold to place a ${animal.name}.`;
  tip.hidden = false;
}

function hideTip() {
  const tip = document.getElementById('tip');
  if (tip.hidden) return;
  if (current && current.history.some((h) => h.after === 2)) {
    tip.hidden = true;
    settings.tipDone = true;
    save(KEYS.settings, settings);
  }
}

function clearHint() {
  if (!hint) return;
  hint = null;
  hideHint();
}

function onHint() {
  if (!current || current.status !== 'playing') return;
  const animal = ANIMALS[settings.animal] || ANIMALS[DEFAULT_ANIMAL];
  if (!hint) {
    const data = hintFor(current.puzzle, current.board, { animal: animal.name });
    hint = { tier: 1, data };
    current = game.countHint(current);
  } else if (hint.tier < 3) {
    hint = { ...hint, tier: hint.tier + 1 };
  }
  const { data, tier } = hint;
  if (data.kind === 'mistake' || data.kind === 'stuck') showHint(data.text);
  else if (tier === 1) showHint('Look at the highlighted cells. Tap hint again for the idea, and once more for the move.');
  else showHint(data.text);
  render();
  persist();
}

function finish() {
  timer.pause();
  current = game.setElapsed(current, timer.elapsed());
  const won = current.status === 'won';
  recordResult(won);
  const animal = ANIMALS[settings.animal] || ANIMALS[DEFAULT_ANIMAL];
  const cycles = load(KEYS.cycles, {}) || {};
  const list = won ? WIN_MESSAGES : LOSS_MESSAGES;
  const picked = nextMessage(list, cycles[won ? 'win' : 'loss'], Math.random);
  cycles[won ? 'win' : 'loss'] = picked.cycle;
  save(KEYS.cycles, cycles);
  if (!won) current = game.reveal(current);
  else confetti();
  render();
  persist();
  showEnd({
    status: current.status,
    title: won ? 'Solved!' : 'Out of paws',
    message: fillAnimal(picked.message, animal.name, animal.plural),
    timeText: won ? `Time: ${formatTime(current.elapsedMs)}` : 'Here is how it fits together.',
    artSvg: animalSvg(settings.animal),
    onNext: startNew,
    onLook: () => hideEnd(),
  });
}

// --- Persistence -----------------------------------------------------------

function persist() {
  if (!current) return;
  save(KEYS.game, { ...current, elapsedMs: timer.elapsed() });
}

function rememberSeed(seed) {
  const seeds = load(KEYS.seeds, []) || [];
  if (seeds.includes(seed)) return;
  seeds.push(seed);
  save(KEYS.seeds, seeds.slice(-3000));
}

function recordResult(won) {
  const stats = load(KEYS.stats, {}) || {};
  const key = `${current.puzzle.n}-${current.puzzle.difficulty}`;
  const entry = stats[key] || { solved: 0, lost: 0, times: [], best: null };
  if (won) {
    entry.solved++;
    entry.times = [...entry.times, current.elapsedMs].slice(-100);
    entry.best = entry.best === null ? current.elapsedMs : Math.min(entry.best, current.elapsedMs);
  } else {
    entry.lost++;
  }
  stats[key] = entry;
  if (won && current.puzzle.daily) stats.daily = recordDailySolve(stats.daily, current.puzzle.daily);
  save(KEYS.stats, stats);
}

function statsHtml() {
  const stats = load(KEYS.stats, {}) || {};
  const keys = Object.keys(stats).filter((k) => k !== 'daily').sort();
  if (!keys.length) return 'No puzzles finished yet.';
  const rows = keys.map((key) => {
    const s = stats[key];
    const sorted = s.times.slice().sort((a, b) => a - b);
    const median = sorted.length ? sorted[Math.floor(sorted.length / 2)] : null;
    const fmt = (v) => (v === null ? '–' : formatTime(v));
    return `<tr><th>${key.replace('-', ' · ')}</th><td>${s.solved} solved</td><td>${s.lost} lost</td><td>best ${fmt(s.best)}</td><td>median ${fmt(median)}</td></tr>`;
  });
  return `<table>${rows.join('')}</table>`;
}

function exportData() {
  const payload = { app: 'animal-not-crossing', version: 1, exportedAt: new Date().toISOString(), data: dumpAll() };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const name = `animal-not-crossing-${new Date().toISOString().slice(0, 10)}.json`;
  const file = new File([blob], name, { type: 'application/json' });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    navigator.share({ files: [file], title: 'Animal Not Crossing backup' }).catch(() => downloadBlob(blob, name));
  } else {
    downloadBlob(blob, name);
  }
}

function downloadBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function importData(file) {
  try {
    const parsed = JSON.parse(await file.text());
    if (!parsed || parsed.app !== 'animal-not-crossing' || typeof parsed.data !== 'object') throw new Error('not a backup file');
    restoreAll(parsed.data);
    location.reload();
  } catch (error) {
    alert(`Could not import that file: ${error.message}`);
  }
}

// --- Menu ------------------------------------------------------------------

function onSettingChange(key, value) {
  settings[key] = value;
  save(KEYS.settings, settings);
  if (key === 'theme' || key === 'palette' || key === 'animal') applyLook();
  if (key === 'timer') timer.show(value);
  if ((key === 'tapMode' || key === 'autoMark' || key === 'relaxed') && current) {
    current = { ...current, settings: { ...current.settings, ...gameSettings() } };
    if (key === 'relaxed') {
      const limit = value ? Infinity : game.MISTAKE_LIMITS[current.puzzle.difficulty];
      current = { ...current, mistakeLimit: limit };
      if (current.status === 'playing' && current.mistakes >= limit) current = { ...current, status: 'lost' };
    }
    render();
    persist();
    if (current.status !== 'playing') finish();
  }
  if (key === 'n' || key === 'difficulty') {
    nextPuzzle = null;
    prepareNext();
  }
}

// --- Boot ------------------------------------------------------------------

function capital(text) {
  return text[0].toUpperCase() + text.slice(1);
}

bindBar({
  onUndo,
  onHint,
  onNew: startNew,
  onMenu: () => {
    renderStats(statsHtml());
    document.getElementById('daily-streak').textContent = dailyStreakText();
    syncMenu(settings);
    openMenu();
  },
});

bindMenu({
  settings,
  sizes: Array.from({ length: MAX_SIZE - MIN_SIZE + 1 }, (_, i) => MIN_SIZE + i),
  animals: Object.entries(ANIMALS),
  palettes: Object.entries(PALETTES),
  onChange: onSettingChange,
  onClose: closeMenu,
  onExport: exportData,
  onImport: importData,
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    timer.pause();
    persist();
  } else if (current && current.status === 'playing') {
    timer.resume();
  }
});

document.getElementById('btn-daily').addEventListener('click', startDaily);

applyLook();
requestPersistence();

const saved = load(KEYS.game);
if (saved && saved.status === 'playing' && saved.puzzle && saved.board) {
  // JSON turns Infinity into null; restore it for relaxed games.
  startGame(saved.puzzle, { ...saved, mistakeLimit: saved.mistakeLimit === null ? Infinity : saved.mistakeLimit });
} else {
  startNew();
}

// Offline: the service worker precaches every file. Registered last so it
// never delays the first puzzle.
//
// Updates: a new worker installs in the background and takes control
// (skipWaiting + clients.claim in sw.js). The page that is already open would
// keep running the old modules, and a home-screen app on iOS resumes rather
// than reloads, so we reload once ourselves when control changes. The game
// is saved after every move, so nothing is lost. We also check for updates
// whenever the app returns to the foreground.
if ('serviceWorker' in navigator) {
  // On the very first visit the worker claims the page too; that is not an update.
  const hadController = Boolean(navigator.serviceWorker.controller);
  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloading || !hadController) return;
    reloading = true;
    persist();
    location.reload();
  });
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register(new URL('./sw.js', document.baseURI));
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden) registration.update().catch(() => {});
      });
    } catch (error) {
      console.warn('service worker failed', error);
    }
  });
}
