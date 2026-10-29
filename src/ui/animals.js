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
      <path fill="currentColor" d="M14 14 Q8 8 6 20 Q4 34 12 40 L12 42 A20 18 0 0 0 52 42 L52 40 Q60 34 58 20 Q56 8 50 14 Q32 6 14 14 Z"/>
      <ellipse cx="25" cy="34" rx="3" ry="3.6" fill="${EYE}"/>
      <ellipse cx="39" cy="34" rx="3" ry="3.6" fill="${EYE}"/>
      <ellipse cx="32" cy="44" rx="4.2" ry="3.2" fill="${EYE}"/>
      <path d="M32 47 L32 50 M32 50 Q28 53 25 50 M32 50 Q36 53 39 50" stroke="${EYE}" stroke-width="1.8" fill="none" stroke-linecap="round"/>
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
      <path fill="currentColor" d="M32 6 Q48 6 50 26 L52 46 Q52 58 32 58 Q12 58 12 46 L14 26 Q16 6 32 6 Z"/>
      <path fill="${EYE}" d="M32 26 Q42 26 43 40 L44 50 Q44 54 32 54 Q20 54 20 50 L21 40 Q22 26 32 26 Z"/>
      <path fill="${EYE}" d="M22 12 Q32 20 42 12 Q38 24 32 24 Q26 24 22 12 Z" opacity="0.001"/>
      <circle cx="25" cy="17" r="3" fill="${EYE}"/>
      <circle cx="39" cy="17" r="3" fill="${EYE}"/>
      <path d="M27 22 L37 22 L32 28 Z" fill="${EYE}"/>
      <path d="M22 58 L18 62 L30 62 Z M42 58 L46 62 L34 62 Z" fill="currentColor"/>
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


// Farm animals in the rounded style, so every species exists in both sets.
Object.assign(ANIMALS, {
  chicken: {
    name: 'chicken',
    plural: 'chickens',
    svg: `<svg viewBox="0 0 64 64" aria-hidden="true">
      <path fill="currentColor" d="M26 8 Q30 2 34 8 Q38 2 40 10 L38 14 Q44 18 44 26 L52 24 L46 32 L44 36 Q54 40 52 50 Q50 58 36 58 Q14 58 12 44 Q12 30 24 26 Q20 16 26 8 Z"/>
      <circle cx="33" cy="22" r="2.6" fill="${EYE}"/>
      <path d="M26 58 L24 63 M38 58 L40 63" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
    </svg>`,
  },
  cow: {
    name: 'cow',
    plural: 'cows',
    svg: `<svg viewBox="0 0 64 64" aria-hidden="true">
      <path fill="currentColor" d="M10 12 Q4 10 8 22 L16 24 Q10 30 14 40 Q16 56 32 56 Q48 56 50 40 Q54 30 48 24 L56 22 Q60 10 54 12 L46 18 Q32 10 18 18 Z"/>
      <ellipse cx="24" cy="30" rx="3" ry="3.4" fill="${EYE}"/>
      <ellipse cx="40" cy="30" rx="3" ry="3.4" fill="${EYE}"/>
      <path fill="${EYE}" d="M20 40 Q32 36 44 40 Q46 50 32 50 Q18 50 20 40 Z"/>
      <circle cx="27" cy="44" r="1.8" fill="currentColor"/>
      <circle cx="37" cy="44" r="1.8" fill="currentColor"/>
    </svg>`,
  },
  pig: {
    name: 'pig',
    plural: 'pigs',
    svg: `<svg viewBox="0 0 64 64" aria-hidden="true">
      <path fill="currentColor" d="M12 12 L24 18 Q32 14 40 18 L52 12 L50 28 Q56 36 50 46 Q44 56 32 56 Q20 56 14 46 Q8 36 14 28 Z"/>
      <ellipse cx="23" cy="30" rx="2.8" ry="3.2" fill="${EYE}"/>
      <ellipse cx="41" cy="30" rx="2.8" ry="3.2" fill="${EYE}"/>
      <ellipse cx="32" cy="42" rx="9" ry="6" fill="${EYE}"/>
      <ellipse cx="28.5" cy="42" rx="1.8" ry="2.4" fill="currentColor"/>
      <ellipse cx="35.5" cy="42" rx="1.8" ry="2.4" fill="currentColor"/>
    </svg>`,
  },
  sheep: {
    name: 'sheep',
    plural: 'sheep',
    svg: `<svg viewBox="0 0 64 64" aria-hidden="true">
      <path fill="currentColor" d="M20 14 Q24 6 32 8 Q40 6 44 14 Q54 12 54 22 Q58 28 52 32 Q54 40 46 42 L44 50 Q40 56 32 56 Q24 56 20 50 L18 42 Q10 40 12 32 Q6 28 10 22 Q10 12 20 14 Z"/>
      <path fill="${EYE}" d="M22 30 Q32 24 42 30 Q46 42 32 48 Q18 42 22 30 Z"/>
      <circle cx="27" cy="34" r="2.2" fill="currentColor"/>
      <circle cx="37" cy="34" r="2.2" fill="currentColor"/>
      <path d="M8 26 Q2 28 6 32 M56 26 Q62 28 58 32" stroke="currentColor" stroke-width="4" stroke-linecap="round" fill="none"/>
    </svg>`,
  },
});
