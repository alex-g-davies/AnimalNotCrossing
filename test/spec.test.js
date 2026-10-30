import test from 'node:test';
import assert from 'node:assert/strict';
import { RANDOM, SIZES, resolveChoice, resolveSpec, specMatches } from '../src/core/spec.js';
import { createRng } from '../src/core/rng.js';
import { DIFFICULTY_NAMES } from '../src/core/difficulty.js';

test('fixed settings resolve to themselves', () => {
  assert.deepEqual(resolveSpec({ n: 8, difficulty: 'medium' }), { n: 8, difficulty: 'medium' });
  assert.deepEqual(resolveSpec({ n: '10', difficulty: 'hard' }), { n: 10, difficulty: 'hard' });
});

test('random settings pick from the whole pool, deterministically for a seeded rng', () => {
  const rng = createRng(7);
  const random = () => rng.next();
  const seenN = new Set();
  const seenD = new Set();
  for (let i = 0; i < 400; i++) {
    const spec = resolveSpec({ n: RANDOM, difficulty: RANDOM }, random);
    assert.ok(SIZES.includes(spec.n));
    assert.ok(DIFFICULTY_NAMES.includes(spec.difficulty));
    seenN.add(spec.n);
    seenD.add(spec.difficulty);
  }
  assert.equal(seenN.size, SIZES.length);
  assert.equal(seenD.size, DIFFICULTY_NAMES.length);
  const a = createRng(3);
  const b = createRng(3);
  assert.deepEqual(resolveSpec({ n: RANDOM, difficulty: RANDOM }, () => a.next()), resolveSpec({ n: RANDOM, difficulty: RANDOM }, () => b.next()));
});

test('a prepared puzzle matches when each setting is equal or random', () => {
  const p = { n: 9, difficulty: 'easy' };
  assert.ok(specMatches({ n: 9, difficulty: 'easy' }, p));
  assert.ok(specMatches({ n: RANDOM, difficulty: 'easy' }, p));
  assert.ok(specMatches({ n: RANDOM, difficulty: RANDOM }, p));
  assert.ok(!specMatches({ n: 8, difficulty: RANDOM }, p));
  assert.ok(!specMatches({ n: RANDOM, difficulty: 'hard' }, p));
});

test('look choices resolve random against the given ids', () => {
  assert.equal(resolveChoice('cat', ['cat', 'dog']), 'cat');
  assert.ok(['cat', 'dog'].includes(resolveChoice(RANDOM, ['cat', 'dog'])));
  assert.equal(resolveChoice(RANDOM, ['cat', 'dog'], () => 0.99), 'dog');
});
