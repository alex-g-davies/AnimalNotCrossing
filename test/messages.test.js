import test from 'node:test';
import assert from 'node:assert/strict';
import { createRng } from '../src/core/rng.js';
import { LOSS_MESSAGES, WIN_MESSAGES, fillAnimal, nextMessage } from '../src/messages.js';

test('a cycle shows every message once before any repeat', () => {
  const rng = createRng(3).next;
  let cycle = null;
  const seen = new Set();
  for (let i = 0; i < WIN_MESSAGES.length; i++) {
    const r = nextMessage(WIN_MESSAGES, cycle, rng);
    cycle = r.cycle;
    seen.add(r.message);
  }
  assert.equal(seen.size, WIN_MESSAGES.length);
  // Next call starts a fresh shuffle instead of failing.
  assert.ok(WIN_MESSAGES.includes(nextMessage(WIN_MESSAGES, cycle, rng).message));
});

test('a stale cycle from a different list length is replaced', () => {
  const r = nextMessage(LOSS_MESSAGES, { order: [0, 1], pos: 1 }, createRng(1).next);
  assert.equal(r.cycle.order.length, LOSS_MESSAGES.length);
  assert.equal(r.cycle.pos, 1);
});

test('animal placeholders are filled', () => {
  assert.equal(fillAnimal('A {animal} and two {animals}.', 'fox', 'foxes'), 'A fox and two foxes.');
});
