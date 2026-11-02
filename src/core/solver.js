// Counting solver: proves a region layout has exactly one solution.
//
// Backtracks row by row. For the classic game bitmasks track used columns
// and used regions, and the previous row's column enforces the no-touch
// rule. Double Up (k = 2) uses the general search below: two columns per
// row, at least two apart, with per-column and per-region counts. Both stop
// as soon as `limit` solutions are found, so uniqueness checks cost at most
// "find two".

import { perLine } from './rules.js';

export function countSolutions(puzzle, limit = 2) {
  return perLine(puzzle) === 1 ? countSingle(puzzle, limit) : countMulti(puzzle, limit, perLine(puzzle));
}

function countSingle(puzzle, limit) {
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

function countMulti(puzzle, limit, k) {
  const { n, regions } = puzzle;
  const colCount = new Array(n).fill(0);
  const regionCount = new Array(n).fill(0);
  const rows = [];
  let count = 0;
  let first = null;

  // Columns for `row`, chosen left to right so each is at least two past the
  // last, never touching the previous row, and never overfilling a column or
  // region. `chosen` holds the columns picked so far in this row.
  function search(row, chosen) {
    if (chosen.length === k) {
      rows.push(chosen.slice());
      const done = row + 1 === n ? finish() : search(row + 1, []);
      rows.pop();
      return done;
    }
    const prev = row > 0 ? rows[row - 1] : [];
    const start = chosen.length ? chosen[chosen.length - 1] + 2 : 0;
    for (let c = start; c < n; c++) {
      if (colCount[c] >= k) continue;
      const region = regions[row][c];
      if (regionCount[region] >= k) continue;
      if (prev.some((p) => Math.abs(p - c) <= 1)) continue;
      colCount[c]++;
      regionCount[region]++;
      chosen.push(c);
      const done = search(row, chosen);
      chosen.pop();
      colCount[c]--;
      regionCount[region]--;
      if (done) return true;
    }
    return false;
  }

  function finish() {
    count++;
    if (first === null) first = rows.map((r) => r.slice());
    return count >= limit;
  }

  search(0, []);
  return { count, solution: first };
}

// Convenience: true when the layout has exactly one solution.
export function isUnique(puzzle) {
  return countSolutions(puzzle, 2).count === 1;
}
