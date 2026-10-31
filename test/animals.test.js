import test from 'node:test';
import assert from 'node:assert/strict';
import { ANIMALS, DEFAULT_ANIMAL } from '../src/ui/animals.js';
import { PIXEL_SPRITES } from '../src/ui/animals-pixel.js';

test('every animal has a name, a plural, a portrait and a Valley sprite', () => {
  assert.ok(DEFAULT_ANIMAL in ANIMALS);
  for (const [id, animal] of Object.entries(ANIMALS)) {
    assert.equal(typeof animal.name, 'string', id);
    assert.equal(typeof animal.plural, 'string', id);
    assert.match(animal.markup, new RegExp(`img/animals/${id}\.png`), id);
    assert.ok(PIXEL_SPRITES[id], `no pixel sprite for ${id}`);
    assert.match(PIXEL_SPRITES[id], /<rect /, id);
  }
});
