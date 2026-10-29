import test from 'node:test';
import assert from 'node:assert/strict';
import { createRng } from '../src/core/rng.js';
import { ANIMAL, EMPTY, MARK, emptyBoard, findConflicts, isSolved, isValidSolution } from '../src/core/rules.js';
import { generatePuzzle } from '../src/core/generator.js';

// Hand-written reference: for each animal, scan the whole board for another
// animal that shares a row, column, region, or is within one step.
function referenceConflicts(board, puzzle) {
  const { n, regions } = puzzle;
  const out = new Set();
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (board[r][c] !== ANIMAL) continue;
      for (let r2 = 0; r2 < n; r2++) {
        for (let c2 = 0; c2 < n; c2++) {
          if ((r2 === r && c2 === c) || board[r2][c2] !== ANIMAL) continue;
          const sameLine = r2 === r || c2 === c || regions[r2][c2] === regions[r][c];
          const touching = Math.abs(r2 - r) <= 1 && Math.abs(c2 - c) <= 1;
          if (sameLine || touching) out.add(r * n + c);
        }
      }
    }
  }
  return out;
}

test('findConflicts agrees with the reference on random boards', () => {
  const rng = createRng(99);
  for (let i = 0; i < 300; i++) {
    const n = 6 + rng.int(5);
    const puzzle = generatePuzzle({ n, seed: rng.int(1e9) });
    const board = emptyBoard(n);
    const fill = rng.next();
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        const v = rng.next();
        board[r][c] = v < fill * 0.3 ? ANIMAL : v < 0.6 ? MARK : EMPTY;
      }
    }
    assert.deepEqual([...findConflicts(board, puzzle)].sort(), [...referenceConflicts(board, puzzle)].sort());
  }
});

test('the stored solution solves the puzzle and nothing less does', () => {
  const puzzle = generatePuzzle({ n: 8, seed: 42 });
  const board = emptyBoard(8);
  assert.equal(isSolved(board, puzzle), false);
  for (let r = 0; r < 8; r++) {
    board[r][puzzle.solution[r]] = ANIMAL;
    assert.equal(isSolved(board, puzzle), r === 7);
  }
  assert.equal(findConflicts(board, puzzle).size, 0);
  assert.ok(isValidSolution(puzzle.solution, puzzle.regions));
});

test('isValidSolution rejects touching, repeated column and repeated region', () => {
  const regions = [
    [0, 0, 1, 1, 2, 2],
    [0, 0, 1, 1, 2, 2],
    [3, 3, 3, 4, 4, 4],
    [3, 3, 3, 4, 4, 4],
    [5, 5, 5, 5, 5, 5],
    [5, 5, 5, 5, 5, 5],
  ];
  assert.equal(isValidSolution([0, 1, 2, 3, 4, 5], regions), false); // diagonal touching
  assert.equal(isValidSolution([0, 2, 0, 3, 5, 1], regions), false); // column 0 repeated
  assert.equal(isValidSolution([0, 2, 4, 1, 3, 5], regions), false); // rows 4 and 5 share region 5
});
