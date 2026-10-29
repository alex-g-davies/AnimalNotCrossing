import test from 'node:test';
import assert from 'node:assert/strict';
import { countSolutions, isUnique } from '../src/core/solver.js';
import { referenceCount } from './reference-solver.js';
import { createRng } from '../src/core/rng.js';
import { generatePuzzle, growRegions, placeAnimals } from '../src/core/generator.js';

// A hand-drawn 6x6 layout. The test only requires that both solvers agree
// on how many solutions it has, whatever that number is.
const KNOWN = {
  n: 6,
  regions: [
    [0, 0, 0, 1, 1, 1],
    [0, 0, 1, 1, 1, 1],
    [3, 3, 3, 2, 2, 2],
    [3, 3, 3, 2, 2, 2],
    [4, 4, 4, 5, 5, 5],
    [4, 4, 5, 5, 5, 5],
  ],
};

test('known layout: counting solver and reference solver agree', () => {
  const a = countSolutions(KNOWN, 100);
  const b = referenceCount(KNOWN);
  assert.equal(a.count, b.count);
  if (a.count > 0) assert.ok(b.solutions.some((s) => s.join() === a.solution.join()));
});

test('solvers agree on random region layouts, unique or not', () => {
  const rng = createRng(2024);

  for (let i = 0; i < 400; i++) {
    const n = 6 + rng.int(5); // 6..10
    const solution = placeAnimals(n, rng);
    const regions = growRegions(n, solution, rng);
    const puzzle = { n, regions };
    const fast = countSolutions(puzzle, 50);
    const slow = referenceCount(puzzle, 50);
    assert.equal(fast.count, slow.count, `layout ${i} (${n}x${n})`);
    assert.ok(fast.count >= 1, 'the placed solution must always be found');
    // With more than 50 solutions the placed one may not be among those enumerated.
    if (slow.count < 50) assert.ok(slow.solutions.some((s) => s.join() === solution.join()));

  }
});

test('generated puzzles are unique and the found solution equals the stored one', () => {
  for (let seed = 1; seed <= 50; seed++) {
    const puzzle = generatePuzzle({ n: 7, seed });
    assert.ok(isUnique(puzzle));
    assert.deepEqual(countSolutions(puzzle).solution, puzzle.solution);
  }
});
