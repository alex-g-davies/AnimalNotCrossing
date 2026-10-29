// Hint engine. Runs the deduction engine from the player's current board.
//
// A hint has three tiers, chosen by the UI on repeated taps:
//   1. `area`  cells to highlight where progress is possible
//   2. `text`  the technique in plain words
//   3. `move`  the exact placement or eliminations
//
// If the board already contradicts the stored solution, the hint says so
// first (kind: 'mistake') instead of reasoning from a wrong position.

import { ANIMAL, MARK } from './rules.js';
import { createState, findDeduction } from './techniques.js';

export function hintFor(puzzle, board, { animal = 'cat', maxLevel = 3 } = {}) {
  const { n, solution } = puzzle;
  const wrongAnimals = [];
  const wrongMarks = [];
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (board[r][c] === ANIMAL && solution[r] !== c) wrongAnimals.push(r * n + c);
      if (board[r][c] === MARK && solution[r] === c) wrongMarks.push(r * n + c);
    }
  }
  if (wrongAnimals.length) {
    return { kind: 'mistake', cells: wrongAnimals, text: `One of your ${plural(animal)} is in the wrong place.` };
  }
  if (wrongMarks.length) {
    return { kind: 'mistake', cells: wrongMarks, text: `One of your X marks is hiding a ${animal}.` };
  }

  const state = createState(puzzle, board);
  const d = findDeduction(state, maxLevel);
  if (!d || d.contradiction) {
    return { kind: 'stuck', text: 'No simple next step found. Try undoing a few moves.' };
  }
  return {
    kind: 'deduction',
    level: d.level,
    technique: d.technique,
    area: areaFor(state, d),
    text: textFor(d, animal),
    move: { place: d.place ?? null, eliminate: d.eliminate || [] },
  };
}

// Cells worth highlighting for tier 1: the unknown cells of every unit the
// deduction talks about, plus the cells it changes.
function areaFor(state, d) {
  const cells = new Set(d.eliminate || []);
  if (d.place !== undefined && d.place !== null) cells.add(d.place);
  const units = [];
  if (d.unit) units.push(d.unit);
  if (d.line) units.push(d.line);
  if (d.group) {
    const type = d.technique.includes('regions-in') ? 'region' : d.technique.includes('rows') ? 'row' : 'col';
    for (const index of d.group) units.push({ type, index });
  }
  for (const u of units) {
    for (const i of state.units[u.type][u.index]) if (state.cells[i] === 0) cells.add(i);
  }
  return [...cells].sort((a, b) => a - b);
}

export function describeUnit(unit) {
  if (!unit) return 'this area';
  if (unit.type === 'row') return `row ${unit.index + 1}`;
  if (unit.type === 'col') return `column ${unit.index + 1}`;
  return 'this region';
}

function textFor(d, animal) {
  const unit = describeUnit(d.unit);
  switch (d.technique) {
    case 'single':
      return `${capital(unit)} has only one spot left for a ${animal}.`;
    case 'region-in-line':
      return `Every spot left in this region sits in ${describeUnit(d.line)}, so the rest of that ${d.line.type === 'row' ? 'row' : 'column'} can't hold a ${animal}.`;
    case 'line-in-region':
      return `Everything left in ${unit} belongs to one region, so that region's other cells are out.`;
    case 'sees-all':
      return `A ${animal} here would touch or share a line with every spot left for ${unit}, so it can't go here.`;
    case 'lookahead':
      return `A ${animal} here leads to a dead end.`;
    default: {
      const k = d.technique[0];
      const lines = d.technique.includes('rows') ? 'rows' : 'columns';
      if (d.technique.includes('regions-in')) {
        return `These ${k} regions only fit in ${k} ${lines} between them, so no other region can use those ${lines}.`;
      }
      return `These ${k} ${lines} must share ${k} regions, so those regions are out everywhere else.`;
    }
  }
}

function plural(word) {
  if (/(s|x|z|ch|sh)$/.test(word)) return `${word}es`;
  return `${word}s`;
}
function capital(text) {
  return text[0].toUpperCase() + text.slice(1);
}
