// Habitat garden: what you put in your yard, and what grows in your beds, decides which animals
// come to visit. Walk up to a visitor to record it in your Nature Journal. Every species shows a hint
// of what it likes, so finding them all is a little puzzle rather than luck.

export const YARD_ITEMS = ['pond', 'birdbath', 'beehotel', 'feeder', 'logpile'];
const FLOWERS = ['tulip', 'sunflower'];

export const VISITORS = [
  { id: 'ladybird', name: 'Ladybird', icon: '🐞', hint: 'any crop growing in a bed', near: 'plot', needs: h => h.crops >= 1 && h.day },
  { id: 'butterfly', name: 'Butterfly', icon: '🦋', hint: 'flowers growing in two beds', near: 'plot', needs: h => h.flowers >= 2 && h.day },
  { id: 'bee', name: 'Bumblebee', icon: '🐝', hint: 'a bee hotel and flowers growing', near: 'beehotel', needs: h => h.beehotel && h.flowers >= 1 && h.day },
  { id: 'frog', name: 'Frog', icon: '🐸', hint: 'a lily pond', near: 'pond', needs: h => h.pond },
  { id: 'duck', name: 'Duck', icon: '🦆', hint: 'a lily pond and a log pile to rest by', near: 'pond', needs: h => h.pond && h.logpile && h.day },
  { id: 'snail', name: 'Snail', icon: '🐌', hint: 'a lily pond on a rainy day', near: 'pond', needs: h => h.pond && h.rain },
  { id: 'songbird', name: 'Songbird', icon: '🐦', hint: 'a bird bath', near: 'birdbath', needs: h => h.birdbath && h.day },
  { id: 'squirrel', name: 'Squirrel', icon: '🐿️', hint: 'a nut feeder', near: 'feeder', needs: h => h.feeder && h.day },
  { id: 'hedgehog', name: 'Hedgehog', icon: '🦔', hint: 'a log pile', near: 'logpile', needs: h => h.logpile },
  { id: 'owl', name: 'Owl', icon: '🦉', hint: 'a log pile and a nut feeder, after dark', near: 'feeder', needs: h => h.logpile && h.feeder && h.night },
  { id: 'rabbit', name: 'Wild rabbit', icon: '🐇', hint: 'three beds growing and a log pile', near: 'plot', needs: h => h.crops >= 3 && h.logpile && h.day },
];
export const SPOT_REWARD = 20;
export const COMPLETE_REWARD = 150;

/** What the yard offers: counts of each yard item placed outdoors, crops growing, time and weather. */
export function habitatOf(decor, plots, { hour = 12, rain = false, outdoors = () => true } = {}) {
  const h = { crops: 0, flowers: 0, rain, night: hour >= 20 || hour < 6, day: hour >= 6 && hour < 20 };
  for (const k of YARD_ITEMS) h[k] = 0;
  for (const d of decor || []) if (YARD_ITEMS.includes(d.item) && outdoors(d.i, d.j)) h[d.item]++;
  for (const p of plots || []) if (p && p.crop) { h.crops++; if (FLOWERS.includes(p.crop)) h.flowers++; }
  return h;
}
// a repeatable 0..1 number for a species on a day, so visits are the same all day on every device
const roll = (day, id) => { let x = day * 2654435761 >>> 0; for (const c of id) x = (x ^ c.charCodeAt(0)) * 16777619 >>> 0; return (x % 1000) / 1000; };
/** Who visits today: species whose habitat is there, most days (four days in five). */
export function visitorsToday(h, day) {
  return VISITORS.filter(v => v.needs(h) && roll(day, v.id) < 0.8);
}
/** Where each visitor hangs out: next to the first matching yard item or bed, nudged so they don't overlap. */
export function placeVisitors(list, decor, plotTiles, outdoors = () => true) {
  const out = [], used = new Map();
  for (const v of list) {
    const spots = v.near === 'plot' ? plotTiles : (decor || []).filter(d => d.item === v.near && outdoors(d.i, d.j)).map(d => [d.i, d.j]);
    if (!spots.length) continue;
    const n = used.get(v.near) || 0; used.set(v.near, n + 1);
    const [i, j] = spots[n % spots.length], off = [[0.5, 1.25], [1.25, 0.5], [-0.25, 0.5], [0.5, -0.25]][n % 4];
    out.push({ ...v, x: i + off[0], y: j + off[1] });
  }
  return out;
}
/** Record a sighting. Returns the reward lines, or null if it was already in the journal. */
export function spot(P, id, day) {
  P.nature ||= {};
  if (P.nature[id]) return null;
  P.nature[id] = day;
  const v = VISITORS.find(x => x.id === id);
  const done = VISITORS.every(x => P.nature[x.id]);
  return { coins: SPOT_REWARD + (done ? COMPLETE_REWARD : 0), msg: `📖 New in your Nature Journal: ${v.icon} ${v.name}! +${SPOT_REWARD} ✦`, done };
}
