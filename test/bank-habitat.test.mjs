import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as BK from '../public/js/bank.js';
import * as HB from '../public/js/habitat.js';
import { ITEMS } from '../public/js/life.js';
import * as CR from '../public/js/critters.js';

test('savings: put coins away, take them out, and they grow 2% a morning up to the cap', () => {
  const P = {}, you = { coins: 300 };
  assert.ok(BK.deposit(P, you, 200, 1).ok);
  assert.equal(you.coins, 100);
  assert.equal(P.bank.savings, 200);
  assert.deepEqual(BK.morning(P, { debt: 0 }, 2), ['🏦 Your savings earned ✦ 4 interest.']);
  assert.equal(P.bank.savings, 204);
  P.bank.savings = 10000; BK.morning(P, { debt: 0 }, 3);
  assert.equal(P.bank.savings, 10000 + BK.SAVINGS_CAP);
  assert.ok(BK.withdraw(P, you, 50, 3).ok);
  assert.equal(you.coins, 150);
  assert.match(BK.withdraw({}, you, 50).msg, /empty/);
  assert.match(BK.deposit({}, { coins: 0 }, 50).msg, /no coins/);
});

test('each morning savings pay off a loan first', () => {
  const P = { bank: { savings: 80, history: [] } }, E = { debt: 100 };
  BK.morning(P, E, 1);
  assert.equal(E.debt, 20);
  assert.equal(P.bank.savings, 0);
});

test('a repayment plan shows days and the total, and refuses payments that can’t keep up', () => {
  const p = BK.plan(100, 30);
  assert.ok(p.days >= 4 && p.days <= 5, JSON.stringify(p));
  assert.ok(p.total > 100 && p.total < 130);
  assert.equal(BK.plan(100, 5), null);
  assert.deepEqual(BK.plan(0, 10), { days: 0, total: 0, perDay: 10 });
  const q = BK.loanQuote(100);
  assert.equal(q.owed, 100);
  assert.ok(q.days > 0 && q.days <= 8 && q.repay >= 100);
});

test('every yard item is for sale and every visitor has a hint', () => {
  for (const k of HB.YARD_ITEMS) assert.ok(ITEMS[k] && ITEMS[k].cat === 'decor' && ITEMS[k].yard, k);
  for (const v of HB.VISITORS) assert.match(v.hint, /\w/);
});

test('the yard decides who visits, at the times the real animals are about', () => {
  const out = (i, j) => j > 5; // tiles with j above 5 count as outside
  const decor = [{ item: 'pond', i: 1, j: 8 }, { item: 'logpile', i: 3, j: 8 }, { item: 'feeder', i: 5, j: 8 }, { item: 'pond', i: 1, j: 1 }];
  const plots = [{ crop: 'tulip' }, { crop: 'sunflower' }, { crop: 'tomato' }, { crop: 'carrot' }, {}, {}];
  const day = HB.habitatOf(decor, plots, { hour: 12, outdoors: out });
  assert.equal(day.pond, 1); // the indoor pond doesn't count
  assert.equal(day.flowers, 2);
  assert.equal(day.crops, 4);
  assert.equal(day.veg, 2);
  const ids = h => HB.VISITORS.filter(v => v.needs(h)).map(v => v.id);
  assert.ok(['frog', 'butterfly', 'duck', 'squirrel', 'ladybird'].every(id => ids(day).includes(id)), ids(day).join());
  for (const id of ['owl', 'hedgehog', 'rabbit', 'snail']) assert.ok(!ids(day).includes(id), id + ' is not out at noon');
  const night = HB.habitatOf(decor, plots, { hour: 23, outdoors: out });
  for (const id of ['owl', 'hedgehog', 'snail', 'frog']) assert.ok(ids(night).includes(id), id);
  for (const id of ['butterfly', 'duck', 'squirrel', 'ladybird']) assert.ok(!ids(night).includes(id), id);
  assert.ok(ids(HB.habitatOf(decor, plots, { hour: 7, outdoors: out })).includes('rabbit')); // rabbits graze at dawn
  assert.ok(!ids(HB.habitatOf(decor, plots, { hour: 12, rain: true, outdoors: out })).includes('butterfly'));
  assert.ok(ids(HB.habitatOf(decor, plots, { hour: 12, rain: true, outdoors: out })).includes('snail'));
  assert.deepEqual(ids(HB.habitatOf([], [], {})), []);
});

test('visitors stand by their favourite spot, and spotting one pays once', () => {
  const decor = [{ item: 'pond', i: 4, j: 12 }];
  const placed = HB.placeVisitors([HB.VISITORS.find(v => v.id === 'frog')], decor, []);
  assert.ok(Math.abs(placed[0].x - 4.5) <= 1 && Math.abs(placed[0].y - 12.5) <= 1);
  const bf = HB.placeVisitors([HB.VISITORS.find(v => v.id === 'butterfly')], [], [[2, 9, 'tomato'], [5, 9, 'tulip']]);
  assert.deepEqual(bf[0].beds, [[5.5, 9.5]]); // butterflies only visit the flower beds
  const P = {};
  assert.equal(HB.spot(P, 'frog', 3).coins, HB.SPOT_REWARD);
  assert.equal(HB.spot(P, 'frog', 4), null);
  for (const v of HB.VISITORS) if (v.id !== 'owl') HB.spot(P, v.id, 5);
  const last = HB.spot(P, 'owl', 6);
  assert.ok(last.done);
  assert.equal(last.coins, HB.SPOT_REWARD + HB.COMPLETE_REWARD);
});

test('visits are the same all day, and most days a species with a home shows up', () => {
  const h = { pond: 1, crops: 0, flowers: 0, day: true };
  assert.deepEqual(HB.visitorsToday(h, 9), HB.visitorsToday(h, 9));
  let seen = 0; for (let d = 0; d < 100; d++) if (HB.visitorsToday(h, d).some(v => v.id === 'frog')) seen++;
  assert.ok(seen > 60 && seen < 95, String(seen));
});

// a seeded random so the routines are repeatable
const seeded = (n = 7) => () => (n = (n * 16807) % 2147483647) / 2147483647;
const run = (id, secs, extra = {}) => {
  const rnd = seeded(), v = { id, ax: 5.5, ay: 12.5, beds: [[3.5, 12.5], [7.5, 12.5]], flowers: [[7.5, 12.5]], ...extra };
  const c = CR.makeCritter(v, rnd), track = [];
  for (let k = 0; k < secs * 20; k++) { CR.stepCritter(c, 0.05, { rnd, ok: () => true }); track.push({ x: c.x, y: c.y, h: c.h, mode: c.mode }); }
  return { c, track };
};

test('every visitor has a drawn animal and moves on its own', () => {
  const fake = new Proxy({}, { get: (o, k) => (k in o ? o[k] : () => {}), set: (o, k, v) => ((o[k] = v), true) });
  for (const v of HB.VISITORS) {
    const { c, track } = run(v.id, 30);
    const moved = track.some(p => Math.hypot(p.x - track[0].x, p.y - track[0].y) > 0.05 || Math.abs(p.h - track[0].h) > 1);
    assert.ok(moved, v.id + ' never moved');
    for (const p of track) assert.ok(Number.isFinite(p.x) && Number.isFinite(p.y) && Number.isFinite(p.h), v.id);
    assert.doesNotThrow(() => CR.drawCritter(fake, c, (x, y, h) => [x * 10, y * 10 - h], 1, 3), v.id);
  }
});

test('each animal keeps to its home: frogs by the pond, ducks on it, snails crawl slowly', () => {
  const frog = run('frog', 60).track;
  assert.ok(frog.every(p => Math.hypot(p.x - 5.5, p.y - 12.5) < 0.9), 'the frog stays by the pond');
  assert.ok(frog.some(p => p.mode === 'hop' && p.h > 4), 'the frog hops');
  const duck = run('duck', 60).track;
  assert.ok(duck.every(p => Math.hypot(p.x - 5.5, p.y - 12.5) < 0.45 && p.h === 0), 'the duck stays on the water');
  assert.ok(duck.some(p => p.mode === 'dabble'), 'the duck dabbles');
  const snail = run('snail', 30).track;
  let fastest = 0; for (let k = 1; k < snail.length; k++) fastest = Math.max(fastest, Math.hypot(snail[k].x - snail[k - 1].x, snail[k].y - snail[k - 1].y) / 0.05);
  assert.ok(fastest < 0.1, 'snails are slow: ' + fastest);
  const owl = run('owl', 60).track;
  assert.ok(owl.filter(p => p.mode === 'perch').length > owl.length / 3, 'the owl mostly watches from its perch');
  const bird = run('songbird', 90).track;
  assert.ok(bird.some(p => p.h > 30) && bird.some(p => p.h === 0), 'the robin perches on the bath and hops on the ground');
});
