// The animals: names used in copy, and the icon shown on the board. The
// icons are the owner's kawaii portraits (source sheet in art/, cut into
// transparent PNGs by tools/cut-sheet.js). The Valley theme uses the pixel
// sprites in animals-pixel.js instead.

export const ANIMALS = {
  cat: { name: 'cat', plural: 'cats' },
  dog: { name: 'dog', plural: 'dogs' },
  bunny: { name: 'bunny', plural: 'bunnies' },
  fox: { name: 'fox', plural: 'foxes' },
  frog: { name: 'frog', plural: 'frogs' },
  duck: { name: 'duck', plural: 'ducks' },
  penguin: { name: 'penguin', plural: 'penguins' },
  hedgehog: { name: 'hedgehog', plural: 'hedgehogs' },
  chicken: { name: 'chicken', plural: 'chickens' },
  cow: { name: 'cow', plural: 'cows' },
  pig: { name: 'pig', plural: 'pigs' },
  sheep: { name: 'sheep', plural: 'sheep' },
};

for (const [id, animal] of Object.entries(ANIMALS)) {
  animal.markup = `<img class="animal-img" src="img/animals/${id}.png" alt="" draggable="false">`;
}

export const DEFAULT_ANIMAL = 'cat';

export function animalMarkup(id) {
  return (ANIMALS[id] || ANIMALS[DEFAULT_ANIMAL]).markup;
}

export const PAW_SVG = `<svg viewBox="0 0 24 24" aria-hidden="true" class="paw">
  <ellipse cx="7" cy="8.5" rx="2.2" ry="3" fill="currentColor"/>
  <ellipse cx="12" cy="6.5" rx="2.2" ry="3" fill="currentColor"/>
  <ellipse cx="17" cy="8.5" rx="2.2" ry="3" fill="currentColor"/>
  <path d="M12 11 C7 11 4 15 5 18 C6 21 9 20 12 20 C15 20 18 21 19 18 C20 15 17 11 12 11 Z" fill="currentColor"/>
</svg>`;
