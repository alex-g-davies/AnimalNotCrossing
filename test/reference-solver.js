// Independent solver used only by tests. Deliberately different from
// src/core/solver.js: searches region by region instead of row by row, uses
// plain arrays instead of bitmasks, and checks every rule by brute force.
// It must agree with the counting solver on every puzzle, classic (one
// animal per region) and Double Up (two).

export function referenceCount(puzzle, limit = Infinity) {
  const { n, regions } = puzzle;
  const k = puzzle.k === 2 ? 2 : 1;
  const regionCells = Array.from({ length: n }, () => []);
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) regionCells[regions[r][c]].push([r, c]);
  }
  const placed = [];
  const solutions = [];

  function compatible(r, c) {
    let sameRow = 0, sameCol = 0;
    for (const [pr, pc] of placed) {
      if (pr === r && pc === c) return false;
      if (Math.abs(pr - r) <= 1 && Math.abs(pc - c) <= 1) return false;
      if (pr === r) sameRow++;
      if (pc === c) sameCol++;
    }
    return sameRow < k && sameCol < k;
  }

  // Region by region, choose k of its cells (in increasing order, so each
  // set is tried once) that fit with everything placed so far.
  function search(regionId, from, inRegion) {
    if (solutions.length >= limit) return;
    if (inRegion === k) {
      if (regionId + 1 === n) {
        const sol = Array.from({ length: n }, () => []);
        for (const [r, c] of placed) sol[r].push(c);
        for (const row of sol) row.sort((a, b) => a - b);
        solutions.push(k === 1 ? sol.map(([c]) => c) : sol);
        return;
      }
      search(regionId + 1, 0, 0);
      return;
    }
    const cells = regionCells[regionId];
    for (let i = from; i < cells.length; i++) {
      const [r, c] = cells[i];
      if (!compatible(r, c)) continue;
      placed.push([r, c]);
      search(regionId, i + 1, inRegion + 1);
      placed.pop();
    }
  }

  search(0, 0, 0);
  return { count: solutions.length, solutions };
}
