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
