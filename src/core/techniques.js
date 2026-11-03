// Human-style deduction engine.
//
// Used three ways: to grade difficulty (which techniques a puzzle needs), to
// power hints (the next deduction from the player's board), and by the
// generator as its repair objective (how many cells are still unresolved).
//
// State: `cells` is an n*n Uint8Array where each cell is UNKNOWN, OUT
// (eliminated) or ANIMAL. Those values match the board constants in rules.js
// (EMPTY, MARK, ANIMAL) so a player's board can be loaded directly.
//
// Every unit (row, column, region) needs k animals: 1 in the classic game,
// 2 in Double Up. "Need" below is how many a unit still lacks. The classic
// techniques generalise by counting: a group of units whose candidates fit
// in a set of lines that need exactly as many animals must take them all.
//
// Every technique is sound: it only eliminates cells that cannot hold an
// animal in any solution. So if deduction fills the board, that filling is
// the puzzle's only solution.

import { perLine } from './rules.js';

export const UNKNOWN = 0;
export const OUT = 1;
export const ANIMAL = 2;

export const LEVEL_NAMES = {
  1: 'single',
  2: 'confinement',
  3: 'group confinement',
  4: 'lookahead',
};

export function createState(puzzle, board = null) {
  const { n, regions } = puzzle;
  const k = perLine(puzzle);
  const cells = new Uint8Array(n * n);
  const regionCells = Array.from({ length: n }, () => []);
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      regionCells[regions[r][c]].push(r * n + c);
      if (board) cells[r * n + c] = board[r][c];
    }
  }
  // Precomputed lookups: profiling showed building these on every query was
  // over half of all deduction time.
  const rowIndex = new Uint8Array(n * n);
  const colIndex = new Uint8Array(n * n);
  const regionIndex = new Uint8Array(n * n);
  for (let i = 0; i < n * n; i++) {
    rowIndex[i] = Math.floor(i / n);
    colIndex[i] = i % n;
    regionIndex[i] = regions[rowIndex[i]][colIndex[i]];
  }
  const units = {
    row: Array.from({ length: n }, (_, r) => Array.from({ length: n }, (_, c) => r * n + c)),
    col: Array.from({ length: n }, (_, c) => Array.from({ length: n }, (_, r) => r * n + c)),
    region: regionCells,
  };
  // Animals per unit, kept up to date by placeAnimal. Profiling showed that
  // recounting them on every lookup was over half of all deduction time.
  const animals = { row: new Uint8Array(n), col: new Uint8Array(n), region: new Uint8Array(n) };
  const state = { n, k, regions, regionCells, cells, rowIndex, colIndex, regionIndex, units, animals };
  // A board loaded from the player may hold animals whose eliminations have
  // not been applied yet; apply them so the engine starts from a consistent view.
  if (board) {
    for (let i = 0; i < n * n; i++) if (cells[i] === ANIMAL) countAnimal(state, i);
    for (let i = 0; i < n * n; i++) if (cells[i] === ANIMAL) eliminateAround(state, i);
  }
  return state;
}

export function cloneState(state) {
  const { row, col, region } = state.animals;
  return { ...state, cells: new Uint8Array(state.cells), animals: { row: new Uint8Array(row), col: new Uint8Array(col), region: new Uint8Array(region) } };
}

function countAnimal(state, index) {
  state.animals.row[state.rowIndex[index]]++;
  state.animals.col[state.colIndex[index]]++;
  state.animals.region[state.regionIndex[index]]++;
}

function placeAnimal(state, index) {
  if (state.cells[index] === ANIMAL) return;
  state.cells[index] = ANIMAL;
  countAnimal(state, index);
  eliminateAround(state, index);
}

function unitAnimals(state, type, index) {
  return state.animals[type][index];
}

// Everything a placed animal rules out: the eight cells around it, and its
// row, column and region once they hold their k animals.
function eliminateAround(state, index) {
  const { n, cells, k } = state;
  const r = state.rowIndex[index];
  const c = state.colIndex[index];
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr < 0 || nr >= n || nc < 0 || nc >= n) continue;
      if (cells[nr * n + nc] === UNKNOWN) cells[nr * n + nc] = OUT;
    }
  }
  for (const [type, unit] of [['row', r], ['col', c], ['region', state.regionIndex[index]]]) {
    if (unitAnimals(state, type, unit) < k) continue;
    for (const i of state.units[type][unit]) if (cells[i] === UNKNOWN) cells[i] = OUT;
  }
}

// Units are rows, columns and regions. Each has an index 0..n-1.
const UNIT_TYPES = ['row', 'col', 'region'];

// How many animals a unit still needs.
function unitNeed(state, type, index) {
  return state.k - unitAnimals(state, type, index);
}

// Unknown cells of a unit, or null when the unit already has its animals.
function unitCandidates(state, type, index) {
  if (unitNeed(state, type, index) <= 0) return null;
  const out = [];
  for (const i of state.units[type][index]) if (state.cells[i] === UNKNOWN) out.push(i);
  return out;
}

function rowOf(state, i) {
  return state.rowIndex[i];
}
function colOf(state, i) {
  return state.colIndex[i];
}
function regionOf(state, i) {
  return state.regionIndex[i];
}

function adjacent(state, a, b) {
  return a !== b && Math.abs(state.rowIndex[a] - state.rowIndex[b]) <= 1 && Math.abs(state.colIndex[a] - state.colIndex[b]) <= 1;
}

// True when placing an animal at `a` would rule out cell `b`: b touches a,
// or shares a row, column or region that a would fill up.
function sees(state, a, b) {
  if (a === b) return false;
  if (adjacent(state, a, b)) return true;
  const ra = state.rowIndex[a], ca = state.colIndex[a];
  if (ra === state.rowIndex[b] && unitNeed(state, 'row', ra) <= 1) return true;
  if (ca === state.colIndex[b] && unitNeed(state, 'col', ca) <= 1) return true;
  const ga = state.regionIndex[a];
  return ga === state.regionIndex[b] && unitNeed(state, 'region', ga) <= 1;
}

export function applyDeduction(state, d) {
  if (d.place !== undefined && d.place !== null) placeAnimal(state, d.place);
  if (d.eliminate) for (const i of d.eliminate) if (state.cells[i] === UNKNOWN) state.cells[i] = OUT;
}

export function unknownCount(state) {
  let k = 0;
  for (const v of state.cells) if (v === UNKNOWN) k++;
  return k;
}

export function animalCount(state) {
  let k = 0;
  for (const v of state.animals.row) k += v;
  return k;
}

// ---------------------------------------------------------------------------
// Level 1: a unit with exactly as many candidates as it still needs gets
// them all (one per step). A unit with fewer is a contradiction.

function findLevel1(state) {
  const { n } = state;
  for (const type of UNIT_TYPES) {
    for (let index = 0; index < n; index++) {
      const cands = unitCandidates(state, type, index);
      if (cands === null) continue;
      const need = unitNeed(state, type, index);
      if (cands.length < need) return { contradiction: true, unit: { type, index } };
      if (cands.length === need) {
        return { level: 1, technique: need === 1 ? 'single' : 'fill', unit: { type, index }, place: cands[0], eliminate: [] };
      }
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Level 2a (Double Up): fitting. A unit that needs two animals can only use
// pairs of candidates that do not touch. Cells in no such pair are out; a
// cell in every such pair is forced.

function findFit(state) {
  const { n, k } = state;
  if (k < 2) return null;
  for (const type of UNIT_TYPES) {
    for (let index = 0; index < n; index++) {
      const cands = unitCandidates(state, type, index);
      if (cands === null || unitNeed(state, type, index) !== 2) continue;
      const inSome = new Set();
      const inAll = new Set(cands);
      let pairs = 0;
      for (let i = 0; i < cands.length; i++) {
        for (let j = i + 1; j < cands.length; j++) {
          if (adjacent(state, cands[i], cands[j])) continue;
          pairs++;
          inSome.add(cands[i]);
          inSome.add(cands[j]);
          for (const x of inAll) if (x !== cands[i] && x !== cands[j]) inAll.delete(x);
        }
      }
      if (pairs === 0) return { contradiction: true, unit: { type, index } };
      const eliminate = cands.filter((i) => !inSome.has(i));
      const forced = [...inAll];
      if (eliminate.length || forced.length) {
        return { level: 2, technique: 'fit', unit: { type, index }, place: forced.length ? forced[0] : null, eliminate };
      }
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Level 2b: confinement between a region and a line (row or column).
//  - All candidates of a region lie in one row, and that row needs exactly
//    what the region needs: the rest of that row is out.
//  - All candidates of a row lie in one region, likewise: the rest of that
//    region is out. (And the same with columns.)

function findLevel2(state) {
  const { n } = state;
  for (let region = 0; region < n; region++) {
    const cands = unitCandidates(state, 'region', region);
    if (cands === null || cands.length === 0) continue;
    for (const line of ['row', 'col']) {
      const pick = line === 'row' ? rowOf : colOf;
      const first = pick(state, cands[0]);
      if (!cands.every((i) => pick(state, i) === first)) continue;
      if (unitNeed(state, line, first) !== unitNeed(state, 'region', region)) continue;
      const eliminate = (unitCandidates(state, line, first) || []).filter((i) => regionOf(state, i) !== region);
      if (eliminate.length) {
        return { level: 2, technique: 'region-in-line', unit: { type: 'region', index: region }, line: { type: line, index: first }, eliminate };
      }
    }
  }
  for (const line of ['row', 'col']) {
    for (let index = 0; index < n; index++) {
      const cands = unitCandidates(state, line, index);
      if (cands === null || cands.length === 0) continue;
      const first = regionOf(state, cands[0]);
      if (!cands.every((i) => regionOf(state, i) === first)) continue;
      if (unitNeed(state, 'region', first) !== unitNeed(state, line, index)) continue;
      const pick = line === 'row' ? rowOf : colOf;
      const eliminate = (unitCandidates(state, 'region', first) || []).filter((i) => pick(state, i) !== index);
      if (eliminate.length) {
        return { level: 2, technique: 'line-in-region', unit: { type: line, index }, line: { type: 'region', index: first }, eliminate };
      }
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Level 3a: group confinement. A few regions whose candidates together span
// only lines that need exactly as many animals as those regions do must
// take those lines, so other regions are out of them. Also the reverse
// (lines confined to regions), and the same for columns.

function findGroupConfinement(state, groupSize) {
  const { n } = state;
  for (const line of ['row', 'col']) {
    const pick = line === 'row' ? rowOf : colOf;
    // regionLines[region] = bitmask of lines its candidates touch (null if done)
    const regionLines = [];
    const lineRegions = [];
    const regionNeed = [];
    const lineNeed = [];
    for (let i = 0; i < n; i++) {
      const rc = unitCandidates(state, 'region', i);
      regionLines.push(rc === null ? null : rc.reduce((m, c) => m | (1 << pick(state, c)), 0));
      regionNeed.push(unitNeed(state, 'region', i));
      const lc = unitCandidates(state, line, i);
      lineRegions.push(lc === null ? null : lc.reduce((m, c) => m | (1 << regionOf(state, c)), 0));
      lineNeed.push(unitNeed(state, line, i));
    }
    // Regions -> lines
    let found = searchGroups(regionLines, regionNeed, lineNeed, groupSize, (groupMask, unionMask) => {
      const eliminate = [];
      for (let l = 0; l < n; l++) {
        if (!(unionMask & (1 << l))) continue;
        for (const i of unitCandidates(state, line, l) || []) {
          if (!(groupMask & (1 << regionOf(state, i)))) eliminate.push(i);
        }
      }
      return eliminate;
    });
    if (found) return { level: 3, technique: `${groupSize}-regions-in-${line}s`, ...found };
    // Lines -> regions
    found = searchGroups(lineRegions, lineNeed, regionNeed, groupSize, (groupMask, unionMask) => {
      const eliminate = [];
      for (let region = 0; region < n; region++) {
        if (!(unionMask & (1 << region))) continue;
        for (const i of unitCandidates(state, 'region', region) || []) {
          if (!(groupMask & (1 << pick(state, i)))) eliminate.push(i);
        }
      }
      return eliminate;
    });
    if (found) return { level: 3, technique: `${groupSize}-${line}s-in-regions`, ...found };
  }
  return null;
}

function needOfMask(mask, needs) {
  let total = 0;
  for (let i = 0; mask; i++, mask >>>= 1) if (mask & 1) total += Math.max(0, needs[i]);
  return total;
}

// Enumerates groups of `size` units whose candidate masks union to a set of
// units needing exactly as many animals as the group does, and returns the
// first one with a non-empty elimination list.
function searchGroups(masks, groupNeeds, unionNeeds, size, eliminationsFor) {
  const n = masks.length;
  const chosen = [];
  function rec(start, unionMask, groupNeed) {
    if (chosen.length === size) {
      if (needOfMask(unionMask, unionNeeds) !== groupNeed) return null;
      const groupMask = chosen.reduce((m, i) => m | (1 << i), 0);
      const eliminate = eliminationsFor(groupMask, unionMask);
      return eliminate.length ? { group: chosen.slice(), eliminate } : null;
    }
    for (let i = start; i < n; i++) {
      if (masks[i] === null || masks[i] === 0) continue;
      const next = unionMask | masks[i];
      const need = groupNeed + groupNeeds[i];
      // The union can only grow, so once it needs more than the group it is no use.
      if (needOfMask(next, unionNeeds) > need + (size - chosen.length - 1) * Math.max(...groupNeeds)) continue;
      chosen.push(i);
      const hit = rec(i + 1, next, need);
      chosen.pop();
      if (hit) return hit;
    }
    return null;
  }
  return rec(0, 0, 0);
}

// Level 3b: a cell that sees every candidate of some unit (that it does not
// belong to) cannot hold an animal, because placing it would starve that unit.

function findSeesAll(state) {
  const { n, cells } = state;
  const candidateLists = [];
  for (const type of UNIT_TYPES) {
    for (let index = 0; index < n; index++) {
      const cands = unitCandidates(state, type, index);
      if (cands && cands.length > 0) candidateLists.push({ type, index, cands });
    }
  }
  for (let x = 0; x < n * n; x++) {
    if (cells[x] !== UNKNOWN) continue;
    for (const unit of candidateLists) {
      if (unit.cands.includes(x)) continue;
      if (unit.cands.every((i) => sees(state, x, i))) {
        return { level: 3, technique: 'sees-all', unit: { type: unit.type, index: unit.index }, eliminate: [x] };
      }
    }
  }
  return null;
}

function findLevel3(state) {
  return findGroupConfinement(state, 2) || findSeesAll(state) || findGroupConfinement(state, 3);
}

// ---------------------------------------------------------------------------
// Level 4: one-step lookahead. Assume an animal in a cell; if levels 1-3 then
// reach a contradiction, the cell is out. Optional and slow; kept for measuring.

function findLevel4(state) {
  const { n, cells } = state;
  for (let x = 0; x < n * n; x++) {
    if (cells[x] !== UNKNOWN) continue;
    const trial = cloneState(state);
    applyDeduction(trial, { place: x });
    const result = runDeduction(trial, 3);
    if (result.contradiction) return { level: 4, technique: 'lookahead', eliminate: [x] };
  }
  return null;
}

// ---------------------------------------------------------------------------

// The next deduction at the lowest level that yields one, or null when stuck.
export function findDeduction(state, maxLevel = 3) {
  const finders = [findLevel1, (s) => findFit(s) || findLevel2(s), findLevel3, findLevel4];
  for (let level = 1; level <= Math.min(maxLevel, 4); level++) {
    const d = finders[level - 1](state);
    if (d) return d;
  }
  return null;
}

// Runs deductions until solved or stuck. Mutates `state`.
export function runDeduction(state, maxLevel = 3) {
  const { n, k } = state;
  const levelCounts = [0, 0, 0, 0, 0];
  let steps = 0;
  let maxLevelUsed = 0;
  for (;;) {
    if (animalCount(state) === n * k) return { solved: true, contradiction: false, steps, maxLevelUsed, levelCounts };
    const d = findDeduction(state, maxLevel);
    if (!d) return { solved: false, contradiction: false, steps, maxLevelUsed, levelCounts };
    if (d.contradiction) return { solved: false, contradiction: true, steps, maxLevelUsed, levelCounts };
    applyDeduction(state, d);
    steps++;
    levelCounts[d.level]++;
    if (d.level > maxLevelUsed) maxLevelUsed = d.level;
  }
}

// Convenience for callers that start from a puzzle (and optionally a board).
export function solveByDeduction(puzzle, { maxLevel = 3, board = null } = {}) {
  const state = createState(puzzle, board);
  const result = runDeduction(state, maxLevel);
  return { ...result, state };
}
