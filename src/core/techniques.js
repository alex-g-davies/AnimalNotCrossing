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
// Every technique is sound: it only eliminates cells that cannot hold an
// animal in any solution. So if deduction fills the board, that filling is
// the puzzle's only solution.

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
  const state = { n, regions, regionCells, cells, rowIndex, colIndex, regionIndex, units };
  // A board loaded from the player may hold animals whose eliminations have
  // not been applied yet; apply them so the engine starts from a consistent view.
  if (board) {
    for (let i = 0; i < n * n; i++) if (cells[i] === ANIMAL) eliminateAround(state, i);
  }
  return state;
}

export function cloneState(state) {
  return { ...state, cells: new Uint8Array(state.cells) };
}

// Everything a placed animal rules out: its row, column, region and the
// eight cells around it.
function eliminateAround(state, index) {
  const { n, regions, regionCells, cells } = state;
  const r = Math.floor(index / n);
  const c = index % n;
  for (let i = 0; i < n; i++) {
    if (cells[r * n + i] === UNKNOWN) cells[r * n + i] = OUT;
    if (cells[i * n + c] === UNKNOWN) cells[i * n + c] = OUT;
  }
  for (const j of regionCells[regions[r][c]]) if (cells[j] === UNKNOWN) cells[j] = OUT;
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr < 0 || nr >= n || nc < 0 || nc >= n) continue;
      if (cells[nr * n + nc] === UNKNOWN) cells[nr * n + nc] = OUT;
    }
  }
}

// Units are rows, columns and regions. Each has an index 0..n-1.
const UNIT_TYPES = ['row', 'col', 'region'];

function unitCells(state, type, index) {
  return state.units[type][index];
}

// Unknown cells of a unit, or null when the unit already holds its animal.
function unitCandidates(state, type, index) {
  const out = [];
  for (const i of unitCells(state, type, index)) {
    if (state.cells[i] === ANIMAL) return null;
    if (state.cells[i] === UNKNOWN) out.push(i);
  }
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

// True when placing an animal at `a` would rule out cell `b`.
function sees(state, a, b) {
  if (a === b) return false;
  const ra = state.rowIndex[a];
  const ca = state.colIndex[a];
  const rb = state.rowIndex[b];
  const cb = state.colIndex[b];
  if (ra === rb || ca === cb) return true;
  if (state.regionIndex[a] === state.regionIndex[b]) return true;
  return Math.abs(ra - rb) <= 1 && Math.abs(ca - cb) <= 1;
}

export function applyDeduction(state, d) {
  if (d.place !== undefined && d.place !== null) {
    state.cells[d.place] = ANIMAL;
    eliminateAround(state, d.place);
  }
  if (d.eliminate) for (const i of d.eliminate) if (state.cells[i] === UNKNOWN) state.cells[i] = OUT;
}

export function unknownCount(state) {
  let k = 0;
  for (const v of state.cells) if (v === UNKNOWN) k++;
  return k;
}

export function animalCount(state) {
  let k = 0;
  for (const v of state.cells) if (v === ANIMAL) k++;
  return k;
}

// ---------------------------------------------------------------------------
// Level 1: a unit with a single candidate gets its animal.
// (A unit with no candidates and no animal is a contradiction.)

function findLevel1(state) {
  const { n } = state;
  for (const type of UNIT_TYPES) {
    for (let index = 0; index < n; index++) {
      const cands = unitCandidates(state, type, index);
      if (cands === null) continue;
      if (cands.length === 0) return { contradiction: true, unit: { type, index } };
      if (cands.length === 1) {
        return { level: 1, technique: 'single', unit: { type, index }, place: cands[0], eliminate: [] };
      }
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Level 2: confinement between a region and a line (row or column).
//  - All candidates of a region lie in one row: the rest of that row is out.
//  - All candidates of a row lie in one region: the rest of that region is out.
//  (And the same with columns.)

function findLevel2(state) {
  const { n } = state;
  for (let region = 0; region < n; region++) {
    const cands = unitCandidates(state, 'region', region);
    if (cands === null || cands.length === 0) continue;
    for (const line of ['row', 'col']) {
      const pick = line === 'row' ? rowOf : colOf;
      const first = pick(state, cands[0]);
      if (!cands.every((i) => pick(state, i) === first)) continue;
      const eliminate = unitCandidates(state, line, first).filter((i) => regionOf(state, i) !== region);
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
      const pick = line === 'row' ? rowOf : colOf;
      const eliminate = unitCandidates(state, 'region', first).filter((i) => pick(state, i) !== index);
      if (eliminate.length) {
        return { level: 2, technique: 'line-in-region', unit: { type: line, index }, line: { type: 'region', index: first }, eliminate };
      }
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Level 3a: group confinement. k regions whose candidates together span only
// k rows must take those rows, so other regions are out of those rows.
// Also the reverse (k rows confined to k regions) and the same for columns.

function bitCount(mask) {
  let k = 0;
  while (mask) {
    mask &= mask - 1;
    k++;
  }
  return k;
}

function findGroupConfinement(state, k) {
  const { n } = state;
  for (const line of ['row', 'col']) {
    const pick = line === 'row' ? rowOf : colOf;
    // regionLines[region] = bitmask of lines its candidates touch (null if done)
    const regionLines = [];
    const lineRegions = [];
    for (let i = 0; i < n; i++) {
      const rc = unitCandidates(state, 'region', i);
      regionLines.push(rc === null ? null : rc.reduce((m, c) => m | (1 << pick(state, c)), 0));
      const lc = unitCandidates(state, line, i);
      lineRegions.push(lc === null ? null : lc.reduce((m, c) => m | (1 << regionOf(state, c)), 0));
    }
    // Regions -> lines
    let found = searchGroups(regionLines, k, (groupMask, unionMask) => {
      const eliminate = [];
      for (let l = 0; l < n; l++) {
        if (!(unionMask & (1 << l))) continue;
        for (const i of unitCandidates(state, line, l) || []) {
          if (!(groupMask & (1 << regionOf(state, i)))) eliminate.push(i);
        }
      }
      return eliminate;
    });
    if (found) return { level: 3, technique: `${k}-regions-in-${line}s`, ...found };
    // Lines -> regions
    found = searchGroups(lineRegions, k, (groupMask, unionMask) => {
      const eliminate = [];
      for (let region = 0; region < n; region++) {
        if (!(unionMask & (1 << region))) continue;
        for (const i of unitCandidates(state, 'region', region) || []) {
          if (!(groupMask & (1 << pick(state, i)))) eliminate.push(i);
        }
      }
      return eliminate;
    });
    if (found) return { level: 3, technique: `${k}-${line}s-in-regions`, ...found };
  }
  return null;
}

// Enumerates k-subsets of units whose candidate masks union to exactly k
// bits, and returns the first one with a non-empty elimination list.
function searchGroups(masks, k, eliminationsFor) {
  const n = masks.length;
  const chosen = [];
  function rec(start, unionMask) {
    if (chosen.length === k) {
      if (bitCount(unionMask) !== k) return null;
      const groupMask = chosen.reduce((m, i) => m | (1 << i), 0);
      const eliminate = eliminationsFor(groupMask, unionMask);
      return eliminate.length ? { group: chosen.slice(), eliminate } : null;
    }
    for (let i = start; i < n; i++) {
      if (masks[i] === null || masks[i] === 0) continue;
      const next = unionMask | masks[i];
      if (bitCount(next) > k) continue;
      chosen.push(i);
      const hit = rec(i + 1, next);
      chosen.pop();
      if (hit) return hit;
    }
    return null;
  }
  return rec(0, 0);
}

// Level 3b: a cell that sees every candidate of some unit (that it does not
// belong to) cannot hold an animal, because placing it would empty that unit.

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
  const finders = [findLevel1, findLevel2, findLevel3, findLevel4];
  for (let level = 1; level <= Math.min(maxLevel, 4); level++) {
    const d = finders[level - 1](state);
    if (d) return d;
  }
  return null;
}

// Runs deductions until solved or stuck. Mutates `state`.
export function runDeduction(state, maxLevel = 3) {
  const { n } = state;
  const levelCounts = [0, 0, 0, 0, 0];
  let steps = 0;
  let maxLevelUsed = 0;
  for (;;) {
    if (animalCount(state) === n) return { solved: true, contradiction: false, steps, maxLevelUsed, levelCounts };
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
