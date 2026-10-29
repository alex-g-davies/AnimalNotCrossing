import test from 'node:test';
import assert from 'node:assert/strict';
import { createRng, hashString, mulberry32 } from '../src/core/rng.js';

test('same seed gives the same sequence', () => {
  const a = mulberry32(12345);
  const b = mulberry32(12345);
  for (let i = 0; i < 100; i++) assert.equal(a(), b());
});

test('values stay in [0, 1) and int(n) stays in range', () => {
  const rng = createRng(7);
  for (let i = 0; i < 10000; i++) {
    const v = rng.next();
    assert.ok(v >= 0 && v < 1);
    const k = rng.int(9);
    assert.ok(Number.isInteger(k) && k >= 0 && k < 9);
  }
});

test('shuffle is a permutation and depends on the seed', () => {
  const base = Array.from({ length: 20 }, (_, i) => i);
  const x = createRng(1).shuffle(base.slice());
  const y = createRng(1).shuffle(base.slice());
  const z = createRng(2).shuffle(base.slice());
  assert.deepEqual(x, y);
  assert.notDeepEqual(x, z);
  assert.deepEqual(x.slice().sort((a, b) => a - b), base);
});

test('hashString is stable and differs for nearby dates', () => {
  assert.equal(hashString('2026-10-29'), hashString('2026-10-29'));
  assert.notEqual(hashString('2026-10-29'), hashString('2026-10-30'));
});
