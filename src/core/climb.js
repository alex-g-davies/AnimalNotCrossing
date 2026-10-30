// Climb mode: a run of puzzles that get bigger and harder until the player
// fails. Each stage has a countdown. After the ladder ends the stage repeats
// at 12x12 hard with the time limit shrinking, so a run always ends.

export const LADDER = [
  { n: 6, difficulty: 'easy' },
  { n: 7, difficulty: 'easy' },
  { n: 7, difficulty: 'medium' },
  { n: 8, difficulty: 'medium' },
  { n: 9, difficulty: 'medium' },
  { n: 9, difficulty: 'hard' },
  { n: 10, difficulty: 'hard' },
  { n: 11, difficulty: 'hard' },
  { n: 12, difficulty: 'hard' },
];

export const TIME_PER_CELL_MS = 5000; // 6x6 = 3 min, 8x8 = 5:20, 12x12 = 12 min
export const SHRINK = 0.85; // per stage past the ladder
export const MIN_LIMIT_MS = 60000;

// Stage numbers start at 1.
export function stageSpec(stage) {
  const index = Math.min(stage, LADDER.length) - 1;
  const { n, difficulty } = LADDER[index];
  const extra = Math.max(0, stage - LADDER.length);
  const timeLimitMs = Math.max(MIN_LIMIT_MS, Math.round(n * n * TIME_PER_CELL_MS * SHRINK ** extra));
  return { stage, n, difficulty, timeLimitMs };
}

export function newRun() {
  return { stage: 1, totalMs: 0 };
}

// The current stage was solved in `elapsedMs`: move on.
export function clearStage(run, elapsedMs) {
  return { stage: run.stage + 1, totalMs: run.totalMs + elapsedMs };
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
