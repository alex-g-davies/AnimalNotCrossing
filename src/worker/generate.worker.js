// Runs the generator off the main thread so the board never freezes.
// Message in:  { id, n, seed, difficulty }
// Message out: { id, puzzle } or { id, error }

import { generatePuzzle } from '../core/generator.js';

self.onmessage = (event) => {
  const { id, n, seed, difficulty } = event.data;
  try {
    const t0 = performance.now();
    const puzzle = generatePuzzle({ n, seed, difficulty });
    puzzle.generatedMs = Math.round(performance.now() - t0);
    self.postMessage({ id, puzzle });
  } catch (error) {
    self.postMessage({ id, error: String(error && error.message ? error.message : error) });
  }
};
