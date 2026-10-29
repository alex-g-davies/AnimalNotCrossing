// The four rules of the game, as pure functions over a player's board.
//
// A board is an N x N array of cell states. A puzzle is { n, regions, solution }
// where regions[r][c] is the region id of that cell and solution[r] is the
// column of the animal in row r.

export const EMPTY = 0;
export const MARK = 1; // an X: the player believes this cell is empty
export const ANIMAL = 2;

export function emptyBoard(n) {
  return Array.from({ length: n }, () => new Array(n).fill(EMPTY));
}

// Returns a Set of cell indices (r * n + c) for every animal that breaks a rule
// the player can see: another animal in its row, column or region, or any
// animal touching it (including diagonally). The stored solution is not used.
export function findConflicts(board, puzzle) {
  const { n, regions } = puzzle;
  const animals = [];
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (board[r][c] === ANIMAL) animals.push({ r, c, region: regions[r][c] });
    }
  }
  const conflicts = new Set();
  for (let i = 0; i < animals.length; i++) {
    for (let j = i + 1; j < animals.length; j++) {
      const a = animals[i];
      const b = animals[j];
      const sameLine = a.r === b.r || a.c === b.c || a.region === b.region;
      const touching = Math.abs(a.r - b.r) <= 1 && Math.abs(a.c - b.c) <= 1;
      if (sameLine || touching) {
        conflicts.add(a.r * n + a.c);
        conflicts.add(b.r * n + b.c);
      }
    }
  }
  return conflicts;
}

// True when the board holds exactly n animals and none of them conflict.
// That is equivalent to one animal per row, column and region with no touching,
// so it never needs the stored solution.
export function isSolved(board, puzzle) {
  const { n } = puzzle;
  let count = 0;
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (board[r][c] === ANIMAL) count++;
    }
  }
  return count === n && findConflicts(board, puzzle).size === 0;
}

// Checks that a solution array (column per row) obeys all four rules for the
// given regions. Used by tests and by the generator's own sanity check.
export function isValidSolution(solution, regions) {
  const n = regions.length;
  if (solution.length !== n) return false;
  const usedCols = new Set();
  const usedRegions = new Set();
  for (let r = 0; r < n; r++) {
    const c = solution[r];
    if (!Number.isInteger(c) || c < 0 || c >= n) return false;
    if (usedCols.has(c)) return false;
    usedCols.add(c);
    const region = regions[r][c];
    if (usedRegions.has(region)) return false;
    usedRegions.add(region);
    if (r > 0 && Math.abs(c - solution[r - 1]) <= 1) return false;
  }
  return true;
}
