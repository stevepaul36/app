// Habitat garden: what you put in your yard, and what grows in your beds, decides which animals
// come to visit. Walk up to a visitor to record it in your Nature Journal. Every species shows a hint
// of what it likes, so finding them all is a little puzzle rather than luck.

export const YARD_ITEMS = ['pond', 'birdbath', 'beehotel', 'feeder', 'logpile'];
const FLOWERS = ['tulip', 'sunflower'];

// Each visitor's needs follow what the real animal does: what it eats, where it shelters, when it's out.
export const VISITORS = [
  { id: 'ladybird', name: 'Ladybird', icon: '🐞', hint: 'crops growing (it eats the aphids on them)', near: 'plot', needs: h => h.crops >= 1 && h.day },
  { id: 'butterfly', name: 'Butterfly', icon: '🦋', hint: 'flowers growing in two beds, on a dry day', near: 'flower', needs: h => h.flowers >= 2 && h.day && !h.rain },
  { id: 'bee', name: 'Mason bee', icon: '🐝', hint: 'a bee hotel to nest in and flowers to feed on', near: 'beehotel', needs: h => h.beehotel && h.flowers >= 1 && h.day && !h.rain },
  { id: 'frog', name: 'Frog', icon: '🐸', hint: 'a lily pond', near: 'pond', needs: h => h.pond },
  { id: 'duck', name: 'Mallard duck', icon: '🦆', hint: 'a lily pond to swim on, by day', near: 'pond', needs: h => h.pond && h.day },
  { id: 'snail', name: 'Snail', icon: '🐌', hint: 'leafy crops to nibble, on a rainy day or at night', near: 'plot', needs: h => h.crops >= 1 && (h.rain || h.night) },
  { id: 'songbird', name: 'Robin', icon: '🐦', hint: 'a bird bath to drink and bathe in', near: 'birdbath', needs: h => h.birdbath && h.day },
  { id: 'squirrel', name: 'Red squirrel', icon: '🐿️', hint: 'a nut feeder', near: 'feeder', needs: h => h.feeder && h.day },
  { id: 'hedgehog', name: 'Hedgehog', icon: '🦔', hint: 'a log pile to sleep under; it comes out at dusk and night', near: 'logpile', needs: h => h.logpile && (h.night || h.dusk) },
  { id: 'rabbit', name: 'Wild rabbit', icon: '🐇', hint: 'two beds of vegetables, at dawn or dusk', near: 'plot', needs: h => h.veg >= 2 && (h.dawn || h.dusk) },
  { id: 'owl', name: 'Tawny owl', icon: '🦉', hint: 'a log pile where mice hide, after dark', near: 'logpile', needs: h => h.logpile && h.night },
];
export const SPOT_REWARD = 20;
export const COMPLETE_REWARD = 150;

/** What the yard offers: counts of each yard item placed outdoors, crops growing, time and weather. */
export function habitatOf(decor, plots, { hour = 12, rain = false, outdoors = () => true } = {}) {
  const h = { crops: 0, flowers: 0, veg: 0, rain, night: hour >= 20 || hour < 6, day: hour >= 6 && hour < 20, dawn: hour >= 5 && hour < 9, dusk: hour >= 17 && hour < 22 };
  for (const k of YARD_ITEMS) h[k] = 0;
  for (const d of decor || []) if (YARD_ITEMS.includes(d.item) && outdoors(d.i, d.j)) h[d.item]++;
  for (const p of plots || []) if (p && p.crop) { h.crops++; if (FLOWERS.includes(p.crop)) h.flowers++; else h.veg++; }
  return h;
}
// a repeatable 0..1 number for a species on a day, so visits are the same all day on every device
const roll = (day, id) => { let x = day * 2654435761 >>> 0; for (const c of id) x = (x ^ c.charCodeAt(0)) * 16777619 >>> 0; return (x % 1000) / 1000; };
/** Who visits today: species whose habitat is there, most days (four days in five). */
export function visitorsToday(h, day) {
  return VISITORS.filter(v => v.needs(h) && roll(day, v.id) < 0.8);
}
/**
 * Where each visitor lives: the yard item (or bed) it belongs to, and the beds it can move between.
 * plotTiles are [i, j, crop] for beds with something growing.
 */
export function placeVisitors(list, decor, plotTiles, outdoors = () => true) {
  const out = [], used = new Map();
  const beds = plotTiles.map(([i, j]) => [i + 0.5, j + 0.5]), flowers = plotTiles.filter(p => FLOWERS.includes(p[2])).map(([i, j]) => [i + 0.5, j + 0.5]);
  for (const v of list) {
    const spots = v.near === 'plot' ? beds : v.near === 'flower' ? flowers : (decor || []).filter(d => d.item === v.near && outdoors(d.i, d.j)).map(d => [d.i + 0.5, d.j + 0.5]);
    if (!spots.length) continue;
    const n = used.get(v.near) || 0; used.set(v.near, n + 1);
    const [ax, ay] = spots[n % spots.length];
    out.push({ ...v, ax, ay, x: ax, y: ay, beds: v.near === 'flower' ? flowers : beds, flowers });
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
