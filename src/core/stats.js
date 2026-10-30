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

// How this win compares with the player's earlier wins at the same size and
// difficulty. Call it before recordResult. `pct` is positive when faster than
// the average of those earlier times, null when there is nothing to compare.
export function compareTime(stats, puzzle, elapsedMs) {
  const entry = entryFor(stats, comboKey(puzzle));
  const times = entry.times.filter((t) => typeof t === 'number');
  const count = times.length;
  const avg = count ? times.reduce((a, b) => a + b, 0) / count : null;
  const pct = avg ? Math.round(((avg - elapsedMs) / avg) * 100) : null;
  const newBest = entry.best === null || elapsedMs < entry.best;
  return { count, avg, pct, newBest, solved: entry.solved, lost: entry.lost };
}

// Games finished, won or lost, over every size and difficulty.
export function gamesPlayed(stats) {
  return comboKeys(stats).reduce((sum, key) => sum + ((stats[key].solved || 0) + (stats[key].lost || 0)), 0);
}

// The "enjoying the app?" card shows once every FEEDBACK_EVERY finished
// games. `feedback` is the stored record { asked, ... }; `asked` is the game
// count when it was last shown, so a reload cannot show it twice.
export const FEEDBACK_EVERY = 10;

export function feedbackDue(stats, feedback) {
  const played = gamesPlayed(stats);
  return played > 0 && played % FEEDBACK_EVERY === 0 && (!feedback || feedback.asked !== played);
}
