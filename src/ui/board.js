// Board rendering and taps. Builds one button per cell when a puzzle is set,
// then updates classes on every render. Knows nothing about game rules.

import { ANIMAL, MARK } from '../core/rules.js';

export function createBoard(el) {
  let n = 0;
  let cells = [];
  let onTap = null;
  let animalMarkup = '';

  el.addEventListener('click', (event) => {
    const cell = event.target.closest('.cell');
    if (!cell || !onTap) return;
    onTap(Number(cell.dataset.r), Number(cell.dataset.c));
  });

  function setPuzzle(puzzle, handler) {
    n = puzzle.n;
    onTap = handler;
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
        cell.setAttribute('aria-label', `row ${r + 1} column ${c + 1}`);
        cell.style.setProperty('--region-color', `var(--region-${regions[r][c]})`);
        if (c < n - 1 && regions[r][c + 1] !== regions[r][c]) cell.classList.add('b-right');
        if (r < n - 1 && regions[r + 1][c] !== regions[r][c]) cell.classList.add('b-bottom');
        el.appendChild(cell);
        cells.push(cell);
      }
    }
  }

  function setAnimal(svg) {
    animalMarkup = svg;
    for (const cell of cells) if (cell.classList.contains('animal')) cell.innerHTML = animalMarkup;
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
        cell.innerHTML = animalMarkup;
        cell.classList.add('placed');
      } else if (value !== ANIMAL && wasAnimal) {
        cell.innerHTML = '';
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
