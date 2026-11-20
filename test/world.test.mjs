import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildWorld, findPath, HOMES, T } from '../public/js/world.js';

const world = buildWorld();

test('buildings never overlap and never sit in water', () => {
  const seen = new Map();
  for (const o of world.objects) {
    for (let j = o.j; j < o.j + o.d; j++) for (let i = o.i; i < o.i + o.w; i++) {
      const key = i + ',' + j;
      assert.ok(!seen.has(key), `${o.name || o.kind} overlaps ${seen.get(key)} at ${key}`);
      seen.set(key, o.name || o.kind);
      assert.notEqual(world.get(i, j), T.SEA, `${o.name || o.kind} is in the sea`);
      assert.notEqual(world.get(i, j), T.POND, `${o.name || o.kind} is in the pond`);
    }
  }
});

test('every door can be walked to from the town square', () => {
  for (const o of world.objects) {
    if (!o.doorTile) continue;
    const path = findPath(world, 23.5, 23.5, o.doorTile[0] + 0.5, o.doorTile[1] + 0.5);
    assert.ok(path, `no path to ${o.name || o.kind}`);
  }
});

test('home IDs match the server property catalogue', () => {
  const server = fs.readFileSync(new URL('../server.js', import.meta.url), 'utf8');
  for (const h of HOMES) assert.match(server, new RegExp(`'${h.id}','${h.name.replace(/[&]/g, '\\$&')}'`), `${h.id} missing from server seed`);
});
