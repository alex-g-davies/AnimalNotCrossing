import test from 'node:test';
import assert from 'node:assert/strict';
import { CRYSTAL_EXTRA, MILESTONES, TIERS, awardClimb, awardMilestones, backfill, ladderLength, tierThresholds, trophyCount } from '../src/core/trophies.js';
import { buildLadder, clearStage, newRun, optionsFromKey, optionsKey } from '../src/core/climb.js';
import { comboKeys, recordResult } from '../src/core/stats.js';
import { formatDate, portraitSrc, trophyLine, trophyPageHtml } from '../src/ui/trophies.js';

const look = { animal: 'otter', style: 'normal', palette: 'ocean' };
const formatTime = (ms) => `${Math.round(ms / 1000)}s`;
const CUSTOM = { maxSize: 8, ramp: 'steep', clock: 'tight' };

// Clear `count` stages of one run, each taking `ms`, collecting awards.
function climbTo(stats, options, count, ms = 60000, who = look) {
  let run = newRun(options);
  const earned = [];
  for (let i = 0; i < count; i++) {
    run = clearStage(run, ms);
    const r = awardClimb(stats, optionsKey(run.options), run, who, '2026-11-13');
    stats = r.stats;
    earned.push(...r.earned);
  }
  return { stats, earned };
}

test('tier thresholds for every ladder shape', () => {
  assert.deepEqual(tierThresholds(9), { bronze: 3, silver: 6, gold: 9, crystal: 12 });
  for (let L = 3; L <= 9; L++) {
    const t = tierThresholds(L);
    assert.ok(t.bronze >= 1 && t.bronze < t.silver && t.silver < t.gold && t.gold < t.crystal, `L=${L}`);
    assert.equal(t.gold, L);
    assert.equal(t.crystal, L + CRYSTAL_EXTRA);
  }
  assert.equal(ladderLength('default'), buildLadder(optionsFromKey('default')).length);
  assert.equal(ladderLength('8-steep-tight'), 3);
  assert.equal(optionsKey(optionsFromKey('10-gentle-generous')), '10-gentle-generous', 'keys round-trip');
});

test('each tier is awarded on the clear that reaches it, with the character and time', () => {
  const { stats, earned } = climbTo({}, undefined, 12);
  assert.deepEqual(earned.map((e) => [e.tier, e.stages, e.totalMs]), [['bronze', 3, 180000], ['silver', 6, 360000], ['gold', 9, 540000], ['crystal', 12, 720000]]);
  const slots = stats.trophies.climb.default;
  assert.deepEqual(Object.keys(slots), TIERS);
  assert.deepEqual(slots.silver, { stages: 6, totalMs: 360000, date: '2026-11-13', animal: 'otter', style: 'normal', palette: 'ocean' });
  assert.equal(trophyCount(stats), 4);
});

test('a slot is replaced only by a quicker run, and ladders keep separate slots', () => {
  const { stats } = climbTo({}, undefined, 3, 60000);
  const slower = climbTo(stats, undefined, 3, 90000, { ...look, animal: 'cat' });
  assert.equal(slower.earned.length, 0);
  assert.equal(slower.stats.trophies.climb.default.bronze.animal, 'otter');
  const quicker = climbTo(stats, undefined, 3, 30000, { ...look, animal: 'cat' });
  assert.deepEqual(quicker.earned.map((e) => [e.tier, e.improved]), [['bronze', true]]);
  assert.equal(quicker.stats.trophies.climb.default.bronze.animal, 'cat');
  const both = climbTo(quicker.stats, CUSTOM, 1).stats;
  assert.equal(both.trophies.climb['8-steep-tight'].bronze.stages, 1);
  assert.equal(both.trophies.climb.default.bronze.totalMs, 90000);
});

test('milestones fire once, with the character of the game that earned them', () => {
  const stats = recordResult({}, { n: 8, difficulty: 'easy', k: 2 }, true, 1000);
  const first = awardMilestones(stats, look, '2026-11-13');
  assert.deepEqual(first.earned.map((e) => e.id), ['double-first']);
  assert.equal(first.stats.trophies.milestones['double-first'].animal, 'otter');
  const again = awardMilestones(first.stats, { ...look, animal: 'cat' }, '2026-11-14');
  assert.equal(again.earned.length, 0);
  assert.equal(again.stats, first.stats, 'unchanged object when nothing new');
  let s = first.stats;
  for (let i = 0; i < 4; i++) s = recordResult(s, { n: 6, difficulty: 'easy' }, true, 1000);
  assert.deepEqual(awardMilestones(s, look, '2026-11-15').earned.map((e) => e.id), ['streak-5']);
  assert.equal(MILESTONES.length, new Set(MILESTONES.map((m) => m.id)).size);
});

test('back-fill awards what old stats reached, without characters, and is idempotent', () => {
  const old = {
    '8-medium': { solved: 30, lost: 2, times: [], best: 1000 },
    overall: { streak: 3, bestStreak: 11, games: 120, playMs: 0 },
    daily: { current: 2, best: 8, last: '2026-11-01' },
    climb: { runs: 5, bestStage: 7, bestStageMs: 400000 }, // ended on stage 7: 6 cleared
    climbs: { '8-steep-tight': { runs: 1, bestStage: 2, bestStageMs: 50000 } },
  };
  const filled = backfill(old);
  const d = filled.trophies.climb.default;
  assert.deepEqual(Object.keys(d).sort(), ['bronze', 'silver']);
  assert.deepEqual(d.silver, { legacy: true, stages: 6, totalMs: 400000 });
  assert.equal(d.bronze.totalMs, null, 'no time known for the bronze point');
  assert.deepEqual(Object.keys(filled.trophies.climb['8-steep-tight']), ['bronze']);
  assert.deepEqual(Object.keys(filled.trophies.milestones).sort(), ['daily-7', 'games-100', 'streak-10', 'streak-5']);
  assert.ok(Object.values(filled.trophies.milestones).every((r) => r.legacy && !r.animal));
  assert.equal(backfill(filled), filled, 'second run changes nothing');
  const blank = {};
  assert.equal(backfill(blank), blank, 'nothing to award');
  // A real run then replaces a legacy slot that had no time.
  let run = newRun();
  for (let i = 0; i < 3; i++) run = clearStage(run, 50000);
  const r = awardClimb(filled, 'default', run, look, '2026-11-13');
  assert.equal(r.stats.trophies.climb.default.bronze.animal, 'otter');
});

test('the trophies key is not a size and difficulty combination', () => {
  const { stats } = climbTo(recordResult({}, { n: 6, difficulty: 'easy' }, true, 1000), undefined, 3);
  assert.deepEqual(comboKeys(stats), ['6-easy']);
});

test('the trophy page renders empty, partial and full cases', () => {
  const empty = trophyPageHtml({}, { formatTime });
  assert.match(empty, /No trophies yet/);
  assert.match(empty, /Climb · Standard ladder/);
  assert.equal((empty.match(/class="trophy (bronze|silver|gold|crystal) empty"/g) || []).length, 4);
  assert.equal((empty.match(/trophy medal empty/g) || []).length, MILESTONES.length);

  let { stats } = climbTo({}, undefined, 6);
  stats = climbTo(stats, CUSTOM, 6).stats;
  const html = trophyPageHtml(stats, { formatTime });
  assert.match(html, /6 trophies so far/);
  assert.match(html, /Up to 8 × 8, steep ramp, tight clock/);
  assert.match(html, /6 stages in 360s/);
  assert.match(html, /13 Nov 2026 · otter/);
  assert.match(html, /img\/animals\/otter\.png/);
  assert.match(html, /Clear 9 stages/);
  const valley = trophyPageHtml(stats, { formatTime, style: 'valley' });
  assert.match(valley, /cup pixel/);
  assert.match(valley, /img\/animals\/otter\.png/, 'the otter has no pixel portrait yet');
  const firstCup = valley.slice(valley.indexOf('<svg class="cup pixel"'), valley.indexOf('</svg>'));
  assert.ok((firstCup.match(/<rect /g) || []).length <= 60, 'pixel runs are merged into one rect each');

  const legacy = trophyPageHtml(backfill({ climb: { runs: 1, bestStage: 4, bestStageMs: 1000 } }), { formatTime });
  assert.match(legacy, /Earned before the trophy case/);
  assert.match(legacy, /<polygon/, 'a star stands in for the character');
});

test('portraits, dates and the end-card line', () => {
  assert.equal(portraitSrc('cat', 'valley'), 'img/valley/cat.png');
  assert.equal(portraitSrc('princess', 'valley'), 'img/animals/princess.png', 'no pixel version');
  assert.equal(portraitSrc('bernese', 'normal'), null, 'renamed ids fall back to the star');
  assert.equal(formatDate('2026-01-05'), '5 Jan 2026');
  assert.equal(formatDate(undefined), '');
  assert.equal(trophyLine([], formatTime), '');
  assert.equal(trophyLine([{ kind: 'climb', tier: 'gold', stages: 9, totalMs: 9000 }], formatTime), 'New Gold cup: 9 stages in 9s.');
  assert.equal(
    trophyLine([{ kind: 'climb', tier: 'bronze', stages: 3, totalMs: 3000, improved: true }, { kind: 'milestone', name: 'Five in a row' }], formatTime),
    'Quicker Bronze cup: 3 stages in 3s. New rosette: Five in a row.',
  );
});
