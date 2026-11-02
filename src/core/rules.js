// The four rules of the game, as pure functions over a player's board.
//
// A board is an N x N array of cell states. A puzzle is { n, regions, solution, k }
// where regions[r][c] is the region id of that cell. `k` is how many animals
// each row, column and region holds: 1 in the classic game (solution[r] is
// the column of row r's animal) or 2 in "Double Up" (solution[r] is a sorted
// array of the two columns). Animals never touch, not even diagonally.

export const EMPTY = 0;
export const MARK = 1; // an X: the player believes this cell is empty
export const ANIMAL = 2;

export function emptyBoard(n) {
  return Array.from({ length: n }, () => new Array(n).fill(EMPTY));
}

// Animals per row, column and region.
export function perLine(puzzle) {
  return puzzle.k === 2 ? 2 : 1;
}

export function isSolutionCell(puzzle, r, c) {
  const s = puzzle.solution[r];
  return Array.isArray(s) ? s.includes(c) : s === c;
}

// Every solution cell as [r, c], row by row.
export function solutionCells(puzzle) {
  const out = [];
  puzzle.solution.forEach((s, r) => {
    for (const c of Array.isArray(s) ? s : [s]) out.push([r, c]);
  });
  return out;
}

function touching(a, b) {
  return Math.abs(a.r - b.r) <= 1 && Math.abs(a.c - b.c) <= 1;
}

// Returns a Set of cell indices (r * n + c) for every animal that breaks a rule
// the player can see: more than k animals in its row, column or region, or any
// animal touching it (including diagonally). The stored solution is not used.
export function findConflicts(board, puzzle) {
  const { n, regions } = puzzle;
  const k = perLine(puzzle);
  const animals = [];
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (board[r][c] === ANIMAL) animals.push({ r, c, region: regions[r][c] });
    }
  }
  const conflicts = new Set();
  for (const key of ['r', 'c', 'region']) {
    const groups = new Map();
    for (const a of animals) {
      if (!groups.has(a[key])) groups.set(a[key], []);
      groups.get(a[key]).push(a);
    }
    for (const group of groups.values()) {
      if (group.length > k) for (const a of group) conflicts.add(a.r * n + a.c);
    }
  }
  for (let i = 0; i < animals.length; i++) {
    for (let j = i + 1; j < animals.length; j++) {
      if (touching(animals[i], animals[j])) {
        conflicts.add(animals[i].r * n + animals[i].c);
        conflicts.add(animals[j].r * n + animals[j].c);
      }
    }
  }
  return conflicts;
}

// True when the board holds exactly n*k animals and none of them conflict.
// That is equivalent to k animals per row, column and region with no
// touching, so it never needs the stored solution.
export function isSolved(board, puzzle) {
  const { n } = puzzle;
  let count = 0;
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (board[r][c] === ANIMAL) count++;
    }
  }
  return count === n * perLine(puzzle) && findConflicts(board, puzzle).size === 0;
}

// Checks that a solution obeys all four rules for the given regions. Used by
// tests and by the generator's own sanity check.
export function isValidSolution(solution, regions, k = 1) {
  const n = regions.length;
  if (solution.length !== n) return false;
  const colCount = new Array(n).fill(0);
  const regionCount = new Array(n).fill(0);
  let prev = [];
  for (let r = 0; r < n; r++) {
    const cols = Array.isArray(solution[r]) ? solution[r] : [solution[r]];
    if (cols.length !== k) return false;
    for (let i = 0; i < cols.length; i++) {
      const c = cols[i];
      if (!Number.isInteger(c) || c < 0 || c >= n) return false;
      if (i > 0 && c <= cols[i - 1] + 1) return false; // sorted, and never adjacent
      if (++colCount[c] > k) return false;
      if (++regionCount[regions[r][c]] > k) return false;
      if (prev.some((p) => Math.abs(p - c) <= 1)) return false;
    }
    prev = cols;
  }
  return colCount.every((v) => v === k) && regionCount.every((v) => v === k);
}

// Cells an animal at (r, c) rules out on this board: the eight around it, and
// its row, column and region once they hold their k animals (counting it).
export function cellsRuledOut(board, puzzle, r, c) {
  const { n, regions } = puzzle;
  const k = perLine(puzzle);
  const out = new Set();
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      const nr = r + dr, nc = c + dc;
      if ((dr || dc) && nr >= 0 && nr < n && nc >= 0 && nc < n) out.add(nr * n + nc);
    }
  }
  const units = [
    { cells: Array.from({ length: n }, (_, i) => [r, i]) },
    { cells: Array.from({ length: n }, (_, i) => [i, c]) },
    { cells: [] },
  ];
  for (let rr = 0; rr < n; rr++) for (let cc = 0; cc < n; cc++) if (regions[rr][cc] === regions[r][c]) units[2].cells.push([rr, cc]);
  for (const unit of units) {
    let animals = board[r][c] === ANIMAL ? 0 : 1;
    for (const [rr, cc] of unit.cells) if (board[rr][cc] === ANIMAL) animals++;
    if (animals >= k) for (const [rr, cc] of unit.cells) if (rr !== r || cc !== c) out.add(rr * n + cc);
  }
  return [...out].filter((i) => board[Math.floor(i / n)][i % n] !== ANIMAL);
}
