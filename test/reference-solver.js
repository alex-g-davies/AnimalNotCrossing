// Independent solver used only by tests. Deliberately different from
// src/core/solver.js: searches region by region instead of row by row, uses
// plain arrays instead of bitmasks, and checks every rule by brute force.
// It must agree with the counting solver on every puzzle.

export function referenceCount(puzzle, limit = Infinity) {
  const { n, regions } = puzzle;
  const regionCells = Array.from({ length: n }, () => []);
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) regionCells[regions[r][c]].push([r, c]);
  }
  const placed = [];
  const solutions = [];

  function compatible(r, c) {
    for (const [pr, pc] of placed) {
      if (pr === r || pc === c) return false;
      if (Math.abs(pr - r) <= 1 && Math.abs(pc - c) <= 1) return false;
    }
    return true;
  }

  function search(regionId) {
    if (solutions.length >= limit) return;
    if (regionId === n) {
      const cols = new Array(n);
      for (const [r, c] of placed) cols[r] = c;
      solutions.push(cols);
      return;
    }
    for (const [r, c] of regionCells[regionId]) {
      if (!compatible(r, c)) continue;
      placed.push([r, c]);
      search(regionId + 1);
      placed.pop();
    }
  }

  search(0);
  return { count: solutions.length, solutions };
}
