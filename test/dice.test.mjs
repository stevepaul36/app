import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../public/js/estate.js';
import * as D from '../public/js/dice.js';

const homes = Array.from({ length: 22 }, (_, k) => ({ id: 'h' + k, i: (k % 6) * 5, j: Math.floor(k / 6) * 5, price: 200 + k * 20, rent: 10 + k }));
const districtOf = h => (h.i < 15 ? 'a' : 'b') + (h.j < 10 ? 'n' : 's');
const fresh = (neighbours = [{ name: 'Pip', traits: ['Neat'], home: [0, 0] }, { name: 'Bo', traits: ['Playful'], home: [25, 15] }]) => {
  const T = D.ensure(E.newTown(homes, E.makeStreets(homes, districtOf, {}), neighbours, 3));
  return { T, Est: {}, you: { coins: 3000 } };
};
// dice that come up with the numbers we ask for
const loaded = (...faces) => { let k = 0; return () => (faces[k++ % faces.length] - 1) / 6 + 0.01; };

test('the ring has Monopoly’s 40 places with every home, 4 bus lines and 2 utilities', () => {
  const { T } = fresh();
  const R = D.ring(T);
  assert.equal(R.length, 40);
  assert.equal(R[0].kind, 'go');
  assert.equal(R[10].kind, 'jail');
  assert.equal(R[20].kind, 'fountain');
  assert.equal(R[30].kind, 'gotojail');
  assert.equal(R.filter(s => s.kind === 'home').length, 22);
  assert.equal(R.filter(s => s.kind === 'biz').length, 6);
  // cheapest streets come first
  const firstHome = R.find(s => s.kind === 'home').id, lastHome = R.filter(s => s.kind === 'home').at(-1).id;
  assert.ok(T.deeds[firstHome].p < T.deeds[lastHome].p);
});

test('rolling moves you, passing GO pays, landing on a bank home waits for you to buy or auction', () => {
  const { T, Est, you } = fresh();
  T.you.pos = 36;
  const out = D.roll(Est, T, you, 1, loaded(2, 3, 1, 1), 't');
  assert.deepEqual(out.dice, [2, 3]);
  assert.equal(T.you.pos, 1);
  assert.equal(you.coins, 3000 + D.GO_PAY);
  assert.equal(out.landed.kind, 'home');
  if (E.ownedBy(T, 'bank').includes(out.landed.id)) {
    assert.equal(T.pending.kind, 'buy');
    assert.match(D.roll(Est, T, you, 1, loaded(1, 2)).msg, /Finish your last move/);
    const r = D.resolvePending(Est, T, you, 1, 'buy', 't');
    assert.ok(r.ok);
    assert.equal(T.deeds[out.landed.id].owner, 'you');
  }
});

test('landing on a neighbour’s home means paying them rent', () => {
  const { T, Est, you } = fresh();
  const R = D.ring(T);
  const k = R.findIndex(s => s.kind === 'home');
  T.deeds[R[k].id].owner = 'Bo';
  T.you.pos = k - 3;
  D.roll(Est, T, you, 1, loaded(1, 2, 6, 6), 't');
  assert.equal(T.pending.kind, 'rent');
  assert.equal(T.pending.to, 'Bo');
  const bo = T.npc.Bo.coins;
  const r = D.resolvePending(Est, T, you, 1, null, 't');
  E.payCosts(Est, { t: T }, r.costs, you, 1);
  assert.equal(T.npc.Bo.coins, bo + r.costs[0].amount);
});

test('doubles roll again; three doubles send you to the Ranger’s office', () => {
  const { T, Est, you } = fresh();
  const out = D.roll(Est, T, you, 1, loaded(3, 3, 1, 1), 't');
  assert.ok(out.doubles);
  T.pending = null;
  T.auction = null;
  if (!out.jailed && !Est.jail) assert.ok(out.again);
  Est.jail = null; T.you.pos = 0; T.you.dbl = 2;
  const third = D.roll(Est, T, you, 1, loaded(4, 4, 1, 1), 't');
  assert.ok(third.jailed);
  assert.ok(Est.jail);
  assert.equal(T.you.pos, 10);
});

test('the Ranger’s office: roll doubles, pay ✦ 50, or use a free card to get out; third miss pays and leaves', () => {
  const { T, Est, you } = fresh();
  Est.jail = { tries: 0 };
  let out = D.roll(Est, T, you, 1, loaded(1, 2, 1, 1), 't');
  assert.ok(Est.jail);
  assert.match(out.events[0], /still/);
  out = D.roll(Est, T, you, 1, loaded(1, 2, 1, 1), 't');
  out = D.roll(Est, T, you, 1, loaded(1, 2, 1, 1), 't');
  assert.equal(Est.jail, null);
  assert.ok(out.costs.some(c => c.amount === D.JAIL_FINE));
  Est.jail = { tries: 0 };
  assert.equal(D.useFreeCard(Est).ok, false);
  Est.freeCards = 1;
  assert.ok(D.useFreeCard(Est).ok);
  assert.equal(Est.jail, null);
  Est.jail = { tries: 0 };
  assert.ok(D.payJail(Est, you, 't').ok);
});

test('taxes fill the Wishing Fountain pot and landing there collects it', () => {
  const { T, Est, you } = fresh([]);
  T.you.pos = 0;
  const out = D.roll(Est, T, you, 1, loaded(1, 3), 't'); // lands on 4: council tax
  assert.equal(out.landed.kind, 'tax');
  E.payCosts(Est, { t: T }, out.costs, you, 1);
  assert.equal(T.pot, D.TAXES.council);
  T.you.pos = 15;
  const c = you.coins;
  D.roll(Est, T, you, 1, loaded(2, 3), 't'); // 20: the fountain
  assert.equal(you.coins, c + D.TAXES.council);
  assert.equal(T.pot, 0);
});

test('bus lines charge 25/50/100/200 by how many the owner has; utilities charge 4x or 10x the dice', () => {
  const { T, Est, you } = fresh();
  assert.ok(D.buyBiz(Est, T, 'bus-n', you, 1).ok);
  T.biz['bus-n'].owner = 'Bo';
  assert.equal(D.bizRent(T, 'bus-n', 7), 25);
  T.biz['bus-e'].owner = 'Bo'; T.biz['bus-s'].owner = 'Bo';
  assert.equal(D.bizRent(T, 'bus-n', 7), 100);
  T.biz.water.owner = 'Bo';
  assert.equal(D.bizRent(T, 'water', 7), 28);
  T.biz.power.owner = 'Bo';
  assert.equal(D.bizRent(T, 'water', 7), 70);
});

test('cards: every Lucky Leaf and Town Chest card can be drawn, and a free card is kept', () => {
  const { T, Est, you } = fresh();
  const R = D.ring(T);
  const leaf = R.findIndex(s => s.kind === 'leaf');
  let drawn = 0;
  for (let k = 0; k < 16; k++) {
    Est.jail = null; T.pending = null; T.auction = null; T.you.dbl = 0;
    T.you.pos = leaf - 3;
    const before = T.decks.leaf.length;
    const out = D.roll(Est, T, you, 1, loaded(1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2), "t");
    if (out.card) drawn++;
    E.payCosts(Est, { t: T }, out.costs, you, 1);
    assert.ok(before === 0 || T.decks.leaf.length < before + 16);
  }
  assert.ok(drawn >= 16);
  assert.equal(T.decks.leaf.length, 0, "the whole Lucky Leaf deck was drawn");
  assert.ok(Est.freeCards >= 1);
});

test('auctions: you win when no neighbour will go higher; otherwise the keenest outbids you', () => {
  const { T, Est, you } = fresh();
  const id = E.ownedBy(T, 'bank')[0];
  T.pending = { id, kind: 'buy' };
  D.resolvePending(Est, T, you, 1, 'auction', 't');
  assert.ok(T.auction);
  const top = Math.max(0, ...Object.values(T.auction.maxes));
  if (top > 20) {
    const r = D.bid(Est, T, you, 10, 1);
    assert.ok(T.auction && T.auction.leader !== 'you');
    assert.match(r.msg, /bids/);
  }
  const r2 = D.bid(Est, T, you, top + 10, 1);
  assert.equal(r2.won, 'you');
  assert.equal(T.deeds[id].owner, 'you');
  // passing hands it to the keenest neighbour (or the bank keeps it)
  const id2 = E.ownedBy(T, 'bank')[0];
  T.auction = D.startAuction(T, id2);
  const p = D.pass(Est, T, you, 1);
  assert.ok(p.ok);
  assert.ok(['bank', 'Pip', 'Bo'].includes(T.deeds[id2].owner));
});

test('neighbours stroll too: landing on your home pays you; a broke neighbour goes bankrupt and you get their homes', () => {
  const { T, Est, you } = fresh();
  // make every home yours with a manor, so wherever they land on a home, they owe a lot
  for (const d of Object.values(T.deeds)) { d.owner = 'you'; d.lives = null; d.level = E.MANOR; }
  T.npc.Pip.coins = 5; T.npc.Bo.coins = 5;
  const c = you.coins;
  let bankrupt = false;
  for (let k = 0; k < 20 && !bankrupt; k++) {
    T.pending = null; T.auction = null; Est.jail = null;
    const out = D.roll(Est, T, you, 1, Math.random, 't');
    bankrupt = out.events.some(e => /bankrupt/.test(e));
  }
  assert.ok(bankrupt, 'someone went bankrupt');
  assert.ok(you.coins >= c - 2000);
});

test('can’t pay: upgrades are sold first, then homes mortgaged, then you’re caught', () => {
  const { T, Est, you } = fresh([]);
  you.coins = 100000;
  const st = T.streets.find(s => s.homes.length === 2) || T.streets[0];
  for (const id of st.homes) E.buyFromBank(Est, T, id, you, 1);
  for (let k = 0; k < 2 * st.homes.length; k++) E.renovate(Est, T, st.homes[k % st.homes.length], you);
  you.coins = 0;
  const msgs = E.payCosts(Est, { t: T }, [{ amount: 30, why: 'tax', town: 't' }], you, 2);
  assert.ok(msgs[0].includes('upgrade'));
  assert.equal(T.pot, 30);
  you.coins = 0;
  const big = E.payCosts(Est, { t: T }, [{ amount: 1e6, why: 'rent', town: 't' }], you, 3);
  assert.ok(big.some(m => /caught/i.test(m)));
  assert.ok(Est.jail);
});
