// Per-combination and overall statistics, as pure functions over the stored
// stats object. Keys are "n-difficulty"; `overall` holds the global win
// streak; `daily` is managed by daily.js.
//
// A win streak counts consecutive solved puzzles. A loss ends it, and so does
// abandoning a puzzle after making a move (otherwise the number would mean
// nothing). X marks and hints do not matter.

export const OVERALL = 'overall';
export const RESERVED = new Set([OVERALL, 'daily', 'climb']);

export function comboKey(puzzle) {
  return `${puzzle.n}-${puzzle.difficulty}`;
}

function entryFor(stats, key) {
  return { solved: 0, lost: 0, times: [], best: null, streak: 0, bestStreak: 0, ...(stats[key] || {}) };
}

function overallFor(stats) {
  return { streak: 0, bestStreak: 0, ...(stats[OVERALL] || {}) };
}

function bump(entry, won) {
  entry.streak = won ? entry.streak + 1 : 0;
  entry.bestStreak = Math.max(entry.bestStreak, entry.streak);
  return entry;
}

export function recordResult(stats, puzzle, won, elapsedMs) {
  const key = comboKey(puzzle);
  const entry = bump(entryFor(stats, key), won);
  if (won) {
    entry.solved++;
    entry.times = [...entry.times, elapsedMs].slice(-100);
    entry.best = entry.best === null ? elapsedMs : Math.min(entry.best, elapsedMs);
  } else {
    entry.lost++;
  }
  return { ...stats, [key]: entry, [OVERALL]: bump(overallFor(stats), won) };
}

// Leaving a puzzle unfinished after making a move ends both streaks.
export function recordAbandon(stats, puzzle) {
  const key = comboKey(puzzle);
  return { ...stats, [key]: bump(entryFor(stats, key), false), [OVERALL]: bump(overallFor(stats), false) };
}

export function streaks(stats) {
  return overallFor(stats);
}

export function comboKeys(stats) {
  return Object.keys(stats).filter((k) => !RESERVED.has(k)).sort((a, b) => parseInt(a, 10) - parseInt(b, 10) || a.localeCompare(b));
}
