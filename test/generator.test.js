import test from 'node:test';
import assert from 'node:assert/strict';
import { generatePuzzle, puzzleKey, regionSizes, MIN_SIZE, MAX_SIZE } from '../src/core/generator.js';
import { isValidSolution } from '../src/core/rules.js';
import { referenceCount } from './reference-solver.js';

test('same seed gives an identical puzzle', () => {
  const a = generatePuzzle({ n: 8, seed: 123456 });
  const b = generatePuzzle({ n: 8, seed: 123456 });
  assert.equal(puzzleKey(a), puzzleKey(b));
  assert.deepEqual(a.solution, b.solution);
  const c = generatePuzzle({ n: 8, seed: 123457 });
  assert.notEqual(puzzleKey(a), puzzleKey(c));
});

test('every size from MIN to MAX generates and obeys the shape rules', () => {
  for (let n = MIN_SIZE; n <= MAX_SIZE; n++) {
    for (let seed = 1; seed <= 5; seed++) {
      const puzzle = generatePuzzle({ n, seed });
      const sizes = regionSizes(puzzle.regions);
      assert.equal(sizes.length, n);
      assert.ok(sizes.every((s) => s >= 2), `no single-cell regions on medium (${n}x${n} seed ${seed})`);
      assert.ok(Math.max(...sizes) <= 0.4 * n * n);
      assert.ok(isValidSolution(puzzle.solution, puzzle.regions));
      assert.ok(isConnected(puzzle.regions));
    }
  }
});

test('every region is connected', () => {
  for (let seed = 1; seed <= 30; seed++) {
    assert.ok(isConnected(generatePuzzle({ n: 10, seed }).regions));
  }
});

// The 1,000-per-size volume check lives in uniqueness.bench.js (npm run bench).
// This keeps a smaller version of it in the routine test run.
test('100 8x8 puzzles have exactly one solution, equal to the stored one (reference solver)', () => {
  for (let seed = 1; seed <= 100; seed++) {
    const puzzle = generatePuzzle({ n: 8, seed });
    const { count, solutions } = referenceCount(puzzle, 2);
    assert.equal(count, 1, `seed ${seed} has ${count} solutions`);
    assert.deepEqual(solutions[0], puzzle.solution, `seed ${seed} solution mismatch`);
  }
});

function isConnected(regions) {
  const n = regions.length;
  const seen = Array.from({ length: n }, () => new Array(n).fill(false));
  const components = new Array(n).fill(0);
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (seen[r][c]) continue;
      const id = regions[r][c];
      components[id]++;
      const stack = [[r, c]];
      seen[r][c] = true;
      while (stack.length) {
        const [cr, cc] = stack.pop();
        for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nr = cr + dr;
          const nc = cc + dc;
          if (nr < 0 || nr >= n || nc < 0 || nc >= n || seen[nr][nc] || regions[nr][nc] !== id) continue;
          seen[nr][nc] = true;
          stack.push([nr, nc]);
        }
      }
    }
  }
  return components.every((k) => k === 1);
}
