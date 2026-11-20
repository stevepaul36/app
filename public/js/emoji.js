// Emoji chat for a children's game: no typed messages, only emojis. You start with a small set and
// unlock more by playing (cooking, making friends, working...). Each neighbour also has a signature emoji.

export const STARTER = ['😀', '😊', '👋', '❤️', '👍', '🎵', '☀️', '🌼', '🍎', '⭐', '😂', '🤔'];

// Achievements unlock emojis. test reads the player's stats.
export const ACHIEVEMENTS = [
  { id: 'meal', label: 'Cook your first meal', emojis: ['🍳', '🥞'], test: s => s.meals >= 1 },
  { id: 'shower', label: 'Take a shower', emojis: ['🫧', '🛁'], test: s => s.showers >= 1 },
  { id: 'sleep', label: 'Sleep in your own bed', emojis: ['😴', '🌙'], test: s => s.sleeps >= 1 },
  { id: 'tv', label: 'Watch TV on the sofa', emojis: ['📺', '🍿'], test: s => s.tv >= 1 },
  { id: 'dance', label: 'Dance to the radio', emojis: ['💃', '🕺'], test: s => s.dances >= 1 },
  { id: 'read', label: 'Read a book', emojis: ['📚', '🤓'], test: s => s.reads >= 1 },
  { id: 'outfit', label: 'Change your outfit', emojis: ['👗', '🧢'], test: s => s.outfits >= 1 },
  { id: 'chat', label: 'Send 5 emoji messages', emojis: ['💌', '🦄'], test: s => s.chats >= 5 },
  { id: 'friends', label: 'Make 3 friends (2 hearts each)', emojis: ['🤝', '🎉'], test: s => s.friends >= 3 },
  { id: 'bestie', label: 'Reach 5 hearts with someone', emojis: ['💖', '👯'], test: s => s.bestFriends >= 1 },
  { id: 'work', label: 'Work a shift', emojis: ['💼', '💰'], test: s => s.works >= 1 },
  { id: 'places', label: 'Visit 4 different places', emojis: ['🗺️', '🚋'], test: s => s.places >= 4 },
  { id: 'wheel', label: 'Ride the Sunwheel', emojis: ['🎡', '🌈'], test: s => s.rides >= 1 },
  { id: 'fish', label: 'Catch a fish', emojis: ['🎣', '🐟'], test: s => s.fish >= 1 },
  { id: 'rich', label: 'Save up 100 coins', emojis: ['💎', '👑'], test: s => s.coins >= 100 },
  { id: 'days', label: 'Reach day 3', emojis: ['🎂', '🌟'], test: s => s.day >= 3 },
  { id: 'chef', label: 'Reach cooking level 5', emojis: ['🧑‍🍳', '🍰'], test: s => s.cooking >= 5 },
  { id: 'sporty', label: 'Reach fitness level 5', emojis: ['🏅', '⚽'], test: s => s.fitness >= 5 },
  { id: 'promoted', label: 'Get a promotion at work', emojis: ['🎖️', '🧭'], test: s => s.jobLevel >= 1 },
  { id: 'storyteller', label: 'Reach charisma level 3', emojis: ['🗣️', '✨'], test: s => s.charisma >= 3 },
];
export const ALL_EMOJIS = [...STARTER, ...ACHIEVEMENTS.flatMap(a => a.emojis)];

// Each neighbour shares a signature emoji once you reach 3 hearts with them.
export const SIGNATURE = { Pip: '🥕', Marlow: '🍯', Juniper: '🎟️', Biscuit: '🪙', Nori: '🐚', Wren: '🎨', Clover: '🌾', Hazel: '🌅', Tumble: '📖', Sable: '🍏', Dot: '🎈', Bramble: '🌱' };

// Families of emojis, so a neighbour can answer in kind.
const FAMILY = {
  food: ['🍎', '🍳', '🥞', '🍿', '🍯', '🥕', '🍏', '🐟'],
  love: ['❤️', '💖', '💌', '😊', '🤝', '🎉', '👯'],
  fun: ['😂', '🎵', '💃', '🕺', '🎡', '🌈', '🎈', '🦄'],
  calm: ['🌼', '☀️', '🌙', '😴', '📚', '🤓', '🌾', '🌅', '🐚', '🌱'],
  hello: ['👋', '😀', '👍', '⭐', '🌟'],
};
const familyOf = e => Object.keys(FAMILY).find(k => FAMILY[k].includes(e)) || 'hello';
const TRAIT_FAV = { food: '😋', love: '🥰', fun: '🤩', calm: '😌', hello: '😄' };

// A friendly reply of one to three emojis.
export function replyTo(sent, neighbour, rand = Math.random) {
  const fam = familyOf(sent[sent.length - 1]);
  const pool = FAMILY[fam];
  const out = [TRAIT_FAV[fam], pool[Math.floor(rand() * pool.length)]];
  if (rand() < 0.4) out.push(SIGNATURE[neighbour] || '✨');
  return out;
}

export function unlockedSet(progress) {
  const set = new Set(STARTER);
  for (const a of ACHIEVEMENTS) if ((progress.achievements || []).includes(a.id)) a.emojis.forEach(e => set.add(e));
  for (const [name, e] of Object.entries(SIGNATURE)) if (((progress.friends || {})[name]?.hearts || 0) >= 3) set.add(e);
  return set;
}
