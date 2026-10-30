// Puzzle spec resolution: turns the saved settings (which may say "random"
// for size, difficulty, animal or palette) into one concrete choice.

import { MAX_SIZE, MIN_SIZE } from './generator.js';
import { DIFFICULTY_NAMES } from './difficulty.js';

export const RANDOM = 'random';

export const SIZES = Array.from({ length: MAX_SIZE - MIN_SIZE + 1 }, (_, i) => MIN_SIZE + i);

export function pick(list, random = Math.random) {
  return list[Math.min(list.length - 1, Math.floor(random() * list.length))];
}

// Concrete { n, difficulty } for the next puzzle.
export function resolveSpec(settings, random = Math.random) {
  const n = settings.n === RANDOM ? pick(SIZES, random) : Number(settings.n);
  const difficulty = settings.difficulty === RANDOM ? pick(DIFFICULTY_NAMES, random) : settings.difficulty;
  return { n, difficulty };
}

// Would a puzzle (or pending generation) with this size and difficulty
// satisfy the current settings? Random accepts anything in its pool.
export function specMatches(settings, spec) {
  const sizeOk = settings.n === RANDOM ? SIZES.includes(spec.n) : Number(settings.n) === spec.n;
  const diffOk = settings.difficulty === RANDOM ? DIFFICULTY_NAMES.includes(spec.difficulty) : settings.difficulty === spec.difficulty;
  return sizeOk && diffOk;
}

// Resolve one look setting ('random' or a concrete id) against a list of ids.
export function resolveChoice(value, ids, random = Math.random) {
  return value === RANDOM ? pick(ids, random) : value;
}
