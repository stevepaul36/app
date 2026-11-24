// The island road: Willowvale plus six more towns, each on its own 44 x 44 island grid.
// Every town is built from a recipe (venues, homes, landmarks, neighbours) by one generic builder,
// so the engine treats each of them exactly like Willowvale.
import { N, T, rng } from './world.js';

// Ground skins: a town can draw its roads, plazas and lawns with its own tiles (types 13+ in cityart.js).
export const SKIN = { ASPHALT: 13, STONE: 14, TERRACOTTA: 15, GRAVEL: 16, REDTILE: 17, TECH: 18, AUTUMN: 19, BRICK: 20, WHITE: 21, SANDSTONE: 22 };

// Map of the whole island chain (positions are 0..100 on the island-map card).
export const CITY_LIST = [
  { id: 'willowvale', name: 'Willowvale', icon: '🌳', color: '#3FA86A', tagline: 'Your home town: café, market, marina and the Sunwheel.', pos: [50, 52], fare: 0 },
  { id: 'maple', name: 'Maple Row', icon: '🍁', color: '#E8823A', tagline: 'Leafy streets of houses, a school, a pool and a jogging track.', pos: [24, 30], fare: 3, tasks: [] },
  { id: 'skyhaven', name: 'Skyhaven', icon: '🏙️', color: '#3F6FD8', tagline: 'Glass towers, a monorail, the Neon Arcade and tech jobs.', pos: [78, 26], fare: 6, skip: 150,
    tasks: [{ k: 'friends', n: 2, label: 'Make 2 friends (2 hearts each)' }, { k: 'places', n: 5, label: 'Visit 5 different places' }, { k: 'works', n: 1, label: 'Work a shift' }] },
  { id: 'lumen', name: 'Lumen Labs', icon: '🔭', color: '#2BB3A3', tagline: 'Science town: observatory, robot museum and the Bright Ideas Lab.', pos: [88, 58], fare: 6, skip: 200,
    tasks: [{ k: 'logic', n: 2, label: 'Reach logic level 2' }, { k: 'reads', n: 3, label: 'Read or study 3 times' }, { k: 'visited:skyhaven', n: 1, label: 'Visit Skyhaven' }] },
  { id: 'lantern', name: 'Lantern Quarter', icon: '🏮', color: '#D9363E', tagline: 'Lantern-lit streets, a teahouse, a pagoda and a night market.', pos: [16, 66], fare: 6, skip: 250,
    tasks: [{ k: 'cooking', n: 2, label: 'Reach cooking level 2' }, { k: 'meals', n: 5, label: 'Cook 5 meals' }, { k: 'friends', n: 4, label: 'Make 4 friends' }] },
  { id: 'sakura', name: 'Sakura Hill', icon: '🌸', color: '#E86A9A', tagline: 'Cherry blossoms, a hot-spring onsen, a ramen bar and a hilltop garden.', pos: [64, 84], fare: 8, skip: 300,
    tasks: [{ k: 'fitness', n: 2, label: 'Reach fitness level 2' }, { k: 'bestFriends', n: 1, label: 'Make a best friend (5 hearts)' }, { k: 'cities', n: 4, label: 'Visit 4 towns' }] },
  { id: 'marigold', name: 'Marigold Bazaar', icon: '🪔', color: '#F29A1D', tagline: 'A grand bazaar, chai corner, sweet shop and the Lotus Garden.', pos: [34, 88], fare: 8, skip: 350,
    tasks: [{ k: 'charisma', n: 2, label: 'Reach charisma level 2' }, { k: 'creativity', n: 2, label: 'Reach creativity level 2' }, { k: 'achv', n: 10, label: 'Unlock 10 emoji achievements' }] },
];
export const cityMeta = id => CITY_LIST.find(c => c.id === id);
// Roads on the island map: [from, to].
export const ROUTES = [['willowvale', 'maple'], ['willowvale', 'skyhaven'], ['skyhaven', 'lumen'], ['willowvale', 'lumen'], ['maple', 'lantern'], ['willowvale', 'lantern'], ['willowvale', 'sakura'], ['sakura', 'marigold'], ['lantern', 'marigold']];

// Each town unlocks a pack of emojis the first time you visit; packs can also be bought in the shop.
export const CITY_PACKS = {
  maple: { name: 'Maple Row pack', emojis: ['🍁', '🏡', '🏊', '🚸'], price: 60 },
  skyhaven: { name: 'Skyhaven pack', emojis: ['🏙️', '🤖', '🚀', '🕹️'], price: 80 },
  lumen: { name: 'Lumen Labs pack', emojis: ['🔭', '🧪', '🪐', '💡'], price: 80 },
  lantern: { name: 'Lantern pack', emojis: ['🏮', '🥟', '🐉', '🧧'], price: 80 },
  sakura: { name: 'Sakura pack', emojis: ['🌸', '🍜', '🎐', '🍡'], price: 80 },
  marigold: { name: 'Marigold pack', emojis: ['🪔', '🌼', '🫖', '🐘'], price: 80 },
};

const Q = { nw: 'nw', ne: 'ne', se: 'se', sw: 'sw' };
export const quadrantAt = (x, y) => (x < 21 ? (y < 21 ? Q.nw : Q.sw) : (y < 21 ? Q.ne : Q.se));

// ---------- recipes ----------
// Venue: id, name, type, icon, color, size [w, d], zone (quadrant or 'any'), acts (action set in sim.js),
// style (themed art in cityart.js) or vstyle (Willowvale-style venue colours), activity (daily reward).
const act = (title, verb, story, reward, amount, coins) => ({ title, verb, story, reward, amount, coins });

export const RECIPES = {
  maple: {
    seed: 101, ground: T.GRASS, skin: { [T.PATH]: SKIN.BRICK, [T.PLAZA]: SKIN.BRICK, [T.GRASS]: SKIN.AUTUMN }, trees: ['maple', 'maple', 'round', 'maple'], treeChance: 0.3, lamp: null,
    districts: { nw: ['Acorn Lane', '#E8823A'], ne: ['School Hill', '#D9485F'], se: ['Poolside', '#2E9BD6'], sw: ['Maple Park', '#3FA86A'] },
    center: { lm: 'bandstand', name: 'The Bandstand', acts: 'bandstand', icon: '🎺' },
    venues: [
      { id: 'maple-school', name: 'Maple Row School', type: 'School', icon: '🏫', color: '#D9485F', size: [4, 3], zone: 'ne', style: 'school', acts: 'school', desc: 'Bright classrooms, a big library corner and a bell that rings at nine.', activity: act('Spelling bee', 'Spelling', 'You spelled “marmalade” and won a gold star.', 'crafts', 1, 4) },
      { id: 'maple-track', name: 'Maple Park Track', type: 'Track', icon: '🏃', color: '#3FA86A', size: [5, 3], zone: 'sw', flat: 'track', acts: 'track', desc: 'A springy running loop where the town jogs every morning.', activity: act('Fun run', 'Jogging', 'You finished the fun run and got a medal ribbon.', 'coins', 0, 5) },
      { id: 'maple-pool', name: 'Splash Pool', type: 'Pool', icon: '🏊', color: '#2E9BD6', size: [3, 3], zone: 'se', style: 'pool', acts: 'pool', desc: 'A sparkling outdoor pool with a twisty slide.', activity: act('Swim race', 'Swimming', 'You won the doggy-paddle race!', 'coins', 0, 6) },
      { id: 'maple-shop', name: 'Corner Shop', type: 'Shop', icon: '🛒', color: '#F2A93B', size: [2, 2], zone: 'nw', vstyle: { wall: '#FFF1D6', roof: '#F2A93B', floors: 1, roofType: 'gable', awning: ['#F2A93B', '#FFFFFF'] }, acts: 'cornershop', desc: 'Snacks, stickers and the newspaper.', activity: act('Help stack shelves', 'Stacking', 'The shopkeeper gave you a berry for your help.', 'berries', 1, 3) },
      { id: 'maple-bakery', name: 'Hearth Bakery', type: 'Bakery', icon: '🥐', color: '#C9672E', size: [3, 2], zone: 'nw', vstyle: { wall: '#FFE9D2', roof: '#C9672E', floors: 2, roofType: 'gable', awning: ['#C9672E', '#FFFFFF'] }, acts: 'cafe', desc: 'Warm bread at sunrise and cinnamon buns all day.', activity: act('Bake bread', 'Kneading', 'Your loaf rose perfectly.', 'berries', 1, 4) },
    ],
    homes: { count: 20, kinds: ['house', 'bungalow', 'house', 'townhouse', 'treehouse', 'bungalow'], extra: 6, rent: [10, 24] },
    fillers: [],
    neighbours: [
      { name: 'Rosie', species: 'bunny', traits: ['Neat', 'Early Bird', 'Athletic'], line: 'I jog round the park before breakfast. Join me!', wants: 'flowers', jogger: true },
      { name: 'Finn', species: 'fox', traits: ['Playful', 'Athletic', 'Social Butterfly'], line: 'Bet I can do the pool slide backwards.', wants: 'fish', jogger: true },
      { name: 'Poppy', species: 'sheep', traits: ['Bookworm', 'Shy', 'Early Bird'], line: 'I teach the little ones to read at the school.', wants: 'crafts', work: 'maple-school' },
      { name: 'Oscar', species: 'bear', traits: ['Foodie', 'Early Bird', 'Neat'], line: 'The bakery opens at six. I am there at five past.', wants: 'berries', work: 'maple-bakery' },
      { name: 'Daisy', species: 'deer', traits: ['Outdoorsy', 'Artist', 'Shy'], line: 'The maples go red, then gold. My favourite is in between.', wants: 'flowers' },
      { name: 'Milo', species: 'cat', traits: ['Night Owl', 'Playful', 'Foodie'], line: 'Have you tried the corner shop sherbet? Fizzy!', wants: 'fish' },
      { name: 'Ivy', species: 'otter', traits: ['Athletic', 'Outdoorsy', 'Music Lover'], line: 'I am the lifeguard at Splash Pool. Walk, do not run!', wants: 'fish', work: 'maple-pool', jogger: true },
      { name: 'Theo', species: 'raccoon', traits: ['Music Lover', 'Social Butterfly', 'Night Owl'], line: 'Band practice at the bandstand on Sundays.', wants: 'crafts' },
    ],
  },

  skyhaven: {
    seed: 202, ground: T.GRASS, skin: { [T.PATH]: SKIN.ASPHALT, [T.PLAZA]: SKIN.TECH, [T.GRASS]: SKIN.TECH }, trees: ['planter', 'round', 'planter'], treeChance: 0.1, lamp: 'neon', grid: true,
    districts: { nw: ['Circuit Row', '#3F6FD8'], ne: ['Neon Mile', '#C94BD8'], se: ['Skyline Bay', '#2E9BD6'], sw: ['Garden Deck', '#3FA86A'] },
    center: { lm: 'holo', name: 'Hologram Fountain', acts: 'fountain', icon: '💠' },
    venues: [
      { id: 'sky-tech', name: 'Pixel Works', type: 'Tech office', icon: '💻', color: '#3F6FD8', size: [3, 3], zone: 'nw', style: 'office', acts: 'office', desc: 'Where the island’s apps and games get made.', activity: act('Bug hunt', 'Debugging', 'You found a sneaky bug and the team cheered.', 'coins', 0, 8) },
      { id: 'sky-arcade', name: 'Neon Arcade', type: 'Arcade', icon: '🕹️', color: '#C94BD8', size: [3, 2], zone: 'ne', style: 'arcade', acts: 'arcade', desc: 'Claw machines, dance mats and a high-score wall.', activity: act('High score', 'Playing', 'Your name is on the high-score wall!', 'crafts', 1, 4) },
      { id: 'sky-mall', name: 'Skyline Mall', type: 'Mall', icon: '🛍️', color: '#2E9BD6', size: [4, 3], zone: 'ne', style: 'mall', acts: 'mall', desc: 'Three floors of shops and a food court with a view.', activity: act('Shop helper', 'Helping', 'You helped a shopkeeper and got a thank-you coin.', 'coins', 0, 6) },
      { id: 'sky-cinema', name: 'Starlight Cinema', type: 'Cinema', icon: '🎬', color: '#F0587A', size: [3, 3], zone: 'se', style: 'cinema', acts: 'cinema', desc: 'Big screens, comfy seats and popcorn that crunches.', activity: act('Movie night', 'Watching', 'The cartoon made the whole room giggle.', 'coins', 0, 5) },
      { id: 'sky-monorail', name: 'Monorail Station', type: 'Monorail', icon: '🚝', color: '#7A8798', size: [4, 2], zone: 'sw', style: 'monorail', acts: 'monorail', desc: 'A smooth ride above the rooftops.', activity: act('Sky ride', 'Riding', 'You waved at the whole city from the monorail.', 'coins', 0, 4) },
      { id: 'sky-gym', name: 'Pulse Gym', type: 'Gym', icon: '🏋️', color: '#3FA86A', size: [3, 2], zone: 'sw', style: 'gym', acts: 'gym', desc: 'Climbing wall, trampolines and a running machine.', activity: act('Climb the wall', 'Climbing', 'You rang the bell at the top!', 'coins', 0, 5) },
    ],
    homes: { count: 14, kinds: ['tower', 'condo', 'tower'], extra: 4, rent: [24, 52] },
    fillers: [{ style: 'skyscraper', size: [2, 2], n: 9 }, { style: 'skyscraper', size: [3, 3], n: 4 }],
    neighbours: [
      { name: 'Nova', species: 'cat', traits: ['Night Owl', 'Artist', 'Social Butterfly'], line: 'I design the glowing signs on Neon Mile.', wants: 'crafts', work: 'sky-arcade' },
      { name: 'Jett', species: 'fox', traits: ['Athletic', 'Early Bird', 'Playful'], line: 'Fastest route across town? Monorail, every time.', wants: 'fish', jogger: true },
      { name: 'Pixel', species: 'raccoon', traits: ['Bookworm', 'Night Owl', 'Shy'], line: 'I write code at Pixel Works. Mostly games!', wants: 'berries', work: 'sky-tech' },
      { name: 'Zara', species: 'deer', traits: ['Social Butterfly', 'Music Lover', 'Neat'], line: 'The mall has a piano. I play it when no one is looking.', wants: 'flowers', work: 'sky-mall' },
      { name: 'Echo', species: 'bunny', traits: ['Playful', 'Music Lover', 'Foodie'], line: 'Dance mat champion three weeks running.', wants: 'berries' },
      { name: 'Rex', species: 'bear', traits: ['Athletic', 'Foodie', 'Early Bird'], line: 'I coach climbing at Pulse Gym. Chalk up!', wants: 'fish', work: 'sky-gym', jogger: true },
      { name: 'Luma', species: 'otter', traits: ['Artist', 'Outdoorsy', 'Night Owl'], line: 'The towers sparkle at night like a sea of stars.', wants: 'flowers' },
      { name: 'Kip', species: 'sheep', traits: ['Neat', 'Bookworm', 'Shy'], line: 'I fix the monorail. It purrs when it is happy.', wants: 'crafts', work: 'sky-monorail' },
    ],
  },

  lumen: {
    seed: 303, ground: T.GRASS, skin: { [T.PATH]: SKIN.WHITE, [T.PLAZA]: SKIN.TECH }, trees: ['round', 'pine', 'round'], treeChance: 0.22, lamp: 'neon',
    districts: { nw: ['Star Field', '#3F4FB0'], ne: ['Laboratory Lane', '#2BB3A3'], se: ['Museum Mile', '#8E7CE0'], sw: ['Greenhouse Gardens', '#3FA86A'] },
    center: { lm: 'atom', name: 'The Big Atom', acts: 'admire', icon: '⚛️' },
    venues: [
      { id: 'lumen-observatory', name: 'Starlight Observatory', type: 'Observatory', icon: '🔭', color: '#3F4FB0', size: [3, 3], zone: 'nw', style: 'observatory', acts: 'observatory', desc: 'A giant telescope under a dome that opens at night.', activity: act('Spot a comet', 'Stargazing', 'You spotted a comet and named it after yourself!', 'crafts', 1, 5) },
      { id: 'lumen-lab', name: 'Bright Ideas Lab', type: 'Lab', icon: '🧪', color: '#2BB3A3', size: [4, 3], zone: 'ne', style: 'lab', acts: 'lab', desc: 'Bubbling beakers, buzzing robots and careful scientists.', activity: act('Volcano experiment', 'Experimenting', 'Your baking-soda volcano fizzed over the top!', 'coins', 0, 7) },
      { id: 'lumen-museum', name: 'Robot Museum', type: 'Museum', icon: '🤖', color: '#8E7CE0', size: [4, 3], zone: 'se', style: 'museum', acts: 'museum', desc: 'Friendly robots, dinosaur bones and a moon rock you can touch.', activity: act('Museum quiz', 'Exploring', 'You answered every quiz question.', 'flowers', 1, 4) },
      { id: 'lumen-greenhouse', name: 'Glass Greenhouse', type: 'Greenhouse', icon: '🌿', color: '#3FA86A', size: [3, 3], zone: 'sw', style: 'greenhouse', acts: 'greenhouse', desc: 'Giant leaves, tiny cactuses and a pond of lily pads.', activity: act('Plant a seed', 'Planting', 'Your seed sprouted already. Science!', 'flowers', 1, 4) },
      { id: 'lumen-cafe', name: 'Quark Café', type: 'Café', icon: '☕', color: '#F2A93B', size: [2, 2], zone: 'nw', vstyle: { wall: '#F4FBFF', roof: '#2BB3A3', floors: 1, roofType: 'flat', awning: ['#2BB3A3', '#FFFFFF'] }, acts: 'cafe', desc: 'Atom-shaped cookies and fizzy lemonade.', activity: act('Taste test', 'Tasting', 'You tried the new atom cookie. Delicious.', 'berries', 1, 3) },
    ],
    homes: { count: 16, kinds: ['labhouse', 'domehouse', 'apartment', 'labhouse', 'domehouse'], extra: 5, rent: [16, 36] },
    fillers: [{ style: 'turbine', size: [1, 1], n: 4, zone: 'outer', landmark: true }],
    neighbours: [
      { name: 'Quill', species: 'raccoon', traits: ['Bookworm', 'Night Owl', 'Shy'], line: 'I count stars at the observatory. I am up to nine thousand.', wants: 'crafts', work: 'lumen-observatory' },
      { name: 'Vega', species: 'cat', traits: ['Neat', 'Bookworm', 'Early Bird'], line: 'Safety goggles on! Then we can mix things.', wants: 'flowers', work: 'lumen-lab' },
      { name: 'Atom', species: 'bear', traits: ['Foodie', 'Playful', 'Social Butterfly'], line: 'The museum robot waves back if you wave first.', wants: 'berries' },
      { name: 'Iris', species: 'deer', traits: ['Outdoorsy', 'Artist', 'Neat'], line: 'The greenhouse orchid bloomed today. Come see!', wants: 'flowers', work: 'lumen-greenhouse' },
      { name: 'Bolt', species: 'fox', traits: ['Athletic', 'Playful', 'Early Bird'], line: 'I am building a robot that can do cartwheels.', wants: 'crafts', jogger: true },
      { name: 'Fizz', species: 'otter', traits: ['Playful', 'Foodie', 'Music Lover'], line: 'Quark Café lemonade has real bubbles. I checked.', wants: 'fish' },
      { name: 'Gizmo', species: 'bunny', traits: ['Bookworm', 'Shy', 'Night Owl'], line: 'I guide tours at the Robot Museum.', wants: 'berries', work: 'lumen-museum' },
      { name: 'Sol', species: 'sheep', traits: ['Outdoorsy', 'Early Bird', 'Athletic'], line: 'The wind turbines spin faster before a storm.', wants: 'fish', jogger: true },
    ],
  },

  lantern: {
    seed: 404, ground: T.GRASS, skin: { [T.PATH]: SKIN.STONE, [T.PLAZA]: SKIN.REDTILE }, trees: ['bamboo', 'round', 'bamboo', 'blossom'], treeChance: 0.24, lamp: 'lantern',
    districts: { nw: ['Lantern Street', '#D9363E'], ne: ['Jade Corner', '#2E9B6E'], se: ['Moon Garden', '#8E7CE0'], sw: ['Night Market', '#F2A93B'] },
    center: { lm: 'pagoda', name: 'Five-Tier Pagoda', acts: 'pagoda', icon: '🏯' },
    venues: [
      { id: 'lantern-tea', name: 'Jade Teahouse', type: 'Teahouse', icon: '🍵', color: '#2E9B6E', size: [3, 3], zone: 'ne', style: 'teahouse', acts: 'teahouse', desc: 'Tiny cups of jasmine tea and steaming baskets of dim sum.', activity: act('Pour the tea', 'Pouring', 'You poured tea without spilling a drop.', 'berries', 1, 4) },
      { id: 'lantern-noodle', name: 'Golden Noodle Bar', type: 'Noodle bar', icon: '🍜', color: '#F2A93B', size: [2, 2], zone: 'nw', style: 'shophouse', shade: '#F2A93B', acts: 'noodles', desc: 'Hand-pulled noodles stretched right in the window.', activity: act('Pull noodles', 'Stretching', 'Your noodle was as long as a tail!', 'coins', 0, 5) },
      { id: 'lantern-kitchen', name: 'Dumpling Kitchen', type: 'Kitchen', icon: '🥟', color: '#D9363E', size: [3, 2], zone: 'nw', style: 'shophouse', shade: '#D9363E', acts: 'kitchen', desc: 'Where dumplings are folded by the hundred.', activity: act('Fold dumplings', 'Folding', 'You folded twelve perfect dumplings.', 'berries', 1, 5) },
      { id: 'lantern-market', name: 'Night Market', type: 'Market', icon: '🧧', color: '#F2A93B', size: [4, 3], zone: 'sw', style: 'nightmarket', acts: 'nightmarket', desc: 'Lantern-lit stalls of snacks, toys and paper kites.', activity: act('Kite stall', 'Trading', 'You traded a keepsake for a dragon kite.', 'crafts', 1, 6) },
      { id: 'lantern-garden', name: 'Moon Garden', type: 'Garden', icon: '🌕', color: '#8E7CE0', size: [3, 3], zone: 'se', style: 'moongarden', acts: 'garden', desc: 'A round moon gate, koi pond and quiet stone paths.', activity: act('Feed the koi', 'Feeding', 'The koi did a happy splash.', 'flowers', 1, 4) },
    ],
    homes: { count: 16, kinds: ['shophouse', 'courtyard', 'shophouse', 'shophouse'], extra: 5, rent: [14, 34] },
    fillers: [{ style: 'shophouse', size: [2, 2], n: 5 }, { style: 'paifang', size: [3, 1], n: 1, zone: 'entrance', landmark: true }],
    neighbours: [
      { name: 'Mei', species: 'cat', traits: ['Neat', 'Artist', 'Early Bird'], line: 'I paint the lanterns. Each one has a tiny wish on it.', wants: 'flowers' },
      { name: 'Bao', species: 'bear', traits: ['Foodie', 'Early Bird', 'Social Butterfly'], line: 'Dumplings are best when you fold them with friends.', wants: 'berries', work: 'lantern-kitchen' },
      { name: 'Lin', species: 'fox', traits: ['Athletic', 'Early Bird', 'Outdoorsy'], line: 'Morning stretches in the Moon Garden. Very calm.', wants: 'fish', jogger: true },
      { name: 'Tao', species: 'otter', traits: ['Playful', 'Foodie', 'Night Owl'], line: 'The night market has a toy dragon that wiggles.', wants: 'fish', work: 'lantern-market' },
      { name: 'Ping', species: 'bunny', traits: ['Music Lover', 'Social Butterfly', 'Playful'], line: 'I play the drum when the lanterns light up.', wants: 'crafts' },
      { name: 'Jade', species: 'deer', traits: ['Neat', 'Bookworm', 'Shy'], line: 'Jasmine or oolong? At the teahouse I know every leaf.', wants: 'flowers', work: 'lantern-tea' },
      { name: 'Wen', species: 'raccoon', traits: ['Bookworm', 'Night Owl', 'Artist'], line: 'From the top of the pagoda you can see Sakura Hill.', wants: 'crafts' },
      { name: 'Lulu', species: 'sheep', traits: ['Foodie', 'Outdoorsy', 'Shy'], line: 'The noodle bar makes a noodle so long it never ends.', wants: 'berries', work: 'lantern-noodle' },
    ],
  },

  sakura: {
    seed: 505, ground: T.GRASS, skin: { [T.PATH]: SKIN.STONE, [T.PLAZA]: SKIN.GRAVEL }, trees: ['cherry', 'cherry', 'pine', 'cherry', 'round'], treeChance: 0.28, lamp: 'stonelantern',
    districts: { nw: ['Blossom Lane', '#E86A9A'], ne: ['Hot Spring Row', '#C9672E'], se: ['Hilltop Garden', '#3FA86A'], sw: ['Koi Pond Park', '#2E9BD6'] },
    center: { lm: 'bigsakura', name: 'The Great Cherry Tree', acts: 'bigtree', icon: '🌸' },
    venues: [
      { id: 'sakura-onsen', name: 'Hot Spring Onsen', type: 'Onsen', icon: '♨️', color: '#C9672E', size: [4, 3], zone: 'ne', style: 'onsen', acts: 'onsen', desc: 'Warm steamy pools that make tired paws feel brand new.', activity: act('Long soak', 'Soaking', 'Your fur is the fluffiest it has ever been.', 'flowers', 1, 4) },
      { id: 'sakura-ramen', name: 'Hilltop Ramen', type: 'Ramen bar', icon: '🍜', color: '#D9485F', size: [2, 2], zone: 'nw', style: 'machiya', shade: '#D9485F', curtain: true, acts: 'ramen', desc: 'Rich broth, springy noodles and a counter with six stools.', activity: act('Make broth', 'Simmering', 'Your broth was so good the chef bowed.', 'berries', 1, 5) },
      { id: 'sakura-shrine', name: 'Hilltop Garden', type: 'Garden', icon: '⛩️', color: '#E04B3A', size: [3, 3], zone: 'se', style: 'shrine', acts: 'shrinegarden', desc: 'A red gate, stone lanterns and a little garden house on the hill.', activity: act('Sweep the path', 'Sweeping', 'You swept the petals into a pink heart.', 'flowers', 1, 4) },
      { id: 'sakura-dojo', name: 'Bamboo Dojo', type: 'Dojo', icon: '🥋', color: '#6B4A2E', size: [3, 3], zone: 'sw', style: 'machiya', shade: '#6B4A2E', big: true, acts: 'dojo', desc: 'Practise balance, kicks and bows on soft mats.', activity: act('Belt test', 'Practising', 'You passed your yellow belt test!', 'coins', 0, 6) },
      { id: 'sakura-koi', name: 'Koi Pond', type: 'Pond', icon: '🎏', color: '#2E9BD6', size: [3, 3], zone: 'sw', flat: 'koi', acts: 'koi', desc: 'Bright orange and white koi swimming under a little red bridge.', activity: act('Koi count', 'Counting', 'You counted eleven koi and one shy turtle.', 'fish', 1, 3) },
    ],
    homes: { count: 16, kinds: ['machiya', 'minka', 'machiya'], extra: 5, rent: [14, 34] },
    fillers: [],
    neighbours: [
      { name: 'Hana', species: 'bunny', traits: ['Artist', 'Outdoorsy', 'Early Bird'], line: 'When the petals fall, I paint each one.', wants: 'flowers' },
      { name: 'Kenji', species: 'fox', traits: ['Athletic', 'Neat', 'Early Bird'], line: 'At the dojo we bow before we start, and say thank you after.', wants: 'crafts', work: 'sakura-dojo', jogger: true },
      { name: 'Yuki', species: 'sheep', traits: ['Neat', 'Shy', 'Bookworm'], line: 'The onsen is my favourite place on a snowy day.', wants: 'flowers', work: 'sakura-onsen' },
      { name: 'Momo', species: 'otter', traits: ['Playful', 'Foodie', 'Social Butterfly'], line: 'I can slurp ramen louder than anyone. It means it is tasty!', wants: 'fish' },
      { name: 'Sora', species: 'deer', traits: ['Outdoorsy', 'Music Lover', 'Shy'], line: 'Wind chimes sing at the Hilltop Garden.', wants: 'crafts' },
      { name: 'Riku', species: 'bear', traits: ['Foodie', 'Early Bird', 'Neat'], line: 'Three days to make the perfect ramen broth.', wants: 'berries', work: 'sakura-ramen' },
      { name: 'Aiko', species: 'cat', traits: ['Bookworm', 'Night Owl', 'Artist'], line: 'I fold paper cranes. I have made four hundred.', wants: 'flowers' },
      { name: 'Taro', species: 'raccoon', traits: ['Outdoorsy', 'Playful', 'Athletic'], line: 'The koi know my whistle.', wants: 'fish', jogger: true },
    ],
  },

  marigold: {
    seed: 606, ground: T.GRASS, skin: { [T.PATH]: SKIN.TERRACOTTA, [T.PLAZA]: SKIN.SANDSTONE }, trees: ['palm', 'banyan', 'palm', 'banyan', 'round'], treeChance: 0.22, lamp: 'brass', marigolds: true,
    districts: { nw: ['Spice Lane', '#E8582A'], ne: ['Bazaar Gate', '#F29A1D'], se: ['Lotus Garden', '#E86A9A'], sw: ['Picture Palace Road', '#8E3FB8'] },
    center: { lm: 'rangoli', name: 'Rangoli Square', acts: 'rangoli', icon: '🌺', flat: true },
    venues: [
      { id: 'marigold-bazaar', name: 'Grand Bazaar', type: 'Bazaar', icon: '🧺', color: '#F29A1D', size: [4, 3], zone: 'ne', style: 'bazaar', acts: 'bazaar', desc: 'Rows of bright stalls with spices, bangles, kites and fruit.', activity: act('Haggle for mangoes', 'Trading', 'You traded a smile for the ripest mango.', 'berries', 1, 6) },
      { id: 'marigold-chai', name: 'Chai Corner', type: 'Chai stall', icon: '🫖', color: '#C9672E', size: [2, 2], zone: 'nw', style: 'chai', acts: 'chai', desc: 'Sweet spiced chai poured from up high.', activity: act('Pour from high', 'Pouring', 'You poured chai from way up high and caught every drop!', 'coins', 0, 4) },
      { id: 'marigold-sweets', name: 'Sweet Shop', type: 'Sweet shop', icon: '🍬', color: '#E86A9A', size: [2, 2], zone: 'nw', style: 'haveli', shade: '#F7B6C6', shop: true, acts: 'sweets', desc: 'Trays of colourful sweets that sparkle in the window.', activity: act('Make laddoos', 'Rolling', 'You rolled the roundest laddoos.', 'berries', 1, 4) },
      { id: 'marigold-pavilion', name: 'Lotus Garden', type: 'Garden', icon: '🪷', color: '#E86A9A', size: [4, 3], zone: 'se', style: 'pavilion', acts: 'garden', desc: 'Domed pavilions, a lotus pond and shady arches.', activity: act('Lotus count', 'Counting', 'You counted twenty lotus flowers.', 'flowers', 1, 4) },
      { id: 'marigold-cinema', name: 'Picture Palace', type: 'Cinema', icon: '🎬', color: '#8E3FB8', size: [3, 3], zone: 'sw', style: 'cinema', palace: true, acts: 'cinema', desc: 'A grand old cinema where everyone dances in the aisles.', activity: act('Dance number', 'Dancing', 'You danced along with the whole audience!', 'coins', 0, 6) },
    ],
    homes: { count: 18, kinds: ['palace', 'haveli', 'hut', 'haveli', 'hut', 'haveli'], once: ['palace'], extra: 5, rent: [10, 32] },
    fillers: [{ style: 'rickshaw', size: [1, 1], n: 4, zone: 'road', landmark: true }],
    neighbours: [
      { name: 'Priya', species: 'deer', traits: ['Artist', 'Neat', 'Early Bird'], line: 'I draw rangoli every morning. Want to help with the colours?', wants: 'flowers' },
      { name: 'Arjun', species: 'fox', traits: ['Athletic', 'Social Butterfly', 'Early Bird'], line: 'Cricket in the park after school. You can bat first!', wants: 'crafts', jogger: true },
      { name: 'Meera', species: 'cat', traits: ['Music Lover', 'Artist', 'Night Owl'], line: 'My grandmother taught me songs about the monsoon.', wants: 'flowers' },
      { name: 'Ravi', species: 'bear', traits: ['Foodie', 'Social Butterfly', 'Early Bird'], line: 'Chai is better shared. Two cups, please!', wants: 'berries', work: 'marigold-chai' },
      { name: 'Anika', species: 'bunny', traits: ['Playful', 'Foodie', 'Music Lover'], line: 'The sweet shop has sweets in every colour of a kite.', wants: 'berries', work: 'marigold-sweets' },
      { name: 'Kabir', species: 'otter', traits: ['Bookworm', 'Shy', 'Outdoorsy'], line: 'The lotus flowers open when the sun says hello.', wants: 'fish' },
      { name: 'Tara', species: 'sheep', traits: ['Neat', 'Outdoorsy', 'Athletic'], line: 'I keep the Lotus Garden tidy. The frogs help.', wants: 'flowers', work: 'marigold-pavilion', jogger: true },
      { name: 'Dev', species: 'raccoon', traits: ['Playful', 'Night Owl', 'Foodie'], line: 'At the bazaar I sell kites. The blue one flies highest.', wants: 'crafts', work: 'marigold-bazaar' },
    ],
  },
};

// ---------- the generic town builder ----------
const WALKABLE = new Set([T.SAND, T.GRASS, T.PATH, T.PLAZA, T.PARK, T.DOCK, T.MEADOW]);
const SOFT = new Set([T.GRASS, T.PARK, T.MEADOW, T.SAND]);

export function buildCity(id) {
  const R0 = RECIPES[id];
  const tiles = new Uint8Array(N * N), blocked = new Uint8Array(N * N), reserved = new Uint8Array(N * N);
  const idx = (i, j) => j * N + i;
  const inb = (i, j) => i >= 0 && j >= 0 && i < N && j < N;
  const get = (i, j) => (inb(i, j) ? tiles[idx(i, j)] : T.SEA);
  const set = (i, j, t) => { if (inb(i, j)) tiles[idx(i, j)] = t; };
  const r = rng(R0.seed);
  const c = (N - 1) / 2, RAD = 20.2;
  const ph = r() * 6;
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const dx = Math.abs(i - c) / RAD, dy = Math.abs(j - c) / RAD;
    const wob = Math.sin(i * 0.6 + ph) * 0.025 + Math.cos(j * 0.55 + ph * 2) * 0.025;
    const d = Math.pow(dx ** 4 + dy ** 4, 0.25) + wob;
    set(i, j, d < 0.9 ? R0.ground : d < 1 ? T.SAND : T.SEA);
  }
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    if (get(i, j) === T.SEA || get(i, j) === T.SAND) continue;
    if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => get(i + a, j + b) === T.SEA)) set(i, j, T.SAND);
  }
  const pave = (i, j) => { if (SOFT.has(get(i, j))) set(i, j, T.PATH); };
  // avenues, ring lanes and (in the big city) a tighter grid
  for (let k = 0; k < N; k++) { pave(21, k); pave(22, k); pave(k, 21); pave(k, 22); }
  for (let k = 10; k <= 33; k++) { pave(10, k); pave(33, k); pave(k, 10); pave(k, 33); }
  if (R0.grid) for (let k = 10; k <= 33; k++) { pave(16, k); pave(27, k); pave(k, 16); pave(k, 27); }
  for (let j = 19; j <= 24; j++) for (let i = 19; i <= 24; i++) set(i, j, T.PLAZA);
  // the island road arrives over a bridge from the north
  for (let j = 0; j <= 4; j++) for (const i of [21, 22]) if (get(i, j) === T.SEA || get(i, j) === T.SAND) set(i, j, T.DOCK);

  const objects = [];
  const walkable = (i, j) => inb(i, j) && WALKABLE.has(tiles[idx(i, j)]) && !blocked[idx(i, j)];
  const isRoad = (i, j) => { const t = get(i, j); return t === T.PATH || t === T.PLAZA || t === T.DOCK; };
  const footprint = o => { for (let j = o.j; j < o.j + o.d; j++) for (let i = o.i; i < o.i + o.w; i++) blocked[idx(i, j)] = 1; };
  const reserve = (o, m = 1) => { for (let j = o.j - m; j < o.j + o.d + m; j++) for (let i = o.i - m; i < o.i + o.w + m; i++) if (inb(i, j)) reserved[idx(i, j)] = 1; };
  function routeToRoad(si, sj) {
    const prev = new Map(), q = [[si, sj]], key = (i, j) => i + ',' + j;
    prev.set(key(si, sj), null);
    while (q.length) {
      const [i, j] = q.shift();
      if (isRoad(i, j)) { const route = []; let k = key(i, j); while (k) { route.push(k.split(',').map(Number)); k = prev.get(k); } return route; }
      if (prev.size > 400) return null;
      for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const ni = i + a, nj = j + b, nk = key(ni, nj);
        if (prev.has(nk) || !walkable(ni, nj)) continue;
        prev.set(nk, key(i, j)); q.push([ni, nj]);
      }
    }
    return null;
  }
  function place(o) {
    footprint(o);
    const faces = [{ face: 'j', tile: [o.i + Math.floor((o.w - 1) / 2), o.j + o.d] }, { face: 'i', tile: [o.i + o.w, o.j + Math.floor((o.d - 1) / 2)] }];
    let best = null;
    for (const f of faces) {
      if (!walkable(...f.tile)) continue;
      const route = routeToRoad(...f.tile); if (!route) continue;
      const score = -route.length + (f.face === 'j' ? 0.5 : 0);
      if (!best || score > best.score) best = { ...f, route, score };
    }
    if (best) { o.door = best.face; o.doorTile = best.tile; for (const [i, j] of best.route) if (SOFT.has(get(i, j))) set(i, j, T.PATH); }
    else { o.door = 'j'; o.doorTile = faces[0].tile; }
    objects.push(o); reserve(o);
    return o;
  }
  // Is a w x d lot free and facing a road?
  const inZone = (i, j, w, d, zone) => {
    const cx = i + w / 2, cy = j + d / 2;
    if (zone === 'any' || !zone) return true;
    if (zone === 'outer') return cx < 10 || cx > 33 || cy < 10 || cy > 33;
    if (zone === 'inner') return cx > 10 && cx < 33 && cy > 10 && cy < 33;
    return quadrantAt(cx, cy) === zone;
  };
  function lotScore(i, j, w, d) {
    for (let y = j - 1; y <= j + d; y++) for (let x = i - 1; x <= i + w; x++) {
      if (!inb(x, y)) return null;
      const inside = x >= i && x < i + w && y >= j && y < j + d;
      if (inside) { if (!SOFT.has(get(x, y)) || get(x, y) === T.SAND || blocked[idx(x, y)] || reserved[idx(x, y)]) return null; }
      else if (blocked[idx(x, y)]) return null;
    }
    // best when the front (+j) or side (+i) edge touches a road
    let s = 99;
    for (let x = i; x < i + w; x++) if (isRoad(x, j + d)) s = Math.min(s, 0); else if (isRoad(x, j + d + 1)) s = Math.min(s, 1);
    for (let y = j; y < j + d; y++) if (isRoad(i + w, y)) s = Math.min(s, 0.3); else if (isRoad(i + w + 1, y)) s = Math.min(s, 1.3);
    if (s > 2) return null;
    return s;
  }
  function findLot(w, d, zone, rnd) {
    let best = null;
    for (let j = 2; j < N - 2 - d; j++) for (let i = 2; i < N - 2 - w; i++) {
      if (!inZone(i, j, w, d, zone)) continue;
      const s = lotScore(i, j, w, d); if (s === null) continue;
      const score = s + rnd() * 0.6;
      if (!best || score < best.score) best = { i, j, score };
    }
    return best;
  }
  const rp = rng(R0.seed + 1);

  // bus stop beside the bridge, and the town square centrepiece
  const stop = { kind: 'busstop', i: 23, j: 4, w: 2, d: 1, name: 'Island bus stop', icon: '🚌' };
  if (get(23, 4) === T.SAND || get(23, 4) === T.SEA) stop.j = 5;
  for (let y = stop.j; y < stop.j + 1; y++) for (let x = 23; x < 25; x++) set(x, y, R0.ground);
  footprint(stop); stop.doorTile = [22, stop.j]; stop.stand = [22.5, stop.j + 0.5]; objects.push(stop); reserve(stop);
  // a pier and boat hire at the south end of the main avenue
  let jS = N - 1; while (jS > 30 && !(get(22, jS) === T.PATH || get(22, jS) === T.SAND || get(22, jS) === T.GRASS)) jS--;
  for (let j = jS + 1; j < Math.min(N, jS + 4); j++) for (const i of [21, 22]) if (get(i, j) === T.SEA) set(i, j, T.DOCK);
  for (const i of [21, 22]) if (get(i, jS) !== T.DOCK) set(i, jS, T.PATH);
  const pier = { kind: 'boathire', i: 23, j: jS - 1, w: 1, d: 1, name: 'Boat hire', icon: '🚣', stand: [22.5, jS + 0.5] };
  if (!blocked[idx(23, jS - 1)]) { set(23, jS - 1, T.SAND); footprint(pier); pier.doorTile = [22, jS]; objects.push(pier); reserve(pier); }
  const cen = R0.center;
  const centre = { kind: 'landmark', lm: cen.lm, i: 21, j: 21, w: 2, d: 2, name: cen.name, acts: cen.acts, icon: cen.icon, flat: !!cen.flat };
  if (cen.flat) { centre.i = 20; centre.j = 20; centre.w = 4; centre.d = 4; centre.stand = [22, 22]; } else footprint(centre);
  objects.push(centre); reserve(centre, 0);

  // venues first, near the middle of their quarter
  const venues = [];
  for (const v of R0.venues) {
    const [w, d] = v.size;
    const lot = findLot(w, d, v.zone, rp) || findLot(w, d, 'any', rp);
    if (!lot) continue;
    const o = Object.assign({}, v, { i: lot.i, j: lot.j, w, d });
    if (v.flat) {
      o.kind = 'venue'; o.flatArt = v.flat; o.stand = [o.i + w / 2, o.j + d / 2];
      for (let y = o.j; y < o.j + d; y++) for (let x = o.i; x < o.i + w; x++) set(x, y, T.PARK);
      objects.push(o); reserve(o);
    } else place(Object.assign(o, { kind: 'venue' }));
    venues.push(o);
  }
  // homes you can rent, then filler buildings
  const homes = [];
  const H = R0.homes, kinds = H.kinds;
  const rentSpan = H.rent;
  const usedNames = new Set();
  const makeHome = k => {
    let style = kinds[k % kinds.length];
    if (H.once && H.once.includes(style) && k >= kinds.length) style = kinds[(k + 1) % kinds.length];
    const SIZE = { palace: [4, 3], courtyard: [3, 3], minka: [3, 2], bungalow: [3, 2], townhouse: [3, 2] };
    const size = SIZE[style] || [2, 2];
    const lot = findLot(size[0], size[1], style === 'palace' ? 'outer' : k % 2 ? 'outer' : 'inner', rp) || findLot(size[0], size[1], 'any', rp);
    if (!lot) return;
    const kind = style === 'palace' ? 'villa' : ['tower', 'apartment', 'townhouse', 'condo'].includes(style) ? 'apartment' : 'house';
    let rent = Math.round(rentSpan[0] + (rentSpan[1] - rentSpan[0]) * ((k * 7) % H.count) / Math.max(1, H.count - 1));
    if (style === 'palace') rent = rentSpan[1] * 3; else if (style === 'hut') rent = Math.max(6, Math.round(rent * 0.6)); else if (style === 'courtyard' || style === 'minka') rent = Math.round(rent * 1.4);
    const STYLE_NAMES = { palace: 'Marigold Palace', treehouse: 'Treetop Hideout', hut: null };
    const HUTS = ['Clay Cottage', 'Mango Grove Hut', 'Sunflower Hut', 'Painted Hut', 'Paddy Field Hut', 'Peacock Hut', 'Banyan Shade Hut'];
    if (style === 'hut') STYLE_NAMES.hut = HUTS[k % HUTS.length];
    const name = STYLE_NAMES[style] ? STYLE_NAMES[style] + (style === 'treehouse' && k > 6 ? ' II' : '') : HOME_NAMES[id][k % HOME_NAMES[id].length] + (['', ' II', ' III', ' IV'][Math.floor(k / HOME_NAMES[id].length)] || '');
    const blurb = { palace: 'A real palace with domes, towers and a long balcony. Fit for a royal!', hut: 'A cosy round village hut with painted walls and a thatched roof.', treehouse: 'A secret cabin up in a big maple tree, with a rope ladder.', minka: 'A big old farmhouse with a thatched roof and a wooden porch.', courtyard: 'A home built around its own little garden, behind a red gate.', bungalow: 'A wide family home with a porch and a garden.', domehouse: 'A round dome home that glows at night.', condo: 'A city apartment with a balcony on every floor.' }[style] || HOME_BLURB[id];
    let unique = name; for (let n = 2; usedNames.has(unique); n++) unique = name.replace(/ (II|III|IV)$/, '') + ' ' + ['', '', 'II', 'III', 'IV', 'V', 'VI'][n];
    usedNames.add(unique);
    const o = place({ kind, home: true, style: style === 'house' || style === 'apartment' ? null : style, id: `${id}-home-${k + 1}`, i: lot.i, j: lot.j, w: size[0], d: size[1], look: k % 5, rent, price: rent * 22, name: unique, description: blurb });
    homes.push(o);
  };
  for (let k = 0; k < H.count; k++) makeHome(k);
  for (const f of R0.fillers) for (let k = 0; k < f.n; k++) {
    const [w, d] = f.size;
    if (f.zone === 'road') { // parked by the kerb
      for (let tries = 0; tries < 60; tries++) {
        const i = 6 + Math.floor(rp() * 32), j = 6 + Math.floor(rp() * 32);
        if (get(i, j) !== T.PATH || blocked[idx(i, j)] || reserved[idx(i, j)] || (i >= 19 && i <= 24) || (j >= 19 && j <= 24)) continue;
        const o = { kind: 'landmark', lm: f.style, i, j, w: 1, d: 1, deco: true, seed: k }; footprint(o); objects.push(o); reserve(o); break;
      }
      continue;
    }
    if (f.zone === 'entrance') { const o = { kind: 'landmark', lm: f.style, i: 23, j: 7, w, d, name: 'Lantern Gate', acts: 'admire', icon: '🏮' }; if (lotScore(23, 7, w, d) !== null) { footprint(o); objects.push(o); reserve(o); } continue; }
    const lot = findLot(w, d, f.zone || 'any', rp); if (!lot) continue;
    if (f.landmark) { const o = { kind: 'landmark', lm: f.style, i: lot.i, j: lot.j, w, d, deco: true, seed: k }; footprint(o); objects.push(o); reserve(o); }
    else place({ kind: 'shop', style: f.style, i: lot.i, j: lot.j, w, d, look: k, seed: k });
  }

  // more homes, added after everything else so the homes and shops above keep their spots
  for (let k = H.count; k < H.count + (H.extra || 0); k++) makeHome(k);

  // trees, flowers and lamps
  const decor = [];
  const rd = rng(R0.seed + 7);
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const t = get(i, j);
    if (blocked[idx(i, j)] || reserved[idx(i, j)]) continue;
    const nearRoad = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => isRoad(i + a, j + b));
    let chance = 0;
    if (t === T.GRASS || t === T.PARK || t === T.MEADOW) chance = Math.min(0.42, R0.treeChance * 1.3) * (nearRoad ? 0.5 : 1);
    else if (t === T.SAND) chance = 0.05;
    const roll = rd();
    if (roll < chance) {
      const kind = t === T.SAND ? 'palm' : R0.trees[Math.floor(rd() * R0.trees.length)];
      decor.push({ kind: 'tree', tree: kind, i, j, w: 1, d: 1, seed: Math.floor(rd() * 1000), ox: (rd() - 0.5) * 0.3, oy: (rd() - 0.5) * 0.3 });
      blocked[idx(i, j)] = 1;
    } else if ((t === T.GRASS || t === T.PARK) && rd() < 0.1) {
      decor.push({ kind: rd() < 0.75 ? 'flowers' : 'bush', i, j, w: 1, d: 1, seed: Math.floor(rd() * 1000), ox: (rd() - 0.5) * 0.4, oy: (rd() - 0.5) * 0.4, marigold: R0.marigolds });
    }
  }
  for (let k = 4; k < N - 4; k += 4) {
    for (const [i, j] of [[20, k], [23, k], [k, 20], [k, 23]]) {
      if (!walkable(i, j) || reserved[idx(i, j)] || get(i, j) === T.PLAZA || get(i, j) === T.DOCK) continue;
      decor.push({ kind: 'lamp', art: R0.lamp, i, j, w: 1, d: 1, seed: k });
    }
  }
  for (const [i, j, f] of [[19, 25, 'i'], [25, 19, 'j'], [18, 20, 'i'], [20, 18, 'j'], [25, 24, 'j'], [24, 25, 'i']]) if (walkable(i, j) && !reserved[idx(i, j)]) decor.push({ kind: 'bench', i, j, w: 1, d: 1, face: f });

  const boats = [];
  const rb = rng(R0.seed + 9);
  for (const [i, j] of [[39, 4], [41, 30], [6, 41], [1.5, 20], [40, 41], [3, 6]]) if (get(Math.floor(i), Math.floor(j)) === T.SEA) boats.push({ kind: 'boat', x: i, y: j, seed: Math.floor(rb() * 100), sail: rb() < 0.6 });

  // neighbours live in the town's homes
  const neighbours = R0.neighbours.map((n, k) => {
    const h = homes[(k * 3 + 1) % Math.max(1, homes.length)];
    return { ...n, outfit: k, home: h ? h.doorTile.slice() : [22, 26], city: id };
  });
  // the jogging loop follows the ring lane
  const jogLoop = [[10.5, 10.5], [33.5, 10.5], [33.5, 33.5], [10.5, 33.5]];

  const districts = {};
  for (const [k, [name, color]] of Object.entries(R0.districts)) districts[k] = { name, color, blurb: '', spawn: { nw: [14, 15], ne: [28, 15], se: [28, 28], sw: [15, 28] }[k] };
  return {
    id, tiles, blocked, objects, decor, boats, idx, get, inb, isRoad,
    walkable: (i, j) => walkable(i, j),
    skin: R0.skin || {}, stop, venues, homes, neighbours, jogLoop, districts,
    districtAt: (x, y) => quadrantAt(x, y),
  };
}

const HOME_NAMES = {
  maple: ['Acorn Cottage', 'Russet House', 'Conker Corner', 'Ember Lodge', 'Amber Gables', 'Hazelnut Home', 'Toffee Row', 'Pumpkin Place', 'Cider Cottage', 'Leafy Lodge', 'Chestnut House', 'Copper Corner', 'Bramble Gables', 'Harvest Home', 'Golden Row', 'Sorrel House'],
  skyhaven: ['Skylight Tower', 'Comet Heights', 'Glass Garden Tower', 'Neon Loft', 'Aurora Apartments', 'Cloudline', 'Pixel Point', 'Starlight Suites', 'Zenith Tower', 'Orbit Residences'],
  lumen: ['Prism House', 'Quasar Cottage', 'Nebula Nook', 'Orbit Flats', 'Photon Place', 'Galaxy Gardens', 'Ion Lodge', 'Comet Court', 'Spark House', 'Crystal Flats', 'Helix Home', 'Lumen Lofts'],
  lantern: ['Red Door House', 'Jade Window Home', 'Peony House', 'Golden Lantern Home', 'Plum Blossom House', 'Silk Kite House', 'Moon Window Home', 'Lucky Cat House', 'Bamboo Balcony', 'Pearl Door House', 'Dragon Step Home', 'Tea Leaf House'],
  sakura: ['Petal House', 'Maple Leaf Machiya', 'Crane House', 'Bamboo Lane Home', 'Snow Lantern House', 'Koi Window Home', 'Willow Bridge House', 'Plum Tree House', 'Mochi Machiya', 'Paper Fan House', 'Wind Chime Home', 'Moonview House'],
  marigold: ['Peacock Haveli', 'Mango Tree House', 'Saffron Haveli', 'Jasmine House', 'Lotus Window Haveli', 'Kite Roof House', 'Turmeric House', 'Monsoon Haveli', 'Bangle House', 'Coconut Court', 'Lantern Arch House', 'Marigold Haveli'],
};
const HOME_BLURB = {
  maple: 'A cosy family home on a leafy street.',
  skyhaven: 'A sky-high apartment with city views.',
  lumen: 'A bright modern home with a stargazing roof.',
  lantern: 'A shophouse home above a lantern-lit street.',
  sakura: 'A wooden townhouse with a tiny garden.',
  marigold: 'A colourful haveli with a rooftop terrace.',
};

// ---------- Willowvale gets the island road too ----------
// A bridge off the north shore and a bus stop beside the main avenue.
export function addWillowvaleRoad(world) {
  const { get, idx } = world;
  for (let j = 0; j <= 3; j++) for (const i of [21, 22]) if (get(i, j) === T.SEA || get(i, j) === T.SAND) world.tiles[idx(i, j)] = T.DOCK;
  let j0 = 3; while (j0 < 8 && (get(23, j0) === T.SEA || get(23, j0) === T.SAND || world.blocked[idx(23, j0)] || world.blocked[idx(24, j0)])) j0++;
  for (const i of [23, 24]) if (world.tiles[idx(i, j0)] !== T.PATH) world.tiles[idx(i, j0)] = T.GRASS;
  const stop = { kind: 'busstop', i: 23, j: j0, w: 2, d: 1, name: 'Island bus stop', icon: '🚌', doorTile: [22, j0], stand: [22.5, j0 + 0.5] };
  world.blocked[idx(23, j0)] = 1; world.blocked[idx(24, j0)] = 1;
  // clear any tree in the way
  const inWay = d => d.j >= j0 - 1 && d.j <= j0 + 1 && d.i >= 22 && d.i <= 25;
  for (const d of world.decor) if (inWay(d) && d.kind === 'tree') world.blocked[idx(d.i, d.j)] = 0;
  world.decor = world.decor.filter(d => !inWay(d));
  world.objects.push(stop);
  world.stop = stop;
  return stop;
}
