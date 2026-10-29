import test from 'node:test';
import assert from 'node:assert/strict';
import { generatePuzzle } from '../src/core/generator.js';
import { ANIMAL, MARK, emptyBoard } from '../src/core/rules.js';
import { hintFor } from '../src/core/hints.js';

test('a wrong animal is reported before any deduction', () => {
  const puzzle = generatePuzzle({ n: 8, seed: 11, difficulty: 'medium' });
  const board = emptyBoard(8);
  const wrongCol = (puzzle.solution[0] + 2) % 8;
  board[0][wrongCol] = ANIMAL;
  const hint = hintFor(puzzle, board, { animal: 'fox' });
  assert.equal(hint.kind, 'mistake');
  assert.deepEqual(hint.cells, [wrongCol]);
  assert.match(hint.text, /foxes/);
});

test('an X on the hidden animal is reported as a mistake', () => {
  const puzzle = generatePuzzle({ n: 8, seed: 11, difficulty: 'medium' });
  const board = emptyBoard(8);
  board[2][puzzle.solution[2]] = MARK;
  const hint = hintFor(puzzle, board);
  assert.equal(hint.kind, 'mistake');
  assert.deepEqual(hint.cells, [2 * 8 + puzzle.solution[2]]);
});

test('from an empty board the hint is a real deduction with area, text and move', () => {
  const puzzle = generatePuzzle({ n: 8, seed: 11, difficulty: 'medium' });
  const hint = hintFor(puzzle, emptyBoard(8), { animal: 'cat' });
  assert.equal(hint.kind, 'deduction');
  assert.ok(hint.level >= 1 && hint.level <= 3);
  assert.ok(hint.area.length > 0);
  assert.ok(hint.text.length > 10);
  assert.ok(hint.move.place !== null || hint.move.eliminate.length > 0);
  // Following hints from an empty board must solve the puzzle without ever
  // suggesting a wrong move.
  const board = emptyBoard(8);
  for (let step = 0; step < 200; step++) {
    const h = hintFor(puzzle, board);
    if (h.kind !== 'deduction') break;
    if (h.move.place !== null) {
      const r = Math.floor(h.move.place / 8);
      const c = h.move.place % 8;
      assert.equal(puzzle.solution[r], c);
      board[r][c] = ANIMAL;
    }
    for (const i of h.move.eliminate) {
      const r = Math.floor(i / 8);
      const c = i % 8;
      assert.notEqual(puzzle.solution[r], c);
      board[r][c] = MARK;
    }
  }
  for (let r = 0; r < 8; r++) assert.equal(board[r][puzzle.solution[r]], ANIMAL);
});
