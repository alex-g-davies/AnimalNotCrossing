// The Stats page: HTML for the stats sheet, built from the stored stats
// object. No DOM here, so it can be checked in Node.

import { comboKeys, streaks, summary, trend } from '../core/stats.js';
import { liveStreak } from '../core/daily.js';
import { describeOptions, optionsFromKey } from '../core/climb.js';

const SPARK_POINTS = 20;

export function statsPageHtml(stats, { today, formatTime }) {
  const fmt = (v) => (v === null || v === undefined ? '–' : formatTime(v));
  const keys = comboKeys(stats);
  if (!keys.length) return '<p class="note">No puzzles finished yet. Your numbers will gather here.</p>';
  const sections = [];

  const s = summary(stats);
  const rate = s.winRate === null ? '–' : `${Math.round(s.winRate * 100)}%`;
  const untimed = s.games - s.timedGames;
  const playTime = s.timedGames
    ? `${formatLong(s.playMs)}${untimed > 0 ? ` across ${s.timedGames} games (${untimed} earlier game${untimed === 1 ? '' : 's'} were not timed)` : ''}`
    : 'not tracked yet';
  sections.push(section('Overall', [
    stat(`${s.games} game${s.games === 1 ? '' : 's'}`, `${s.wins} won · ${s.losses} lost · win rate ${rate}`),
    stat('Play time', playTime),
  ]));

  const overall = streaks(stats);
  const live = liveStreak(stats.daily, today);
  const daily = stats.daily || { best: 0, last: null };
  sections.push(section('Streaks', [
    stat(`Win streak: ${overall.streak}`, `Best: ${overall.bestStreak}. A loss, or leaving a puzzle after a move, ends it.`),
    stat(`Daily streak: ${live} day${live === 1 ? '' : 's'}`, `Best: ${daily.best || 0}${daily.last === today ? ' · solved today' : ''}`),
  ]));

  const climbs = [['default', stats.climb], ...Object.entries(stats.climbs || {})].filter(([, c]) => c);
  if (climbs.length) {
    sections.push(section('Climb', climbs.map(([key, c]) => {
      const ladder = key === 'default' ? 'Standard ladder' : capital(describeOptions(optionsFromKey(key)));
      return stat(`Stage ${c.bestStage}`, `${ladder} · ${c.runs} run${c.runs === 1 ? '' : 's'} · ${fmt(c.bestStageMs)} to get there`);
    })));
  }

  sections.push(section('By size and difficulty', keys.map((key) => {
    const e = stats[key];
    const times = (e.times || []).filter(Number.isFinite);
    const sorted = times.slice().sort((a, b) => a - b);
    const median = sorted.length ? sorted[Math.floor(sorted.length / 2)] : null;
    const [n, difficulty, mode] = key.split('-');
    const t = trend(times);
    const trendText = t === null ? '' : t.pct > 0 ? `Recent wins ${t.pct}% quicker than your earlier ones.` : t.pct < 0 ? `Recent wins ${-t.pct}% slower than your earlier ones.` : 'Recent wins right on your earlier pace.';
    const line = `${e.solved} solved · ${e.lost} lost · best ${fmt(e.best)} · median ${fmt(median)} · streak ${e.streak || 0}, best ${e.bestStreak || 0}`;
    return stat(`${n} × ${n} · ${capital(difficulty)}${mode === 'double' ? ' · Double Up' : ''}`, line, sparkline(times), trendText);
  })));

  return sections.join('');
}

function section(title, rows) {
  return `<section><h3>${title}</h3><div class="stats">${rows.join('')}</div></section>`;
}

function stat(title, line, spark = '', extra = '') {
  return `<div class="stat"><div class="stat-main"><b>${title}</b><span>${line}</span>${extra ? `<span class="trend">${extra}</span>` : ''}</div>${spark}</div>`;
}

// The last few win times as a tiny line, lower meaning quicker; the best is marked.
export function sparkline(times) {
  const t = times.slice(-SPARK_POINTS);
  if (t.length < 2) return '';
  const w = 120, h = 32;
  const max = Math.max(...t), min = Math.min(...t);
  const x = (i) => (i / (t.length - 1)) * (w - 6) + 3;
  const y = (v) => (max === min ? h / 2 : h - 4 - ((v - min) / (max - min)) * (h - 8));
  const points = t.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const best = t.indexOf(min);
  return `<svg class="spark" viewBox="0 0 ${w} ${h}" aria-label="last ${t.length} win times, lower is quicker">`
    + `<polyline points="${points}" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/>`
    + `<circle cx="${x(best).toFixed(1)}" cy="${y(min).toFixed(1)}" r="2.5" fill="var(--accent)"/></svg>`;
}

// "2 h 14 min", "14 min", "48 s".
export function formatLong(ms) {
  const total = Math.round(ms / 1000);
  const h = Math.floor(total / 3600), m = Math.floor((total % 3600) / 60), s = total % 60;
  if (h) return `${h} h ${m} min`;
  if (m) return `${m} min`;
  return `${s} s`;
}

function capital(text) {
  return text[0].toUpperCase() + text.slice(1);
}
