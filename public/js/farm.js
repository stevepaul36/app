// Farm animals and pets. Put a chicken coop or a paddock outside your home, buy animals for it, and look
// after them: feed them hay and give them a pat. An animal fed today has something for you tomorrow
// (an egg, milk, or wool every other day). Care fills its hearts, and at five hearts it gives double.
// Nothing is ever lost: a hungry animal simply has nothing to give that day. A pet follows you around
// town. All plain data and rules, so it's easy to test.

export const ANIMALS = {
  chicken: { name: 'Chicken', icon: '🐔', home: 'coop', price: 40, product: 'egg', every: 1 },
  cow: { name: 'Cow', icon: '🐄', home: 'paddock', price: 120, product: 'milk', every: 1 },
  sheep: { name: 'Sheep', icon: '🐑', home: 'paddock', price: 90, product: 'wool', every: 2 },
};
export const PETS = {
  dog: { name: 'Puppy', icon: '🐶', price: 30 },
  cat: { name: 'Kitten', icon: '🐱', price: 30 },
};
export const ROOM = { coop: 3, paddock: 2 }; // animals each home holds
export const HAY_COST = 2;
export const MAX_LOVE = 10; // two love make a heart; five hearts give double
// names to pick from, so there's no typed text
export const NAMES = ['Clover', 'Pebble', 'Nutmeg', 'Daisy', 'Maple', 'Pip', 'Bramble', 'Honey', 'Sprout', 'Biscuit', 'Juniper', 'Toffee', 'Willow', 'Button', 'Hazel', 'Poppy'];

export function ensure(P) {
  P.farm ||= {};
  P.farm.animals ||= [];
  if (P.farm.pet === undefined) P.farm.pet = null;
  P.farm.nextId ||= 1;
  return P.farm;
}
export const hearts = a => Math.floor(Math.min(MAX_LOVE, a.love || 0) / 2);

/** How many more of this kind fit, given how many coops and paddocks are placed outside. */
export function roomFor(P, kind, homes) {
  const home = ANIMALS[kind].home;
  const used = ensure(P).animals.filter(a => ANIMALS[a.kind].home === home).length;
  return (homes[home] || 0) * ROOM[home] - used;
}
/** A name nobody in the farm has yet. */
export function freeName(P, seed = 0) {
  const taken = new Set([...ensure(P).animals.map(a => a.name), P.farm.pet && P.farm.pet.name]);
  for (let k = 0; k < NAMES.length; k++) { const n = NAMES[(seed + k) % NAMES.length]; if (!taken.has(n)) return n; }
  return NAMES[seed % NAMES.length] + ' ' + (P.farm.nextId);
}

export function buy(P, kind, you, homes, day, name) {
  const A = ANIMALS[kind];
  if (!A) return { ok: false, msg: 'There is no such animal.' };
  if (roomFor(P, kind, homes) <= 0) return { ok: false, msg: homes[A.home] ? `Your ${A.home === 'coop' ? 'coop is' : 'paddock is'} full. Place another outside your home.` : `First place a ${A.home === 'coop' ? 'chicken coop' : 'paddock'} outside your home.` };
  if (you.coins < A.price) return { ok: false, msg: `A ${A.name.toLowerCase()} costs ✦ ${A.price}.` };
  you.coins -= A.price;
  const F = ensure(P), a = { id: F.nextId++, kind, name: name || freeName(P, F.nextId), love: 0, born: day, fedOn: null, pettedOn: null, collectedOn: null };
  F.animals.push(a);
  return { ok: true, animal: a, msg: `${A.icon} ${a.name} the ${A.name.toLowerCase()} moved in! Feed them hay today and they'll have ${articled(A.product)} for you tomorrow.` };
}
const articled = p => ({ egg: 'an egg', milk: 'milk', wool: 'wool' }[p]);

/** Is there something to collect today? Fed on an earlier day, not collected since, and (for sheep) every other day. */
export function ready(a, day) {
  const A = ANIMALS[a.kind];
  if (a.fedOn == null || a.fedOn >= day) return false;
  if (a.collectedOn != null && a.collectedOn > a.fedOn) return false;
  if (a.collectedOn != null && day - a.collectedOn < A.every) return false;
  return true;
}
export const amount = a => (hearts(a) >= 5 ? 2 : 1);

export function feed(P, id, inv, day) {
  const a = ensure(P).animals.find(x => x.id === id);
  if (!a) return { ok: false };
  if (a.fedOn === day) return { ok: false, msg: `${a.name} has already eaten today.` };
  if ((inv.hay || 0) < 1) return { ok: false, msg: 'You need hay. Buy some in the Barnyard.' };
  inv.hay--; a.fedOn = day; a.love = Math.min(MAX_LOVE, (a.love || 0) + 1);
  return { ok: true, msg: `${ANIMALS[a.kind].icon} ${a.name} munches happily.` };
}
export function pet(P, id, day) {
  const F = ensure(P), a = id === 'pet' ? F.pet : F.animals.find(x => x.id === id);
  if (!a) return { ok: false };
  if (a.pettedOn === day) return { ok: false, msg: `${a.name} already had a cuddle today.` };
  a.pettedOn = day; a.love = Math.min(MAX_LOVE, (a.love || 0) + 1);
  return { ok: true, msg: `💕 ${a.name} loves that.` };
}
export function collect(P, id, inv, day) {
  const a = ensure(P).animals.find(x => x.id === id);
  if (!a || !ready(a, day)) return null;
  const item = ANIMALS[a.kind].product, n = amount(a);
  inv[item] = (inv[item] || 0) + n; a.collectedOn = day;
  return { item, n, name: a.name };
}
export function adopt(P, kind, you, day, name) {
  const T = PETS[kind], F = ensure(P);
  if (!T) return { ok: false };
  if (F.pet) return { ok: false, msg: `${F.pet.name} is already your pet.` };
  if (you.coins < T.price) return { ok: false, msg: `Adopting costs ✦ ${T.price} for food and a bed.` };
  you.coins -= T.price;
  F.pet = { kind, name: name || freeName(P, day), love: 0, since: day, pettedOn: null };
  return { ok: true, msg: `${T.icon} ${F.pet.name} is your new pet! They'll follow you everywhere.` };
}
/** Walking past an animal looks after it: collect what's ready, else feed it if you have hay, else a pat. */
export function tend(P, id, inv, day) {
  const got = collect(P, id, inv, day);
  if (got) return { kind: 'collect', ...got };
  const a = ensure(P).animals.find(x => x.id === id);
  if (!a) return null;
  if (a.fedOn !== day && (inv.hay || 0) > 0) { const r = feed(P, id, inv, day); return r.ok ? { kind: 'feed', msg: r.msg } : null; }
  if (a.pettedOn !== day) { const r = pet(P, id, day); return r.ok ? { kind: 'pet', msg: r.msg } : null; }
  return null;
}
