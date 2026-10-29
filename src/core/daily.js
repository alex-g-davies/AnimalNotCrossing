// The daily puzzle: one fixed puzzle per calendar day, derived from the local
// date, so she and anyone else with the app see the same board that day.

import { hashString } from './rng.js';

export const DAILY_SIZE = 8;
export const DAILY_DIFFICULTY = 'medium';

// Local date as YYYY-MM-DD.
export function dateKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function dailySeed(key) {
  return hashString(`daily:${key}`);
}

export function dailySpec(date = new Date()) {
  const key = dateKey(date);
  return { key, n: DAILY_SIZE, difficulty: DAILY_DIFFICULTY, seed: dailySeed(key) };
}

// Streak bookkeeping. `streak` is { current, best, last } where `last` is the
// date key of the most recent solved daily. Returns the updated object.
export function recordDailySolve(streak, key) {
  const s = { current: 0, best: 0, last: null, ...(streak || {}) };
  if (s.last === key) return s;
  s.current = s.last && isYesterday(s.last, key) ? s.current + 1 : 1;
  s.best = Math.max(s.best, s.current);
  s.last = key;
  return s;
}

// Current streak counts only if the last solve was today or yesterday.
export function liveStreak(streak, todayKey) {
  if (!streak || !streak.last) return 0;
  if (streak.last === todayKey || isYesterday(streak.last, todayKey)) return streak.current;
  return 0;
}

function isYesterday(earlierKey, laterKey) {
  const a = new Date(`${earlierKey}T12:00:00`);
  const b = new Date(`${laterKey}T12:00:00`);
  return Math.round((b - a) / 86400000) === 1;
}
