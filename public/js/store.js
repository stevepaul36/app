// The furniture store and your own yard stall.
// Store: furniture sorted by room, three deals a day at 30% off, a little stock of each piece that
// refills every morning, and anything you no longer want sells back for half what it cost.
// Stall: put a market stall outside your home, set out up to four things at your own prices, and
// neighbours shop at it overnight. Fair prices sell; greedy ones sit on the table. Plain rules only.

export const MARKUP = 3; // shop price = an item's value x 3 (matches the game's furniture prices)
export const DEAL_OFF = 0.3;
export const DAILY_STOCK = 3;
export const STALL_SLOTS = 4;

// Every piece of furniture belongs to one room of the store.
export const ROOMS = [
  { id: 'living', name: 'Living room', icon: '🛋️', items: ['cosychair', 'sidetable', 'beanbag', 'rug', 'cushions', 'piano', 'fireplace', 'grandclock', 'tallshelf', 'bookstack', 'globe', 'recordplayer'] },
  { id: 'bedroom', name: 'Bedroom & bath', icon: '🛏️', items: ['teddy', 'cot', 'toybox', 'dresser', 'mirror', 'bathtub'] },
  { id: 'deco', name: 'Plants & decor', icon: '🪴', items: ['plantpot', 'vase', 'cactus', 'bonsai', 'aquarium', 'easel', 'shellchime', 'jackolantern', 'stool'] },
  { id: 'lights', name: 'Lights & fun', icon: '💡', items: ['lamp', 'fairylights', 'telescope'] },
  { id: 'garden', name: 'Garden', icon: '🌳', items: ['fence', 'hedge', 'stonepath', 'swing', 'gazebo', 'well', 'shed', 'stall'] },
  { id: 'wild', name: 'Wildlife & farm', icon: '🐝', items: ['pond', 'birdbath', 'beehotel', 'feeder', 'logpile', 'coop', 'paddock'] },
];
export const roomOf = k => ROOMS.find(r => r.items.includes(k));

// a repeatable number for a day, so everyone sees the same deals
const roll = (day, salt) => { let x = (day * 2654435761 + salt * 40503) >>> 0; x ^= x >>> 15; x = Math.imul(x, 2246822519) >>> 0; x ^= x >>> 13; return (x >>> 0) / 4294967296; };

/** Three pieces on sale today, from three different rooms. */
export function dealsFor(day, items) {
  const pool = ROOMS.map(r => r.items.filter(k => items[k])).filter(l => l.length);
  const out = [];
  for (let n = 0; out.length < 3 && n < 20; n++) {
    const room = pool[Math.floor(roll(day, n * 7 + 1) * pool.length)], k = room[Math.floor(roll(day, n * 7 + 2) * room.length)];
    if (!out.includes(k) && !out.some(x => room.includes(x))) out.push(k);
  }
  return out;
}
export function priceOf(k, day, items) {
  const base = items[k].price * MARKUP;
  return dealsFor(day, items).includes(k) ? Math.round(base * (1 - DEAL_OFF)) : base;
}
/** What's left of a piece in the store today. */
export function stockLeft(P, k, day) {
  const s = P.store && P.store.day === day ? P.store.bought[k] || 0 : 0;
  return Math.max(0, DAILY_STOCK - s);
}
export function buy(P, k, day, you, items) {
  if (!items[k] || items[k].cat !== 'decor') return { ok: false, msg: 'That isn’t sold here.' };
  if (stockLeft(P, k, day) < 1) return { ok: false, msg: 'Sold out today. New stock arrives tomorrow morning.' };
  const cost = priceOf(k, day, items);
  if (you.coins < cost) return { ok: false, msg: `You need ✦ ${cost}.` };
  you.coins -= cost;
  if (!P.store || P.store.day !== day) P.store = { day, bought: {} };
  P.store.bought[k] = (P.store.bought[k] || 0) + 1;
  return { ok: true, cost, msg: `Bought ${items[k].one}${cost < items[k].price * MARKUP ? ' (on sale!)' : ''}.` };
}
export const sellBackPrice = (k, items) => Math.floor(items[k].price * MARKUP / 2);

// ---------- your yard stall ----------
export function stallOf(P) { P.stall ||= { slots: [], till: 0, lastDay: null, log: [] }; return P.stall; }
/** Put something from your bag on the stall at a price. */
export function list(P, k, price, inv, items) {
  const st = stallOf(P);
  if (st.slots.length >= STALL_SLOTS) return { ok: false, msg: `Your stall holds ${STALL_SLOTS} things.` };
  if (!items[k] || !items[k].price || items[k].cat === 'seed') return { ok: false, msg: 'You can’t sell that.' };
  if ((inv[k] || 0) < 1) return { ok: false, msg: 'You don’t have one.' };
  inv[k]--; st.slots.push({ item: k, price: Math.max(1, Math.round(price)) });
  return { ok: true };
}
export function unlist(P, n, inv) {
  const st = stallOf(P), s = st.slots[n];
  if (!s) return false;
  inv[s.item] = (inv[s.item] || 0) + 1; st.slots.splice(n, 1);
  return true;
}
/** How likely a neighbour buys at this price: almost surely at its value, rarely at double. */
export function saleChance(price, value) {
  const r = price / Math.max(1, value);
  return r <= 1 ? 0.9 : r >= 2.5 ? 0.04 : Math.max(0.04, 0.9 - (r - 1) * 0.6);
}
// what a fair asking price is: a little over its value at the market
export const fairPrice = (k, items) => Math.max(1, Math.round(items[k].price * 1.2));
/**
 * Neighbours shop at your stall overnight, once for each morning since you last looked (up to 3).
 * Coins go into the till. Returns the sales.
 */
export function settle(P, day, items, names = ['A neighbour']) {
  const st = stallOf(P), sales = [];
  if (st.lastDay == null) { st.lastDay = day; return sales; }
  const from = Math.max(st.lastDay + 1, day - 2);
  for (let d = from; d <= day; d++) {
    for (let n = st.slots.length - 1; n >= 0; n--) {
      const s = st.slots[n];
      if (roll(d, n * 13 + s.item.length + s.price) < saleChance(s.price, items[s.item].price)) {
        const who = names[Math.floor(roll(d, n * 5 + 3) * names.length)];
        sales.push({ item: s.item, price: s.price, who, day: d });
        st.till += s.price; st.slots.splice(n, 1);
      }
    }
  }
  st.lastDay = Math.max(st.lastDay, day);
  st.log = [...sales, ...st.log].slice(0, 8);
  return sales;
}
export function emptyTill(P) { const st = stallOf(P), n = st.till; st.till = 0; return n; }
