// Difficulty grading, backed by the deduction engine in techniques.js.
//
// Measured on this machine (see PERF.md): puzzles solvable with level 1 alone
// do not exist without single-cell regions, because nothing gives a first
// "single" until an animal is placed. So the levels map to difficulty like this:
//
//   easy    solvable with levels 1-2 (singles and simple confinement)
//   medium  needs level 3, but only a few level-3 steps
//   hard    needs level 3 for many steps
//
// Anything the engine cannot finish at level 3 is rejected by the generator,
// which is what keeps the "no guessing" promise.

import { solveByDeduction } from './techniques.js';

// Up to this many level-3 deductions counts as medium; more is hard.
export const MEDIUM_MAX_LEVEL3_STEPS = 2;

export const DIFFICULTIES = {
  easy: { maxLevel: 2, allowSingles: true },
  medium: { maxLevel: 3, allowSingles: false },
  hard: { maxLevel: 3, allowSingles: false },
};

export const DIFFICULTY_NAMES = Object.keys(DIFFICULTIES);

// Turns a deduction result into a difficulty label.
export function labelFor(result) {
  if (!result.solved) return 'unsolvable';
  if (result.maxLevelUsed <= 2) return 'easy';
  if (result.levelCounts[3] <= MEDIUM_MAX_LEVEL3_STEPS) return 'medium';
  return 'hard';
}

// Grades a puzzle from an empty board.
export function gradePuzzle(puzzle, maxLevel = 3) {
  const result = solveByDeduction(puzzle, { maxLevel });
  return {
    label: labelFor(result),
    solved: result.solved,
    maxLevelUsed: result.maxLevelUsed,
    steps: result.steps,
    levelCounts: result.levelCounts,
  };
}
