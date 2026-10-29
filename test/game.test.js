import test from 'node:test';
import assert from 'node:assert/strict';
import { generatePuzzle } from '../src/core/generator.js';
import { ANIMAL, EMPTY, MARK } from '../src/core/rules.js';
import { conflicts, hold, mistakesLeft, newGame, reveal, setCell, tap, undo, wrongAnimals } from '../src/core/game.js';

const puzzle = generatePuzzle({ n: 8, seed: 21, difficulty: 'hard' });
const wrongCell = (r) => (puzzle.solution[r] + 4) % 8;

test('hold mode: tap toggles an X, hold places or removes the animal, X never costs a mistake', () => {
  let s = newGame(puzzle);
  const r = 0;
  const c = puzzle.solution[0];
  s = tap(s, r, c);
  assert.equal(s.board[r][c], MARK);
  s = tap(s, r, c);
  assert.equal(s.board[r][c], EMPTY);
  s = hold(s, r, c);
  assert.equal(s.board[r][c], ANIMAL);
  s = tap(s, r, c);
  assert.equal(s.board[r][c], EMPTY, 'a tap removes an animal');
  s = hold(s, r, c);
  s = hold(s, r, c);
  assert.equal(s.board[r][c], EMPTY, 'a second hold removes it too');
  // Clearing an X on a wrong cell: no mistake, ever.
  const wrong = wrongCell(1);
  s = tap(s, 1, wrong);
  s = tap(s, 1, wrong);
  assert.equal(s.mistakes, 0);
  s = hold(s, 1, wrong);
  assert.equal(s.mistakes, 1);
});

test('cycle mode: tap cycles empty, X, animal, empty', () => {
  let t = newGame(puzzle, { tapMode: 'cycle' });
  const r = 0;
  const c = puzzle.solution[0];
  t = tap(t, r, c);
  assert.equal(t.board[r][c], MARK);
  t = tap(t, r, c);
  assert.equal(t.board[r][c], ANIMAL);
  t = tap(t, r, c);
  assert.equal(t.board[r][c], EMPTY);
});

test('undo restores the previous cell and is a no-op on an empty history', () => {
  let s = newGame(puzzle);
  assert.equal(undo(s), s);
  s = tap(s, 1, 1);
  s = tap(s, 1, 1);
  s = undo(s);
  assert.equal(s.board[1][1], MARK);
  s = undo(s);
  assert.equal(s.board[1][1], EMPTY);
  assert.equal(s.history.length, 0);
});

test('states are not mutated', () => {
  const s0 = newGame(puzzle);
  const s1 = tap(s0, 2, 2);
  assert.equal(s0.board[2][2], EMPTY);
  assert.equal(s1.board[2][2], MARK);
  assert.equal(s0.history.length, 0);
});

test('conflicts show rule breaks, wrongAnimals shows solution breaks', () => {
  let s = newGame(puzzle, { relaxed: true });
  s = setCell(s, 0, 0, ANIMAL);
  s = setCell(s, 0, 5, ANIMAL); // same row
  assert.deepEqual([...conflicts(s)].sort(), [0, 5]);
  const wrong = wrongAnimals(s);
  assert.ok(wrong.length >= 1 && wrong.length <= 2);
});

test('mistakes count wrong animals only, undo does not refund, limit ends the game', () => {
  let s = newGame(puzzle); // hard: limit 3
  assert.equal(s.mistakeLimit, 3);
  s = setCell(s, 0, wrongCell(0), MARK); // X never counts
  assert.equal(s.mistakes, 0);
  s = setCell(s, 0, wrongCell(0), ANIMAL);
  assert.equal(s.mistakes, 1);
  s = undo(s);
  assert.equal(s.mistakes, 1);
  assert.equal(s.board[0][wrongCell(0)], MARK);
  s = setCell(s, 1, wrongCell(1), ANIMAL);
  assert.equal(mistakesLeft(s), 1);
  assert.equal(s.status, 'playing');
  s = setCell(s, 2, wrongCell(2), ANIMAL);
  assert.equal(s.status, 'lost');
  // Nothing moves after a loss; reveal shows the answer.
  assert.equal(tap(s, 5, 5), s);
  const shown = reveal(s);
  for (let r = 0; r < 8; r++) assert.equal(shown.board[r][puzzle.solution[r]], ANIMAL);
});

test('relaxed mode never loses', () => {
  let s = newGame(puzzle, { relaxed: true });
  for (let r = 0; r < 8; r++) s = setCell(s, r, wrongCell(r), ANIMAL);
  assert.equal(s.status, 'playing');
  assert.equal(mistakesLeft(s), Infinity);
});

test('placing every solution animal wins; auto-mark fills and undoes together', () => {
  let s = newGame(puzzle, { autoMark: true });
  for (let r = 0; r < 8; r++) {
    s = setCell(s, r, puzzle.solution[r], ANIMAL);
    assert.equal(s.status, r === 7 ? 'won' : 'playing');
  }
  let t = newGame(puzzle, { autoMark: true });
  t = setCell(t, 0, puzzle.solution[0], ANIMAL);
  const marked = t.board.flat().filter((v) => v === MARK).length;
  assert.ok(marked >= 7, 'row, column, region and neighbours get X marks');
  t = undo(t);
  assert.equal(t.board.flat().filter((v) => v !== EMPTY).length, 0);
});
