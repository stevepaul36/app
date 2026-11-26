import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as FM from '../public/js/farm.js';
import * as CR from '../public/js/critters.js';
import { ITEMS, RECIPES } from '../public/js/life.js';

test('every animal, its product, its home and the new recipes are in the catalogue', () => {
  for (const A of Object.values(FM.ANIMALS)) {
    assert.ok(ITEMS[A.product], A.product);
    assert.ok(ITEMS[A.home] && ITEMS[A.home].yard, A.home);
  }
  assert.ok(ITEMS.hay);
  for (const id of ['omelette', 'pancakes', 'scarf']) assert.ok(RECIPES.find(r => r.id === id) && ITEMS[id], id);
});

test('you need a coop before chickens, and it holds three', () => {
  const P = {}, you = { coins: 1000 };
  assert.match(FM.buy(P, 'chicken', you, { coop: 0 }, 1).msg, /coop/);
  for (let k = 0; k < 3; k++) assert.ok(FM.buy(P, 'chicken', you, { coop: 1 }, 1).ok);
  assert.match(FM.buy(P, 'chicken', you, { coop: 1 }, 1).msg, /full/);
  assert.equal(you.coins, 1000 - 3 * FM.ANIMALS.chicken.price);
  assert.equal(new Set(P.farm.animals.map(a => a.name)).size, 3, 'every animal gets its own name');
  assert.match(FM.buy({}, 'cow', { coins: 5 }, { paddock: 1 }, 1).msg, /costs/);
});

test('fed today, an egg tomorrow; hungry animals give nothing but are never lost', () => {
  const P = {}, inv = { hay: 3 };
  const a = FM.buy(P, 'chicken', { coins: 99 }, { coop: 1 }, 10).animal;
  assert.equal(FM.ready(a, 10), false);
  assert.match(FM.feed(P, a.id, inv, 10).msg, /munches/);
  assert.match(FM.feed(P, a.id, inv, 10).msg, /already/);
  assert.equal(FM.ready(a, 10), false, 'not the same day');
  assert.equal(FM.ready(a, 11), true);
  assert.deepEqual(FM.collect(P, a.id, inv, 11), { item: 'egg', n: 1, name: a.name });
  assert.equal(inv.egg, 1);
  assert.equal(FM.collect(P, a.id, inv, 11), null, 'only once');
  assert.equal(FM.ready(a, 12), false, 'not fed yesterday, so nothing today');
  assert.equal(P.farm.animals.length, 1);
  assert.match(FM.feed(P, a.id, { hay: 0 }, 12).msg, /hay/);
});

test('sheep give wool every other day, and five hearts give double', () => {
  const P = {}, inv = { hay: 99 };
  const s = FM.buy(P, 'sheep', { coins: 999 }, { paddock: 1 }, 1).animal;
  FM.feed(P, s.id, inv, 1); assert.ok(FM.collect(P, s.id, inv, 2));
  FM.feed(P, s.id, inv, 2); assert.equal(FM.ready(s, 3), false, 'wool needs two days to grow');
  assert.equal(FM.ready(s, 4), true);
  const c = FM.buy(P, 'cow', { coins: 999 }, { paddock: 1 }, 1).animal;
  for (let d = 1; d <= 5; d++) { FM.feed(P, c.id, inv, d); FM.pet(P, c.id, d); }
  assert.equal(FM.hearts(c), 5);
  assert.equal(FM.collect(P, c.id, inv, 6).n, 2);
});

test('walking past an animal collects, then feeds, then pats', () => {
  const P = {}, inv = { hay: 1 };
  const a = FM.buy(P, 'chicken', { coins: 99 }, { coop: 1 }, 1).animal;
  assert.equal(FM.tend(P, a.id, inv, 1).kind, 'feed');
  assert.equal(FM.tend(P, a.id, inv, 1).kind, 'pet');
  assert.equal(FM.tend(P, a.id, inv, 1), null);
  assert.equal(FM.tend(P, a.id, inv, 2).kind, 'collect');
});

test('one pet at a time, and it follows you', () => {
  const P = {}, you = { coins: 100 };
  assert.ok(FM.adopt(P, 'dog', you, 1).ok);
  assert.equal(you.coins, 100 - FM.PETS.dog.price);
  assert.match(FM.adopt(P, 'cat', you, 1).msg, /already/);
  assert.ok(FM.pet(P, 'pet', 1).ok);
  assert.equal(FM.pet(P, 'pet', 1).ok, false);
  let n = 3; const rnd = () => (n = (n * 16807) % 2147483647) / 2147483647;
  const dog = CR.makeCritter({ id: 'dog', ax: 5, ay: 5 }, rnd), target = [9, 5];
  for (let k = 0; k < 60; k++) CR.stepCritter(dog, 0.05, { rnd, target });
  assert.ok(Math.hypot(dog.x - 9, dog.y - 5) < 1.5, `the dog caught up: ${dog.x},${dog.y}`);
  for (let k = 0; k < 40; k++) CR.stepCritter(dog, 0.05, { rnd, target });
  assert.notEqual(dog.mode, 'run', 'then it sits by you');
  CR.stepCritter(dog, 0.05, { rnd, target: [40, 40] });
  assert.ok(Math.hypot(dog.x - 40, dog.y - 40) < 1.5, 'after a long trip it arrives with you');
});

test('farm animals stay by their home and look alive', () => {
  const fake = new Proxy({}, { get: (o, k) => (k in o ? o[k] : () => {}), set: (o, k, v) => ((o[k] = v), true) });
  for (const id of ['chicken', 'cow', 'sheep', 'dog', 'cat']) {
    let n = 11; const rnd = () => (n = (n * 16807) % 2147483647) / 2147483647;
    const c = CR.makeCritter({ id, ax: 10.5, ay: 10.5 }, rnd), modes = new Set(); let moved = false;
    const x0 = c.x, y0 = c.y;
    for (let k = 0; k < 1200; k++) {
      CR.stepCritter(c, 0.05, { rnd, ok: () => true, target: [12 + Math.sin(k / 100) * 3, 10.5] });
      modes.add(c.mode); if (Math.hypot(c.x - x0, c.y - y0) > 0.1) moved = true;
      if (['chicken', 'cow', 'sheep'].includes(id)) assert.ok(Math.hypot(c.x - 10.5, c.y - 10.5) < 2, `${id} wandered off`);
      CR.drawCritter(fake, c, (x, y, h) => [x * 10, y * 10 - h], 1, k / 20);
    }
    assert.ok(moved, id + ' never moved');
    assert.ok(modes.size >= 2, `${id} only did ${[...modes]}`);
  }
});
