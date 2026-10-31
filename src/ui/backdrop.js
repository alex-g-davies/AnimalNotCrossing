// Decoration around the board, one scene per colour palette. Rendered once
// into #backdrop (fixed, behind the app, no pointer events). Everything is
// inline SVG except Valley, which uses pieces cut from the owner's sheet.
// Colours are chosen to sit quietly on both the light and the dark theme;
// style.css lowers the opacity further in the dark theme.

// Small deterministic generator so scattered pieces land in the same places
// every time (and do not jump when the look is re-applied).
function seeded(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function svg(body, viewBox = '0 0 400 800', align = 'xMidYMid slice') {
  return `<svg class="deco-svg" viewBox="${viewBox}" preserveAspectRatio="${align}" aria-hidden="true">${body}</svg>`;
}

function meadow() {
  const rnd = seeded(7);
  let blades = '';
  for (let x = -10; x < 420; x += 9) {
    const h = 18 + rnd() * 30;
    const lean = (rnd() - 0.5) * 14;
    blades += `<path d="M${x} 800 Q${x + lean * 0.4} ${800 - h * 0.6} ${x + lean} ${800 - h}" stroke="#6fae5c" stroke-width="3" stroke-linecap="round" fill="none" opacity="${0.35 + rnd() * 0.3}"/>`;
  }
  let daisies = '';
  for (let i = 0; i < 9; i++) {
    const x = 15 + rnd() * 370, y = 760 + rnd() * 28, r = 3 + rnd() * 2.5;
    let petals = '';
    for (let p = 0; p < 6; p++) {
      const a = (p / 6) * Math.PI * 2;
      petals += `<circle cx="${(x + Math.cos(a) * r * 1.5).toFixed(1)}" cy="${(y + Math.sin(a) * r * 1.5).toFixed(1)}" r="${r.toFixed(1)}" fill="#fff8f0" opacity="0.9"/>`;
    }
    daisies += `${petals}<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(r * 0.9).toFixed(1)}" fill="#f2c14e"/>`;
  }
  const leaf = (x, y, flip) => `<g transform="translate(${x} ${y}) scale(${flip * 0.75} 0.75)" fill="#7fb069" opacity="0.32">
    <path d="M0 0 C 30 -40, 70 -40, 90 -10 C 60 10, 25 15, 0 0 Z"/><path d="M8 -4 L 80 -14" stroke="#4f7d3f" stroke-width="2" fill="none"/>
    <path d="M10 20 C 30 -5, 60 0, 75 25 C 50 35, 25 35, 10 20 Z" opacity="0.7"/></g>`;
  return svg(`${blades}${daisies}${leaf(-20, 50, 1)}${leaf(420, 70, -1)}`);
}

function sorbet() {
  const rnd = seeded(11);
  const colors = ['#f28c9c', '#f7c58f', '#9bd4c3', '#b9a7e8', '#f6e38f', '#8ec8ea'];
  let out = '';
  for (let i = 0; i < 70; i++) {
    const x = rnd() * 400, y = rnd() * 800, a = rnd() * 180, c = colors[i % colors.length];
    const inBoard = y > 170 && y < 560 && x > 20 && x < 380; // keep the middle quiet
    if (inBoard && rnd() < 0.75) continue;
    out += i % 4 === 0
      ? `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(3 + rnd() * 3).toFixed(1)}" fill="${c}" opacity="0.55"/>`
      : `<rect x="-9" y="-3" width="18" height="6" rx="3" fill="${c}" opacity="0.6" transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${a.toFixed(0)})"/>`;
  }
  return svg(out);
}

function ocean() {
  const wave = (y, amp, color, opacity) => {
    let d = `M-20 ${y}`;
    for (let x = -20; x <= 420; x += 40) d += ` q 10 ${-amp} 20 0 t 20 0`;
    return `<path d="${d} L420 820 L-20 820 Z" fill="${color}" opacity="${opacity}"/>`;
  };
  const rnd = seeded(5);
  let bubbles = '';
  for (let i = 0; i < 14; i++) {
    const side = i % 2 ? 380 - rnd() * 40 : 20 + rnd() * 40;
    const y = 120 + rnd() * 560, r = 3 + rnd() * 6;
    bubbles += `<circle cx="${side.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}" fill="none" stroke="#5aa9d6" stroke-width="1.5" opacity="0.45"/><circle cx="${(side - r * 0.35).toFixed(1)}" cy="${(y - r * 0.35).toFixed(1)}" r="${(r * 0.22).toFixed(1)}" fill="#5aa9d6" opacity="0.5"/>`;
  }
  return svg(`${bubbles}${wave(730, 10, '#5aa9d6', 0.22)}${wave(752, 8, '#3f8fc2', 0.28)}${wave(774, 7, '#2f74a6', 0.34)}`);
}

function dusk() {
  const rnd = seeded(3);
  let stars = '';
  for (let i = 0; i < 40; i++) {
    const x = rnd() * 400, y = rnd() * 260, s = 1 + rnd() * 2.2;
    stars += rnd() < 0.3
      ? `<path d="M${x} ${y - s * 2.2} L${x + s * 0.6} ${y - s * 0.6} L${x + s * 2.2} ${y} L${x + s * 0.6} ${y + s * 0.6} L${x} ${y + s * 2.2} L${x - s * 0.6} ${y + s * 0.6} L${x - s * 2.2} ${y} L${x - s * 0.6} ${y - s * 0.6} Z" fill="#f2d98d" opacity="0.7"/>`
      : `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(s * 0.7).toFixed(1)}" fill="#f2d98d" opacity="${(0.35 + rnd() * 0.4).toFixed(2)}"/>`;
  }
  const moon = `<circle cx="340" cy="90" r="30" fill="#f2d98d" opacity="0.75"/><circle cx="352" cy="80" r="27" fill="var(--bg)"/>`;
  const hills = `<path d="M-20 760 Q 80 690 180 740 T 420 720 L420 820 L-20 820 Z" fill="#6b4f8a" opacity="0.35"/>
    <path d="M-20 790 Q 120 740 230 780 T 420 770 L420 820 L-20 820 Z" fill="#4a3566" opacity="0.4"/>`;
  return svg(`${stars}${moon}${hills}`);
}

function valley() {
  return `<div class="deco ground"></div><img class="deco farm" src="img/valley/farm.png" alt="" draggable="false">
    <img class="deco sprig tl" src="img/valley/sprig.png" alt="" draggable="false">
    <img class="deco sprig tr" src="img/valley/sprig.png" alt="" draggable="false">`;
}

const SCENES = { meadow, sorbet, ocean, dusk, valley };

export function backdropMarkup(palette) {
  const scene = SCENES[palette];
  return scene ? scene() : '';
}
