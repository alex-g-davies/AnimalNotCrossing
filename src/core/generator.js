// Puzzle generator.
//
// 1. Place the animals: a valid solution with no touching.
// 2. Grow N colored regions around them until the grid is full.
// 3. Repair: move single cells between neighbouring regions, keeping any move
//    that does not increase the number of cells the deduction engine leaves
//    unresolved. When that number reaches zero the puzzle is solvable by
//    logic alone, and therefore unique.
// 4. Confirm uniqueness with the counting solver, check the shape rules and
//    the requested difficulty. Otherwise place new animals and try again.
//
// Why repair instead of retry: measured on this machine, a random region
// layout is unique less than 1% of the time at 7x7 and never at 10x10 or
// above (see PERF.md), so a retry loop would never finish.

import { createRng } from './rng.js';
import { countSolutions } from './solver.js';
import { isValidSolution } from './rules.js';
import { solveByDeduction, unknownCount } from './techniques.js';
import { DIFFICULTIES, gradePuzzle } from './difficulty.js';

export const MIN_SIZE = 6;
export const MAX_SIZE = 12;

// Largest share of the grid one region may cover. Bigger regions make the
// puzzle trivial (the region barely constrains anything) and look ugly.
const MAX_REGION_SHARE = 0.4;

const ORTHOGONAL = [[1, 0], [-1, 0], [0, 1], [0, -1]];

// Step 1. Row by row, try columns in a seeded shuffled order that are unused
// and at least two away from the previous row's column.
export function placeAnimals(n, rng) {
  const cols = new Array(n).fill(-1);
  let usedCols = 0;

  function search(row) {
    if (row === n) return true;
    const order = rng.shuffle(Array.from({ length: n }, (_, i) => i));
    const prev = row > 0 ? cols[row - 1] : -100;
    for (const c of order) {
      if (usedCols & (1 << c)) continue;
      if (Math.abs(c - prev) <= 1) continue;
      cols[row] = c;
      usedCols |= 1 << c;
      if (search(row + 1)) return true;
      usedCols &= ~(1 << c);
      cols[row] = -1;
    }
    return false;
  }

  if (!search(0)) throw new Error(`could not place ${n} animals`);
  return cols;
}

// Step 2. Each region starts at its animal's cell. Repeatedly pick a region,
// weighted towards the smaller ones, and give it one unassigned cell that is
// orthogonally adjacent to a cell it already owns.
export function growRegions(n, solution, rng) {
  const regions = Array.from({ length: n }, () => new Array(n).fill(-1));
  const cells = []; // cells[region] = list of [r, c]
  for (let r = 0; r < n; r++) {
    regions[r][solution[r]] = r;
    cells.push([[r, solution[r]]]);
  }
  let unassigned = n * n - n;

  while (unassigned > 0) {
    const candidates = [];
    let totalWeight = 0;
    for (let id = 0; id < n; id++) {
      const frontier = frontierOf(regions, cells[id], n);
      if (frontier.length === 0) continue;
      const weight = 1 / (cells[id].length * cells[id].length);
      candidates.push({ id, frontier, weight });
      totalWeight += weight;
    }
    let pickValue = rng.next() * totalWeight;
    let chosen = candidates[candidates.length - 1];
    for (const cand of candidates) {
      pickValue -= cand.weight;
      if (pickValue <= 0) {
        chosen = cand;
        break;
      }
    }
    const [r, c] = rng.pick(chosen.frontier);
    regions[r][c] = chosen.id;
    cells[chosen.id].push([r, c]);
    unassigned--;
  }
  return regions;
}

function frontierOf(regions, regionCells, n) {
  const seen = new Set();
  const out = [];
  for (const [r, c] of regionCells) {
    for (const [dr, dc] of ORTHOGONAL) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr < 0 || nr >= n || nc < 0 || nc >= n) continue;
      if (regions[nr][nc] !== -1) continue;
      const key = nr * n + nc;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push([nr, nc]);
    }
  }
  return out;
}

export function regionSizes(regions) {
  const n = regions.length;
  const sizes = new Array(n).fill(0);
  for (const row of regions) for (const id of row) sizes[id]++;
  return sizes;
}

// Shape rules that do not need a solver. Returns null when fine, else a reason.
export function checkShape(regions, { allowSingles }) {
  const n = regions.length;
  const sizes = regionSizes(regions);
  const maxAllowed = Math.floor(MAX_REGION_SHARE * n * n);
  for (const size of sizes) {
    if (size === 0) return 'empty region';
    if (size === 1 && !allowSingles) return 'single-cell region';
    if (size > maxAllowed) return 'region too large';
  }
  return null;
}

// True when region `id` stays connected after giving up cell (skipR, skipC).
function staysConnected(regions, id, skipR, skipC) {
  const n = regions.length;
  let start = null;
  let total = 0;
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (regions[r][c] !== id || (r === skipR && c === skipC)) continue;
      total++;
      if (!start) start = [r, c];
    }
  }
  if (!start) return false;
  const seen = new Set([start[0] * n + start[1]]);
  const stack = [start];
  while (stack.length) {
    const [r, c] = stack.pop();
    for (const [dr, dc] of ORTHOGONAL) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr < 0 || nr >= n || nc < 0 || nc >= n) continue;
      if ((nr === skipR && nc === skipC) || regions[nr][nc] !== id) continue;
      const key = nr * n + nc;
      if (seen.has(key)) continue;
      seen.add(key);
      stack.push([nr, nc]);
    }
  }
  return seen.size === total;
}

// Cells the deduction engine cannot resolve, or 0 when it solves the puzzle.
function unresolved(n, regions, maxLevel) {
  const result = solveByDeduction({ n, regions }, { maxLevel });
  return result.solved ? 0 : unknownCount(result.state) + 1;
}

// Step 3. Hill-climb on the region layout. Each move hands one boundary cell
// to a neighbouring region, as long as both regions keep a legal size, the
// giving region stays connected and the cell is not one of the solution cells.
// A move is kept when the deduction engine leaves no more cells unresolved
// than before. Returns the final score (0 means solved by logic).
export function repairRegions(n, regions, solution, rng, { maxLevel, minSize, maxEvals }) {
  const sizes = regionSizes(regions);
  const maxSize = Math.floor(MAX_REGION_SHARE * n * n);
  let score = unresolved(n, regions, maxLevel);
  let evals = 0;
  while (score > 0 && evals < maxEvals) {
    const r = rng.int(n);
    const c = rng.int(n);
    if (solution[r] === c) continue;
    const from = regions[r][c];
    const [dr, dc] = ORTHOGONAL[rng.int(4)];
    const nr = r + dr;
    const nc = c + dc;
    if (nr < 0 || nr >= n || nc < 0 || nc >= n) continue;
    const to = regions[nr][nc];
    if (to === from || sizes[from] <= minSize || sizes[to] >= maxSize) continue;
    if (!staysConnected(regions, from, r, c)) continue;
    regions[r][c] = to;
    evals++;
    const next = unresolved(n, regions, maxLevel);
    if (next <= score) {
      score = next;
      sizes[from]--;
      sizes[to]++;
    } else {
      regions[r][c] = from;
    }
  }
  return { score, evals };
}

// Main entry point. Deterministic for a given (n, seed, difficulty).
export function generatePuzzle({ n, seed, difficulty = 'medium', maxEvals = 3000, maxPlacements = 50 }) {
  if (!Number.isInteger(n) || n < MIN_SIZE || n > MAX_SIZE) {
    throw new Error(`grid size must be ${MIN_SIZE}..${MAX_SIZE}, got ${n}`);
  }
  const spec = DIFFICULTIES[difficulty];
  if (!spec) throw new Error(`unknown difficulty ${difficulty}`);
  const rng = createRng(seed);
  const stats = { placements: 0, evals: 0, unsolved: 0, badShape: 0, wrongDifficulty: 0 };

  for (let p = 0; p < maxPlacements; p++) {
    stats.placements++;
    const solution = placeAnimals(n, rng);
    const regions = growRegions(n, solution, rng);
    const repaired = repairRegions(n, regions, solution, rng, {
      maxLevel: spec.maxLevel,
      minSize: spec.allowSingles ? 1 : 2,
      maxEvals,
    });
    stats.evals += repaired.evals;
    if (repaired.score !== 0) {
      stats.unsolved++;
      continue;
    }
    if (checkShape(regions, { allowSingles: spec.allowSingles })) {
      stats.badShape++;
      continue;
    }
    const puzzle = { n, regions, solution, seed, difficulty };
    const grade = gradePuzzle(puzzle);
    if (grade.label !== difficulty) {
      stats.wrongDifficulty++;
      continue;
    }
    // Belt and braces: the deduction engine is sound, so this must hold.
    const counted = countSolutions(puzzle, 2);
    if (counted.count !== 1 || counted.solution.join() !== solution.join()) {
      throw new Error(`deduction solved a puzzle that is not unique (seed ${seed})`);
    }
    if (!isValidSolution(solution, regions)) throw new Error('generator produced an invalid solution');
    puzzle.grade = grade;
    puzzle.stats = stats;
    return puzzle;
  }
  throw new Error(`gave up generating a ${n}x${n} ${difficulty} puzzle for seed ${seed}`);
}

// Compact string id, handy for repeat detection and determinism tests.
export function puzzleKey(puzzle) {
  return `${puzzle.n}:${puzzle.regions.map((row) => row.join('')).join('|')}`;
}

// ASCII picture of a puzzle, for logs and tests.
export function renderPuzzle(puzzle) {
  const letters = 'ABCDEFGHIJKLMNOP';
  return puzzle.regions
    .map((row, r) => row.map((id, c) => (puzzle.solution[r] === c ? letters[id].toLowerCase() : letters[id])).join(' '))
    .join('\n');
}
