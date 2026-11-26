import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as ST from '../public/js/store.js';
import * as AR from '../public/js/arrange.js';
import { ITEMS } from '../public/js/life.js';
import { ACTIONS } from '../public/js/sim.js';
import { buildHome, O, ROOM } from '../public/js/home.js';

const furnitureSrc = readFileSync(new URL('../public/js/furniture.js', import.meta.url), 'utf8');

test('every piece of furniture is in exactly one store room and has its own drawing', () => {
  const decor = Object.keys(ITEMS).filter(k => ITEMS[k].cat === 'decor');
  for (const k of decor) {
    assert.equal(ST.ROOMS.filter(r => r.items.includes(k)).length, 1, `${k} should be in one room`);
    assert.match(furnitureSrc, new RegExp(`\\bd_${k}\\(ctx`), `d_${k} needs a sprite`);
  }
  for (const r of ST.ROOMS) for (const k of r.items) assert.ok(ITEMS[k] && ITEMS[k].cat === 'decor', `${k} is not furniture`);
  assert.ok(decor.length >= 40, `lots to choose from (${decor.length})`);
});

test('the new pieces you can use do something when you walk up to them', () => {
  for (const k of ['recordplayer', 'telescope', 'swing', 'bathtub', 'gazebo', 'stall', 'well', 'coop', 'mirror']) assert.ok(ACTIONS['d_' + k]?.length, k);
  assert.equal(ACTIONS.d_stall[0].special, 'stall');
  assert.equal(ACTIONS.d_well[0].special, 'well');
});

test('three deals a day from three rooms, the same for everyone, 30% off', () => {
  for (let day = 1; day < 40; day++) {
    const d = ST.dealsFor(day, ITEMS);
    assert.equal(d.length, 3);
    assert.equal(new Set(d.map(k => ST.roomOf(k).id)).size, 3);
    assert.deepEqual(ST.dealsFor(day, ITEMS), d);
    assert.equal(ST.priceOf(d[0], day, ITEMS), Math.round(ITEMS[d[0]].price * ST.MARKUP * 0.7));
  }
  assert.notDeepEqual(ST.dealsFor(3, ITEMS), ST.dealsFor(4, ITEMS));
});

test('the store sells out and restocks the next morning', () => {
  const P = {}, you = { coins: 10000 }, k = 'lamp', day = 5;
  for (let n = 0; n < ST.DAILY_STOCK; n++) assert.ok(ST.buy(P, k, day, you, ITEMS).ok);
  assert.equal(ST.stockLeft(P, k, day), 0);
  assert.match(ST.buy(P, k, day, you, ITEMS).msg, /Sold out/);
  assert.equal(ST.stockLeft(P, k, day + 1), ST.DAILY_STOCK);
  assert.ok(ST.buy(P, k, day + 1, you, ITEMS).ok);
  assert.match(ST.buy({}, 'gazebo', 1, { coins: 1 }, ITEMS).msg, /need/);
  assert.equal(ST.buy({}, 'egg', 1, you, ITEMS).ok, false, 'eggs aren’t furniture');
  assert.equal(ST.sellBackPrice('lamp', ITEMS), Math.floor(ITEMS.lamp.price * ST.MARKUP / 2));
});

test('your stall: list, take back, and fair prices sell overnight while greedy ones wait', () => {
  const P = {}, inv = { egg: 10, tomato: 2 };
  assert.ok(ST.list(P, 'egg', 3, inv, ITEMS).ok);
  assert.equal(inv.egg, 9);
  assert.ok(ST.unlist(P, 0, inv)); assert.equal(inv.egg, 10);
  assert.equal(ST.list(P, 'tomatoseed', 1, { tomatoseed: 1 }, ITEMS).ok, false);
  assert.equal(ST.list(P, 'milk', 1, inv, ITEMS).ok, false, 'not in your bag');
  for (let n = 0; n < ST.STALL_SLOTS; n++) ST.list(P, 'egg', 1, inv, ITEMS);
  assert.match(ST.list(P, 'egg', 1, inv, ITEMS).msg, /holds/);
  assert.ok(ST.saleChance(1, 5) > ST.saleChance(8, 5));
  assert.ok(ST.saleChance(50, 5) < 0.1);
  // fair prices over a week: almost everything sells
  let sold = 0, steep = 0;
  for (let run = 0; run < 30; run++) {
    const a = {}, b = {};
    ST.list(a, 'egg', ITEMS.egg.price, { egg: 1 }, ITEMS); ST.list(b, 'egg', ITEMS.egg.price * 4, { egg: 1 }, ITEMS);
    ST.settle(a, run * 10, ITEMS); ST.settle(b, run * 10, ITEMS);
    if (ST.settle(a, run * 10 + 1, ITEMS).length) sold++;
    if (ST.settle(b, run * 10 + 1, ITEMS).length) steep++;
  }
  assert.ok(sold > 20, `fair sold ${sold}/30`);
  assert.ok(steep < 8, `steep sold ${steep}/30`);
});

test('stall sales go into the till, only count days since you last looked, and never twice', () => {
  const P = {};
  ST.list(P, 'egg', 1, { egg: 1 }, ITEMS);
  assert.deepEqual(ST.settle(P, 10, ITEMS), [], 'nothing sells on the day you set it out');
  let sales = [];
  for (let d = 11; d < 20 && !sales.length; d++) sales = ST.settle(P, d, ITEMS, ['Pip']);
  assert.equal(sales.length, 1); assert.equal(sales[0].who, 'Pip');
  assert.equal(P.stall.till, 1); assert.equal(P.stall.slots.length, 0);
  assert.equal(ST.emptyTill(P), 1); assert.equal(P.stall.till, 0);
  assert.equal(P.stall.log.length, 1);
});

const zone = (i, j) => { const a = i - O[0], b = j - O[1]; return a >= 0 && b >= 0 && a < ROOM.w && b < ROOM.d ? 'in' : 'out'; };
test('you can move the furniture your home came with, but not through walls or into the way', () => {
  for (const layout of ['classic', 'open', 'studio', 'loft']) {
    const w = buildHome(layout); AR.applyMoves(w, null);
    const shelf = w.objects.find(f => f.type === 'bookshelf');
    assert.ok(AR.movable(shelf));
    assert.equal(AR.movable(w.objects.find(f => f.type === 'plot')), false);
    assert.equal(AR.movable(w.objects.find(f => f.door)), false);
    const reach0 = AR.reachable(w).size;
    // into the garden: no
    assert.equal(AR.tryMove(w, shelf, O[0] + 3, O[1] + 12, { zone }).ok, false);
    // onto the bed: no
    const bed = w.objects.find(f => f.type === 'bed');
    assert.match(AR.tryMove(w, shelf, bed.i, bed.j, { zone }).msg, /way/);
    // into an open spot in the living room: yes, and it is saved as an offset from where it started
    let moved = null;
    for (let j = O[1] + 4; j < O[1] + 9 && !moved; j++) for (let i = O[0] + 5; i < O[0] + 11 && !moved; i++) { const r = AR.tryMove(w, shelf, i, j, { zone }); if (r.ok) moved = r; }
    assert.ok(moved, `${layout}: the shelf should fit somewhere`);
    assert.deepEqual(moved.offset, [shelf.i - shelf.i0, shelf.j - shelf.j0]);
    assert.equal(w.blocked[w.idx(shelf.i, shelf.j)], 1);
    assert.equal(w.blocked[w.idx(shelf.i0, shelf.j0)], 0, 'its old spot is free');
    // a fresh home with the saved move puts it in the same place
    const w2 = buildHome(layout), key = AR.keyOf(w.objects, shelf);
    AR.applyMoves(w2, { [key]: [...moved.offset, 1] });
    const s2 = w2.objects.find(f => AR.keyOf(w2.objects, f) === key);
    assert.deepEqual([s2.i, s2.j, s2.flip], [shelf.i, shelf.j, true]);
    assert.deepEqual(s2.stand, shelf.stand);
    assert.ok(AR.reachable(w).size >= reach0 - 2);
  }
});

test('a move that would wall something off is refused and changes nothing', () => {
  const w = buildHome('classic'); AR.applyMoves(w, null);
  const before = Array.from(w.blocked);
  const plant = w.objects.find(f => f.type === 'plant');
  let refused = 0;
  for (let j = O[1]; j < O[1] + ROOM.d; j++) for (let i = O[0]; i < O[0] + ROOM.w; i++) {
    const at = [plant.i, plant.j], r = AR.tryMove(w, plant, i, j, { zone });
    if (r.ok) { AR.tryMove(w, plant, ...at, { zone }); } else refused++;
  }
  assert.ok(refused > 10);
  assert.deepEqual(Array.from(w.blocked), before, 'putting it back leaves the home as it was');
});
