// The animals: names used in copy, and the icon shown on the board. The
// icons are the owner's kawaii portraits (source sheets in art/, cut into
// transparent PNGs by tools/cut-sheet.js): img/animals/ for most looks and
// img/valley/ (the pixel-style set) for the Valley theme.

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
  // Second sheet (art/Cute Pastel Animal Faces Grid.png), same order.
  bear: { name: 'bear', plural: 'bears' },
  panda: { name: 'panda', plural: 'pandas' },
  mouse: { name: 'mouse', plural: 'mice' },
  raccoon: { name: 'raccoon', plural: 'raccoons' },
  lion: { name: 'lion', plural: 'lions' },
  tiger: { name: 'tiger', plural: 'tigers' },
  monkey: { name: 'monkey', plural: 'monkeys' },
  koala: { name: 'koala', plural: 'koalas' },
  deer: { name: 'deer', plural: 'deer' },
  elephant: { name: 'elephant', plural: 'elephants' },
  owl: { name: 'owl', plural: 'owls' },
  seal: { name: 'seal', plural: 'seals' },
  // Aquatic sheet (art/Aquatic Animal Grid.png and art/Valley Aquatic Grid.png), same order.
  clownfish: { name: 'clownfish', plural: 'clownfish' },
  dolphin: { name: 'dolphin', plural: 'dolphins' },
  whale: { name: 'whale', plural: 'whales' },
  octopus: { name: 'octopus', plural: 'octopuses' },
  turtle: { name: 'turtle', plural: 'turtles' },
  shark: { name: 'shark', plural: 'sharks' },
  crab: { name: 'crab', plural: 'crabs' },
  seahorse: { name: 'seahorse', plural: 'seahorses' },
  jellyfish: { name: 'jellyfish', plural: 'jellyfish' },
  pufferfish: { name: 'pufferfish', plural: 'pufferfish' },
  sealpup: { name: 'seal pup', plural: 'seal pups' },
  narwhal: { name: 'narwhal', plural: 'narwhals' },
  // Christmas sheets (art/Christmas Animal Grid.png and art/Valley Christmas
  // Grid.png), same order. Shown only with the Christmas colours; `base` names
  // the everyday animal a dressed-up one stands in for.
  reindeer: { name: 'reindeer', plural: 'reindeer', festive: true },
  polarbear: { name: 'polar bear', plural: 'polar bears', festive: true },
  'xmas-penguin': { name: 'penguin', plural: 'penguins', festive: true, base: 'penguin' },
  'xmas-fox': { name: 'fox', plural: 'foxes', festive: true, base: 'fox' },
  'xmas-bunny': { name: 'bunny', plural: 'bunnies', festive: true, base: 'bunny' },
  'xmas-mouse': { name: 'mouse', plural: 'mice', festive: true, base: 'mouse' },
  squirrel: { name: 'squirrel', plural: 'squirrels', festive: true },
  robin: { name: 'robin', plural: 'robins', festive: true },
  'xmas-cat': { name: 'cat', plural: 'cats', festive: true, base: 'cat' },
  'xmas-dog': { name: 'dog', plural: 'dogs', festive: true, base: 'dog' },
  'xmas-sheep': { name: 'sheep', plural: 'sheep', festive: true, base: 'sheep' },
  'xmas-hedgehog': { name: 'hedgehog', plural: 'hedgehogs', festive: true, base: 'hedgehog' },
};

for (const [id, animal] of Object.entries(ANIMALS)) {
  animal.markup = `<img class="animal-img" src="img/animals/${id}.png" alt="" draggable="false">`;
  animal.valleyMarkup = `<img class="animal-img" src="img/valley/${id}.png" alt="" draggable="false">`;
}

export const DEFAULT_ANIMAL = 'cat';
export const DEFAULT_FESTIVE_ANIMAL = 'reindeer';

// The ids on offer: the everyday set, or the festive set with the Christmas colours.
export function animalIds(festive) {
  return Object.keys(ANIMALS).filter((id) => Boolean(ANIMALS[id].festive) === festive);
}

// The id to show for a chosen animal when the festive set is (or is not) in
// use: a dressed-up version of the same animal where there is one, else the
// set's default. Ids already in the right set come back unchanged.
export function animalFor(id, festive) {
  const animal = ANIMALS[id];
  if (!animal) return festive ? DEFAULT_FESTIVE_ANIMAL : DEFAULT_ANIMAL;
  if (Boolean(animal.festive) === festive) return id;
  if (festive) return Object.keys(ANIMALS).find((k) => ANIMALS[k].base === id) || DEFAULT_FESTIVE_ANIMAL;
  return animal.base || DEFAULT_ANIMAL;
}

export function animalMarkup(id) {
  return (ANIMALS[id] || ANIMALS[DEFAULT_ANIMAL]).markup;
}

export const PAW_SVG = `<svg viewBox="0 0 24 24" aria-hidden="true" class="paw">
  <ellipse cx="7" cy="8.5" rx="2.2" ry="3" fill="currentColor"/>
  <ellipse cx="12" cy="6.5" rx="2.2" ry="3" fill="currentColor"/>
  <ellipse cx="17" cy="8.5" rx="2.2" ry="3" fill="currentColor"/>
  <path d="M12 11 C7 11 4 15 5 18 C6 21 9 20 12 20 C15 20 18 21 19 18 C20 15 17 11 12 11 Z" fill="currentColor"/>
</svg>`;
