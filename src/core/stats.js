// Per-combination and overall statistics, as pure functions over the stored
// stats object. Keys are "n-difficulty"; `overall` holds the global win
// streak; `daily` is managed by daily.js.
//
// A win streak counts consecutive solved puzzles. A loss ends it, and so does
// abandoning a puzzle after making a move (otherwise the number would mean
// nothing). X marks and hints do not matter.

export const OVERALL = 'overall';
export const RESERVED = new Set([OVERALL, 'daily', 'climb', 'climbs', 'trophies']);

// "8-medium", or "8-medium-double" for Double Up (two animals per line).
export function comboKey(puzzle) {
  return `${puzzle.n}-${puzzle.difficulty}${puzzle.k === 2 ? '-double' : ''}`;
}

function entryFor(stats, key) {
  return { solved: 0, lost: 0, times: [], best: null, streak: 0, bestStreak: 0, ...(stats[key] || {}) };
}

// `games` and `playMs` count every finished game, win or loss, since they
// were added (Nov 2026); older games have no recorded time.
function overallFor(stats) {
  return { streak: 0, bestStreak: 0, games: 0, playMs: 0, ...(stats[OVERALL] || {}) };
}

function bump(entry, won) {
  entry.streak = won ? entry.streak + 1 : 0;
  entry.bestStreak = Math.max(entry.bestStreak, entry.streak);
  return entry;
}

export function recordResult(stats, puzzle, won, elapsedMs) {
  const key = comboKey(puzzle);
  const entry = bump(entryFor(stats, key), won);
  const ms = Number.isFinite(elapsedMs) ? elapsedMs : 0;
  entry.playMs = (entry.playMs || 0) + ms;
  const overall = bump(overallFor(stats), won);
  overall.games += 1;
  overall.playMs += ms;
  if (won) {
    entry.solved++;
    entry.times = [...entry.times, elapsedMs].slice(-100);
    entry.best = entry.best === null ? elapsedMs : Math.min(entry.best, elapsedMs);
  } else {
    entry.lost++;
  }
  return { ...stats, [key]: entry, [OVERALL]: overall };
}

// Leaving a puzzle unfinished after making a move ends both streaks.
export function recordAbandon(stats, puzzle) {
  const key = comboKey(puzzle);
  return { ...stats, [key]: bump(entryFor(stats, key), false), [OVERALL]: bump(overallFor(stats), false) };
}

export function streaks(stats) {
  const { streak, bestStreak } = overallFor(stats);
  return { streak, bestStreak };
}

// Totals across every size and difficulty. `timedGames` is how many of the
// games have a recorded time (all of them, once the counters exist).
export function summary(stats) {
  const o = overallFor(stats);
  let wins = 0, losses = 0;
  for (const key of comboKeys(stats)) {
    wins += stats[key].solved || 0;
    losses += stats[key].lost || 0;
  }
  const games = wins + losses;
  return { games, wins, losses, winRate: games ? wins / games : null, playMs: o.playMs, timedGames: Math.min(o.games, games) };
}

// Are the recent wins quicker than the earlier ones? Compares the medians of
// the two halves of the recorded times; null until there are `min` of them.
// `pct` is positive when the recent half is quicker.
export function trend(times, min = 6) {
  const t = (times || []).filter(Number.isFinite);
  if (t.length < min) return null;
  const half = Math.floor(t.length / 2);
  const median = (xs) => { const s = xs.slice().sort((a, b) => a - b); return s[s.length >> 1]; };
  const earlier = median(t.slice(0, half));
  const recent = median(t.slice(-half));
  return { earlier, recent, pct: earlier ? Math.round(((earlier - recent) / earlier) * 100) : 0 };
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

