// Cuddly animal icons: round faces, big glossy eyes, blush, a dark outline and
// a cream halo so they sit on any region colour in light or dark. Drawn on a
// 64x64 grid. Original work.

const OUT = '#3a2e2a';
const HALO = '#fffaf0';
const EYE_W = '#ffffff';
const PUPIL = '#2d2320';
const PINK = '#f29cb1';
const BLUSH = 'rgba(242, 128, 150, 0.55)';

// Shared bits: eyes, nose and mouth, placed by centre coordinates.
function eyes(lx, rx, y, r = 6) {
  const eye = (x) => `
      <ellipse cx="${x}" cy="${y}" rx="${r}" ry="${r + 0.8}" fill="${EYE_W}" stroke="${OUT}" stroke-width="1.6"/>
      <circle cx="${x + 0.6}" cy="${y + 1}" r="${r * 0.68}" fill="${PUPIL}"/>
      <circle cx="${x + 2.2}" cy="${y - 1.6}" r="${r * 0.3}" fill="${EYE_W}"/>
      <circle cx="${x - 1.4}" cy="${y + 2.6}" r="${r * 0.14}" fill="${EYE_W}"/>`;
  return eye(lx) + eye(rx);
}
function blush(lx, rx, y) {
  return `
      <ellipse cx="${lx}" cy="${y}" rx="4.2" ry="2.4" fill="${BLUSH}"/>
      <ellipse cx="${rx}" cy="${y}" rx="4.2" ry="2.4" fill="${BLUSH}"/>`;
}
function smile(x, y) {
  return `
      <path d="M${x} ${y} Q${x} ${y + 3.2} ${x - 3.6} ${y + 2.6} M${x} ${y} Q${x} ${y + 3.2} ${x + 3.6} ${y + 2.6}" fill="none" stroke="${OUT}" stroke-width="1.6" stroke-linecap="round"/>`;
}
// A filled shape drawn twice: a wide cream stroke underneath (the halo) and
// the coloured shape with its outline on top.
function body(d, fill) {
  return `
      <path d="${d}" fill="${HALO}" stroke="${HALO}" stroke-width="7" stroke-linejoin="round"/>
      <path d="${d}" fill="${fill}" stroke="${OUT}" stroke-width="2.5" stroke-linejoin="round"/>`;
}
function wrap(inner) {
  return `<svg viewBox="0 0 64 64" aria-hidden="true">${inner}
    </svg>`;
}

export const CUTE_ANIMALS = {
  cat: {
    name: 'cat',
    plural: 'cats',
    svg: wrap(`
      ${body('M12 31 L10 9 L27 18 Q32 16.5 37 18 L54 9 L52 31 A20.5 20.5 0 1 1 12 31 Z', '#eaa455')}
      <path d="M15 14 L24 19 L15 27 Z M49 14 L40 19 L49 27 Z" fill="${PINK}"/>
      <ellipse cx="32" cy="44" rx="11" ry="7.5" fill="#fff1dc"/>
      ${blush(15, 49, 42)}
      ${eyes(23, 41, 36)}
      <path d="M29.4 42.6 L34.6 42.6 L32 45.6 Z" fill="#e3819a" stroke="${OUT}" stroke-width="1.2" stroke-linejoin="round"/>
      ${smile(32, 45.6)}
      <path d="M8 40 L15 41 M8 46 L15 44.5 M56 40 L49 41 M56 46 L49 44.5" stroke="${OUT}" stroke-width="1.3" stroke-linecap="round"/>`),
  },
};

export const CUTE_PAW = `<svg viewBox="0 0 24 24" aria-hidden="true" class="paw">
  <ellipse cx="7" cy="8.5" rx="2.2" ry="3" fill="currentColor"/>
  <ellipse cx="12" cy="6.5" rx="2.2" ry="3" fill="currentColor"/>
  <ellipse cx="17" cy="8.5" rx="2.2" ry="3" fill="currentColor"/>
  <path d="M12 11 C7 11 4 15 5 18 C6 21 9 20 12 20 C15 20 18 21 19 18 C20 15 17 11 12 11 Z" fill="currentColor"/>
</svg>`;
