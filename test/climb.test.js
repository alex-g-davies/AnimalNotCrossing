import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CLOCKS, DEFAULT_OPTIONS, LADDER, MIN_LIMIT_MS, RAMPS, SHRINK, buildLadder, clearStage, newRun, normalizeOptions, optionsKey, recordRun, stageSpec,
} from '../src/core/climb.js';
import { DIFFICULTY_NAMES } from '../src/core/difficulty.js';
import { MAX_SIZE, MIN_SIZE } from '../src/core/generator.js';

test('the ladder never gets easier and stays within the supported sizes', () => {
  let last = { n: 0, difficulty: 'easy' };
  for (const step of LADDER) {
    assert.ok(step.n >= MIN_SIZE && step.n <= MAX_SIZE);
    assert.ok(step.n >= last.n);
    assert.ok(DIFFICULTY_NAMES.indexOf(step.difficulty) >= DIFFICULTY_NAMES.indexOf(last.difficulty) || step.n > last.n);
    last = step;
  }
  assert.deepEqual(stageSpec(1), { stage: 1, n: 6, difficulty: 'easy', timeLimitMs: 180000 });
});

test('time limits grow with the board, then shrink past the ladder down to a floor', () => {
  for (let s = 2; s <= LADDER.length; s++) assert.ok(stageSpec(s).timeLimitMs >= stageSpec(s - 1).timeLimitMs, `stage ${s}`);
  const top = stageSpec(LADDER.length);
  const next = stageSpec(LADDER.length + 1);
  assert.equal(next.n, top.n);
  assert.equal(next.difficulty, top.difficulty);
  assert.equal(next.timeLimitMs, Math.round(top.timeLimitMs * SHRINK));
  assert.equal(stageSpec(100).timeLimitMs, MIN_LIMIT_MS);
});

test('every ramp never gets easier and stays within the supported sizes', () => {
  for (const ramp of Object.keys(RAMPS)) {
    let last = { n: 0, difficulty: 'easy' };
    for (const step of buildLadder({ ramp })) {
      assert.ok(step.n >= MIN_SIZE && step.n <= MAX_SIZE);
      assert.ok(step.n >= last.n, ramp);
      assert.ok(DIFFICULTY_NAMES.indexOf(step.difficulty) >= DIFFICULTY_NAMES.indexOf(last.difficulty) || step.n > last.n, ramp);
      last = step;
    }
  }
});

test('custom ladders cap the board, change the ramp and the clock, and keep their own key', () => {
  assert.deepEqual(buildLadder({ maxSize: 9, ramp: 'steep' }), [
    { n: 6, difficulty: 'medium' }, { n: 7, difficulty: 'medium' }, { n: 8, difficulty: 'hard' }, { n: 9, difficulty: 'hard' },
  ]);
  const options = { maxSize: 9, ramp: 'steep', clock: 'tight' };
  assert.deepEqual(stageSpec(4, options), { stage: 4, n: 9, difficulty: 'hard', timeLimitMs: 81 * CLOCKS.tight.perCellMs });
  const past = stageSpec(5, options);
  assert.equal(past.n, 9);
  assert.equal(past.timeLimitMs, Math.round(81 * CLOCKS.tight.perCellMs * CLOCKS.tight.shrink));
  assert.ok(stageSpec(2, { clock: 'generous' }).timeLimitMs > stageSpec(2).timeLimitMs);
  assert.equal(optionsKey(DEFAULT_OPTIONS), 'default');
  assert.equal(optionsKey({ maxSize: '12', ramp: 'normal', clock: 'normal' }), 'default');
  assert.equal(optionsKey(options), '9-steep-tight');
  assert.deepEqual(normalizeOptions({ maxSize: 4, ramp: 'silly', clock: null }), DEFAULT_OPTIONS);
  assert.deepEqual(newRun(options).options, options);
});

test('runs advance and are recorded by best stage, then by time', () => {
  let run = newRun();
  run = clearStage(run, 30000);
  run = clearStage(run, 45000);
  assert.deepEqual(run, { stage: 3, totalMs: 75000, options: DEFAULT_OPTIONS });
  let stats = recordRun(null, run);
  assert.deepEqual(stats, { runs: 1, bestStage: 3, bestStageMs: 75000 });
  stats = recordRun(stats, { stage: 2, totalMs: 10000 });
  assert.equal(stats.bestStage, 3);
  assert.equal(stats.runs, 2);
  stats = recordRun(stats, { stage: 3, totalMs: 60000 });
  assert.equal(stats.bestStageMs, 60000);
  stats = recordRun(stats, { stage: 4, totalMs: 200000 });
  assert.deepEqual(stats, { runs: 4, bestStage: 4, bestStageMs: 200000 });
});
