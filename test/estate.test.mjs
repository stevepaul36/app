import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../public/js/estate.js';

// A small town: two districts. a has 5 homes (streets of 3 + 2), b has 2 (one street).
const homes = [
  { id: 'h1', i: 1, j: 1, price: 200, rent: 10 }, { id: 'h2', i: 2, j: 1, price: 220, rent: 11 }, { id: 'h3', i: 3, j: 1, price: 240, rent: 12 },
  { id: 'h4', i: 1, j: 5, price: 300, rent: 15 }, { id: 'h5', i: 2, j: 5, price: 320, rent: 16 },
  { id: 'h6', i: 20, j: 20, price: 500, rent: 25 }, { id: 'h7', i: 21, j: 20, price: 520, rent: 26 },
];
const districtOf = h => (h.i < 10 ? 'a' : 'b');
const info = { a: ['Acorn Lane', '#E8823A'], b: ['Bay Side', '#2E9BD6'] };
const fresh = (neighbours = []) => {
  const streets = E.makeStreets(homes, districtOf, info);
  const T = E.newTown(homes, streets, neighbours, 7);
  return { T, Est: {}, you: { coins: 5000 } };
};

test('streets: districts split into streets of 2-3 neighbouring homes', () => {
  const s = E.makeStreets(homes, districtOf, info);
  assert.deepEqual(s.map(x => x.homes.length).sort(), [2, 2, 3]);
  assert.ok(s.every(x => x.name && x.color));
  assert.equal(new Set(s.flatMap(x => x.homes)).size, homes.length);
});

test('neighbours start in the home nearest where they live, and won’t sell it', () => {
  const { T } = fresh([{ name: 'Pip', traits: ['Shy'], home: [20, 20] }]);
  assert.equal(T.deeds.h6.owner, 'Pip');
  assert.equal(T.deeds.h6.lives, 'Pip');
  assert.equal(E.askPrice(T, 'h6'), null);
});

test('buying from the bank, full street doubles rent, selling pays 70%', () => {
  const { T, Est, you } = fresh();
  const before = you.coins;
  assert.ok(E.buyFromBank(Est, T, 'h6', you, 1).ok);
  assert.equal(you.coins, before - 500);
  assert.equal(E.rentOf(T, 'h6'), 25);
  assert.ok(E.buyFromBank(Est, T, 'h7', you, 1).ok);
  assert.ok(E.fullStreet(T, 'h6'));
  assert.equal(E.rentOf(T, 'h6'), 50); // street set: double rent
  assert.ok(E.value(T, 'h6') > 500); // and worth a bit more
  const c = you.coins;
  const v = E.value(T, 'h7');
  assert.ok(E.sellToBank(Est, T, 'h7', you, 1).ok);
  assert.equal(you.coins, c + Math.round(v * 0.7));
  assert.equal(T.deeds.h7.owner, 'bank');
  assert.equal(E.rentOf(T, 'h6'), 25); // set broken
});

test('can’t buy without enough coins, or a home the bank doesn’t own', () => {
  const { T, Est } = fresh([{ name: 'Pip', home: [20, 20] }]);
  assert.equal(E.buyFromBank(Est, T, 'h1', { coins: 10 }, 1).ok, false);
  assert.equal(E.buyFromBank(Est, T, 'h6', { coins: 9999 }, 1).ok, false);
});

test('renovating raises rent and value; mortgaged homes earn nothing and can’t be renovated', () => {
  const { T, Est, you } = fresh();
  E.buyFromBank(Est, T, 'h1', you, 1);
  const r0 = E.rentOf(T, 'h1');
  assert.ok(E.renovate(Est, T, 'h1', you).ok);
  assert.ok(E.rentOf(T, 'h1') > r0);
  E.renovate(Est, T, 'h1', you); E.renovate(Est, T, 'h1', you);
  assert.equal(T.deeds.h1.level, 3);
  assert.equal(E.renovate(Est, T, 'h1', you).ok, false); // already Deluxe
  const c = you.coins;
  assert.ok(E.mortgage(Est, T, 'h1', you).ok);
  assert.ok(you.coins > c);
  assert.equal(E.rentOf(T, 'h1'), 0);
  assert.equal(E.mortgage(Est, T, 'h1', you).ok, false);
  assert.equal(E.setLetting(T, 'h1', true).ok, false);
  const got = you.coins - c;
  assert.equal(E.liftCost(T, 'h1'), Math.round(got * 1.1)); // pay back 10% more
  assert.ok(E.liftMortgage(Est, T, 'h1', you).ok);
  assert.ok(E.rentOf(T, 'h1') > 0);
});

test('selling a mortgaged home pays off the mortgage first', () => {
  const { T, Est, you } = fresh();
  E.buyFromBank(Est, T, 'h1', you, 1);
  E.mortgage(Est, T, 'h1', you);
  const expect = Math.max(0, Math.round(E.value(T, 'h1') * 0.7) - E.liftCost(T, 'h1'));
  const c = you.coins;
  E.sellToBank(Est, T, 'h1', you, 1);
  assert.equal(you.coins, c + expect);
});

test('offers to neighbours: too low is refused (with a hint), enough is accepted', () => {
  const { T, Est, you } = fresh([{ name: 'Pip', traits: ['Neat'], home: [20, 20] }]);
  T.deeds.h1.owner = 'Pip'; // a spare home Pip doesn't live in
  const ask = E.askPrice(T, 'h1');
  assert.ok(ask > E.value(T, 'h1'));
  const low = E.offerToNeighbour(Est, T, 'h1', you, Math.round(ask * 0.95), 1);
  assert.equal(low.ok, false);
  assert.match(low.msg, /So close/);
  const pipBefore = T.npc.Pip.coins;
  assert.ok(E.offerToNeighbour(Est, T, 'h1', you, ask, 1).ok);
  assert.equal(T.deeds.h1.owner, 'you');
  assert.equal(T.npc.Pip.coins, pipBefore + ask);
});

test('swaps: fair trades go through, short ones get a counter, lived-in homes are refused', () => {
  const { T, Est, you } = fresh([{ name: 'Pip', traits: ['Neat'], home: [20, 20] }]);
  E.buyFromBank(Est, T, 'h4', you, 1);
  T.deeds.h1.owner = 'Pip';
  assert.equal(E.proposeSwap(Est, T, { give: [], get: ['h6'], cash: 9999 }, you, 1).ok, false); // Pip lives there
  const short = E.proposeSwap(Est, T, { give: [], get: ['h1'], cash: 10 }, you, 1);
  assert.equal(short.ok, false);
  assert.match(short.msg, /Add about/);
  assert.ok(E.proposeSwap(Est, T, { give: ['h4'], get: ['h1'], cash: 0 }, you, 1).ok); // h4 is worth more than h1
  assert.equal(T.deeds.h1.owner, 'you');
  assert.equal(T.deeds.h4.owner, 'Pip');
});

test('a neighbour’s offer for your home: accepting sells it, mortgage is paid off from the price', () => {
  const { T, Est, you } = fresh([{ name: 'Pip', home: [20, 20] }]);
  E.buyFromBank(Est, T, 'h1', you, 1);
  E.mortgage(Est, T, 'h1', you);
  T.npc.Pip.coins = 5000;
  const offer = { from: 'Pip', id: 'h1', price: 400, day: 1 };
  T.offers = [offer];
  const c = you.coins, owed = E.liftCost(T, 'h1');
  assert.ok(E.answerOffer(Est, T, offer, true, you, 1).ok);
  assert.equal(you.coins, c + 400 - owed);
  assert.equal(T.deeds.h1.owner, 'Pip');
  assert.equal(T.deeds.h1.mort, false);
  assert.equal(T.offers.length, 0);
});

test('renting out: a tenant moves in on a later morning and pays rent each morning', () => {
  const { T, Est, you } = fresh();
  E.buyFromBank(Est, T, 'h1', you, 1);
  E.setLetting(T, 'h1', true);
  let day = 2;
  while (!T.deeds.h1.tenant && day < 40) E.morning(Est, T, day++, you, { letters: false });
  assert.ok(T.deeds.h1.tenant, 'a tenant moved in');
  const c = you.coins;
  const out = E.morning(Est, T, day, you, { letters: false });
  if (T.deeds.h1.tenant || out.events.some(e => /moved out/.test(e))) assert.equal(out.income, E.rentOf(T, 'h1') || out.income);
  assert.ok(you.coins >= c);
});

test('your rent for a neighbour’s home goes to them; their lived-in and let homes aren’t rentable', () => {
  const { T } = fresh([{ name: 'Pip', home: [20, 20] }]);
  assert.equal(E.rentable(T, 'h6'), false);
  T.deeds.h7.owner = 'Pip';
  assert.equal(E.rentable(T, 'h7'), true);
  const c = T.npc.Pip.coins;
  E.payRentTo(T, 'h7', 26);
  assert.equal(T.npc.Pip.coins, c + 26);
  assert.equal(E.rentable(T, 'h1'), true); // bank homes can be rented
});

test('can’t pay: homes get mortgaged, then taken back, then you’re caught and trading freezes', () => {
  const { T, Est, you } = fresh();
  E.buyFromBank(Est, T, 'h1', you, 1);
  you.coins = 0;
  let msgs = E.payCosts(Est, { t: T }, [{ amount: 50, why: 'tax' }], you, 3);
  assert.ok(msgs.some(m => /mortgaged/.test(m)));
  assert.equal(T.deeds.h1.mort, true);
  assert.equal(Est.caughtUntil, undefined);
  you.coins = 0;
  msgs = E.payCosts(Est, { t: T }, [{ amount: 5000, why: 'tax' }], you, 4);
  assert.ok(msgs.some(m => /took back/.test(m)));
  assert.equal(T.deeds.h1.owner, 'bank');
  assert.ok(msgs.some(m => /caught/i.test(m)));
  assert.equal(you.coins, 0);
  assert.ok(E.frozen(Est, 4));
  assert.equal(E.buyFromBank(Est, T, 'h2', { coins: 9999 }, 4).ok, false);
  assert.equal(E.frozen(Est, 5), false); // tomorrow it lifts
  you.coins = 100;
  assert.equal(E.payFines(Est, you), E.CAUGHT_FINE);
  assert.equal(you.coins, 100 - E.CAUGHT_FINE);
});

test('weekly tax is 2% of the homes you own, skipping mortgaged ones', () => {
  const { T, Est, you } = fresh();
  E.buyFromBank(Est, T, 'h6', you, 1);
  E.buyFromBank(Est, T, 'h1', you, 1);
  const all = E.taxDue(T);
  assert.equal(all, Math.round((E.value(T, 'h6') + E.value(T, 'h1')) * 0.02));
  E.mortgage(Est, T, 'h1', you);
  assert.equal(E.taxDue(T), Math.round(E.value(T, 'h6') * 0.02));
});

test('a month of mornings: neighbours buy and sell, coins never go negative, deeds stay valid', () => {
  const ns = ['Pip', 'Biscuit', 'Wren'].map((name, k) => ({ name, traits: [['Neat'], ['Playful'], ['Social Butterfly']][k], home: [homes[k * 2].i, homes[k * 2].j] }));
  const { T, Est, you } = fresh(ns);
  E.buyFromBank(Est, T, 'h3', you, 1);
  E.setLetting(T, 'h3', true);
  const owners0 = JSON.stringify(Object.values(T.deeds).map(d => d.owner));
  for (let day = 2; day < 60; day++) {
    const out = E.morning(Est, T, day, you);
    E.payCosts(Est, { t: T }, out.costs, you, day);
    if (day % 7 === 0) E.payCosts(Est, { t: T }, [{ amount: E.taxDue(T), why: 'tax' }], you, day);
    assert.ok(you.coins >= 0);
    for (const n of Object.values(T.npc)) assert.ok(n.coins >= 0);
    for (const d of Object.values(T.deeds)) {
      assert.ok(d.owner === 'bank' || d.owner === 'you' || T.npc[d.owner]);
      assert.ok(d.level >= 0 && d.level <= 3);
      if (d.lives) assert.equal(d.owner, d.lives); // nobody loses the home they live in
    }
    assert.ok(T.index >= 0.75 && T.index <= 1.4);
  }
  assert.notEqual(JSON.stringify(Object.values(T.deeds).map(d => d.owner)), owners0, 'ownership changed over the month');
  const list = E.richList(T, you.coins);
  assert.equal(list.length, 4);
  assert.ok(list[0].worth >= list[3].worth);
});
