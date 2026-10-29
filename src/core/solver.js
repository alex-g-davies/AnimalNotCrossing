// Counting solver: proves a region layout has exactly one solution.
//
// Backtracks row by row. Bitmasks track used columns and used regions; the
// previous row's column enforces the no-touch rule (two animals in adjacent
// rows must be at least two columns apart). Stops as soon as `limit` solutions
// are found, so uniqueness checks cost at most "find two".

export function countSolutions(puzzle, limit = 2) {
  const { n, regions } = puzzle;
  const cols = new Array(n).fill(-1);
  let count = 0;
  let first = null;

  function search(row, usedCols, usedRegions, prevCol) {
    if (row === n) {
      count++;
      if (first === null) first = cols.slice();
      return count >= limit;
    }
    const regionRow = regions[row];
    for (let c = 0; c < n; c++) {
      if (usedCols & (1 << c)) continue;
      if (prevCol >= 0 && c >= prevCol - 1 && c <= prevCol + 1) continue;
      const regionBit = 1 << regionRow[c];
      if (usedRegions & regionBit) continue;
      cols[row] = c;
      if (search(row + 1, usedCols | (1 << c), usedRegions | regionBit, c)) return true;
    }
    cols[row] = -1;
    return false;
  }

  search(0, 0, 0, -1);
  return { count, solution: first };
}

// Convenience: true when the layout has exactly one solution.
export function isUnique(puzzle) {
  return countSolutions(puzzle, 2).count === 1;
}
