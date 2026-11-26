# Willowvale: Animal Town

A mobile-first illustrated animal-town life-sim for children. Walk an island town, look after your animal, make friends with the neighbours, style your home, and play **Paws & Properties**, a Monopoly-style property game played in the town itself. Coins only, no real money, and no typed chat.

Play it at **https://willowvale-animal-town.onrender.com**. The same game runs as an Android app and inside Reddit posts (see [`reddit/`](reddit/README.md)).

## What's in the game

**Town and life**

- Illustrated 2.5D island drawn on a 2D canvas with no 3D library and no image downloads. It has four districts (Willow Park, Old Town, Bluewater Quay, Fernhill Heights), a town square, eight places to visit, twelve homes, the Sunwheel and the windmill.
- Seven themed towns: Willowvale, then Maple Row, Skyhaven, Lumen Labs, Lantern Quarter, Sakura Hill and Marigold Bazaar, reached by bus and unlocked by finishing each town's tasks or skipping them with coins.
- Sims-style needs (hunger, energy, fun, social, hygiene, comfort), a day clock, weather and seasons. With **free will** on (the default), your animal looks after itself when you stop tapping.
- Twelve original animal neighbours who wander, remember you, gossip and can be befriended, with requests, gifts and friendship hearts.
- Gathering, gardening, cooking, crafting, fishing and bug catching, a bag and collection book, a market, three daily quests, and mini-games.
- **Pop in to places:** tap a café, library or cinema and your animal walks in, has a drink, reads or watches a film, and comes back out with the reward.
- **A green prompt by every door** to go in, go out, do the day's activity or take the bus, plus a 🚪 button to leave any home in one tap.

**Paws & Properties**

- Buy, sell, trade, rent out and mortgage the town's homes; own a whole street to double its rent and upgrade its homes evenly up to a Grand manor. Bus lines and utilities earn when neighbours use them.
- 🃏 **Fate cards** instead of dice: three random draws a day, two more for coins. Cards bring bargains, rent to pay, paying tenants, auctions against the neighbours, storms and windfalls, zoning rules, and golden keys.
- **Zoning:** the council limits how high a street can build, and inspectors fine any home above it, yours or a neighbour's. A building permit covers one home.
- **Debt:** if you can't pay, the bank lends up to ✦ 200 plus 30% of your homes' value, at 5% each morning. Past the limit you lose upgrades, then mortgages, then homes, and then the Ranger comes. Neighbours who can't pay you owe you up to ✦ 300, and past that they go bankrupt and hand over what they own.
- 🏆 **Leaderboards:** you against every neighbour across all towns.

**Your animal and your home**

- Choose your animal, eyes (11 styles, 8 colours), brows, expression, cheeks, hair, outfits and hats.
- **Home Designer:** choose whole-house themes, four floor plans, ten exterior colour schemes, wallpaper palettes, floors, carpets and furniture colours. Add, move, rotate and store decorations indoors or in the yard.
- Every home has its own furniture, style and six garden plots. Choose mixed beds, long rows or a side garden; crops stay with the home they were planted in. Cottages, apartments and villas start with different interior layouts. Rename homes from word lists, never free text.

**Playing together and comfort**

- Players in the same town see each other walk around and can send emoji bubbles. Emoji are unlocked by playing, and there is no typed chat.
- Music and sound effects are made live with Web Audio, with no audio files.
- Tap-to-walk with pathfinding, a joystick, drag to pan, pinch or scroll to zoom, and WASD or arrow keys on desktop. Settings include a follow camera, larger text, a battery saver and tooltips on every icon button.

**Accounts and saves**

- Guest play keeps progress on the device. Optional cloud saves use nickname + password accounts (no email), bcrypt hashes, JWT sessions, rate limits, security headers, versioned saves with conflict detection, and account deletion, stored in MongoDB when `MONGODB_URI` is set.

## Local development

Requires Node.js 20+.

    cp .env.example .env
    npm install
    npm start

Open http://localhost:3000 and start as a guest. `.env.example` sets `MONGODB_URI=memory://test`, an in-memory database that is wiped on restart, so accounts work locally. Leave `MONGODB_URI` empty for guest-only play, or point it at a free Atlas M0 cluster. The game has no CDN dependencies, so it also runs offline in the Android shell; the Google Fonts stylesheet is optional.

    npm test        # 69 tests: game rules, towns, safety, smoke
    npm run check   # syntax-check every module, then run the tests

## Code layout

| File | What it holds |
| --- | --- |
| `server.js` | Express API, accounts, saves, Socket.IO town rooms |
| `public/app.js` | Engine, input and UI |
| `public/js/world.js` | Map, districts, homes, places, neighbours, pathfinding |
| `public/js/cities.js`, `cityart.js` | The seven towns and their art |
| `public/js/art.js`, `character.js` | Procedural art and animal styling |
| `public/js/sim.js`, `life.js`, `townlife.js` | Needs and objects; items, quests, weather; neighbour life |
| `public/js/estate.js`, `fate.js`, `dice.js` | Paws & Properties: property market, fate cards, loans and zoning |
| `public/js/home.js`, `interiors.js`, `furniture.js` | Home interiors and decor |
| `public/js/games.js`, `audio.js`, `emoji.js`, `followcam.js` | Mini-games, sound, emoji, camera |
| `test/` | Node test runner suites |
| `reddit/` | The Devvit Web port for Reddit |

## Deploy to Render

`render.yaml` describes the live free web service, which redeploys on every push to `main`. It uses no paid plans and no Render database.

1. Create a free MongoDB Atlas M0 cluster and a database user with readWrite on the `willowvale` database, and allow access from 0.0.0.0/0, because Render's free plan has no fixed IP.
2. In the Render dashboard, set `MONGODB_URI` to the cluster's connection string. The Blueprint generates `JWT_SECRET`.
3. `ALLOWED_ORIGINS` defaults to the Render address; add any other frontend origins.
4. Check `/healthz`. `accounts: true` with `database: connected` means cloud saves are on, and `accounts: false` means guest mode. Watch the `accounts` field rather than the status code, because guest mode still returns 200.

## Android APK

The workflow `.github/workflows/android-apk.yml` wraps the game in a Capacitor Android shell, builds a debug APK and uploads it as an artifact. To get it, open GitHub Actions → **Android APK** → the latest successful run → download `willowvale-debug-apk`.

It is a debug build for testing, not a signed Play Store release. A release needs a protected signing keystore kept in GitHub secrets. Never commit keystores or passwords.

## Reddit

`reddit/` runs the same game inside a Reddit post with Devvit Web. It adds Reddit logins, the same three daily errands for everyone, streaks, a town the subreddit builds together, and a weekly richest-Redditor board. See [`reddit/README.md`](reddit/README.md) to run it.

## Prototype limitations

- Personal worlds: each player has their own copy of every town, so homes, coins and neighbours in one save never affect another player. Multiplayer shares only positions, looks and emoji.
- The server checks saves for shape, size and format version, but coins and progress come from the player's own device. That suits personal worlds; anything shared (trading between players, server-side rankings, a shared economy) would need checks on the server.
- Characters and buildings are procedural vector art. Real-device performance QA and further accessibility testing remain.
- Not yet a child-safe public production service. Public child access needs a privacy policy, parental consent, legal review, reporting and moderation, data deletion and abuse protection.
