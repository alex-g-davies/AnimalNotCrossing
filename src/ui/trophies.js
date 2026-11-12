// The trophy case page: HTML for the trophy sheet, built from the stored
// stats object (see src/core/trophies.js). No DOM here, so it can be checked
// in Node. Cups are inline SVG in four sizes and metals, with the character
// that earned them on a round plaque; milestones are rosettes.

import { MILESTONES, TIERS, TIER_NAMES, ladderLength, tierThresholds } from '../core/trophies.js';
import { describeOptions, optionsFromKey } from '../core/climb.js';
import { ANIMALS } from './animals.js';

const METALS = {
  bronze: { main: '#d08a4c', dark: '#8f5526', light: '#f3c08e' },
  silver: { main: '#c3cad3', dark: '#7c8592', light: '#f4f6f9' },
  gold: { main: '#f2c230', dark: '#b9860f', light: '#fff1a6' },
  crystal: { main: '#a9e3f6', dark: '#4e9fc2', light: '#f2fdff' },
};
const RIBBONS = { streak: '#ef8fb5', daily: '#7fb4ef', double: '#b48be6', games: '#7fcf97' };
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// The portrait for a stored animal id in the page's style, or null for a
// back-filled record or an id that no longer exists.
export function portraitSrc(id, style) {
  const animal = id && ANIMALS[id];
  if (!animal) return null;
  return style === 'valley' && animal.pixel !== false ? `img/valley/${id}.png` : `img/animals/${id}.png`;
}

// A round plaque with the portrait, or a star when there is no character.
function plaque(src, cx, cy, r, fill) {
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const d = i % 2 ? r * 0.27 : r * 0.62;
    pts.push(`${(cx + d * Math.cos(a)).toFixed(2)},${(cy + d * Math.sin(a)).toFixed(2)}`);
  }
  const face = src
    ? `<image href="${src}" x="${+(cx - r * 0.95).toFixed(2)}" y="${+(cy - r * 0.95).toFixed(2)}" width="${+(r * 1.9).toFixed(2)}" height="${+(r * 1.9).toFixed(2)}"/>`
    : `<polygon points="${pts.join(' ')}" fill="currentColor" opacity="0.45"/>`;
  return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}"/>${face}`;
}

// A smooth cup, viewBox 100 x 104.
function cupSvg(tier, src) {
  const m = METALS[tier];
  return `<svg class="cup" viewBox="0 0 100 104" aria-hidden="true">
  <path d="M22 20 C2 20 4 50 30 54" fill="none" stroke="${m.dark}" stroke-width="6" stroke-linecap="round"/>
  <path d="M78 20 C98 20 96 50 70 54" fill="none" stroke="${m.dark}" stroke-width="6" stroke-linecap="round"/>
  <path d="M17 10 H83 V28 C83 54 67 68 50 68 C33 68 17 54 17 28 Z" fill="${m.main}" stroke="${m.dark}" stroke-width="2.5"/>
  <rect x="15" y="7" width="70" height="7" rx="3.5" fill="${m.light}" stroke="${m.dark}" stroke-width="2"/>
  <path d="M24 18 V30 C24 44 29 54 36 60" fill="none" stroke="${m.light}" stroke-width="4" stroke-linecap="round" opacity="0.75"/>
  <path d="M44 68 H56 L54 82 H46 Z" fill="${m.dark}"/>
  <rect x="31" y="81" width="38" height="8" rx="2" fill="${m.main}" stroke="${m.dark}" stroke-width="2"/>
  <rect x="24" y="89" width="52" height="12" rx="3" fill="${m.dark}"/>
  ${plaque(src, 50, 36, 19, m.light)}
</svg>`;
}

// The Valley cup: the same shape on a 16 x 15 pixel grid.
const PIXEL_CUP = [
  '..OOOOOOOOOOOO..',
  'OOOLLMMMMMMMDOOO',
  'O.OLLMMMMMMMDO.O',
  'O.OLLMMMMMMMDO.O',
  '.OOLLMMMMMMMDOO.',
  '..OOLMMMMMMDOO..',
  '...OOMMMMMDOO...',
  '.....OOMMOO.....',
  '......OMMO......',
  '......OMDO......',
  '.....OOMDOO.....',
  '....OMMMMMDO....',
  '...OOOOOOOOOO...',
  '...OLMMMMMMDO...',
  '...OOOOOOOOOO...',
];

function pixelCupSvg(tier, src) {
  const m = METALS[tier];
  const fills = { O: m.dark, M: m.main, L: m.light, D: m.dark };
  const rects = [];
  // One rect per run of same-coloured pixels in a row.
  PIXEL_CUP.forEach((row, y) => {
    for (let x = 0; x < row.length;) {
      const fill = fills[row[x]];
      let end = x + 1;
      while (end < row.length && fills[row[end]] === fill) end++;
      if (fill) rects.push(`<rect x="${x}" y="${y}" width="${end - x}" height="1.02" fill="${fill}"/>`);
      x = end;
    }
  });
  return `<svg class="cup pixel" viewBox="0 0 16 15" shape-rendering="crispEdges" aria-hidden="true">${rects.join('')}${plaque(src, 8, 3.6, 2.9, m.light)}</svg>`;
}

function rosetteSvg(family, src) {
  const c = RIBBONS[family] || RIBBONS.games;
  return `<svg class="rosette" viewBox="0 0 100 104" aria-hidden="true">
  <path d="M34 60 L22 100 L36 92 L44 102 L52 66 Z" fill="${c}" stroke="rgba(0,0,0,.25)" stroke-width="1.5"/>
  <path d="M66 60 L78 100 L64 92 L56 102 L48 66 Z" fill="${c}" stroke="rgba(0,0,0,.25)" stroke-width="1.5"/>
  <circle cx="50" cy="42" r="36" fill="${c}" stroke="rgba(255,255,255,.8)" stroke-width="7" stroke-dasharray="6 4"/>
  <circle cx="50" cy="42" r="28" fill="none" stroke="rgba(0,0,0,.18)" stroke-width="2"/>
  ${plaque(src, 50, 42, 24, '#fffaf2')}
</svg>`;
}

// "2026-11-13" -> "13 Nov 2026".
export function formatDate(key) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key || '');
  return m ? `${Number(m[3])} ${MONTHS[Number(m[2]) - 1]} ${m[1]}` : '';
}

function who(rec) {
  if (rec.legacy) return 'Earned before the trophy case';
  const animal = rec.animal && ANIMALS[rec.animal];
  return [formatDate(rec.date), animal ? animal.name : ''].filter(Boolean).join(' · ');
}

function climbSlot(tier, need, rec, style, formatTime) {
  const art = style === 'valley' ? pixelCupSvg : cupSvg;
  if (!rec) {
    return `<figure class="trophy ${tier} empty"><div class="stand">${art(tier, null)}</div><figcaption><b>${TIER_NAMES[tier]}</b><span>Clear ${need} stage${need === 1 ? "" : "s"}</span></figcaption></figure>`;
  }
  const time = Number.isFinite(rec.totalMs) ? ` in ${formatTime(rec.totalMs)}` : '';
  return `<figure class="trophy ${tier}"><div class="stand">${art(tier, portraitSrc(rec.animal, style))}</div><figcaption><b>${TIER_NAMES[tier]}</b><span>${rec.stages} stage${rec.stages === 1 ? "" : "s"}${time}</span><span>${who(rec)}</span></figcaption></figure>`;
}

export function trophyPageHtml(stats, { formatTime, style = 'normal' }) {
  const s = stats || {};
  const t = s.trophies || {};
  const climb = t.climb || {};
  const milestones = t.milestones || {};
  const custom = new Set([...Object.keys(s.climbs || {}), ...Object.keys(climb)]);
  custom.delete('default');
  let earned = 0;
  const sections = ['default', ...custom].map((key) => {
    const slots = climb[key] || {};
    const need = tierThresholds(ladderLength(key));
    earned += TIERS.filter((tier) => slots[tier]).length;
    const label = key === 'default' ? 'Standard ladder' : describeOptions(optionsFromKey(key)).replace(/^./, (c) => c.toUpperCase());
    return `<section><h3>Climb · ${label}</h3><div class="shelf">${TIERS.map((tier) => climbSlot(tier, need[tier], slots[tier], style, formatTime)).join('')}</div></section>`;
  });
  const medals = MILESTONES.map((m) => {
    const rec = milestones[m.id];
    const family = m.id.split('-')[0];
    if (!rec) return `<figure class="trophy medal empty"><div class="stand">${rosetteSvg(family, null)}</div><figcaption><b>${m.name}</b><span>${m.detail}</span></figcaption></figure>`;
    earned++;
    return `<figure class="trophy medal"><div class="stand">${rosetteSvg(family, portraitSrc(rec.animal, style))}</div><figcaption><b>${m.name}</b><span>${m.detail}</span><span>${who(rec)}</span></figcaption></figure>`;
  });
  sections.push(`<section><h3>Milestones</h3><div class="shelf medals">${medals.join('')}</div></section>`);
  const intro = earned
    ? `<p class="note">${earned} troph${earned === 1 ? 'y' : 'ies'} so far. Each climb cup keeps your quickest run to that tier.</p>`
    : '<p class="note">No trophies yet. Climb to win cups, and keep streaks going for rosettes.</p>';
  return intro + sections.join('');
}

// A sentence for the end card about trophies just earned.
export function trophyLine(earned, formatTime) {
  if (!earned || !earned.length) return '';
  return earned.map((e) => (e.kind === 'climb'
    ? `${e.improved ? 'Quicker' : 'New'} ${TIER_NAMES[e.tier]}: ${e.stages} stage${e.stages === 1 ? '' : 's'} in ${formatTime(e.totalMs)}.`
    : `New rosette: ${e.name}.`)).join(' ');
}
