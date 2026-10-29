import test from 'node:test';
import assert from 'node:assert/strict';
import { dailySpec, dateKey, liveStreak, recordDailySolve } from '../src/core/daily.js';
import { generatePuzzle, puzzleKey } from '../src/core/generator.js';

test('the daily seed depends only on the local date', () => {
  const a = dailySpec(new Date(2026, 9, 29, 8));
  const b = dailySpec(new Date(2026, 9, 29, 23));
  const c = dailySpec(new Date(2026, 9, 30, 1));
  assert.equal(a.key, '2026-10-29');
  assert.equal(a.seed, b.seed);
  assert.notEqual(a.seed, c.seed);
  const p1 = generatePuzzle({ n: a.n, seed: a.seed, difficulty: a.difficulty });
  const p2 = generatePuzzle({ n: b.n, seed: b.seed, difficulty: b.difficulty });
  assert.equal(puzzleKey(p1), puzzleKey(p2));
});

test('streaks grow on consecutive days, reset after a gap, and never double count', () => {
  let s = recordDailySolve(null, '2026-10-29');
  assert.deepEqual(s, { current: 1, best: 1, last: '2026-10-29' });
  s = recordDailySolve(s, '2026-10-29');
  assert.equal(s.current, 1);
  s = recordDailySolve(s, '2026-10-30');
  s = recordDailySolve(s, '2026-10-31');
  assert.equal(s.current, 3);
  assert.equal(liveStreak(s, '2026-11-01'), 3);
  assert.equal(liveStreak(s, '2026-11-02'), 0);
  s = recordDailySolve(s, '2026-11-03');
  assert.equal(s.current, 1);
  assert.equal(s.best, 3);
});

test('dateKey pads month and day', () => {
  assert.equal(dateKey(new Date(2027, 0, 5)), '2027-01-05');
});
