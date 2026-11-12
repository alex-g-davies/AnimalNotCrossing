// The trophy case (issue #11): climb trophies in four tiers per ladder, and a
// few milestone rosettes. Pure functions over the stored stats object; the
// trophies live under `stats.trophies`, so export and import carry them.
//
//   stats.trophies = {
//     climb: { [ladderKey]: { bronze, silver, gold, crystal } },
//     milestones: { [id]: record },
//   }
//
// A climb record is { stages, totalMs, date, animal, style, palette }: the
// quickest time to clear that many stages on that ladder, and the character
// on the stage that earned it. Records back-filled from stats kept before
// the trophy case have `legacy: true` and no character or date.

import { buildLadder, optionsFromKey } from './climb.js';

export const TIERS = ['bronze', 'silver', 'gold', 'crystal'];
export const TIER_NAMES = { bronze: 'Bronze cup', silver: 'Silver cup', gold: 'Gold cup', crystal: 'Crystal cup' };
// Stages past the top of the ladder (where the clock keeps shrinking) for crystal.
export const CRYSTAL_EXTRA = 3;

// Stages to clear for each tier on a ladder of `length` stages.
export function tierThresholds(length) {
  return {
    bronze: Math.ceil(length / 3),
    silver: Math.ceil((2 * length) / 3),
    gold: length,
    crystal: length + CRYSTAL_EXTRA,
  };
}

export function ladderLength(key) {
  return buildLadder(optionsFromKey(key)).length;
}

function trophiesOf(stats) {
  const t = (stats && stats.trophies) || {};
  return { climb: { ...(t.climb || {}) }, milestones: { ...(t.milestones || {}) } };
}

// `look` is { animal, style, palette } for the game that earned it.
function record(look, date, extra) {
  return { ...extra, date, animal: look.animal, style: look.style, palette: look.palette };
}

// A stage of `run` was just cleared (run.stage is now the next stage and
// run.totalMs the time for all cleared stages). Fills or improves the tier
// slot that this exact number of cleared stages reaches. Returns the new
// stats and the tiers earned or improved now.
export function awardClimb(stats, ladderKey, run, look, date) {
  const cleared = run.stage - 1;
  const thresholds = tierThresholds(ladderLength(ladderKey));
  const tier = TIERS.find((t) => thresholds[t] === cleared);
  if (!tier) return { stats, earned: [] };
  const trophies = trophiesOf(stats);
  const slots = { ...(trophies.climb[ladderKey] || {}) };
  const old = slots[tier];
  const better = !old || !Number.isFinite(old.totalMs) || run.totalMs < old.totalMs;
  if (!better) return { stats, earned: [] };
  slots[tier] = record(look, date, { stages: cleared, totalMs: run.totalMs });
  trophies.climb[ladderKey] = slots;
  return { stats: { ...stats, trophies }, earned: [{ kind: 'climb', tier, stages: cleared, totalMs: run.totalMs, improved: Boolean(old) }] };
}

function doubleWins(stats) {
  return Object.entries(stats || {}).reduce((sum, [key, e]) => sum + (key.endsWith('-double') && e && e.solved ? e.solved : 0), 0);
}

export const MILESTONES = [
  { id: 'streak-5', name: 'Five in a row', detail: 'Won 5 puzzles in a row', met: (s) => ((s.overall || {}).bestStreak || 0) >= 5 },
  { id: 'streak-10', name: 'Ten in a row', detail: 'Won 10 puzzles in a row', met: (s) => ((s.overall || {}).bestStreak || 0) >= 10 },
  { id: 'streak-25', name: 'Twenty-five in a row', detail: 'Won 25 puzzles in a row', met: (s) => ((s.overall || {}).bestStreak || 0) >= 25 },
  { id: 'daily-7', name: 'Daily week', detail: 'Solved the daily 7 days running', met: (s) => ((s.daily || {}).best || 0) >= 7 },
  { id: 'daily-30', name: 'Daily month', detail: 'Solved the daily 30 days running', met: (s) => ((s.daily || {}).best || 0) >= 30 },
  { id: 'daily-100', name: 'Daily hundred', detail: 'Solved the daily 100 days running', met: (s) => ((s.daily || {}).best || 0) >= 100 },
  { id: 'double-first', name: 'Double Up', detail: 'First Double Up win', met: (s) => doubleWins(s) >= 1 },
  { id: 'games-100', name: 'Hundred games', detail: 'Played 100 games', met: (s) => ((s.overall || {}).games || 0) >= 100 },
];

// After a game is recorded: award every milestone now met for the first time.
export function awardMilestones(stats, look, date) {
  const trophies = trophiesOf(stats);
  const earned = [];
  for (const m of MILESTONES) {
    if (trophies.milestones[m.id] || !m.met(stats)) continue;
    trophies.milestones[m.id] = record(look, date, {});
    earned.push({ kind: 'milestone', id: m.id, name: m.name });
  }
  return earned.length ? { stats: { ...stats, trophies }, earned } : { stats, earned };
}

// Stats kept before the trophy case: award what was already reached, without
// a character or date. Safe to run on every start; returns the same object
// when nothing changes.
export function backfill(stats) {
  if (!stats) return stats;
  const trophies = trophiesOf(stats);
  let changed = false;
  const ladders = [['default', stats.climb], ...Object.entries(stats.climbs || {})];
  for (const [key, c] of ladders) {
    if (!c || !c.bestStage) continue;
    const cleared = c.bestStage - 1; // a run is recorded on the stage it ended on
    const thresholds = tierThresholds(ladderLength(key));
    const slots = { ...(trophies.climb[key] || {}) };
    for (const tier of TIERS) {
      if (slots[tier] || thresholds[tier] > cleared) continue;
      const totalMs = thresholds[tier] === cleared && Number.isFinite(c.bestStageMs) ? c.bestStageMs : null;
      slots[tier] = { legacy: true, stages: thresholds[tier], totalMs };
      changed = true;
    }
    if (Object.keys(slots).length) trophies.climb[key] = slots;
  }
  for (const m of MILESTONES) {
    if (trophies.milestones[m.id] || !m.met(stats)) continue;
    trophies.milestones[m.id] = { legacy: true };
    changed = true;
  }
  return changed ? { ...stats, trophies } : stats;
}

export function trophyCount(stats) {
  const t = trophiesOf(stats);
  const climb = Object.values(t.climb).reduce((n, slots) => n + TIERS.filter((tier) => slots[tier]).length, 0);
  return climb + Object.keys(t.milestones).length;
}
