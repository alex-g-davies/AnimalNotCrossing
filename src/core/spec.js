// Puzzle spec resolution: turns the saved settings (which may say "random"
// for size, difficulty, animal or palette) into one concrete choice.

import { MAX_DOUBLE_SIZE, MAX_SIZE, MIN_DOUBLE_SIZE, MIN_SIZE } from './generator.js';
import { DIFFICULTY_NAMES } from './difficulty.js';

export const RANDOM = 'random';

export const SIZES = Array.from({ length: MAX_SIZE - MIN_SIZE + 1 }, (_, i) => MIN_SIZE + i);
// Double Up (two animals per row, column and region) needs room: 8x8 to 11x11.
export const DOUBLE_SIZES = SIZES.filter((n) => n >= MIN_DOUBLE_SIZE && n <= MAX_DOUBLE_SIZE);

export const MODES = { single: 'One per line', double: 'Double Up: two per line' };

export function pick(list, random = Math.random) {
  return list[Math.min(list.length - 1, Math.floor(random() * list.length))];
}

// Animals per line for a mode setting.
export function kFor(mode) {
  return mode === 'double' ? 2 : 1;
}

export function sizesFor(mode) {
  return kFor(mode) === 2 ? DOUBLE_SIZES : SIZES;
}

// Concrete { n, difficulty, k } for the next puzzle. A size too small for
// Double Up is raised to the smallest that fits.
export function resolveSpec(settings, random = Math.random) {
  const k = kFor(settings.mode);
  const sizes = sizesFor(settings.mode);
  const n = settings.n === RANDOM ? pick(sizes, random) : Math.min(sizes[sizes.length - 1], Math.max(sizes[0], Number(settings.n)));
  const difficulty = settings.difficulty === RANDOM ? pick(DIFFICULTY_NAMES, random) : settings.difficulty;
  return { n, difficulty, k };
}

// Would a puzzle (or pending generation) with this size, difficulty and mode
// satisfy the current settings? Random accepts anything in its pool.
export function specMatches(settings, spec) {
  const k = kFor(settings.mode);
  if ((spec.k === 2 ? 2 : 1) !== k) return false;
  const sizes = sizesFor(settings.mode);
  const sizeOk = settings.n === RANDOM ? sizes.includes(spec.n) : Math.min(sizes[sizes.length - 1], Math.max(sizes[0], Number(settings.n))) === spec.n;
  const diffOk = settings.difficulty === RANDOM ? DIFFICULTY_NAMES.includes(spec.difficulty) : settings.difficulty === spec.difficulty;
  return sizeOk && diffOk;
}

// Resolve one look setting ('random' or a concrete id) against a list of ids.
export function resolveChoice(value, ids, random = Math.random) {
  return value === RANDOM ? pick(ids, random) : value;
}
