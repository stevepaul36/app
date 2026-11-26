import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../public/js/estate.js';
import * as D from '../public/js/dice.js';
import * as F from '../public/js/fate.js';

const homes = Array.from({ length: 22 }, (_, k) => ({ id: 'h' + k, i: (k % 6) * 5, j: Math.floor(k / 6) * 5, price: 200 + k * 20, rent: 10 + k }));
const districtOf = h => (h.i < 15 ? 'a' : 'b') + (h.j < 10 ? 'n' : 's');
const fresh = () => {
  const T = D.ensure(E.newTown(homes, E.makeStreets(homes, districtOf, {}), [{ name: 'Pip', traits: ['Neat'], home: [0, 0] }, { name: 'Bo', traits: ['Playful'], home: [25, 15] }], 3));
  const Est = F.ensure({}, T);
  return { T, Est, towns: { t: T }, you: { coins: 1000 } };
};
const seq = (...xs) => { let k = 0; return () => xs[k++ % xs.length]; };

test('three draws a day, two more can be unlocked, and a new day resets them', () => {
  const { T, Est, you } = fresh();
  for (let k = 0; k < 3; k++) assert.ok(F.draw(Est, T, you, 1, Math.random, 't', { kind: 'key' }).ok || T.auction);
  // golden keys can add bonus draws, so use them all up
  while (F.drawsLeft(Est, 1) > 0) F.draw(Est, T, you, 1, Math.random, 't', { kind: 'surprise' }), T.auction = null;
  assert.match(F.draw(Est, T, you, 1).msg, /No draws left/);
  assert.ok(F.buyDraw(Est, you, 1).ok);
  assert.ok(F.buyDraw(Est, you, 1).ok);
  assert.match(F.buyDraw(Est, you, 1).msg, /all the extra draws/);
  assert.equal(F.drawsLeft(Est, 1), 2);
  assert.equal(F.drawsLeft(Est, 2), F.DRAWS_PER_DAY);
});

test('draws are random, not fixed by the day: the same day gives different cards', () => {
  const kinds = new Set();
  for (let k = 0; k < 40; k++) { const { T, Est, you } = fresh(); const out = F.draw(Est, T, you, 5); kinds.add(out.card.kind); }
  assert.ok(kinds.size >= 4, [...kinds].join());
});

test('a bargain is below value and can be bought today only', () => {
  const { T, Est, you } = fresh();
  const out = F.draw(Est, T, you, 1, seq(0.1, 0.2, 0.5), 't', { kind: 'offer' });
  const o = out.offer;
  assert.ok(o.price < E.value(T, o.id));
  assert.match(F.takeOffer(Est, T, you, 2).msg, /ended/);
  T.offer = o;
  const before = you.coins;
  assert.ok(F.takeOffer(Est, T, you, 1).ok);
  assert.equal(T.deeds[o.id].owner, 'you');
  assert.equal(you.coins, before - o.price);
});

test('rent must be paid: short of coins, the bank lends you the rest up to your limit', () => {
  const { T, Est, towns } = fresh();
  const id = Object.keys(T.deeds).find(h => T.deeds[h].owner === 'bank');
  T.deeds[id].owner = 'Pip';
  const you = { coins: 5 };
  const out = F.draw(Est, T, you, 1, () => 0, 't', { kind: 'rent' });
  assert.equal(out.costs[0].to, 'Pip');
  const pipBefore = T.npc.Pip.coins;
  const msgs = E.payCosts(Est, towns, out.costs, you, 1);
  assert.match(msgs[0], /bank lent you/);
  assert.ok(Est.debt > 0);
  assert.equal(you.coins, 0);
  assert.equal(T.npc.Pip.coins, pipBefore + out.costs[0].amount);
  assert.ok(Est.debt <= F.creditLimit(Est, towns));
});

test('loans grow 5% a morning, the bank takes half your purse, and repaying clears them', () => {
  const { Est, towns } = fresh();
  Est.debt = 100;
  const you = { coins: 40 };
  F.morningLoans(Est, towns, you);
  assert.equal(Est.debt, 105 - 20);
  assert.equal(you.coins, 20);
  you.coins = 500;
  assert.ok(F.repay(Est, you, 1000).ok);
  assert.equal(Est.debt, 0);
  assert.equal(you.coins, 415);
  assert.ok(F.borrow(Est, towns, you, 99999).ok);
  assert.equal(Est.debt, F.creditLimit(Est, towns));
  assert.match(F.borrow(Est, towns, you, 10).msg, /won’t lend/);
});

test('a neighbour who can’t pay your rent owes you, pays it back, and only goes bankrupt past the limit', () => {
  const { T, Est, towns } = fresh();
  for (const id of E.ownedBy(T, 'Pip')) T.deeds[id].owner = 'bank'; // nothing to mortgage
  T.npc.Pip.coins = 10;
  const you = { coins: 0 };
  const paid = D.npcPay(T, 'Pip', 60, 'you', you, 1);
  assert.equal(paid, 10);
  assert.equal(T.ious.Pip.you, 50);
  assert.ok(E.ownedBy(T, 'Pip').length >= 0);
  T.npc.Pip.coins = 45;
  F.morningLoans(Est, towns, you);
  assert.equal(T.ious.Pip.you, 25);
  T.npc.Pip.coins = 0;
  D.npcPay(T, 'Pip', 400, 'you', you, 1);
  assert.equal(T.ious.Pip, undefined); // over the limit: bankrupt instead
});

test('zoning: a new rule, then an inspection fines homes built too high (a permit covers one)', () => {
  const { T, Est, you } = fresh();
  F.draw(Est, T, you, 1, () => 0, 't', { kind: 'zoning' });
  const st = Object.keys(T.zones)[0];
  assert.ok(st);
  const z = T.zones[st];
  const id = T.streets.find(s => s.id === st).homes[0];
  Object.assign(T.deeds[id], { owner: 'you', level: z.max + 2 });
  const out = F.draw(Est, T, you, 1, () => 0.99, 't', { kind: 'zoning' });
  assert.equal(out.card.title, 'Zoning inspection');
  assert.equal(out.costs[0].amount, Math.round(E.renovateCost(T, id) * 0.3 * 2));
  Est.permits = 1;
  const out2 = F.draw(Est, T, you, 1, () => 0.99, 't', { kind: 'zoning' });
  assert.equal(out2.costs.length, 0);
});

test('the leaderboard counts every town and takes loans off your worth', () => {
  const { T, Est, towns } = fresh();
  const id = Object.keys(T.deeds).find(h => T.deeds[h].owner === 'bank');
  T.deeds[id].owner = 'you';
  Est.debt = 50;
  const rows = F.leaderboard(Est, towns, 100);
  const me = rows.find(r => r.you);
  assert.equal(me.worth, 100 - 50 + E.worth(T, 'you', 0));
  assert.equal(me.homes, 1);
  assert.equal(rows.length, 3);
  assert.ok(rows[0].worth >= rows[1].worth);
});
