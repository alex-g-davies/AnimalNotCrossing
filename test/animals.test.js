import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { ANIMALS, DEFAULT_ANIMAL, DEFAULT_FESTIVE_ANIMAL, animalFor, animalIds } from '../src/ui/animals.js';

const root = fileURLToPath(new URL('../', import.meta.url));

test('every animal has a name, a plural, and a portrait for each look', () => {
  assert.ok(DEFAULT_ANIMAL in ANIMALS);
  for (const [id, animal] of Object.entries(ANIMALS)) {
    assert.equal(typeof animal.name, 'string', id);
    assert.equal(typeof animal.plural, 'string', id);
    assert.match(animal.markup, new RegExp(`img/animals/${id}\.png`), id);
    assert.ok(existsSync(`${root}img/animals/${id}.png`), `missing portrait for ${id}`);
    if (animal.pixel === false) {
      assert.ok(animal.valleyMarkup.includes(`img/animals/${id}.png`), id);
      assert.match(animal.valleyMarkup, /smooth/, `${id} keeps smooth scaling in Valley`);
      continue;
    }
    assert.match(animal.valleyMarkup, new RegExp(`img/valley/${id}\.png`), id);
    assert.ok(existsSync(`${root}img/valley/${id}.png`), `missing Valley portrait for ${id}`);
  }
});

test('the service worker precaches every portrait', () => {
  const sw = readFileSync(`${root}sw.js`, 'utf8');
  for (const id of Object.keys(ANIMALS)) {
    assert.ok(sw.includes(`./img/animals/${id}.png`), id);
    if (ANIMALS[id].pixel !== false) assert.ok(sw.includes(`./img/valley/${id}.png`), id);
  }
});

test('the festive set is separate and maps to and from the everyday animals', () => {
  const everyday = animalIds(false);
  const festive = animalIds(true);
  assert.ok(everyday.includes('cat') && !everyday.includes('xmas-cat'));
  assert.ok(festive.includes('robin') && !festive.includes('cat'));
  assert.equal(everyday.length + festive.length, Object.keys(ANIMALS).length);
  assert.equal(animalFor('cat', true), 'xmas-cat');
  assert.equal(animalFor('xmas-cat', false), 'cat');
  assert.equal(animalFor('narwhal', true), DEFAULT_FESTIVE_ANIMAL, 'no festive narwhal');
  assert.equal(animalFor('robin', false), DEFAULT_ANIMAL, 'no everyday robin');
  assert.equal(animalFor('robin', true), 'robin');
  assert.equal(animalFor('nope', false), DEFAULT_ANIMAL);
  for (const id of festive) {
    const base = ANIMALS[id].base;
    if (base) assert.ok(everyday.includes(base), `${id} stands in for ${base}`);
  }
});
