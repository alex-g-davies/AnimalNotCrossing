// Double Up: two animals per row, column and region, still never touching.
import test from 'node:test';
import assert from 'node:assert/strict';
import { ANIMAL, EMPTY, MARK, cellsRuledOut, emptyBoard, findConflicts, isSolved, isSolutionCell, isValidSolution, solutionCells } from '../src/core/rules.js';
import { countSolutions } from '../src/core/solver.js';
import { generatePuzzle, placeAnimals, regionSizes } from '../src/core/generator.js';
import { ANIMAL as A, OUT, applyDeduction, createState, findDeduction, solveByDeduction } from '../src/core/techniques.js';
import { hintFor } from '../src/core/hints.js';
import { hold, newGame, reveal, undo } from '../src/core/game.js';
import { DOUBLE_SIZES, resolveSpec, specMatches } from '../src/core/spec.js';
import { createRng } from '../src/core/rng.js';
import { referenceCount } from './reference-solver.js';

const puzzle8 = generatePuzzle({ n: 8, seed: 1, difficulty: 'medium', k: 2 });

test('a Double Up solution has two per row, column and region, none touching', () => {
  assert.equal(puzzle8.k, 2);
  assert.ok(isValidSolution(puzzle8.solution, puzzle8.regions, 2));
  assert.equal(solutionCells(puzzle8).length, 16);
  assert.ok(puzzle8.solution.every((cols) => cols.length === 2 && cols[1] >= cols[0] + 2));
  const sizes = regionSizes(puzzle8.regions);
  assert.ok(sizes.every((s) => s >= 2));
  // Classic solutions are still checked the classic way.
  assert.ok(!isValidSolution(puzzle8.solution, puzzle8.regions, 1));
});

test('placement obeys the rules for every Double Up size', () => {
  const rng = createRng(5);
  for (const n of DOUBLE_SIZES) {
    const rows = placeAnimals(n, rng, 2);
    const colCount = new Array(n).fill(0);
    rows.forEach((cols, r) => {
      assert.equal(cols.length, 2);
      assert.ok(cols[1] - cols[0] >= 2, `row ${r} touches itself`);
      for (const c of cols) colCount[c]++;
      if (r) for (const c of cols) for (const p of rows[r - 1]) assert.ok(Math.abs(p - c) >= 2, 'touches the row above');
    });
    assert.ok(colCount.every((v) => v === 2));
  }
});

test('conflicts: a third animal in a line, or any touching pair, but two per line is fine', () => {
  const { n } = puzzle8;
  const board = emptyBoard(n);
  const [[c1, c2]] = puzzle8.solution;
  board[0][c1] = ANIMAL;
  board[0][c2] = ANIMAL;
  assert.equal(findConflicts(board, puzzle8).size, 0, 'two in a row is allowed');
  const c3 = [0, 1, 2, 3, 4, 5, 6, 7].find((c) => c !== c1 && c !== c2 && Math.abs(c - c1) > 1 && Math.abs(c - c2) > 1);
  board[0][c3] = ANIMAL;
  assert.equal(findConflicts(board, puzzle8).size, 3, 'three in a row all flagged');
  board[0][c3] = EMPTY;
  board[1][c1] = ANIMAL; // directly below: touching (and maybe a third in that region)
  const conflicts = findConflicts(board, puzzle8);
  assert.ok(conflicts.has(c1) && conflicts.has(n + c1));
  assert.ok(!conflicts.has(c2) || puzzle8.regions[1][c1] === puzzle8.regions[0][c2], 'the other animal is clear unless its region overflowed');
});

test('the full solution is recognised as solved, and only then', () => {
  const board = emptyBoard(puzzle8.n);
  const cells = solutionCells(puzzle8);
  for (const [r, c] of cells.slice(0, -1)) board[r][c] = ANIMAL;
  assert.ok(!isSolved(board, puzzle8));
  const [r, c] = cells[cells.length - 1];
  board[r][c] = ANIMAL;
  assert.ok(isSolved(board, puzzle8));
});

test('auto-X rules out only the eight neighbours until a line is full', () => {
  const { n } = puzzle8;
  const board = emptyBoard(n);
  const [[c1, c2]] = puzzle8.solution;
  board[0][c1] = ANIMAL;
  let out = cellsRuledOut(board, puzzle8, 0, c1);
  assert.ok(!out.includes(c2), 'the other solution cell in the row stays open');
  assert.ok(out.includes(n + c1), 'the cell below is out');
  board[0][c2] = ANIMAL;
  out = cellsRuledOut(board, puzzle8, 0, c2);
  for (let c = 0; c < n; c++) if (c !== c1 && c !== c2) assert.ok(out.includes(c), `row full: column ${c} out`);
});

test('the counting solver and the reference solver agree: one solution, the stored one', () => {
  for (let seed = 1; seed <= 12; seed++) {
    const p = generatePuzzle({ n: 8, seed, difficulty: 'hard', k: 2 });
    const counted = countSolutions(p, 2);
    const ref = referenceCount(p, 2);
    assert.equal(counted.count, 1, `seed ${seed}`);
    assert.equal(ref.count, 1, `seed ${seed} (reference)`);
    assert.deepEqual(counted.solution, p.solution);
    assert.deepEqual(ref.solutions[0], p.solution);
  }
  // Removing the region constraint (one big region per row) leaves many solutions.
  const loose = { n: 8, k: 2, regions: Array.from({ length: 8 }, (_, r) => new Array(8).fill(r)) };
  assert.equal(countSolutions(loose, 2).count, 2);
  assert.equal(referenceCount(loose, 2).count, 2);
});

test('every deduction step keeps the Double Up solution intact', () => {
  const rng = createRng(99);
  for (let i = 0; i < 20; i++) {
    const n = DOUBLE_SIZES[rng.int(DOUBLE_SIZES.length - 2)]; // 8..10 keeps the test quick
    const difficulty = ['easy', 'medium', 'hard'][rng.int(3)];
    const p = generatePuzzle({ n, seed: 500 + i, difficulty, k: 2 });
    const state = createState(p);
    for (;;) {
      const d = findDeduction(state, 3);
      assert.ok(d && !d.contradiction, `stuck or contradiction on seed ${500 + i}`);
      applyDeduction(state, d);
      for (const [r, c] of solutionCells(p)) assert.notEqual(state.cells[r * n + c], OUT, `eliminated a solution cell (seed ${500 + i}, ${d.technique})`);
      let animals = 0;
      for (let x = 0; x < n * n; x++) {
        if (state.cells[x] !== A) continue;
        animals++;
        assert.ok(isSolutionCell(p, Math.floor(x / n), x % n), 'placed off the solution');
      }
      if (animals === 2 * n) break;
    }
  }
});

test('the fit technique: a line needing two with three candidates in a row forces the ends', () => {
  // One region per row, so only rows and columns constrain; row 0 has
  // candidates at columns 2, 3 and 4 only.
  const n = 8;
  const regions = Array.from({ length: n }, (_, r) => new Array(n).fill(r));
  const state = createState({ n, k: 2, regions });
  for (let c = 0; c < n; c++) if (c < 2 || c > 4) state.cells[c] = OUT;
  const d = findDeduction(state, 2);
  assert.equal(d.technique, 'fit');
  assert.deepEqual(d.eliminate, [3]);
  assert.equal(d.place, 2);
});

test('hints and the game reducer follow the Double Up solution', () => {
  const p = puzzle8;
  let g = newGame(p, { autoMark: true });
  const [[c1, c2]] = p.solution;
  g = hold(g, 0, c1);
  assert.equal(g.mistakes, 0);
  assert.equal(g.board[1][c1], MARK, 'auto-X below');
  assert.equal(g.board[0][c2], EMPTY, 'the row still has room');
  g = hold(g, 0, c2);
  assert.ok(g.board[0].every((v, c) => (c === c1 || c === c2 ? v === ANIMAL : v === MARK)), 'row full: the rest is X');
  g = undo(g);
  assert.equal(g.board[0][c2], EMPTY);
  const wrong = [0, 1, 2, 3, 4, 5, 6, 7].find((c) => c !== c1 && c !== c2);
  g = hold(g, 0, wrong);
  assert.equal(g.mistakes, 1);
  const hint = hintFor(p, g.board, { animal: 'crab' });
  assert.equal(hint.kind, 'mistake');
  const revealed = reveal(g);
  let count = 0;
  for (const row of revealed.board) for (const v of row) if (v === ANIMAL) count++;
  assert.equal(count, 16);
  const fresh = hintFor(p, emptyBoard(8), { animal: 'crab' });
  assert.equal(fresh.kind, 'deduction');
  assert.ok(solveByDeduction(p).solved);
});

test('the spec keeps Double Up at 8x8 and up', () => {
  assert.deepEqual(resolveSpec({ n: 6, difficulty: 'easy', mode: 'double' }), { n: 8, difficulty: 'easy', k: 2 });
  assert.deepEqual(resolveSpec({ n: 10, difficulty: 'hard', mode: 'double' }), { n: 10, difficulty: 'hard', k: 2 });
  assert.deepEqual(resolveSpec({ n: 12, difficulty: 'hard', mode: 'double' }), { n: 11, difficulty: 'hard', k: 2 }, '12 is too slow for Double Up');
  assert.deepEqual(resolveSpec({ n: 6, difficulty: 'easy' }), { n: 6, difficulty: 'easy', k: 1 });
  const rnd = resolveSpec({ n: 'random', difficulty: 'easy', mode: 'double' }, () => 0);
  assert.equal(rnd.n, 8);
  assert.ok(specMatches({ n: 6, difficulty: 'easy', mode: 'double' }, { n: 8, difficulty: 'easy', k: 2 }));
  assert.ok(!specMatches({ n: 8, difficulty: 'easy', mode: 'double' }, { n: 8, difficulty: 'easy', k: 1 }));
  assert.ok(!specMatches({ n: 8, difficulty: 'easy', mode: 'single' }, { n: 8, difficulty: 'easy', k: 2 }));
  assert.ok(specMatches({ n: 8, difficulty: 'easy' }, { n: 8, difficulty: 'easy' }), 'old specs without k are classic');
});
