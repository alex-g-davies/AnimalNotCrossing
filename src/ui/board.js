// Board rendering and input. Builds one button per cell when a puzzle is
// set, then updates classes on every render. Knows nothing about game rules.
//
// Input: a tap fires `onTap`; pressing and holding for HOLD_MS fires
// `onHold` (with a filling ring as feedback). Dragging into other cells
// starts a paint stroke: `onDragStart(r, c)` (return false to refuse), then
// `onDragEnter(r, c)` for every new cell, then `onDragEnd()`.

import { ANIMAL, MARK } from '../core/rules.js';

export const HOLD_MS = 380;
const MOVE_TOLERANCE = 10;

export function createBoard(el) {
  let n = 0;
  let cells = [];
  let handlers = { onTap: null, onHold: null, onDragStart: null, onDragEnter: null, onDragEnd: null };
  let animalMarkup = '';

  // One press at a time.
  let press = null; // { cell, r, c, x, y, timer, fired, dragging, visited }

  function cellAtPoint(x, y) {
    const target = document.elementFromPoint(x, y);
    const cell = target && target.closest ? target.closest('.cell') : null;
    return cell && el.contains(cell) ? cell : null;
  }

  function cellFrom(event) {
    const cell = event.target.closest('.cell');
    return cell && el.contains(cell) ? cell : null;
  }

  function endPress(cancelled) {
    if (!press) return;
    clearTimeout(press.timer);
    press.cell.classList.remove('pressing');
    const { r, c, fired, dragging } = press;
    press = null;
    if (dragging) {
      if (handlers.onDragEnd) handlers.onDragEnd();
      return;
    }
    if (!cancelled && !fired && handlers.onTap) handlers.onTap(r, c);
  }

  el.addEventListener('pointerdown', (event) => {
    if (!event.isPrimary || event.button !== 0) return;
    const cell = cellFrom(event);
    if (!cell) return;
    event.preventDefault();
    endPress(true);
    const r = Number(cell.dataset.r);
    const c = Number(cell.dataset.c);
    press = { cell, r, c, x: event.clientX, y: event.clientY, fired: false, timer: 0, dragging: false, visited: new Set([r * n + c]) };
    try {
      el.setPointerCapture(event.pointerId);
    } catch {
      // not available: dragging still works while the pointer stays over the board
    }
    cell.classList.add('pressing');
    press.timer = setTimeout(() => {
      if (!press || press.cell !== cell) return;
      press.fired = true;
      cell.classList.remove('pressing');
      if (handlers.onHold) handlers.onHold(r, c);
    }, HOLD_MS);
  });
  el.addEventListener('pointermove', (event) => {
    if (!press || press.fired) return;
    const over = cellAtPoint(event.clientX, event.clientY);
    const moved = Math.hypot(event.clientX - press.x, event.clientY - press.y) > MOVE_TOLERANCE;
    if (!press.dragging) {
      if (!moved) return;
      clearTimeout(press.timer);
      press.cell.classList.remove('pressing');
      if (!over || over === press.cell) {
        // Wandered without reaching another cell: wait and see.
        if (!over) endPress(true);
        return;
      }
      if (!handlers.onDragStart || !handlers.onDragStart(press.r, press.c)) {
        endPress(true);
        return;
      }
      press.dragging = true;
    }
    if (!over) return;
    const r = Number(over.dataset.r);
    const c = Number(over.dataset.c);
    const key = r * n + c;
    if (press.visited.has(key)) return;
    press.visited.add(key);
    if (handlers.onDragEnter) handlers.onDragEnter(r, c);
  });
  el.addEventListener('pointerup', () => endPress(false));
  el.addEventListener('pointercancel', () => endPress(true));
  el.addEventListener('contextmenu', (event) => event.preventDefault());
  // Keyboard: Enter taps, Space holds.
  el.addEventListener('keydown', (event) => {
    const cell = cellFrom(event);
    if (!cell) return;
    if (event.key === 'Enter' && handlers.onTap) handlers.onTap(Number(cell.dataset.r), Number(cell.dataset.c));
    if (event.key === ' ' && handlers.onHold) {
      event.preventDefault();
      handlers.onHold(Number(cell.dataset.r), Number(cell.dataset.c));
    }
  });

  function setPuzzle(puzzle, newHandlers) {
    n = puzzle.n;
    handlers = { ...handlers, ...newHandlers };
    el.style.setProperty('--n', n);
    el.dataset.n = n;
    el.innerHTML = '';
    cells = [];
    const { regions } = puzzle;
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        const cell = document.createElement('button');
        cell.type = 'button';
        cell.className = 'cell';
        cell.dataset.r = r;
        cell.dataset.c = c;
        cell.setAttribute('role', 'gridcell');
        cell.style.setProperty('--region-color', `var(--region-${regions[r][c]})`);
        if (c < n - 1 && regions[r][c + 1] !== regions[r][c]) cell.classList.add('b-right');
        if (r < n - 1 && regions[r + 1][c] !== regions[r][c]) cell.classList.add('b-bottom');
        cell.innerHTML = '<span class="icon"></span>';
        el.appendChild(cell);
        cells.push(cell);
      }
    }
  }

  function setAnimal(svg) {
    animalMarkup = svg;
    for (const cell of cells) if (cell.classList.contains('animal')) cell.querySelector('.icon').innerHTML = animalMarkup;
  }

  // view: { board, conflicts: Set, wrong: number[], hint: { area, move } | null }
  function render(view) {
    const wrong = new Set(view.wrong || []);
    const hintArea = new Set(view.hint ? view.hint.area : []);
    const hintMove = new Set();
    if (view.hint && view.hint.move) {
      if (view.hint.move.place !== null && view.hint.move.place !== undefined) hintMove.add(view.hint.move.place);
      for (const i of view.hint.move.eliminate || []) hintMove.add(i);
    }
    for (let i = 0; i < cells.length; i++) {
      const cell = cells[i];
      const r = Math.floor(i / n);
      const c = i % n;
      const value = view.board[r][c];
      const wasAnimal = cell.classList.contains('animal');
      cell.classList.toggle('mark', value === MARK);
      cell.classList.toggle('animal', value === ANIMAL);
      if (value === ANIMAL && !wasAnimal) {
        cell.querySelector('.icon').innerHTML = animalMarkup;
        cell.classList.add('placed');
      } else if (value !== ANIMAL && wasAnimal) {
        cell.querySelector('.icon').innerHTML = '';
        cell.classList.remove('placed');
      }
      cell.classList.toggle('conflict', view.conflicts ? view.conflicts.has(i) : false);
      cell.classList.toggle('wrong', wrong.has(i));
      cell.classList.toggle('hint', hintArea.has(i) && !hintMove.has(i));
      cell.classList.toggle('hint-move', hintMove.has(i));
      const label = value === ANIMAL ? 'animal' : value === MARK ? 'crossed out' : 'empty';
      cell.setAttribute('aria-label', `row ${r + 1} column ${c + 1}, ${label}`);
    }
  }

  function shake(r, c) {
    const cell = cells[r * n + c];
    if (!cell) return;
    cell.classList.remove('shake');
    void cell.offsetWidth; // restart the animation
    cell.classList.add('shake');
  }

  return { setPuzzle, setAnimal, render, shake };
}
