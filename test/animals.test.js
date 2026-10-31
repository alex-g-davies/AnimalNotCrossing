import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { ANIMALS, DEFAULT_ANIMAL } from '../src/ui/animals.js';

const root = fileURLToPath(new URL('../', import.meta.url));

test('every animal has a name, a plural, and a portrait for each look', () => {
  assert.ok(DEFAULT_ANIMAL in ANIMALS);
  for (const [id, animal] of Object.entries(ANIMALS)) {
    assert.equal(typeof animal.name, 'string', id);
    assert.equal(typeof animal.plural, 'string', id);
    assert.match(animal.markup, new RegExp(`img/animals/${id}\.png`), id);
    assert.match(animal.valleyMarkup, new RegExp(`img/valley/${id}\.png`), id);
    assert.ok(existsSync(`${root}img/animals/${id}.png`), `missing portrait for ${id}`);
    assert.ok(existsSync(`${root}img/valley/${id}.png`), `missing Valley portrait for ${id}`);
  }
});

test('the service worker precaches every portrait', () => {
  const sw = readFileSync(`${root}sw.js`, 'utf8');
  for (const id of Object.keys(ANIMALS)) {
    assert.ok(sw.includes(`./img/animals/${id}.png`), id);
    assert.ok(sw.includes(`./img/valley/${id}.png`), id);
  }
});
