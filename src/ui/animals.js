// Original animal icons as inline SVG. Each is a single-color silhouette in
// currentColor with eyes and nose cut out in the cell's region color, so it
// reads well on every palette. All drawn on a 64x64 grid.

const EYE = 'var(--region-color, #fff)';

export const ANIMALS = {
  cat: {
    name: 'cat',
    plural: 'cats',
    svg: `<svg viewBox="0 0 64 64" aria-hidden="true">
      <path fill="currentColor" d="M14 34 L11 8 L28 20 Q32 19 36 20 L53 8 L50 34 A19 19 0 1 1 14 34 Z"/>
      <ellipse cx="24" cy="36" rx="3.2" ry="4" fill="${EYE}"/>
      <ellipse cx="40" cy="36" rx="3.2" ry="4" fill="${EYE}"/>
      <path d="M29.5 44 L34.5 44 L32 47 Z" fill="${EYE}"/>
      <path d="M32 47 Q32 51 27 51 M32 47 Q32 51 37 51" stroke="${EYE}" stroke-width="1.8" fill="none" stroke-linecap="round"/>
    </svg>`,
  },
  dog: {
    name: 'dog',
    plural: 'dogs',
    svg: `<svg viewBox="0 0 64 64" aria-hidden="true">
      <path fill="currentColor" d="M18 18 Q12 10 8 20 Q6 32 14 38 L14 40 A18 18 0 0 0 50 40 L50 38 Q58 32 56 20 Q52 10 46 18 Q32 10 18 18 Z"/>
      <ellipse cx="25" cy="36" rx="3" ry="3.6" fill="${EYE}"/>
      <ellipse cx="39" cy="36" rx="3" ry="3.6" fill="${EYE}"/>
      <ellipse cx="32" cy="45" rx="4" ry="3" fill="${EYE}"/>
      <path d="M32 48 L32 51 M32 51 Q28 54 25 51 M32 51 Q36 54 39 51" stroke="${EYE}" stroke-width="1.8" fill="none" stroke-linecap="round"/>
    </svg>`,
  },
  bunny: {
    name: 'bunny',
    plural: 'bunnies',
    svg: `<svg viewBox="0 0 64 64" aria-hidden="true">
      <path fill="currentColor" d="M20 30 Q14 6 24 4 Q30 4 30 26 L34 26 Q34 4 40 4 Q50 6 44 30 A17 17 0 1 1 20 30 Z"/>
      <ellipse cx="25" cy="40" rx="2.8" ry="3.6" fill="${EYE}"/>
      <ellipse cx="39" cy="40" rx="2.8" ry="3.6" fill="${EYE}"/>
      <path d="M30 47 L34 47 L32 49.5 Z" fill="${EYE}"/>
      <path d="M32 49.5 Q32 53 28 53 M32 49.5 Q32 53 36 53" stroke="${EYE}" stroke-width="1.8" fill="none" stroke-linecap="round"/>
    </svg>`,
  },
  fox: {
    name: 'fox',
    plural: 'foxes',
    svg: `<svg viewBox="0 0 64 64" aria-hidden="true">
      <path fill="currentColor" d="M8 14 L26 24 Q32 22 38 24 L56 14 L52 36 L32 58 L12 36 Z"/>
      <ellipse cx="24" cy="36" rx="2.8" ry="3.4" fill="${EYE}"/>
      <ellipse cx="40" cy="36" rx="2.8" ry="3.4" fill="${EYE}"/>
      <path d="M29 48 L35 48 L32 52 Z" fill="${EYE}"/>
    </svg>`,
  },
};

export const DEFAULT_ANIMAL = 'cat';

export function animalSvg(id) {
  return (ANIMALS[id] || ANIMALS[DEFAULT_ANIMAL]).svg;
}

export const PAW_SVG = `<svg viewBox="0 0 24 24" aria-hidden="true" class="paw">
  <ellipse cx="7" cy="8.5" rx="2.2" ry="3" fill="currentColor"/>
  <ellipse cx="12" cy="6.5" rx="2.2" ry="3" fill="currentColor"/>
  <ellipse cx="17" cy="8.5" rx="2.2" ry="3" fill="currentColor"/>
  <path d="M12 11c-4 0-7 3-7 6 0 2 1.5 3 3.2 3 1.5 0 2.4-.8 3.8-.8s2.3.8 3.8.8c1.7 0 3.2-1 3.2-3 0-3-3-6-7-6z" fill="currentColor"/>
</svg>`;

// More rounded animals.
Object.assign(ANIMALS, {
  frog: {
    name: 'frog',
    plural: 'frogs',
    svg: `<svg viewBox="0 0 64 64" aria-hidden="true">
      <circle cx="20" cy="22" r="9" fill="currentColor"/>
      <circle cx="44" cy="22" r="9" fill="currentColor"/>
      <path fill="currentColor" d="M8 36 Q8 24 20 26 L44 26 Q56 24 56 36 Q56 54 32 54 Q8 54 8 36 Z"/>
      <circle cx="20" cy="22" r="3.4" fill="${EYE}"/>
      <circle cx="44" cy="22" r="3.4" fill="${EYE}"/>
      <path d="M22 42 Q32 50 42 42" stroke="${EYE}" stroke-width="2" fill="none" stroke-linecap="round"/>
    </svg>`,
  },
  duck: {
    name: 'duck',
    plural: 'ducks',
    svg: `<svg viewBox="0 0 64 64" aria-hidden="true">
      <path fill="currentColor" d="M22 10 A12 12 0 0 1 42 20 L54 22 L42 28 L42 34 Q58 36 56 48 Q54 58 36 58 Q12 58 10 42 Q9 32 20 30 Q16 20 22 10 Z"/>
      <circle cx="30" cy="18" r="3" fill="${EYE}"/>
      <path d="M42 22 L52 22.5 L42 27" fill="${EYE}" opacity="0.6"/>
    </svg>`,
  },
  penguin: {
    name: 'penguin',
    plural: 'penguins',
    svg: `<svg viewBox="0 0 64 64" aria-hidden="true">
      <path fill="currentColor" d="M32 6 Q50 6 50 30 L50 50 Q50 58 32 58 Q14 58 14 50 L14 30 Q14 6 32 6 Z"/>
      <path fill="${EYE}" d="M32 22 Q42 22 42 38 L42 50 Q42 54 32 54 Q22 54 22 50 L22 38 Q22 22 32 22 Z"/>
      <circle cx="26" cy="18" r="2.6" fill="${EYE}"/>
      <circle cx="38" cy="18" r="2.6" fill="${EYE}"/>
      <path d="M29 24 L35 24 L32 28 Z" fill="currentColor"/>
    </svg>`,
  },
  hedgehog: {
    name: 'hedgehog',
    plural: 'hedgehogs',
    svg: `<svg viewBox="0 0 64 64" aria-hidden="true">
      <path fill="currentColor" d="M10 40 L6 26 L16 30 L14 16 L24 24 L26 10 L34 22 L42 10 L44 24 L54 16 L52 30 L60 28 L56 42 Q50 54 36 54 L14 54 Q8 54 8 48 Z"/>
      <path fill="currentColor" d="M8 48 Q6 40 14 40 L36 40 Q44 40 46 46 Q46 54 36 54 L14 54 Q8 54 8 48 Z"/>
      <circle cx="18" cy="45" r="2.4" fill="${EYE}"/>
      <circle cx="9.5" cy="48.5" r="2.2" fill="${EYE}"/>
    </svg>`,
  },
});

// Pixel farm animals for the Valley theme: drawn on a 16x16 grid with
// crisp rects (shape-rendering keeps them sharp when scaled).
function pixel(rows, fg = 'currentColor', eye = EYE) {
  const rects = [];
  rows.forEach((row, y) => {
    [...row].forEach((ch, x) => {
      if (ch === '#') rects.push(`<rect x="${x}" y="${y}" width="1" height="1" fill="${fg}"/>`);
      if (ch === 'o') rects.push(`<rect x="${x}" y="${y}" width="1" height="1" fill="${eye}"/>`);
    });
  });
  return `<svg viewBox="0 0 16 16" shape-rendering="crispEdges" aria-hidden="true">${rects.join('')}</svg>`;
}

export const PIXEL_ANIMALS = {
  chicken: {
    name: 'chicken',
    plural: 'chickens',
    svg: pixel([
      '......##........',
      '.....####.......',
      '.....#o##.......',
      '....######......',
      '...###..........',
      '....######......',
      '...########.....',
      '..##########....',
      '..##########....',
      '...#########....',
      '....#######.....',
      '.....#####......',
      '......#.#.......',
      '......#.#.......',
      '.....##.##......',
      '................',
    ]),
  },
  cow: {
    name: 'cow',
    plural: 'cows',
    svg: pixel([
      '..##......##....',
      '..##......##....',
      '...########.....',
      '..##########....',
      '..#o######o#....',
      '..##########....',
      '...########.....',
      '...#oo##oo#.....',
      '...########.....',
      '....######......',
      '....######......',
      '....##..##......',
      '....##..##......',
      '................',
      '................',
      '................',
    ]),
  },
  pig: {
    name: 'pig',
    plural: 'pigs',
    svg: pixel([
      '................',
      '..##......##....',
      '..###....###....',
      '..##########....',
      '.############...',
      '.###o####o###...',
      '.############...',
      '.####oooo####...',
      '.####o##o####...',
      '.####oooo####...',
      '..##########....',
      '...########.....',
      '....##..##......',
      '....##..##......',
      '................',
      '................',
    ]),
  },
  sheep: {
    name: 'sheep',
    plural: 'sheep',
    svg: pixel([
      '................',
      '....######......',
      '..##########....',
      '.############...',
      '.############...',
      '..##########....',
      '...##oooo##.....',
      '...##o##o##.....',
      '...##oooo##.....',
      '...#oooooo#.....',
      '....oooooo......',
      '.....oooo.......',
      '.....o..o.......',
      '.....o..o.......',
      '................',
      '................',
    ]),
  },
};

Object.assign(ANIMALS, PIXEL_ANIMALS);
