// Climb mode: a run of puzzles that get bigger and harder until the player
// fails. Each stage has a countdown. After the ladder ends the top stage
// repeats with the time limit shrinking, so a run always ends.
//
// The ladder is tunable (menu, "Advanced"): the largest board, how fast the
// difficulty ramps up, and how tight the clock is. The defaults reproduce the
// original ladder, so old bests still mean the same thing; any other setting
// is a "custom" ladder with its own best (see optionsKey).

export const RAMPS = {
  gentle: [[6, 'easy'], [7, 'easy'], [8, 'easy'], [8, 'medium'], [9, 'medium'], [10, 'medium'], [10, 'hard'], [11, 'hard'], [12, 'hard']],
  normal: [[6, 'easy'], [7, 'easy'], [7, 'medium'], [8, 'medium'], [9, 'medium'], [9, 'hard'], [10, 'hard'], [11, 'hard'], [12, 'hard']],
  steep: [[6, 'medium'], [7, 'medium'], [8, 'hard'], [9, 'hard'], [10, 'hard'], [11, 'hard'], [12, 'hard']],
};

export const CLOCKS = {
  generous: { perCellMs: 7000, shrink: 0.9 },
  normal: { perCellMs: 5000, shrink: 0.85 }, // 6x6 = 3 min, 8x8 = 5:20, 12x12 = 12 min
  tight: { perCellMs: 3500, shrink: 0.8 },
};

export const MAX_SIZES = [8, 9, 10, 11, 12];
export const DEFAULT_OPTIONS = { maxSize: 12, ramp: 'normal', clock: 'normal' };
export const MIN_LIMIT_MS = 60000;

// Anything unknown falls back to the default, so stored settings can never
// break a run.
export function normalizeOptions(options) {
  const o = options || {};
  return {
    maxSize: MAX_SIZES.includes(Number(o.maxSize)) ? Number(o.maxSize) : DEFAULT_OPTIONS.maxSize,
    ramp: o.ramp in RAMPS ? o.ramp : DEFAULT_OPTIONS.ramp,
    clock: o.clock in CLOCKS ? o.clock : DEFAULT_OPTIONS.clock,
  };
}

export function buildLadder(options) {
  const { maxSize, ramp } = normalizeOptions(options);
  return RAMPS[ramp].filter(([n]) => n <= maxSize).map(([n, difficulty]) => ({ n, difficulty }));
}

export const LADDER = buildLadder(DEFAULT_OPTIONS);
export const TIME_PER_CELL_MS = CLOCKS.normal.perCellMs;
export const SHRINK = CLOCKS.normal.shrink;

// Stage numbers start at 1.
export function stageSpec(stage, options = DEFAULT_OPTIONS) {
  const o = normalizeOptions(options);
  const ladder = buildLadder(o);
  const index = Math.min(stage, ladder.length) - 1;
  const { n, difficulty } = ladder[index];
  const extra = Math.max(0, stage - ladder.length);
  const { perCellMs, shrink } = CLOCKS[o.clock];
  const timeLimitMs = Math.max(MIN_LIMIT_MS, Math.round(n * n * perCellMs * shrink ** extra));
  return { stage, n, difficulty, timeLimitMs };
}

// 'default' for the original ladder, otherwise a key for that custom ladder's own stats.
export function optionsKey(options) {
  const o = normalizeOptions(options);
  return o.maxSize === DEFAULT_OPTIONS.maxSize && o.ramp === DEFAULT_OPTIONS.ramp && o.clock === DEFAULT_OPTIONS.clock
    ? 'default'
    : `${o.maxSize}-${o.ramp}-${o.clock}`;
}

export function describeOptions(options) {
  const o = normalizeOptions(options);
  return `up to ${o.maxSize} × ${o.maxSize}, ${o.ramp} ramp, ${o.clock} clock`;
}

export function newRun(options = DEFAULT_OPTIONS) {
  return { stage: 1, totalMs: 0, options: normalizeOptions(options) };
}

// The current stage was solved in `elapsedMs`: move on.
export function clearStage(run, elapsedMs) {
  return { ...run, stage: run.stage + 1, totalMs: run.totalMs + elapsedMs };
}

// The run ended on `run.stage`. Records it in the climb stats: best stage
// reached, and the quickest total time among runs that reached it.
export function recordRun(climbStats, run) {
  const s = { runs: 0, bestStage: 0, bestStageMs: null, ...(climbStats || {}) };
  s.runs += 1;
  if (run.stage > s.bestStage) {
    s.bestStage = run.stage;
    s.bestStageMs = run.totalMs;
  } else if (run.stage === s.bestStage && (s.bestStageMs === null || run.totalMs < s.bestStageMs)) {
    s.bestStageMs = run.totalMs;
  }
  return s;
}
