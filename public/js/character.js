// Characters: species, a layered wardrobe (in the spirit of the LPC layer model: body, markings,
// legs, shoes, top, arms, head, hair, accessory, each drawn in a fixed order and recoloured),
// arm poses, held props and the special outfits actions switch to.
import { roundRect, darken, lighten } from './art.js';
import { rng } from './world.js';

export const SPECIES = {
  fox: { label: 'Fox', fur: '#EE8A3C', belly: '#FFF4E6', inner: '#FFC9A6', ears: 'pointy', tail: 'bushy', nose: '#2B2238' },
  bunny: { label: 'Bunny', fur: '#EDE6DE', belly: '#FFFFFF', inner: '#F7B6C6', ears: 'long', tail: 'puff', nose: '#E77D95' },
  bear: { label: 'Bear', fur: '#A06C46', belly: '#E3BE92', inner: '#D9A07A', ears: 'round', tail: 'stub', nose: '#3A2A26' },
  raccoon: { label: 'Raccoon', fur: '#8E939F', belly: '#ECE8E2', inner: '#C9C4BE', ears: 'pointy', tail: 'ringed', nose: '#2B2238', mask: true },
  cat: { label: 'Cat', fur: '#F4B95A', belly: '#FFF2D9', inner: '#F7B6A6', ears: 'cat', tail: 'thin', nose: '#E77D95', stripes: true },
  otter: { label: 'Otter', fur: '#8F5E3E', belly: '#EBCDA7', inner: '#C99A78', ears: 'tiny', tail: 'thick', nose: '#2B2238' },
  sheep: { label: 'Sheep', fur: '#5E4B48', belly: '#F2E6DA', inner: '#C99A9A', ears: 'side', tail: 'stub', nose: '#2B2238', wool: '#FBF7F0' },
  deer: { label: 'Deer', fur: '#C88A57', belly: '#FFF0DC', inner: '#F2C2A2', ears: 'side', tail: 'puff', nose: '#2B2238', antlers: true, spots: true },
};

export const PALETTE = ['#2E9BD6', '#F0587A', '#FFC83D', '#3FA86A', '#8E7CE0', '#FFFFFF', '#26395A', '#F2A93B', '#E8665A', '#7FC8DD', '#C98A4B', '#B9A8EC'];
export const EYE_COLORS = ['#2B2238', '#5A3A22', '#2E6FB8', '#3F8F5A', '#8E4FC9', '#C2412F', '#C99A1E', '#4A9FA8'];
export const HAIR_COLORS = ['#3A2A26', '#8C5A30', '#F2C14E', '#E8665A', '#26395A', '#F7F2EA', '#B97ADB', '#3FA86A'];

// price = coins to unlock in the wardrobe; no price = free from the start
export const WARDROBE = {
  fur: { label: 'Fur', items: [{ id: 0, label: 'Classic' }, { id: 1, label: 'Light' }, { id: 2, label: 'Dark' }] },
  markings: { label: 'Markings', items: [{ id: 'none', label: 'None' }, { id: 'freckles', label: 'Freckles' }, { id: 'patch', label: 'Eye patch' }, { id: 'socks', label: 'White paws' }] },
  eyes: { label: 'Eyes', color: 'eyeColor', palette: EYE_COLORS, items: [{ id: 'round', label: 'Round' }, { id: 'lashes', label: 'Lashes' }, { id: 'happy', label: 'Happy' }, { id: 'sleepy', label: 'Sleepy' }, { id: 'cool', label: 'Unimpressed' }, { id: 'fierce', label: 'Fierce' }, { id: 'wink', label: 'Wink' }, { id: 'dot', label: 'Tiny' }, { id: 'sparkle', label: 'Sparkly', price: 20 }, { id: 'heart', label: 'Hearts', price: 30 }, { id: 'star', label: 'Stars', price: 30 }] },
  brows: { label: 'Brows', items: [{ id: 'none', label: 'None' }, { id: 'soft', label: 'Soft' }, { id: 'raised', label: 'Surprised' }, { id: 'angry', label: 'Grumpy' }, { id: 'worried', label: 'Worried' }, { id: 'bold', label: 'Bold' }] },
  mouth: { label: 'Expression', items: [{ id: 'cat', label: 'Cute' }, { id: 'smile', label: 'Smile' }, { id: 'grin', label: 'Big grin' }, { id: 'laugh', label: 'Laughing' }, { id: 'smirk', label: 'Smirk' }, { id: 'flat', label: 'Serious' }, { id: 'pout', label: 'Pout' }, { id: 'o', label: 'Surprised' }, { id: 'blep', label: 'Tongue out', price: 15 }, { id: 'fang', label: 'Little fang', price: 15 }] },
  cheeks: { label: 'Cheeks', items: [{ id: 'blush', label: 'Blush' }, { id: 'rosy', label: 'Rosy' }, { id: 'none', label: 'None' }] },
  hair: { label: 'Hair', color: 'hairColor', palette: HAIR_COLORS, items: [{ id: 'none', label: 'None' }, { id: 'tuft', label: 'Tuft' }, { id: 'bob', label: 'Bob' }, { id: 'bun', label: 'Bun' }, { id: 'curly', label: 'Curly' }, { id: 'ponytail', label: 'Ponytail' }, { id: 'pigtails', label: 'Pigtails', price: 20 }, { id: 'long', label: 'Long', price: 20 }, { id: 'spiky', label: 'Spiky', price: 25 }, { id: 'mohawk', label: 'Mohawk', price: 30 }] },
  top: { label: 'Top', color: 'topColor', color2: 'top2', items: [{ id: 'tee', label: 'T-shirt' }, { id: 'hoodie', label: 'Hoodie' }, { id: 'stripes', label: 'Stripy top' }, { id: 'dress', label: 'Dress' }, { id: 'jersey', label: 'Sports top', price: 25 }, { id: 'overalls', label: 'Dungarees', price: 30 }, { id: 'sweater', label: 'Jumper', price: 25 }, { id: 'raincoat', label: 'Raincoat', price: 35 }, { id: 'chef', label: 'Chef jacket', price: 40 }, { id: 'jacket', label: 'Jacket', price: 45 }, { id: 'suit', label: 'Smart suit', price: 60 }] },
  bottom: { label: 'Bottoms', color: 'bottomColor', items: [{ id: 'trousers', label: 'Trousers' }, { id: 'jeans', label: 'Jeans' }, { id: 'shorts', label: 'Shorts' }, { id: 'skirt', label: 'Skirt' }] },
  shoes: { label: 'Shoes', color: 'shoeColor', items: [{ id: 'trainers', label: 'Trainers' }, { id: 'boots', label: 'Boots' }, { id: 'sandals', label: 'Sandals' }, { id: 'slippers', label: 'Slippers', price: 15 }, { id: 'wellies', label: 'Wellies', price: 20 }] },
  acc: { label: 'Extras', color: 'accColor', items: [{ id: 'none', label: 'None' }, { id: 'scarf', label: 'Scarf' }, { id: 'bow', label: 'Bow' }, { id: 'cap', label: 'Cap' }, { id: 'beret', label: 'Beret' }, { id: 'backpack', label: 'Backpack' }, { id: 'glasses', label: 'Glasses' }, { id: 'flower', label: 'Flower' }, { id: 'bandana', label: 'Bandana' }, { id: 'sunglasses', label: 'Sunglasses', price: 25 }, { id: 'crown', label: 'Flower crown', price: 30 }, { id: 'headphones', label: 'Headphones', price: 35 }, { id: 'tophat', label: 'Top hat', price: 40 }, { id: 'wizard', label: 'Wizard hat', price: 45 }, { id: 'halo', label: 'Halo', price: 50 }] },
};

const L = (top, topColor, bottomColor, acc, accColor, extra = {}) => ({ fur: 0, markings: 'none', eyes: 'round', eyeColor: '#2B2238', brows: 'none', mouth: 'cat', cheeks: 'blush', hair: 'none', hairColor: '#8C5A30', top, topColor, top2: '#FFFFFF', bottom: 'trousers', bottomColor, shoes: 'trainers', shoeColor: '#FFFFFF', acc, accColor, ...extra });
// Starter looks (also what older saves map to)
export const OUTFITS = [
  L('tee', '#2E9BD6', '#26395A', 'scarf', '#FFC83D'),
  L('dress', '#F0587A', '#3F5A8A', 'bow', '#FFC83D', { hair: 'bob', hairColor: '#E8665A', shoes: 'sandals', shoeColor: '#F0587A' }),
  L('stripes', '#FFC83D', '#5B6B86', 'cap', '#3FA86A', { top2: '#FFFFFF', bottom: 'shorts' }),
  L('hoodie', '#3FA86A', '#8C5A30', 'backpack', '#F0587A', { shoes: 'boots', shoeColor: '#8C5A30' }),
  L('tee', '#8E7CE0', '#26395A', 'glasses', '#26395A', { hair: 'curly', hairColor: '#26395A' }),
  L('stripes', '#FFFFFF', '#2E9BD6', 'scarf', '#F0587A', { top2: '#2E9BD6', bottom: 'skirt' }),
  L('tee', '#F2A93B', '#3F8F6A', 'beret', '#D9485F', { hair: 'tuft', hairColor: '#3A2A26' }),
];

export function normLook(o) {
  if (o && typeof o === 'object') return Object.assign({}, OUTFITS[0], o);
  return OUTFITS[((o | 0) % OUTFITS.length + OUTFITS.length) % OUTFITS.length];
}
// A one-of-a-kind look from a seed, using only free items so neighbours never wear shop exclusives you can't get.
export function randomLook(seed) {
  const r = rng(seed * 7919 + 13), pick = (a) => a[Math.floor(r() * a.length)];
  const free = k => WARDROBE[k].items.filter(i => !i.price).map(i => i.id);
  return { eyes: pick(free('eyes')), eyeColor: pick(EYE_COLORS), brows: pick(free('brows')), mouth: pick(free('mouth')), cheeks: pick(free('cheeks')), fur: pick([0, 0, 1, 2]), markings: pick(['none', 'none', 'freckles', 'socks', 'patch']), hair: pick(free('hair')), hairColor: pick(HAIR_COLORS), top: pick(free('top')), topColor: pick(PALETTE), top2: pick(PALETTE), bottom: pick(free('bottom')), bottomColor: pick(['#26395A', '#5B6B86', '#8C5A30', '#2E9BD6', '#3F8F6A', '#F0587A']), shoes: pick(free('shoes')), shoeColor: pick(PALETTE), acc: pick(free('acc')), accColor: pick(PALETTE) };
}
// What actions dress you in for a moment.
export function occasionLook(base, occasion, saved) {
  saved = saved || {};
  if (occasion === 'sleep') return Object.assign({}, base, { top: 'pyjamas', topColor: '#B9A8EC', top2: '#FFFFFF', bottom: 'pyjamas', bottomColor: '#B9A8EC', shoes: 'slippers', shoeColor: '#F7B6C6', acc: 'none' }, saved.sleep || {});
  if (occasion === 'towel') return Object.assign({}, base, { top: 'towel', topColor: '#7FC8DD', bottom: 'none', shoes: 'none', acc: 'showercap', accColor: '#F0587A' });
  return base;
}

function ellipse(ctx, x, y, rx, ry, fill, stroke, lw = 1.6, rot = 0) {
  ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); }
}

const LONG_SLEEVES = new Set(['hoodie', 'sweater', 'raincoat', 'chef', 'pyjamas', 'jacket', 'suit']);
const BARE = new Set(['towel', 'swim']);

// Draws an animal standing with its feet at (0,0).
// o: t, walk, moving, dir ('front' | 'back'), flip, seed, wave, happy, pose ('stand'|'sit'|'dance'),
//    sitK (0..1, how far into the seat), ground (sitting on the floor), turn (face three-quarters toward
//    where they're heading instead of straight at the camera), asleep, shadow,
//    arms ('hold'|'stir'|'chop'|'scrub'|'wash'|'eat'|'sip'|'type'|'read'|'remote'|'pour'|'toss'|'talk'|'clap'|'browse'|'hug'|'cheer'|'lap'),
//    prop, override ('sleep'|'towel'), shake
const smooth = k => k <= 0 ? 0 : k >= 1 ? 1 : k * k * (3 - 2 * k);
export function drawAnimal(ctx, species, outfit, o = {}) {
  const S = SPECIES[species] || SPECIES.fox;
  let look = normLook(outfit);
  if (o.override) look = occasionLook(look, o.override, o.saved);
  const fur = look.fur === 1 ? lighten(S.fur, 0.2) : look.fur === 2 ? darken(S.fur, 0.18) : S.fur;
  const pawCol = look.markings === 'socks' ? '#FFFFFF' : fur;
  const t = o.t || 0, walk = o.walk || 0, moving = !!o.moving, back = o.dir === 'back';
  const ink = '#2B223866', seed = o.seed || 0;
  const pose = o.pose || 'stand';
  const sitK = pose === 'sit' ? (o.sitK == null ? 1 : o.sitK) : 0, seated = sitK > 0.5;
  const step = moving ? Math.sin(walk) : 0, bob = moving ? Math.abs(Math.cos(walk)) * 2.5 : Math.sin(t * 2 + seed) * (seated ? 0.5 : 0.8);
  // three-quarter turn: the face slides toward where they're looking (local -x is forward), and now and
  // then an idle character glances the other way
  const idle = !moving && !o.arms && !o.asleep && pose !== 'dance';
  const glance = idle ? smooth((Math.sin(t * 0.37 + seed * 1.9) - 0.82) / 0.12) : 0;
  const faceX = back ? 0 : (o.turn ? -3.2 : 0) + glance * (o.turn ? 5.4 : 2.6);
  ctx.save();
  if (o.flip) ctx.scale(-1, 1);
  if (o.shadow !== false) { ctx.fillStyle = 'rgba(33,56,79,.22)'; ctx.beginPath(); ctx.ellipse(0, 0, 15, 5.5, 0, 0, 7); ctx.fill(); }
  if (sitK) ctx.translate(0, (o.ground ? 15 : 9) * smooth(sitK));
  if (moving && !back) ctx.rotate(o.turn ? -0.05 : 0);
  if (pose === 'dance') { const style = seed % 3; ctx.rotate(style === 0 ? Math.sin(t * 6) * 0.14 : style === 1 ? Math.sin(t * 3) * 0.08 : 0); if (style === 2) ctx.translate(Math.sin(t * 5) * 3, 0); }
  if (o.shake) ctx.rotate(Math.sin(t * 40) * 0.12 * o.shake);
  ctx.translate(0, -bob - (pose === 'dance' ? Math.abs(Math.sin(t * 6)) * 4 : 0));

  const tail = () => {
    ctx.save(); ctx.translate(back ? 0 : 10, -18); ctx.rotate((back ? 0 : 0.5) + Math.sin(t * 3 + seed) * 0.15);
    if (S.tail === 'bushy') { ellipse(ctx, 0, -10, 8, 14, fur, ink, 1.4, 0.3); ellipse(ctx, 3, -20, 5, 5.5, '#FFFFFF', null, 1, 0.3); }
    else if (S.tail === 'ringed') { ellipse(ctx, 0, -10, 6.5, 13, fur, ink, 1.4, 0.3); for (let k = 0; k < 3; k++) ellipse(ctx, 1 + k * 1.2, -4 - k * 6, 5.5, 1.6, '#4A4E58', null, 1, 0.3); }
    else if (S.tail === 'puff') ellipse(ctx, 0, -2, 6, 6, back ? '#FFFFFF' : S.belly, ink, 1.4);
    else if (S.tail === 'thin') { ctx.strokeStyle = fur; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(10, -6, 6, -20); ctx.stroke(); }
    else if (S.tail === 'thick') ellipse(ctx, 2, -4, 5, 12, fur, ink, 1.4, 0.8);
    else ellipse(ctx, 0, -2, 4, 4, fur, ink, 1.2);
    ctx.restore();
  };
  if (!back) tail();

  // ---- legs and shoes
  const bottomType = look.top === 'dress' || look.top === 'overalls' ? (look.top === 'overalls' ? 'trousers' : 'none') : look.bottom;
  const legColor = bottomType === 'trousers' || bottomType === 'pyjamas' || bottomType === 'jeans' ? look.bottomColor : fur;
  const legY = -12;
  // seated from the front: shins hang down in front of the seat (feet swing a little); the lap is drawn
  // over the body later. From behind, the seat hides the legs.
  const knee = o.turn ? -3.6 : -1.2;
  const swing = side => (o.ground ? 0 : Math.sin(t * 2.2 + seed + side * 1.3) * 1.1);
  const leg = (x, lift) => {
    if (seated) {
      if (back) return;
      const side = Math.sign(x);
      if (o.ground) { ellipse(ctx, x * 1.15 + knee * 1.6, legY + 6, 6, 3.8, legColor, ink, 1.2); return; }
      ellipse(ctx, x + knee, legY + 8 + swing(side), 3.7, 5, legColor, ink, 1.2);
      if (bottomType === 'pyjamas') ellipse(ctx, x + knee, legY + 8 + swing(side), 0.9, 0.9, look.top2, null);
      return;
    }
    ellipse(ctx, x, legY + 6 - lift, 4.2, 6.5, legColor, ink, 1.2);
    if (bottomType === 'shorts') ellipse(ctx, x, legY + 2 - lift, 4.4, 3.4, look.bottomColor, null);
    if (bottomType === 'jeans') { ellipse(ctx, x, legY + 11 - lift, 4.3, 1.4, lighten(look.bottomColor, 0.25), null); ctx.strokeStyle = lighten(look.bottomColor, 0.3); ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(x + 1.5, legY + 1 - lift); ctx.lineTo(x + 1.5, legY + 9 - lift); ctx.stroke(); }
    if (bottomType === 'pyjamas') for (let k = 0; k < 2; k++) ellipse(ctx, x - 1 + k * 2, legY + 4 + k * 3 - lift, 0.9, 0.9, look.top2, null);
  };
  const shoe = (x, lift) => {
    if (seated && back) return;
    const side = Math.sign(x) || 1;
    if (seated) x = o.ground ? x * 1.3 + knee * 2.4 : x + knee - 0.5;
    const y = seated ? (o.ground ? legY + 8 : legY + 13 + swing(side)) : -1.5 - lift;
    if (look.shoes === 'none') { ellipse(ctx, x, y, 4.6, 2.6, darken(pawCol, 0.15), null); return; }
    if (look.shoes === 'boots' || look.shoes === 'wellies') { ellipse(ctx, x, y - 2.5, 4.5, 4.6, look.shoeColor, ink, 1); ellipse(ctx, x, y, 5.2, 2.6, look.shoeColor, null); if (look.shoes === 'wellies') ellipse(ctx, x, y - 6, 4.6, 1.2, lighten(look.shoeColor, 0.3), null); return; }
    if (look.shoes === 'sandals') { ellipse(ctx, x, y, 4.8, 2.6, pawCol, null); ctx.strokeStyle = look.shoeColor; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(x - 4, y - 1); ctx.lineTo(x + 4, y - 1); ctx.stroke(); return; }
    if (look.shoes === 'slippers') { ellipse(ctx, x, y, 5.6, 3.2, look.shoeColor, null); ellipse(ctx, x, y - 1.5, 3, 1.5, '#FFFFFF', null); return; }
    ellipse(ctx, x, y, 5, 2.8, look.shoeColor, ink, 1); ellipse(ctx, x, y + 1.4, 5, 1.2, '#E6ECF3', null);
  };
  const liftL = Math.max(0, step) * 2, liftR = Math.max(0, -step) * 2;
  leg(-5 + step * 1.5, liftL); leg(5 - step * 1.5, liftR);
  shoe(-5 + step * 2.5, liftL); shoe(5 - step * 2.5, liftR);

  // ---- body / top
  const top = look.top;
  ctx.strokeStyle = ink; ctx.lineWidth = 1.4;
  if (BARE.has(top)) {
    ctx.fillStyle = fur; roundRect(ctx, -10, -34, 20, 24, 9); ctx.fill(); ctx.stroke();
    if (!back) ellipse(ctx, 0, -22, 6.5, 8, S.belly, null);
    if (top === 'towel') { ctx.fillStyle = '#FFFFFF'; roundRect(ctx, -11.5, -27, 23, 17, 5); ctx.fill(); ctx.stroke(); ctx.fillStyle = look.topColor; ctx.fillRect(-11.5, -16, 23, 3); }
  } else if (top === 'dress') {
    ctx.fillStyle = look.topColor; ctx.beginPath(); ctx.moveTo(-9, -34); ctx.lineTo(9, -34); ctx.quadraticCurveTo(10, -22, 15, -6); ctx.quadraticCurveTo(0, -2, -15, -6); ctx.quadraticCurveTo(-10, -22, -9, -34); ctx.closePath(); ctx.fill(); ctx.stroke();
    if (!back) { ctx.fillStyle = lighten(look.topColor, 0.3); roundRect(ctx, -9, -24, 18, 3, 1.5); ctx.fill(); for (let k = -1; k <= 1; k++) ellipse(ctx, k * 5, -12, 1.4, 1.4, '#FFFFFF', null); }
  } else {
    const body = top === 'overalls' ? look.top2 : look.topColor;
    const hem = top === 'raincoat' ? -6 : -10;
    ctx.fillStyle = body; roundRect(ctx, -10, -34, 20, 34 + hem, 9); ctx.fill(); ctx.stroke();
    if (top === 'stripes') { ctx.fillStyle = look.top2; for (let k = 0; k < 3; k++) ctx.fillRect(-9.5, -29 + k * 6, 19, 2.6); }
    if (top === 'pyjamas') for (let k = 0; k < 6; k++) ellipse(ctx, -6 + (k % 3) * 6, -28 + Math.floor(k / 3) * 8, 1.2, 1.2, look.top2, null);
    if (top === 'sweater') { ctx.strokeStyle = darken(body, 0.15); ctx.lineWidth = 1; for (let k = -8; k <= 8; k += 3) { ctx.beginPath(); ctx.moveTo(k, hem - 4); ctx.lineTo(k, hem); ctx.stroke(); } }
    if (top === 'raincoat' && !back) { for (const y of [-28, -21, -14]) ellipse(ctx, 0, y, 1.3, 1.3, '#FFFFFF', null); }
    if (top === 'chef' && !back) { for (const y of [-28, -22, -16]) { ellipse(ctx, -3.5, y, 1.1, 1.1, '#C9D6E2', null); ellipse(ctx, 3.5, y, 1.1, 1.1, '#C9D6E2', null); } }
    if (top === 'hoodie' && !back) { ctx.fillStyle = darken(body, 0.1); roundRect(ctx, -6, -20, 12, 6, 2); ctx.fill(); ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-2, -33); ctx.lineTo(-2, -27); ctx.moveTo(2, -33); ctx.lineTo(2, -27); ctx.stroke(); }
    if (top === 'overalls') { ctx.fillStyle = look.bottomColor; roundRect(ctx, -7, back ? -30 : -27, 14, 17, 3); ctx.fill(); ctx.fillRect(-7, -34, 2.5, 8); ctx.fillRect(4.5, -34, 2.5, 8); if (!back) ellipse(ctx, 0, -21, 2, 1.6, lighten(look.bottomColor, 0.3), null); }
    if ((top === 'jacket' || top === 'suit') && !back) {
      ctx.fillStyle = top === 'suit' ? '#FFFFFF' : look.top2; ctx.beginPath(); ctx.moveTo(-4.5, -34); ctx.lineTo(4.5, -34); ctx.lineTo(1.5, hem - 2); ctx.lineTo(-1.5, hem - 2); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = darken(body, 0.25); ctx.lineWidth = 1.1; ctx.beginPath(); ctx.moveTo(-4.5, -34); ctx.lineTo(-1.5, -24); ctx.moveTo(4.5, -34); ctx.lineTo(1.5, -24); ctx.stroke();
      if (top === 'suit') { ctx.fillStyle = '#C8364A'; ctx.beginPath(); ctx.moveTo(-1.6, -33); ctx.lineTo(1.6, -33); ctx.lineTo(1.2, -21); ctx.lineTo(0, -19); ctx.lineTo(-1.2, -21); ctx.closePath(); ctx.fill(); }
      else for (const y of [-22, -16]) ellipse(ctx, 3.2, y, 1, 1, darken(body, 0.3), null);
    }
    if (top === 'jersey') { ctx.fillStyle = look.top2; ctx.fillRect(-9.5, -32, 3, 22 + hem); ctx.fillRect(6.5, -32, 3, 22 + hem); ctx.font = '800 9px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('7', 0, -22); }
    if (top === 'tee' && !back) { ctx.fillStyle = lighten(body, 0.25); roundRect(ctx, -6, -30, 12, 6, 3); ctx.fill(); }
  }
  if (bottomType === 'skirt') { ctx.fillStyle = look.bottomColor; ctx.beginPath(); ctx.moveTo(-10, -14); ctx.lineTo(10, -14); ctx.lineTo(14, -5); ctx.quadraticCurveTo(0, -2, -14, -5); ctx.closePath(); ctx.fill(); ctx.strokeStyle = ink; ctx.lineWidth = 1.2; ctx.stroke(); }
  if (look.acc === 'backpack' && back) { ctx.fillStyle = look.accColor; roundRect(ctx, -8, -32, 16, 17, 5); ctx.fill(); ctx.stroke(); }
  if (look.acc === 'backpack' && !back) { ctx.strokeStyle = look.accColor; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(-6, -33); ctx.lineTo(-7, -18); ctx.moveTo(6, -33); ctx.lineTo(7, -18); ctx.stroke(); }

  // ---- lap (seated, facing us): thighs come toward the camera over the bottom of the body
  if (seated && !back) {
    const lapCol = top === 'dress' ? look.topColor : top === 'towel' ? '#FFFFFF' : bottomType === 'none' ? fur : look.bottomColor;
    for (const side of [-1, 1]) ellipse(ctx, side * 4.6 + knee * 0.7, -10.5, 5.2, 4.4, lapCol, ink, 1.2);
    if (top === 'dress' || bottomType === 'skirt') { ctx.fillStyle = lapCol; roundRect(ctx, -9 + knee * 0.7, -15, 18, 7, 3.5); ctx.fill(); }
  }

  // ---- arms
  const sw = moving ? Math.sin(walk) * 0.6 : pose === 'dance' ? Math.sin(t * 6) * 1.2 : Math.sin(t * 1.6 + seed) * 0.08;
  const arms = o.arms || (o.wave ? 'wave' : null);
  const rot = side => {
    switch (arms) {
      case 'wave': return side === 1 ? Math.sin(t * 10) * 0.4 - 2.4 : -0.18;
      case 'hold': case 'read': return side * 0.62;
      case 'type': return side * (0.7 + Math.sin(t * 14 + side) * 0.08);
      case 'remote': return side === 1 ? 0.9 : -0.2;
      case 'stir': return side === 1 ? 0.95 + Math.sin(t * 6) * 0.28 : -0.6;
      case 'chop': return side === 1 ? 0.5 + Math.abs(Math.sin(t * 8)) * 0.45 : -0.55;
      case 'scrub': return side * (2.6 + Math.sin(t * 9 + side) * 0.25);
      case 'eat': return side === 1 ? 0.35 + Math.max(0, Math.sin(t * 2.4)) * 1.9 : -0.6;
      case 'wash': return side * (0.78 + Math.sin(t * 10 + side * 1.6) * 0.16);
      case 'sip': return side === 1 ? 0.9 + 1.75 * smooth((Math.sin(t * 1.3 + seed) - 0.35) / 0.4) : -0.45;
      case 'pour': return side === 1 ? 1.15 + Math.sin(t * 1.6) * 0.07 : -0.2;
      case 'toss': return side === 1 ? -0.3 - 2.1 * smooth(Math.sin(t * 2.6)) : -0.18;
      case 'talk': return side * (-0.15 - Math.max(0, Math.sin(t * 3.6 + (side > 0 ? 0 : 2.2))) * 0.85);
      case 'clap': return side * (0.95 + Math.sin(t * 11) * 0.3);
      case 'browse': return side === 1 ? 1.35 + Math.sin(t * 1.8 + seed) * 0.3 : -0.25;
      case 'hug': return side * 1.15;
      case 'cheer': return side * (-2.45 + Math.sin(t * 8 + side) * 0.25);
      case 'lap': return side * 0.4;
      default: return seated ? side * 0.4 : side * (0.18 + sw * side);
    }
  };
  const sleeve = BARE.has(top) ? fur : look.top === 'dress' ? look.topColor : top === 'overalls' ? look.top2 : look.topColor;
  const longSleeve = LONG_SLEEVES.has(top);
  const drawArm = side => {
    ctx.save(); ctx.translate(side * 10, -31); ctx.rotate(rot(side));
    if (longSleeve || BARE.has(top)) ellipse(ctx, 0, 7, 3.6, 8, sleeve, ink, 1.2);
    else { ellipse(ctx, 0, 7, 3.6, 8, fur, ink, 1.2); ellipse(ctx, 0, 3.2, 3.9, 4.4, sleeve, null); }
    ellipse(ctx, 0, 14, 3.4, 3.4, pawCol, ink, 1.1);
    ctx.restore();
  };
  const hand = side => { const r = rot(side); return [side * 10 - 14 * Math.sin(r), -31 + 14 * Math.cos(r)]; };
  const armsAfterHead = arms === 'scrub';
  if (!armsAfterHead) { drawArm(-1); drawArm(1); }
  if (look.acc === 'scarf') { ctx.fillStyle = look.accColor; roundRect(ctx, -11, -37, 22, 6, 3); ctx.fill(); if (!back) { roundRect(ctx, 3, -34, 5, 11, 2); ctx.fill(); } }
  if (!back && o.prop && !armsAfterHead) drawProp(ctx, o.prop, hand, t);

  // ---- head
  ctx.save(); ctx.translate(0, -50);
  const tilt = moving ? Math.sin(walk) * 0.04 : Math.sin(t * 0.9 + seed) * 0.06;
  ctx.rotate(tilt);
  const headR = 15;
  const ear = (side) => {
    ctx.save(); ctx.scale(side, 1);
    if (S.ears === 'pointy' || S.ears === 'cat') {
      const h = S.ears === 'cat' ? 12 : 16;
      ctx.beginPath(); ctx.moveTo(4, -10); ctx.lineTo(12, -10 - h); ctx.lineTo(15, -5); ctx.closePath(); ctx.fillStyle = fur; ctx.fill(); ctx.strokeStyle = ink; ctx.lineWidth = 1.4; ctx.stroke();
      if (!back) { ctx.beginPath(); ctx.moveTo(7, -10); ctx.lineTo(12, -6 - h); ctx.lineTo(13, -7); ctx.closePath(); ctx.fillStyle = S.inner; ctx.fill(); }
      if (species === 'fox' || species === 'raccoon') { ctx.beginPath(); ctx.moveTo(10.5, -6 - h); ctx.lineTo(12, -10 - h); ctx.lineTo(13.5, -6 - h); ctx.closePath(); ctx.fillStyle = '#3A2E36'; ctx.fill(); }
    } else if (S.ears === 'long') {
      const flop = Math.sin(t * 2 + side) * 0.05;
      ctx.save(); ctx.translate(6, -11); ctx.rotate(0.15 + flop);
      ellipse(ctx, 0, -14, 5.5, 15, fur, ink, 1.4); if (!back) ellipse(ctx, 0, -13, 2.8, 11, S.inner, null);
      ctx.restore();
    } else if (S.ears === 'round') { ellipse(ctx, 11, -11, 6.5, 6.5, fur, ink, 1.4); if (!back) ellipse(ctx, 11, -11, 3.5, 3.5, S.inner, null); }
    else if (S.ears === 'tiny') ellipse(ctx, 12, -8, 4, 4, fur, ink, 1.3);
    else if (S.ears === 'side') { ellipse(ctx, 16, -3, 8, 4, fur, ink, 1.3, 0.3); if (!back) ellipse(ctx, 16, -3, 5, 2.2, S.inner, null, 1, 0.3); }
    ctx.restore();
  };
  if (S.antlers) {
    ctx.strokeStyle = '#B98A5A'; ctx.lineWidth = 2.6; ctx.lineCap = 'round';
    for (const side of [-1, 1]) { ctx.beginPath(); ctx.moveTo(side * 6, -12); ctx.lineTo(side * 9, -26); ctx.moveTo(side * 8, -20); ctx.lineTo(side * 14, -24); ctx.moveTo(side * 9, -26); ctx.lineTo(side * 6, -31); ctx.stroke(); }
  }
  // hair that sits behind the head
  if (look.hair === 'pigtails') { for (const s of [-1, 1]) ellipse(ctx, s * 15, 2, 5, 6.5, look.hairColor, ink, 1.1); }
  if (look.hair === 'bob' && back) ellipse(ctx, 0, 2, 16, 13, look.hairColor, ink, 1.2);
  if (look.hair === 'long') { if (back) ellipse(ctx, 0, 6, 16.5, 17, look.hairColor, ink, 1.2); else for (const s of [-1, 1]) ellipse(ctx, s * 13, 7, 6, 13, look.hairColor, ink, 1.1, s * -0.15); }
  if (look.hair === 'ponytail') { ctx.save(); ctx.rotate(Math.sin(t * 3 + seed) * 0.08); ellipse(ctx, back ? 0 : 13, back ? 10 : 4, 4.8, 9, look.hairColor, ink, 1.1, back ? 0 : -0.4); ctx.restore(); }
  if (S.ears !== 'side' && look.acc !== 'showercap') { ear(-1); ear(1); }
  if (S.wool) { for (let k = 0; k < 9; k++) { const a = k / 9 * Math.PI * 2; ellipse(ctx, Math.cos(a) * 13, Math.sin(a) * 12 - 1, 6.5, 6.5, S.wool, ink, 1.2); } }
  ellipse(ctx, 0, 0, headR, headR - 1, S.wool ? S.wool : fur, ink, 1.6);
  if (S.ears === 'side') { ear(-1); ear(1); }
  // hair on top
  const hc = look.hairColor;
  if (look.hair === 'tuft') { ctx.fillStyle = hc; for (const [x, r] of [[-3, -0.4], [0, 0], [3, 0.4]]) { ctx.save(); ctx.translate(x, -13); ctx.rotate(r); ctx.beginPath(); ctx.ellipse(0, -3, 2, 5, 0, 0, 7); ctx.fill(); ctx.restore(); } }
  if (look.hair === 'bob') { ctx.fillStyle = hc; ctx.beginPath(); ctx.arc(0, -2, 15.5, Math.PI * 1.05, Math.PI * 1.95); ctx.quadraticCurveTo(10, -6, 0, -8); ctx.quadraticCurveTo(-10, -6, -15, -5); ctx.fill(); }
  if (look.hair === 'bun') { ellipse(ctx, 0, -17, 6, 5.5, hc, ink, 1.1); ctx.fillStyle = hc; ctx.beginPath(); ctx.arc(0, -3, 14.5, Math.PI * 1.15, Math.PI * 1.85); ctx.quadraticCurveTo(0, -10, -12, -9); ctx.fill(); }
  if (look.hair === 'curly') { for (let k = 0; k < 6; k++) ellipse(ctx, -10 + k * 4, -12 + Math.abs(k - 2.5) * 1.4, 3.8, 3.8, hc, null); }
  if (look.hair === 'pigtails') { ctx.fillStyle = hc; ctx.beginPath(); ctx.arc(0, -3, 14.5, Math.PI * 1.1, Math.PI * 1.9); ctx.quadraticCurveTo(0, -9, -13, -8); ctx.fill(); }
  if (look.hair === 'long' || look.hair === 'ponytail') { ctx.fillStyle = hc; ctx.beginPath(); ctx.arc(0, -2, 15.5, Math.PI * 1.05, Math.PI * 1.95); ctx.quadraticCurveTo(6, -9, -2, -7); ctx.quadraticCurveTo(-9, -6, -15, -4); ctx.fill(); }
  if (look.hair === 'mohawk') { ctx.fillStyle = hc; ctx.beginPath(); ctx.moveTo(-3, -12); for (let k = 0; k < 5; k++) { ctx.lineTo(-3 + k * 1.5 + 0.75, -26 - (k % 2) * 3 + Math.abs(k - 2) * 1.5); ctx.lineTo(-3 + (k + 1) * 1.5, -14); } ctx.lineTo(3, -12); ctx.closePath(); ctx.fill(); ctx.strokeStyle = ink; ctx.lineWidth = 1; ctx.stroke(); }
  if (look.hair === 'spiky') { ctx.fillStyle = hc; ctx.beginPath(); ctx.moveTo(-8, -10); for (let k = 0; k < 5; k++) { ctx.lineTo(-8 + k * 4 + 2, -22 - (k % 2) * 3); ctx.lineTo(-8 + (k + 1) * 4, -11); } ctx.closePath(); ctx.fill(); }
  if (!back) {
    ctx.save(); ctx.translate(faceX, 0);
    if (S.wool) ellipse(ctx, 0, 3, 10.5, 10, fur, null);
    if (S.mask) { ellipse(ctx, -6, -1, 6.5, 4.5, '#4A4E58', null, 1, -0.2); ellipse(ctx, 6, -1, 6.5, 4.5, '#4A4E58', null, 1, 0.2); }
    if (look.markings === 'patch') ellipse(ctx, 6, -1.5, 6, 5, darken(fur, 0.3), null);
    if (S.stripes) { ctx.strokeStyle = darken(fur, 0.2); ctx.lineWidth = 2; ctx.lineCap = 'round'; for (const x of [-4, 0, 4]) { ctx.beginPath(); ctx.moveTo(x, -14); ctx.lineTo(x, -9); ctx.stroke(); } }
    if (S.spots) { for (const [x, y] of [[-10, -6], [10, -7], [-8, -10]]) ellipse(ctx, x, y, 1.6, 1.6, '#FFF4E6', null); }
    if (!S.wool) ellipse(ctx, 0, 5.5, species === 'bunny' || species === 'cat' ? 7 : 8.5, 6, S.belly, null);
    if (look.markings === 'freckles') for (const [x, y] of [[-9, 3], [-11, 5], [-8, 6], [9, 3], [11, 5], [8, 6]]) ellipse(ctx, x, y, 0.8, 0.8, darken(fur, 0.35), null);
    drawFace(ctx, look, o, fur, S, arms, t, seed);
    if (look.acc === 'sunglasses') { ctx.fillStyle = '#1F2233'; roundRect(ctx, -10.5, -5, 9, 6.5, 3); ctx.fill(); roundRect(ctx, 1.5, -5, 9, 6.5, 3); ctx.fill(); ctx.strokeStyle = '#1F2233'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(-1.5, -3); ctx.lineTo(1.5, -3); ctx.stroke(); ctx.fillStyle = 'rgba(255,255,255,.45)'; ctx.fillRect(-9, -4, 2.5, 1.4); ctx.fillRect(3, -4, 2.5, 1.4); }
    if (look.acc === 'glasses') { ctx.strokeStyle = look.accColor; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(-6, -1.5, 4.6, 0, 7); ctx.moveTo(10.6, -1.5); ctx.arc(6, -1.5, 4.6, 0, 7); ctx.moveTo(-1.4, -2); ctx.lineTo(1.4, -2); ctx.stroke(); }
    ctx.restore();
  }
  if (look.acc === 'cap') { ctx.fillStyle = look.accColor; ctx.beginPath(); ctx.arc(0, -6, 13.5, Math.PI, 0); ctx.fill(); if (!back) ellipse(ctx, 5 + faceX * 1.6, -6, 11, 3, darken(look.accColor, 0.15), null); }
  if (look.acc === 'beret') { ellipse(ctx, -2, -13, 13, 5.5, look.accColor, ink, 1.2, -0.2); ellipse(ctx, -2, -18, 1.8, 1.8, look.accColor, null); }
  if (look.acc === 'bow') { ctx.save(); ctx.translate(-9, -11); ctx.fillStyle = look.accColor; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-6, -4); ctx.lineTo(-6, 4); ctx.closePath(); ctx.moveTo(0, 0); ctx.lineTo(6, -4); ctx.lineTo(6, 4); ctx.closePath(); ctx.fill(); ellipse(ctx, 0, 0, 2, 2, darken(look.accColor, 0.2), null); ctx.restore(); }
  if (look.acc === 'crown') { for (let k = 0; k < 7; k++) { const a = Math.PI * (1.1 + k * 0.13); ellipse(ctx, Math.cos(a) * 14, Math.sin(a) * 13, 2.6, 2.6, ['#F0587A', '#FFC83D', '#FFFFFF', '#8E7CE0'][k % 4], null); } }
  if (look.acc === 'tophat') { ellipse(ctx, 0, -12, 15, 3.6, '#26222E', null); ctx.fillStyle = '#26222E'; roundRect(ctx, -9, -33, 18, 21, 2); ctx.fill(); ctx.fillStyle = look.accColor; ctx.fillRect(-9, -17, 18, 3.5); }
  if (look.acc === 'wizard') { ctx.fillStyle = look.accColor; ctx.beginPath(); ctx.moveTo(-14, -9); ctx.quadraticCurveTo(0, -13, 14, -9); ctx.lineTo(5, -40); ctx.closePath(); ctx.fill(); ctx.strokeStyle = ink; ctx.lineWidth = 1.2; ctx.stroke(); ctx.fillStyle = '#FFE27A'; ctx.font = '8px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('★', 1, -22); }
  if (look.acc === 'halo') { ctx.strokeStyle = '#FFD24A'; ctx.lineWidth = 2.6; ctx.beginPath(); ctx.ellipse(0, -27 + Math.sin(t * 2) * 1.2, 10, 3, 0, 0, 7); ctx.stroke(); }
  if (look.acc === 'bandana') { ctx.fillStyle = look.accColor; ctx.beginPath(); ctx.arc(0, -3, 15.2, Math.PI * 1.08, Math.PI * 1.92); ctx.quadraticCurveTo(0, -8, -14, -7); ctx.fill(); for (let k = 0; k < 4; k++) ellipse(ctx, -8 + k * 5, -12, 0.9, 0.9, '#FFFFFF', null); if (!back) ellipse(ctx, 14, -5, 3, 2.2, look.accColor, null); }
  if (look.acc === 'flower') { ctx.save(); ctx.translate(-11, -11); for (let k = 0; k < 5; k++) { const q = k / 5 * Math.PI * 2; ellipse(ctx, Math.cos(q) * 2.8, Math.sin(q) * 2.8, 2.4, 2.4, look.accColor, null); } ellipse(ctx, 0, 0, 1.8, 1.8, '#FFE27A', null); ctx.restore(); }
  if (look.acc === 'headphones') { ctx.strokeStyle = look.accColor; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, -2, 15.5, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke(); ellipse(ctx, -15, 1, 3.5, 5, look.accColor, ink, 1); ellipse(ctx, 15, 1, 3.5, 5, look.accColor, ink, 1); }
  if (look.acc === 'showercap') { ctx.fillStyle = look.accColor; ctx.beginPath(); ctx.arc(0, -4, 15.5, Math.PI * 1.02, Math.PI * 1.98); ctx.closePath(); ctx.fill(); for (let k = 0; k < 7; k++) ellipse(ctx, -14 + k * 4.7, -4, 2.3, 1.6, '#FFFFFF', null); for (let k = 0; k < 4; k++) ellipse(ctx, -8 + k * 5.5, -12, 1.2, 1.2, '#FFFFFF', null); }
  ctx.restore();
  if (armsAfterHead) { drawArm(-1); drawArm(1); if (!back && o.prop) drawProp(ctx, o.prop, hand, t); }
  if (back) tail();
  if (o.asleep && o.blanket) { ctx.fillStyle = o.blanket; roundRect(ctx, -14, -38, 28, 40, 10); ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 2; for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.moveTo(-12, -28 + k * 11); ctx.lineTo(12, -28 + k * 11); ctx.stroke(); } }
  ctx.restore();
}

// Eyes, brows, mouth and cheeks: each picked in the wardrobe, so every animal can look how they feel.
function heartPath(ctx, x, y, r) { ctx.beginPath(); ctx.moveTo(x, y + r * 0.9); ctx.bezierCurveTo(x - r * 1.6, y - r * 0.2, x - r * 0.7, y - r * 1.3, x, y - r * 0.45); ctx.bezierCurveTo(x + r * 0.7, y - r * 1.3, x + r * 1.6, y - r * 0.2, x, y + r * 0.9); ctx.closePath(); }
function starPath(ctx, x, y, r) { ctx.beginPath(); for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, rr = k % 2 ? r * 0.45 : r; ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } ctx.closePath(); }
function drawFace(ctx, look, o, fur, S, arms, t, seed) {
  const eyeCol = look.eyeColor || '#2B2238', style = look.eyes || 'round';
  const blink = o.asleep || ((t + seed * 0.37) % 4.2) < 0.13;
  const closed = (x, up = false) => { ctx.strokeStyle = '#2B2238'; ctx.lineWidth = 1.8; ctx.lineCap = 'round'; ctx.beginPath(); if (up) ctx.arc(x, 0.5, 3, Math.PI + 0.25, -0.25); else ctx.arc(x, -1, 3, 0.2, Math.PI - 0.2); ctx.stroke(); };
  const shine = (x, y, big) => { ellipse(ctx, x - 1, y - 1.5, big ? 1.6 : 1.3, big ? 1.8 : 1.5, '#FFFFFF', null); ellipse(ctx, x + 1.1, y + 1.7, 0.6, 0.6, '#FFFFFF', null); };
  for (const side of [-1, 1]) {
    const x = side * 6;
    if (blink && style !== 'happy') { closed(x); continue; }
    switch (style) {
      case 'happy': closed(x, true); break;
      case 'wink': if (side === 1) closed(x, true); else { ellipse(ctx, x, -1.5, 3.4, 4.2, eyeCol, null); shine(x, -1.5); } break;
      case 'sleepy': ellipse(ctx, x, -0.5, 3.4, 3.4, eyeCol, null); ctx.fillStyle = fur; ctx.beginPath(); ctx.ellipse(x, -1.2, 3.9, 3.6, 0, Math.PI, 0); ctx.fill(); ctx.strokeStyle = '#2B2238'; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.moveTo(x - 3.6, -1.1); ctx.lineTo(x + 3.6, -1.1); ctx.stroke(); break;
      case 'cool': ctx.fillStyle = eyeCol; ctx.beginPath(); ctx.ellipse(x, -1.5, 3.4, 3.2, 0, 0, Math.PI); ctx.fill(); ctx.strokeStyle = '#2B2238'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(x - 3.8, -1.6); ctx.lineTo(x + 3.8, -1.6); ctx.stroke(); break;
      case 'fierce': ctx.fillStyle = eyeCol; ctx.beginPath(); ctx.moveTo(x - 3.6 * side, -3.2); ctx.quadraticCurveTo(x, 2.5, x + 3.8 * side, -0.6); ctx.quadraticCurveTo(x, -4.5, x - 3.6 * side, -3.2); ctx.fill(); ellipse(ctx, x, -1.4, 0.9, 0.9, '#FFFFFF', null); break;
      case 'dot': ellipse(ctx, x, -1, 1.9, 2.2, eyeCol, null); break;
      case 'sparkle': ellipse(ctx, x, -1.5, 4, 4.9, eyeCol, null); shine(x, -1.5, true); ctx.fillStyle = '#FFFFFF'; starPath(ctx, x + 1.4, -3.6, 1.4); ctx.fill(); break;
      case 'heart': ctx.fillStyle = '#E8456A'; heartPath(ctx, x, -1.2, 3.8); ctx.fill(); ellipse(ctx, x - 1.3, -2.6, 0.8, 0.8, '#FFFFFF', null); break;
      case 'star': ctx.fillStyle = '#F2B91E'; starPath(ctx, x, -1.2, 4.4); ctx.fill(); ctx.strokeStyle = '#B9861A'; ctx.lineWidth = 0.8; ctx.stroke(); break;
      case 'lashes': ellipse(ctx, x, -1.5, 3.4, 4.2, eyeCol, null); shine(x, -1.5); ctx.strokeStyle = '#2B2238'; ctx.lineWidth = 1.1; ctx.lineCap = 'round'; for (const k of [0, 1, 2]) { const a = -Math.PI / 2 + side * (0.55 + k * 0.32); ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * 3.6, -1.5 + Math.sin(a) * 4.2); ctx.lineTo(x + Math.cos(a) * 5.6, -1.5 + Math.sin(a) * 6.2); ctx.stroke(); } break;
      default: ellipse(ctx, x, -1.5, 3.4, 4.2, eyeCol, null); shine(x, -1.5);
    }
  }
  const bc = look.hair && look.hair !== 'none' ? darken(look.hairColor, 0.1) : darken(fur, 0.45);
  if (look.brows && look.brows !== 'none') {
    ctx.strokeStyle = bc; ctx.lineCap = 'round'; ctx.lineWidth = look.brows === 'bold' ? 2.6 : 1.6;
    for (const side of [-1, 1]) {
      const x = side * 6; ctx.beginPath();
      if (look.brows === 'soft') ctx.arc(x, -3, 4, Math.PI * 1.25, Math.PI * 1.75);
      else if (look.brows === 'raised') ctx.arc(x, -5, 4, Math.PI * 1.2, Math.PI * 1.8);
      else if (look.brows === 'angry') { ctx.moveTo(x + side * 3.5, -9.5); ctx.lineTo(x - side * 3, -6.6); }
      else if (look.brows === 'worried') { ctx.moveTo(x + side * 3.5, -7); ctx.lineTo(x - side * 3, -9.6); }
      else { ctx.moveTo(x - 3.4, -8); ctx.lineTo(x + 3.4, -8); }
      ctx.stroke();
    }
  }
  const ch = look.cheeks || 'blush';
  if (ch !== 'none') for (const side of [-1, 1]) ellipse(ctx, side * 10, 4, ch === 'rosy' ? 3.4 : 2.6, ch === 'rosy' ? 2.3 : 1.6, ch === 'rosy' ? '#F06C8Fcc' : '#F79AB0aa', null);
  ellipse(ctx, 0, 3.2, 2.4, 1.7, S.nose, null);
  ctx.strokeStyle = '#2B2238'; ctx.lineWidth = 1.1; ctx.lineCap = 'round';
  let m = look.mouth || 'cat';
  if (o.happy && (m === 'cat' || m === 'flat' || m === 'pout')) m = 'smile';
  if (arms === 'eat' && Math.sin(t * 2.4) > 0.6) { ellipse(ctx, 0, 6.5, 2.4, 2, '#7A2E3E', null); return; }
  const cat = () => { ctx.beginPath(); ctx.moveTo(-2.5, 6.6); ctx.quadraticCurveTo(-1.2, 8, 0, 6.6); ctx.quadraticCurveTo(1.2, 8, 2.5, 6.6); ctx.stroke(); };
  ctx.beginPath();
  switch (m) {
    case 'smile': ctx.arc(0, 5.5, 3, 0.1, Math.PI - 0.1); ctx.stroke(); break;
    case 'grin': ctx.fillStyle = '#7A2E3E'; ctx.moveTo(-3.6, 5.6); ctx.quadraticCurveTo(0, 11, 3.6, 5.6); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#FFFFFF'; ctx.fillRect(-2.6, 5.6, 5.2, 1.2); break;
    case 'laugh': ellipse(ctx, 0, 7, 3.6, 3.2, '#7A2E3E', null); ellipse(ctx, 0, 8.6, 2.2, 1.3, '#F0809A', null); break;
    case 'smirk': ctx.moveTo(-2.5, 6.6); ctx.quadraticCurveTo(1, 7.6, 3.4, 5.2); ctx.stroke(); break;
    case 'flat': ctx.moveTo(-2.6, 6.8); ctx.lineTo(2.6, 6.8); ctx.stroke(); break;
    case 'pout': ctx.arc(0, 8.6, 2.4, Math.PI + 0.4, -0.4); ctx.stroke(); break;
    case 'o': ellipse(ctx, 0, 7, 1.6, 2, '#7A2E3E', null); break;
    case 'blep': cat(); ellipse(ctx, 0.6, 8.3, 1.5, 1.8, '#F0809A', null); break;
    case 'fang': cat(); ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.moveTo(1, 7.1); ctx.lineTo(2.3, 7.1); ctx.lineTo(1.6, 9); ctx.closePath(); ctx.fill(); break;
    default: cat();
  }
}

// Things a character can hold. hand(side) gives a paw position in body space.
function drawProp(ctx, prop, hand, t) {
  const [rx, ry] = hand(1), [lx, ly] = hand(-1);
  ctx.save(); ctx.lineCap = 'round';
  if (prop === 'book') { const x = (rx + lx) / 2, y = (ry + ly) / 2 - 2; ctx.fillStyle = '#F0587A'; roundRect(ctx, x - 9, y - 6, 18, 12, 2); ctx.fill(); ctx.fillStyle = '#FFFFFF'; ctx.fillRect(x - 7.5, y - 4.5, 7, 9); ctx.fillRect(x + 0.5, y - 4.5, 7, 9); ctx.strokeStyle = '#C9D6E2'; ctx.lineWidth = 0.8; for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.moveTo(x - 6.5, y - 2.5 + k * 2.5); ctx.lineTo(x - 1.5, y - 2.5 + k * 2.5); ctx.moveTo(x + 1.5, y - 2.5 + k * 2.5); ctx.lineTo(x + 6.5, y - 2.5 + k * 2.5); ctx.stroke(); } }
  else if (prop === 'plate') { const x = (rx + lx) / 2, y = Math.max(ry, ly) + 1; ellipse(ctx, x, y, 10, 3.6, '#FFFFFF', '#C9D6E2', 1); ellipse(ctx, x - 2, y - 1.2, 3, 1.6, '#E8823A', null); ellipse(ctx, x + 3, y - 1, 2.4, 1.4, '#3FA86A', null); }
  else if (prop === 'fork') { ctx.strokeStyle = '#A0AEC0'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(rx, ry); ctx.lineTo(rx - 3, ry - 8); ctx.stroke(); ellipse(ctx, lx + 1, ly + 2, 9, 3.2, '#FFFFFF', '#C9D6E2', 1); ellipse(ctx, lx, ly + 1, 3, 1.4, '#E8823A', null); }
  else if (prop === 'bowl') { ellipse(ctx, lx + 3, ly + 1, 7, 3.2, '#FFFFFF', '#C9D6E2', 1); ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.ellipse(lx + 3, ly + 1, 7, 6, 0, 0, Math.PI); ctx.fill(); ctx.strokeStyle = '#8C5A30'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(rx, ry); ctx.lineTo(lx + 3 + Math.cos(t * 6) * 3, ly - 1); ctx.stroke(); }
  else if (prop === 'knife') { ctx.fillStyle = '#E8E3D8'; roundRect(ctx, lx - 10, ly + 2, 20, 5, 2); ctx.fill(); ellipse(ctx, lx - 3, ly + 3, 2.2, 1.6, '#3FA86A', null); ellipse(ctx, lx + 2, ly + 3, 2.2, 1.6, '#F0587A', null); ctx.strokeStyle = '#A0AEC0'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(rx, ry); ctx.lineTo(rx - 7, ry + 2); ctx.stroke(); }
  else if (prop === 'remote') { ctx.fillStyle = '#34476B'; roundRect(ctx, rx - 2, ry - 7, 4, 9, 1.5); ctx.fill(); ellipse(ctx, rx, ry - 5, 0.9, 0.9, '#F0587A', null); }
  else if (prop === 'sponge') { ctx.fillStyle = '#FFC83D'; roundRect(ctx, rx - 3.5, ry - 3, 7, 5, 1.5); ctx.fill(); for (let k = 0; k < 3; k++) ellipse(ctx, rx + Math.sin(t * 5 + k) * 6, ry - 6 - k * 3, 2, 2, 'rgba(255,255,255,.9)', '#BFE3F2', 0.8); }
  else if (prop === 'cup') { ctx.fillStyle = '#FFFFFF'; ctx.strokeStyle = '#C9D6E2'; ctx.lineWidth = 1; roundRect(ctx, rx - 4, ry - 7, 8, 7, 2); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.arc(rx + 4.5, ry - 3.5, 2.2, -1.4, 1.4); ctx.stroke(); ctx.fillStyle = '#B9733F'; ctx.fillRect(rx - 3, ry - 6.5, 6, 1.6); ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 1.2; for (const k of [-1.5, 1.5]) { ctx.beginPath(); ctx.moveTo(rx + k, ry - 9); ctx.quadraticCurveTo(rx + k + Math.sin(t * 3 + k) * 2, ry - 12, rx + k, ry - 15); ctx.stroke(); } }
  else if (prop === 'can') { ctx.save(); ctx.translate(rx, ry); ctx.rotate(-0.35); ctx.fillStyle = '#3FA86A'; roundRect(ctx, -2, -5, 11, 9, 3); ctx.fill(); ctx.strokeStyle = '#2E7D4F'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(-1, -2); ctx.lineTo(-9, -6); ctx.stroke(); ctx.beginPath(); ctx.arc(4, -6, 3.5, Math.PI, 0); ctx.stroke(); ctx.restore(); ctx.fillStyle = '#7FC8DD'; for (let k = 0; k < 4; k++) { const ph = (t * 1.8 + k / 4) % 1; ellipse(ctx, rx - 9 - k * 0.6, ry - 6 + ph * 22, 1, 1.6, '#7FC8DD', null); } }
  else if (prop === 'letter') { const x = (rx + lx) / 2, y = (ry + ly) / 2 - 3; ctx.fillStyle = '#FFFFFF'; ctx.strokeStyle = '#C9D6E2'; ctx.lineWidth = 1; roundRect(ctx, x - 7, y - 5, 14, 10, 1.5); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x - 7, y - 5); ctx.lineTo(x, y + 1); ctx.lineTo(x + 7, y - 5); ctx.stroke(); ellipse(ctx, x, y + 1, 1.6, 1.6, '#F0587A', null); }
  else if (prop === 'coin') { if (ry < -36) { const ph = (t * 2.6 / (Math.PI * 2)) % 1; ellipse(ctx, rx - 4, ry - 6 - Math.sin(ph * Math.PI) * 8, 2.6, 2.6, '#FFC83D', '#C9962A', 1); } else ellipse(ctx, rx, ry - 1, 2.4, 2.4, '#FFC83D', '#C9962A', 1); }
  else if (prop === 'popcorn') { const x = lx + 3, y = ly - 1; ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.moveTo(x - 5, y - 6); ctx.lineTo(x + 5, y - 6); ctx.lineTo(x + 4, y + 4); ctx.lineTo(x - 4, y + 4); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#E8504A'; ctx.fillRect(x - 2.5, y - 6, 1.6, 10); ctx.fillRect(x + 1, y - 6, 1.6, 10); for (const [a, b] of [[-3, -7], [0, -8.5], [3, -7], [-1.5, -9.5], [1.5, -10]]) ellipse(ctx, x + a, y + b, 2, 1.8, '#FFF3C4', null); if (ry < -34) ellipse(ctx, rx, ry - 1, 1.6, 1.5, '#FFF3C4', null); }
  else if (prop === 'bun') { ellipse(ctx, rx, ry - 2, 4.6, 3.8, '#FFF8EE', '#E3D5C2', 1); ctx.strokeStyle = '#E3D5C2'; ctx.beginPath(); ctx.moveTo(rx - 1.5, ry - 4.5); ctx.lineTo(rx, ry - 3); ctx.lineTo(rx + 1.5, ry - 4.5); ctx.stroke(); }
  else if (prop === 'phone') { ctx.fillStyle = '#26395A'; roundRect(ctx, rx - 3, ry - 8, 6, 10, 1.5); ctx.fill(); ctx.fillStyle = '#7FC3E8'; ctx.fillRect(rx - 2, ry - 7, 4, 7); }
  ctx.restore();
}

export function drawPortrait(canvas, species, outfit, opts = {}) {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const size = opts.size || canvas.clientWidth || 48;
  canvas.width = size * dpr; canvas.height = size * dpr;
  const ctx = canvas.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, size, size);
  const k = size / 64;
  const sc = opts.full ? size / 100 : k * 1.12;
  ctx.save(); ctx.translate(size / 2, opts.full ? size * 0.94 : size * 1.42); ctx.scale(sc, sc);
  drawAnimal(ctx, species, outfit, { t: opts.t || 0, shadow: !!opts.full, happy: true, wave: opts.wave, moving: opts.moving, walk: opts.walk, dir: opts.dir, seed: opts.seed });
  ctx.restore();
}
