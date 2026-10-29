import test from 'node:test';
import assert from 'node:assert/strict';
import { createRng } from '../src/core/rng.js';
import { generatePuzzle } from '../src/core/generator.js';
import { countSolutions } from '../src/core/solver.js';
import {
  ANIMAL, OUT, UNKNOWN, applyDeduction, createState, findDeduction, runDeduction, solveByDeduction,
} from '../src/core/techniques.js';
import { gradePuzzle } from '../src/core/difficulty.js';

// Soundness: no deduction may ever eliminate a solution cell or place an
// animal off the solution. Checked after every single step.
test('every deduction step keeps the true solution intact', () => {
  const rng = createRng(777);
  for (let i = 0; i < 120; i++) {
    const n = 6 + rng.int(7); // 6..12
    const difficulty = ['easy', 'medium', 'hard'][rng.int(3)];
    const puzzle = generatePuzzle({ n, seed: 1000 + i, difficulty });
    const state = createState(puzzle);
    for (;;) {
      const d = findDeduction(state, 3);
      assert.ok(d && !d.contradiction, `stuck or contradiction on seed ${1000 + i}`);
      applyDeduction(state, d);
      for (let r = 0; r < n; r++) {
        const sol = r * n + puzzle.solution[r];
        assert.notEqual(state.cells[sol], OUT, `eliminated a solution cell (seed ${1000 + i}, ${d.technique})`);
      }
      for (let k = 0; k < n * n; k++) {
        if (state.cells[k] === ANIMAL) assert.equal(puzzle.solution[Math.floor(k / n)], k % n, 'placed off the solution');
      }
      let animals = 0;
      for (const v of state.cells) if (v === ANIMAL) animals++;
      if (animals === n) break;
    }
  }
});

test('a solved deduction equals the counting solver solution', () => {
  for (let seed = 1; seed <= 30; seed++) {
    const puzzle = generatePuzzle({ n: 9, seed, difficulty: 'hard' });
    const result = solveByDeduction(puzzle);
    assert.ok(result.solved);
    const found = [];
    for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) if (result.state.cells[r * 9 + c] === ANIMAL) found[r] = c;
    assert.deepEqual(found, countSolutions(puzzle).solution);
  }
});

test('level 1: a single-cell region gets its animal and its neighbourhood is eliminated', () => {
  const regions = [
    [0, 1, 1, 1, 1, 1],
    [2, 2, 2, 2, 1, 1],
    [3, 3, 3, 2, 2, 1],
    [3, 4, 4, 4, 2, 1],
    [3, 4, 5, 5, 5, 5],
    [3, 4, 5, 5, 5, 5],
  ];
  const state = createState({ n: 6, regions });
  const d = findDeduction(state, 3);
  assert.equal(d.level, 1);
  assert.equal(d.place, 0);
  applyDeduction(state, d);
  assert.equal(state.cells[0], ANIMAL);
  assert.equal(state.cells[1], OUT); // same row
  assert.equal(state.cells[6], OUT); // same column
  assert.equal(state.cells[7], OUT); // diagonal neighbour
  assert.equal(state.cells[8], UNKNOWN);
});

test('level 2: a region confined to one row clears the rest of that row', () => {
  // Region 0 occupies only cells (2,1) and (2,2) of row 2.
  const regions = [
    [1, 1, 1, 2, 2, 2],
    [1, 1, 1, 2, 2, 2],
    [3, 0, 0, 4, 4, 4],
    [3, 3, 3, 4, 4, 4],
    [5, 5, 5, 5, 4, 4],
    [5, 5, 5, 5, 5, 5],
  ];
  const state = createState({ n: 6, regions });
  const d = findDeduction(state, 2);
  assert.equal(d.level, 2);
  assert.equal(d.technique, 'region-in-line');
  assert.deepEqual(d.eliminate.sort((a, b) => a - b), [12, 15, 16, 17]);
});

test('grading labels match the requested difficulty and never need guessing', () => {
  for (const difficulty of ['easy', 'medium', 'hard']) {
    for (let seed = 1; seed <= 10; seed++) {
      const puzzle = generatePuzzle({ n: 8, seed, difficulty });
      const grade = gradePuzzle(puzzle);
      assert.ok(grade.solved);
      assert.equal(grade.label, difficulty);
    }
  }
});

test('deduction from a partial player board still solves the puzzle', () => {
  const puzzle = generatePuzzle({ n: 8, seed: 5, difficulty: 'medium' });
  const board = Array.from({ length: 8 }, () => new Array(8).fill(0));
  board[0][puzzle.solution[0]] = ANIMAL;
  board[3][puzzle.solution[3]] = ANIMAL;
  const result = solveByDeduction(puzzle, { board });
  assert.ok(result.solved);
  const state = createState(puzzle, board);
  assert.equal(runDeduction(state, 3).solved, true);
});
