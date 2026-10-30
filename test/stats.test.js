import test from 'node:test';
import assert from 'node:assert/strict';
import { OVERALL, comboKeys, recordAbandon, recordResult, streaks } from '../src/core/stats.js';

const p8 = { n: 8, difficulty: 'medium' };
const p6 = { n: 6, difficulty: 'easy' };

test('wins grow both streaks, a loss resets them and keeps the best', () => {
  let s = {};
  s = recordResult(s, p8, true, 60000);
  s = recordResult(s, p8, true, 50000);
  s = recordResult(s, p6, true, 20000);
  assert.equal(s[OVERALL].streak, 3);
  assert.equal(s['8-medium'].streak, 2);
  assert.equal(s['6-easy'].streak, 1);
  assert.equal(s['8-medium'].best, 50000);
  assert.deepEqual(s['8-medium'].times, [60000, 50000]);
  s = recordResult(s, p8, false, 90000);
  assert.equal(s[OVERALL].streak, 0);
  assert.equal(s[OVERALL].bestStreak, 3);
  assert.equal(s['8-medium'].streak, 0);
  assert.equal(s['8-medium'].bestStreak, 2);
  assert.equal(s['8-medium'].lost, 1);
  assert.equal(s['8-medium'].solved, 2);
  assert.equal(s['6-easy'].streak, 1, 'other combinations keep their own streak');
  assert.deepEqual(streaks(s), { streak: 0, bestStreak: 3 });
});

test('abandoning ends streaks without counting a loss', () => {
  let s = recordResult({}, p8, true, 1000);
  s = recordAbandon(s, p8);
  assert.equal(s[OVERALL].streak, 0);
  assert.equal(s['8-medium'].streak, 0);
  assert.equal(s['8-medium'].lost, 0);
  assert.equal(s['8-medium'].bestStreak, 1);
});

test('old entries without streak fields and reserved keys are handled', () => {
  const old = { '8-medium': { solved: 4, lost: 1, times: [1, 2], best: 1 }, daily: { current: 2, best: 2, last: 'x' } };
  const s = recordResult(old, p8, true, 3);
  assert.equal(s['8-medium'].streak, 1);
  assert.equal(s['8-medium'].solved, 5);
  assert.deepEqual(s.daily, old.daily);
  assert.deepEqual(comboKeys({ ...s, '10-hard': {}, '6-easy': {} }), ['6-easy', '8-medium', '10-hard']);
});

test('inputs are never mutated', () => {
  const before = { '8-medium': { solved: 1, lost: 0, times: [5], best: 5, streak: 1, bestStreak: 1 } };
  const copy = JSON.parse(JSON.stringify(before));
  recordResult(before, p8, true, 7);
  recordAbandon(before, p8);
  assert.deepEqual(before, copy);
});
