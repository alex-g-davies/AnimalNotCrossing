import test from 'node:test';
import assert from 'node:assert/strict';
import { formatLong, sparkline, statsPageHtml } from '../src/ui/statspage.js';
import { recordResult } from '../src/core/stats.js';

const formatTime = (ms) => `${Math.floor(ms / 60000)}:${String(Math.floor(ms / 1000) % 60).padStart(2, '0')}`;
const opts = { today: '2026-11-02', formatTime };

test('an empty record says so', () => {
  assert.match(statsPageHtml({}, opts), /No puzzles finished yet/);
});

test('the page lists totals, streaks, climbs and every combination with a sparkline', () => {
  let s = {};
  for (const ms of [90000, 80000, 70000, 60000, 50000, 40000]) s = recordResult(s, { n: 8, difficulty: 'medium' }, true, ms);
  s = recordResult(s, { n: 6, difficulty: 'easy' }, false, 20000);
  s = { ...s, climb: { runs: 2, bestStage: 5, bestStageMs: 400000 }, climbs: { '9-steep-tight': { runs: 1, bestStage: 3, bestStageMs: 100000 } }, daily: { current: 2, best: 4, last: '2026-11-02' } };
  const html = statsPageHtml(s, opts);
  assert.match(html, /7 games/);
  assert.match(html, /6 won · 1 lost · win rate 86%/);
  assert.match(html, /6 min/);
  assert.match(html, /Win streak: 0/);
  assert.match(html, /Daily streak: 2 days/);
  assert.match(html, /solved today/);
  assert.match(html, /Stage 5.*Standard ladder/);
  assert.match(html, /Stage 3.*Up to 9 × 9, steep ramp, tight clock/);
  assert.match(html, /8 × 8 · Medium/);
  assert.match(html, /6 × 6 · Easy/);
  assert.match(html, /Recent wins 38% quicker/); // medians 80 s vs 50 s
  assert.match(html, /<svg class="spark"/);
  assert.doesNotMatch(html, /undefined|NaN/);
});

test('the sparkline needs two points and marks the quickest', () => {
  assert.equal(sparkline([5]), '');
  const svg = sparkline([30, 20, 40]);
  assert.match(svg, /polyline/);
  assert.match(svg, /circle/);
});

test('long durations read as hours and minutes', () => {
  assert.equal(formatLong(48000), '48 s');
  assert.equal(formatLong(14 * 60000), '14 min');
  assert.equal(formatLong(2 * 3600000 + 14 * 60000), '2 h 14 min');
});
