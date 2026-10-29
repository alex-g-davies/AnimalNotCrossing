// Seeded pseudo-random numbers. The same seed always gives the same sequence,
// which is what makes puzzles reproducible across the worker, Node and the daily seed.

// mulberry32: small, fast, good enough statistical quality for shuffling.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// A small helper object around the raw generator.
export function createRng(seed) {
  const next = mulberry32(seed);
  return {
    seed: seed >>> 0,
    // Float in [0, 1).
    next,
    // Integer in [0, n).
    int(n) {
      return Math.floor(next() * n);
    },
    // Fisher-Yates shuffle, in place, returns the array.
    shuffle(array) {
      for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        const tmp = array[i];
        array[i] = array[j];
        array[j] = tmp;
      }
      return array;
    },
    pick(array) {
      return array[Math.floor(next() * array.length)];
    },
  };
}

// FNV-1a 32-bit hash of a string, for turning "2026-10-29" into a seed.
export function hashString(text) {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

// A fresh unpredictable 32-bit seed for "new puzzle".
export function randomSeed() {
  const c = globalThis.crypto;
  if (c && typeof c.getRandomValues === 'function') {
    return c.getRandomValues(new Uint32Array(1))[0];
  }
  return Math.floor(Math.random() * 4294967296) >>> 0;
}
