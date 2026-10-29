// Game state for one puzzle, as pure functions. No DOM, no timers.
//
// Every function returns a new state object and never mutates its input, so
// the UI can save the state after each move and undo is just history.
//
// Mistakes: placing an animal on a cell that is not in the stored solution.
// X marks never count. Undo removes the piece but does not refund the
// mistake. Reaching the limit ends the game as a loss, unless `relaxed`.

import { ANIMAL, EMPTY, MARK, emptyBoard, findConflicts, isSolved } from './rules.js';

export const MISTAKE_LIMITS = { easy: 5, medium: 4, hard: 3 };

export const DEFAULT_SETTINGS = {
  tapMode: 'mark-first', // or 'animal-first'
  autoMark: false, // placing an animal X-es out every cell it rules out
  relaxed: false, // no mistake limit
};

export function newGame(puzzle, settings = {}) {
  const merged = { ...DEFAULT_SETTINGS, ...settings };
  return {
    puzzle,
    board: emptyBoard(puzzle.n),
    history: [],
    mistakes: 0,
    mistakeLimit: merged.relaxed ? Infinity : MISTAKE_LIMITS[puzzle.difficulty] ?? MISTAKE_LIMITS.medium,
    status: 'playing', // 'playing' | 'won' | 'lost'
    elapsedMs: 0,
    hintsUsed: 0,
    settings: merged,
  };
}

function nextValue(current, tapMode) {
  const cycle = tapMode === 'animal-first' ? [EMPTY, ANIMAL, MARK] : [EMPTY, MARK, ANIMAL];
  return cycle[(cycle.indexOf(current) + 1) % cycle.length];
}

export function setCell(state, r, c, value) {
  if (state.status !== 'playing') return state;
  const { n, solution, regions } = state.puzzle;
  const before = state.board[r][c];
  if (before === value) return state;
  const board = state.board.map((row) => row.slice());
  board[r][c] = value;

  const entry = { r, c, before, after: value, autoMarked: [] };
  let mistakes = state.mistakes;
  if (value === ANIMAL) {
    if (solution[r] !== c) {
      mistakes++;
      entry.mistake = true;
    } else if (state.settings.autoMark) {
      for (let rr = 0; rr < n; rr++) {
        for (let cc = 0; cc < n; cc++) {
          if (board[rr][cc] !== EMPTY) continue;
          const touching = Math.abs(rr - r) <= 1 && Math.abs(cc - c) <= 1;
          if (rr === r || cc === c || regions[rr][cc] === regions[r][c] || touching) {
            board[rr][cc] = MARK;
            entry.autoMarked.push(rr * n + cc);
          }
        }
      }
    }
  }

  let status = state.status;
  if (isSolved(board, state.puzzle)) status = 'won';
  else if (mistakes >= state.mistakeLimit) status = 'lost';

  return { ...state, board, history: [...state.history, entry], mistakes, status };
}

export function tap(state, r, c) {
  return setCell(state, r, c, nextValue(state.board[r][c], state.settings.tapMode));
}

export function undo(state) {
  if (state.status !== 'playing' || state.history.length === 0) return state;
  const entry = state.history[state.history.length - 1];
  const board = state.board.map((row) => row.slice());
  board[entry.r][entry.c] = entry.before;
  const n = state.puzzle.n;
  for (const i of entry.autoMarked) board[Math.floor(i / n)][i % n] = EMPTY;
  return { ...state, board, history: state.history.slice(0, -1) };
}

export function setElapsed(state, elapsedMs) {
  return { ...state, elapsedMs };
}

export function countHint(state) {
  return { ...state, hintsUsed: state.hintsUsed + 1 };
}

// Rule-visible conflicts, for red outlines. Set of cell indices.
export function conflicts(state) {
  return findConflicts(state.board, state.puzzle);
}

// Animals currently on the board that are off the solution, for the mistake tint.
export function wrongAnimals(state) {
  const { n, solution } = state.puzzle;
  const out = [];
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) if (state.board[r][c] === ANIMAL && solution[r] !== c) out.push(r * n + c);
  }
  return out;
}

// After a loss: show the answer. Keeps status 'lost'.
export function reveal(state) {
  const { n, solution } = state.puzzle;
  const board = emptyBoard(n);
  for (let r = 0; r < n; r++) board[r][solution[r]] = ANIMAL;
  return { ...state, board };
}

export function mistakesLeft(state) {
  return state.mistakeLimit === Infinity ? Infinity : Math.max(0, state.mistakeLimit - state.mistakes);
}
