// Puzzle generator.
//
// 1. Place the animals: a valid solution with no touching (k per row and
//    column; k is 1, or 2 for Double Up).
// 2. Grow N colored regions around them until the grid is full. In Double Up
//    the animals are first paired up and each pair joined by a short path,
//    so every region holds exactly two.
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
import { isSolutionCell, isValidSolution } from './rules.js';
import { UNKNOWN, solveByDeduction } from './techniques.js';
import { DIFFICULTIES, MEDIUM_MAX_LEVEL3_STEPS, gradePuzzle, labelFor } from './difficulty.js';

export const MIN_SIZE = 6;
export const MAX_SIZE = 12;
// Double Up: two non-touching animals per row and region need room, and at
// 12x12 generation takes too long (median about 5 s, worst 28 s measured),
// so it stops at 11x11.
export const MIN_DOUBLE_SIZE = 8;
export const MAX_DOUBLE_SIZE = 11;

// Largest share of the grid one region may cover. Bigger regions make the
// puzzle trivial (the region barely constrains anything) and look ugly.
const MAX_REGION_SHARE = 0.4;

const ORTHOGONAL = [[1, 0], [-1, 0], [0, 1], [0, -1]];

// Step 1. Row by row, try columns in a seeded shuffled order. Classic: one
// unused column at least two away from the previous row's. Double Up: two
// columns at least two apart, each used at most twice over the grid, neither
// touching the previous row's pair.
export function placeAnimals(n, rng, k = 1) {
  if (k === 1) return placeSingle(n, rng);
  const rows = [];
  const colCount = new Array(n).fill(0);

  function search(row) {
    if (row === n) return true;
    const prev = row > 0 ? rows[row - 1] : [];
    const order = rng.shuffle(Array.from({ length: n }, (_, i) => i));
    for (const a of order) {
      if (colCount[a] >= k || prev.some((p) => Math.abs(p - a) <= 1)) continue;
      for (const b of order) {
        if (b <= a + 1 || colCount[b] >= k || prev.some((p) => Math.abs(p - b) <= 1)) continue;
        colCount[a]++;
        colCount[b]++;
        rows.push([a, b]);
        if (search(row + 1)) return true;
        rows.pop();
        colCount[a]--;
        colCount[b]--;
      }
    }
    return false;
  }

  if (!search(0)) throw new Error(`could not place ${k * n} animals`);
  return rows;
}

function placeSingle(n, rng) {
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

// Step 2. Each region starts from its animal(s). Repeatedly pick a region,
// weighted towards the smaller ones, and give it one unassigned cell that is
// orthogonally adjacent to a cell it already owns.
export function growRegions(n, solution, rng, k = 1) {
  const regions = Array.from({ length: n }, () => new Array(n).fill(-1));
  const cells = []; // cells[region] = list of [r, c]
  if (k === 1) {
    for (let r = 0; r < n; r++) {
      regions[r][solution[r]] = r;
      cells.push([[r, solution[r]]]);
    }
  } else {
    const seeds = pairUp(n, solution, rng);
    if (!seeds) return null;
    for (let id = 0; id < n; id++) {
      cells.push(seeds[id]);
      for (const [r, c] of seeds[id]) regions[r][c] = id;
    }
  }
  let unassigned = n * n - cells.reduce((sum, list) => sum + list.length, 0);

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
    if (!candidates.length) return null; // an enclosed pocket (cannot happen with connected seeds, but be safe)
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

// Double Up seeds: pair every animal with a nearby one and join each pair by
// a shortest path over free cells, so the region holding both is connected
// from the start. Returns n lists of cells, or null when a pairing boxed
// itself in (the caller tries again with a new placement).
function pairUp(n, solution, rng) {
  const animals = [];
  solution.forEach((cols, r) => cols.forEach((c) => animals.push([r, c])));
  const isAnimal = new Set(animals.map(([r, c]) => r * n + c));
  for (let attempt = 0; attempt < 20; attempt++) {
    const taken = Array.from({ length: n }, () => new Array(n).fill(false));
    const free = new Set(animals.map((_, i) => i));
    const order = rng.shuffle(animals.map((_, i) => i));
    const seeds = [];
    let ok = true;
    for (const i of order) {
      if (!free.has(i)) continue;
      free.delete(i);
      // Partner: one of the three nearest unpaired animals, nearest most likely.
      const others = [...free].sort((a, b) => dist(animals[a], animals[i]) - dist(animals[b], animals[i])).slice(0, 3);
      if (!others.length) { ok = false; break; }
      const j = others[Math.min(others.length - 1, Math.floor(rng.next() ** 2 * others.length))];
      free.delete(j);
      const path = shortestPath(n, animals[i], animals[j], (r, c) => !taken[r][c] && !isAnimal.has(r * n + c));
      if (!path) { ok = false; break; }
      for (const [r, c] of path) taken[r][c] = true;
      seeds.push(path);
    }
    if (ok && seeds.length === n) return seeds;
  }
  return null;
}

function dist([r1, c1], [r2, c2]) {
  return Math.abs(r1 - r2) + Math.abs(c1 - c2);
}

// Breadth-first path from a to b through cells allowed by `open` (b itself
// is always allowed). Returns the cells from a to b inclusive, or null.
function shortestPath(n, a, b, open) {
  const key = (r, c) => r * n + c;
  const prev = new Map([[key(a[0], a[1]), null]]);
  const queue = [a];
  for (let head = 0; head < queue.length; head++) {
    const [r, c] = queue[head];
    if (r === b[0] && c === b[1]) {
      const path = [];
      for (let at = key(r, c); at !== null; at = prev.get(at)) path.push([Math.floor(at / n), at % n]);
      return path.reverse();
    }
    for (const [dr, dc] of ORTHOGONAL) {
      const nr = r + dr, nc = c + dc;
      if (nr < 0 || nr >= n || nc < 0 || nc >= n || prev.has(key(nr, nc))) continue;
      if (!(nr === b[0] && nc === b[1]) && !open(nr, nc)) continue;
      prev.set(key(nr, nc), key(r, c));
      queue.push([nr, nc]);
    }
  }
  return null;
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

// Cells the deduction engine cannot resolve (score 0 means it solves the
// puzzle), which cells they are, and the engine's level counts.
function unresolved(n, regions, k, maxLevel) {
  const result = solveByDeduction({ n, regions, k }, { maxLevel });
  const stuck = [];
  if (!result.solved) result.state.cells.forEach((v, i) => { if (v === UNKNOWN) stuck.push(i); });
  return { score: result.solved ? 0 : stuck.length + 1, stuck, levelCounts: result.levelCounts };
}

// One candidate move: hand cell (r, c) to the neighbouring region in a random
// direction, if both regions keep a legal size, the giving region stays
// connected and the cell is not a solution cell. Returns the move or null.
function pickMove(n, regions, puzzle, sizes, rng, { minSize, maxSize, focus }) {
  let r, c;
  // Moves at the cells the engine could not resolve are far more likely to
  // help than moves anywhere on the board, so most picks come from there.
  if (focus && focus.length && rng.next() < 0.7) {
    const i = focus[rng.int(focus.length)];
    r = Math.floor(i / n);
    c = i % n;
  } else {
    r = rng.int(n);
    c = rng.int(n);
  }
  if (isSolutionCell(puzzle, r, c)) return null;
  const from = regions[r][c];
  const [dr, dc] = ORTHOGONAL[rng.int(4)];
  const nr = r + dr;
  const nc = c + dc;
  if (nr < 0 || nr >= n || nc < 0 || nc >= n) return null;
  const to = regions[nr][nc];
  if (to === from || sizes[from] <= minSize || sizes[to] >= maxSize) return null;
  if (!staysConnected(regions, from, r, c)) return null;
  return { r, c, from, to };
}

// Step 3. Hill-climb on the region layout. A move is kept when the deduction
// engine leaves no more cells unresolved than before. Returns the final score
// (0 means solved by logic). A placement that has not improved for
// `stallEvals` moves is abandoned: a fresh placement is cheaper than grinding.
export function repairRegions(n, regions, solution, rng, { maxLevel, minSize, maxEvals, k = 1, stallEvals = 400 }) {
  const puzzle = { solution };
  const sizes = regionSizes(regions);
  const maxSize = Math.floor(MAX_REGION_SHARE * n * n);
  let current = unresolved(n, regions, k, maxLevel);
  let evals = 0;
  let lastImprovement = 0;
  while (current.score > 0 && evals < maxEvals && evals - lastImprovement < stallEvals) {
    const move = pickMove(n, regions, puzzle, sizes, rng, { minSize, maxSize, focus: current.stuck });
    if (!move) continue;
    regions[move.r][move.c] = move.to;
    evals++;
    const next = unresolved(n, regions, k, maxLevel);
    if (next.score <= current.score) {
      if (next.score < current.score) lastImprovement = evals;
      current = next;
      sizes[move.from]--;
      sizes[move.to]++;
    } else {
      regions[move.r][move.c] = move.from;
    }
  }
  return { score: current.score, evals, stalled: current.score > 0 && evals - lastImprovement >= stallEvals };
}

// How far a solved layout's level-3 step count is from the requested
// difficulty's band (see difficulty.js): 0 when the label already matches.
function difficultyGap(levelCounts, difficulty) {
  const l3 = levelCounts[3];
  if (labelFor({ solved: true, maxLevelUsed: l3 ? 3 : 2, levelCounts }) === difficulty) return 0;
  if (difficulty === 'medium') return l3 === 0 ? 1 : l3 - MEDIUM_MAX_LEVEL3_STEPS;
  if (difficulty === 'hard') return MEDIUM_MAX_LEVEL3_STEPS + 1 - l3;
  return l3; // easy: any level-3 step is one too many
}

// Step 3b. A layout that is solvable but grades as the wrong difficulty used
// to be thrown away with all its repair work. Instead keep moving cells,
// accepting moves that keep the puzzle solvable and bring the level-3 step
// count no further from the requested band, until the label matches.
export function tuneDifficulty(n, regions, solution, rng, { difficulty, maxLevel, minSize, maxEvals, k = 1, levelCounts }) {
  const puzzle = { solution };
  const sizes = regionSizes(regions);
  const maxSize = Math.floor(MAX_REGION_SHARE * n * n);
  let gap = difficultyGap(levelCounts, difficulty);
  let evals = 0;
  while (gap > 0 && evals < maxEvals) {
    const move = pickMove(n, regions, puzzle, sizes, rng, { minSize, maxSize, focus: null });
    if (!move) continue;
    regions[move.r][move.c] = move.to;
    evals++;
    const next = unresolved(n, regions, k, maxLevel);
    const nextGap = next.score === 0 ? difficultyGap(next.levelCounts, difficulty) : Infinity;
    if (nextGap <= gap) {
      gap = nextGap;
      sizes[move.from]--;
      sizes[move.to]++;
    } else {
      regions[move.r][move.c] = move.from;
    }
  }
  return { matched: gap === 0, evals };
}

// Main entry point. Deterministic for a given (n, seed, difficulty, k).
export function generatePuzzle({ n, seed, difficulty = 'medium', k = 1, maxEvals = 3000, maxTuneEvals = 300, maxPlacements = 50 }) {
  const minSize = k === 2 ? MIN_DOUBLE_SIZE : MIN_SIZE;
  const maxSize = k === 2 ? MAX_DOUBLE_SIZE : MAX_SIZE;
  if (!Number.isInteger(n) || n < minSize || n > maxSize) {
    throw new Error(`grid size must be ${minSize}..${maxSize}, got ${n}`);
  }
  if (k !== 1 && k !== 2) throw new Error(`animals per line must be 1 or 2, got ${k}`);
  const spec = DIFFICULTIES[difficulty];
  if (!spec) throw new Error(`unknown difficulty ${difficulty}`);
  const rng = createRng(seed);
  const stats = { placements: 0, evals: 0, unsolved: 0, stalled: 0, badShape: 0, wrongDifficulty: 0, tuned: 0, badLayout: 0 };

  for (let p = 0; p < maxPlacements; p++) {
    stats.placements++;
    const solution = placeAnimals(n, rng, k);
    const regions = growRegions(n, solution, rng, k);
    if (!regions) {
      stats.badLayout++;
      continue;
    }
    const repaired = repairRegions(n, regions, solution, rng, {
      maxLevel: spec.maxLevel,
      minSize: spec.allowSingles && k === 1 ? 1 : k === 2 ? 2 : 2,
      maxEvals,
      k,
    });
    stats.evals += repaired.evals;
    if (repaired.score !== 0) {
      stats.unsolved++;
      if (repaired.stalled) stats.stalled++;
      continue;
    }
    const allowSingles = spec.allowSingles && k === 1;
    if (checkShape(regions, { allowSingles })) {
      stats.badShape++;
      continue;
    }
    const puzzle = { n, regions, solution, seed, difficulty, k };
    let grade = gradePuzzle(puzzle);
    if (grade.label !== difficulty) {
      const tuned = tuneDifficulty(n, regions, solution, rng, {
        difficulty, maxLevel: spec.maxLevel, minSize: allowSingles ? 1 : 2, maxEvals: maxTuneEvals, k, levelCounts: grade.levelCounts,
      });
      stats.evals += tuned.evals;
      grade = gradePuzzle(puzzle);
      if (grade.label !== difficulty || checkShape(regions, { allowSingles })) {
        stats.wrongDifficulty++;
        continue;
      }
      stats.tuned++;
    }
    // Belt and braces: the deduction engine is sound, so this must hold.
    const counted = countSolutions(puzzle, 2);
    if (counted.count !== 1 || JSON.stringify(counted.solution) !== JSON.stringify(solution)) {
      throw new Error(`deduction solved a puzzle that is not unique (seed ${seed})`);
    }
    if (!isValidSolution(solution, regions, k)) throw new Error('generator produced an invalid solution');
    puzzle.grade = grade;
    puzzle.stats = stats;
    return puzzle;
  }
  throw new Error(`gave up generating a ${n}x${n} ${difficulty} puzzle for seed ${seed}`);
}

// Compact string id, handy for repeat detection and determinism tests.
export function puzzleKey(puzzle) {
  return `${puzzle.n}${puzzle.k === 2 ? 'x2' : ''}:${puzzle.regions.map((row) => row.join('')).join('|')}`;
}

// ASCII picture of a puzzle, for logs and tests.
export function renderPuzzle(puzzle) {
  const letters = 'ABCDEFGHIJKLMNOP';
  return puzzle.regions
    .map((row, r) => row.map((id, c) => (isSolutionCell(puzzle, r, c) ? letters[id].toLowerCase() : letters[id])).join(' '))
    .join('\n');
}
