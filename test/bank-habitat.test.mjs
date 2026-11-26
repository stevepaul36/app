import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as BK from '../public/js/bank.js';
import * as HB from '../public/js/habitat.js';
import { ITEMS } from '../public/js/life.js';

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

test('the yard decides who visits: ponds bring frogs, flowers bring butterflies, owls only at night', () => {
  const out = (i, j) => j > 5; // tiles with j above 5 count as outside
  const decor = [{ item: 'pond', i: 1, j: 8 }, { item: 'logpile', i: 3, j: 8 }, { item: 'feeder', i: 5, j: 8 }, { item: 'pond', i: 1, j: 1 }];
  const plots = [{ crop: 'tulip' }, { crop: 'sunflower' }, { crop: 'tomato' }, {}, {}, {}];
  const day = HB.habitatOf(decor, plots, { hour: 12, outdoors: out });
  assert.equal(day.pond, 1); // the indoor pond doesn't count
  assert.equal(day.flowers, 2);
  assert.equal(day.crops, 3);
  const ids = h => HB.VISITORS.filter(v => v.needs(h)).map(v => v.id);
  assert.ok(['frog', 'butterfly', 'hedgehog', 'duck', 'squirrel', 'rabbit', 'ladybird'].every(id => ids(day).includes(id)), ids(day).join());
  assert.ok(!ids(day).includes('owl'));
  const night = HB.habitatOf(decor, plots, { hour: 23, outdoors: out });
  assert.ok(ids(night).includes('owl') && !ids(night).includes('butterfly'));
  assert.deepEqual(ids(HB.habitatOf([], [], {})), []);
});

test('visitors stand by their favourite spot, and spotting one pays once', () => {
  const decor = [{ item: 'pond', i: 4, j: 12 }];
  const placed = HB.placeVisitors([HB.VISITORS.find(v => v.id === 'frog')], decor, []);
  assert.ok(Math.abs(placed[0].x - 4.5) <= 1 && Math.abs(placed[0].y - 12.5) <= 1);
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
