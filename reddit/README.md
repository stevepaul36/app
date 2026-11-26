# Willowvale: Animal Town, on Reddit

Willowvale is a cozy life-sim of animal neighbours: walk around an island town, decorate your home,
grow a garden, cook, fish, catch bugs, make friends, and unlock six more themed towns. This folder is
the Reddit version, built with Devvit Web. It runs the full game inside a Reddit post and adds a
daily layer, so the subreddit plays together every day.

It's a port of my existing game ([web version](https://willowvale-animal-town.onrender.com)), entered
in the **Best Ported Daily Game** category.

## How to play

1. Open today's **Willowvale** post and tap **Play**. The game opens full screen.
2. Pick your animal and a name. You start in your cottage.
3. **Tap anything** to see what you can do: the fridge for breakfast, the bed to sleep, the door to
   go outside. Tap the ground (or use the joystick) to walk.
4. Look at **📋 Errands** in the top right. Everyone gets the **same three errands each day**, like
   _Cook a meal_, _Make something at a workbench_ and _Catch 2 bugs_.
5. Finish all three to:
   - keep your **🔥 daily streak** (shown in your user flair when the app moderates the subreddit),
   - see where you placed (**#1, #2…** to finish today),
   - add **one home to the town the whole subreddit is building**,
   - share your result with one tap (**Comment as u/you**). It posts from your account as a reply to
     the app's pinned comment on the post, so results stay together.
6. Come back tomorrow for new errands. Your town is saved to your Reddit account, so you can carry on
   from any device.

Tips: the 🧭 map shows every place in town; the Journal lists your goals; neighbours have little
requests that pay well; the market buys what you gather; tap 🃏 to draw a **Paws & Properties** fate card, and
open **Homes** to buy, trade and style houses.

## What's new for this hackathon

Everything in this folder was made during the hackathon:

- The Devvit Web app: feed card (splash), full-screen game, and app server.
- **Reddit accounts instead of nicknames and passwords.** Saves go to Redis on the app server, with
  the same checks and version/conflict handling as the web version.
- **Daily errands for everyone**, picked by calendar day (UTC) from the game's own quests.
- **Streaks, finish order, user flair, and a community town counter.**
- **One-tap sharing** of your result, as a reply to the app's pinned comment on each daily post.
- **🏮 The Community Night Festival.** Finish the day's three errands and release one lantern into
  a sky the whole subreddit shares. You pick its colour and symbol from a list, with no typed text.
  Every lantern released this week floats over every town at night, and yours glows a little
  brighter. When the week's lanterns reach the goal, the festival is lit and fireworks fill the
  sky every night until Monday. Next week's goal grows with this week's lanterns, so a busy
  subreddit gets a bigger sky. Tap 🏮 by the clock to see how close everyone is. On the web, your
  neighbours release lanterns with you.
- **A new post every day** at 00:02 UTC (scheduled task), plus a mod menu item to post one now.
- Fonts bundled locally, and the game's own server features (multiplayer streets, nickname accounts)
  switched off inside Reddit.

New in the game itself during the hackathon (so it's on the web too):

- **Paws & Properties, a Monopoly-style property game played in the town, with no board.** Tap 🃏 to
  draw a fate card. You get three a day and can unlock two more with coins. Every card is truly
  random, not fixed by the date:
  - **Bargains:** a home offered below its value, today only. Buy it from the card, or walk to it (a
    🏷️ marks it).
  - **Rent you must pay** to whichever neighbour owns the home you stayed at, plus premium tenants
    and guests who pay you.
  - **Surprise auctions** where you bid against the neighbours.
  - **Surprises:** storms, burst pipes, inheritances, booms, slumps and the Wishing Fountain pot.
  - **Zoning:** the council zones streets (for example "Quiet residential: no building past
    Extension"). Inspectors later fine any home built higher, yours or a neighbour's. A building
    permit covers one home.
  - **Golden keys:** a bonus draw, a building permit, or a card that gets you out of the Ranger's
    office.
  - **Debt:** if you can't pay, the bank lends you the rest, up to ✦ 200 plus 30% of what your homes
    are worth. Loans grow 5% each morning, and the bank takes up to half your purse to pay them
    down. Past your limit, your upgrades are sold, then homes are mortgaged, then the bank takes
    homes back, then the Ranger catches you.
  - **Neighbours' debts:** a neighbour who can't pay your rent owes you, up to ✦ 300, and pays it
    back from their earnings. Past that they go bankrupt, and everything they own passes to
    whoever they owe.
  - **Streets:** own a whole street to double its rent, then upgrade its homes evenly up to a Grand
    manor, from a limited supply in the builder's yard. Sell upgrades back, mortgage, trade or swap.
  - **Bus lines and utilities:** buy them, and neighbours who ride them pay you.
  - **🏆 Leaderboards:** you against every neighbour across all towns. On Reddit there's also a
    weekly board of the richest Redditors, which resets every Monday.
- **Style your animal:** pick eyes (11 styles and 8 colours), brows, expression and cheeks, plus new
  hair, tops (jacket, smart suit, sports top), jeans and hats (top hat, wizard hat, halo,
  sunglasses, bandana, flower).
- **Pop in to places:** tap a café, library or cinema and your animal walks in, has a drink, reads or
  watches a film, then comes back out with the reward.
- **Proper nights, with each town's own floating lights:** nights are darker, and street lamps cast
  pools of light, windows glow and your animal carries a soft light of their own. Each town fills
  the sky with something different after dark: fireflies in Willowvale, leaf lanterns in Maple Row,
  neon drones in Skyhaven, star orbs in Lumen Labs, sky lanterns in the Lantern Quarter, petal
  wisps on Sakura Hill and floating diyas in Marigold Bazaar.
- **A green prompt by every door:** walk up to a door and a green button offers to go in, go out,
  do the day's activity, or take the bus.
- **Home Designer: make every home your own.** Pick one of eight whole-house themes (Sunny Meadow,
  Ocean Cottage, Forest Hideaway, Blossom Pastel, Starlight Den, Autumn Hearth, Cloud Modern, Lemon
  Pop), then one of four floor plans (room by room, open plan, garden studio, loft and nook). Each home
  keeps its own furniture, theme and six crop beds, laid out as mixed beds, long rows or a side
  garden, and crops stay with the home they were planted in. Choose a bed (canopy, bunk beds or a day
  cot), colours for the bedding, wood, sofa, armchair, rug and wardrobe, plus wallpaper, floors and
  carpets. A furniture shop sells 20 pieces. Repaint the homes you own in ten exterior colour schemes
  and rename them from word lists (no typed text).
- **Comfort:** a follow camera with a close-up view, larger text, a battery saver, tooltips on every
  icon button, and a 🚪 button to leave any home in one tap.

The game itself lives one folder up (`../public`). `npm run build` copies it into `public/` here, so
there's one copy of the game for the web, Android and Reddit.

## Your data

The app keeps your saved game, your streak, and for three days the list of who finished each day's
errands. Saved games and streaks delete themselves 30 days after you last play, and you can delete
yours at any time in the game: **Profile → Account → Delete my Willowvale data**. Nothing is sent
anywhere outside Reddit.

## Run it yourself

You need Node.js 22 or newer and a Reddit account.

```sh
cd reddit
npm install
npx devvit login          # opens Reddit in your browser once
npm run playtest          # builds, uploads and opens a test subreddit
```

Other commands:

- `npm run upload`: build and upload a new version.
- `npm test`: type checks, lint, server tests and a build.

## How it's built

| Part                                                            | Where                                             |
| --------------------------------------------------------------- | ------------------------------------------------- |
| Feed card: today's errands, streak, town size, Play             | `public/splash.html`, `src/client/splash.ts`      |
| The game (copied from `../public`)                              | `public/game.html`, `public/app.js`, `public/js/` |
| Bridge: Reddit login, errands chip, result card, share          | `src/client/bridge.ts`                            |
| Server: saves, daily errands, streaks, board, share, daily post | `src/server/`                                     |
| Daily errand picking (shared by client and server)              | `src/shared/daily.ts`                             |

Willowvale is a gentle, all-ages game: there is no typed chat (only emoji), home names are picked
from word lists, it uses coins only (no real money), and the art is all drawn in code.
