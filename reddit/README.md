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
requests that pay well; the market buys what you gather.

## What's new for this hackathon

Everything in this folder was made during the hackathon:

- The Devvit Web app: feed card (splash), full-screen game, and app server.
- **Reddit accounts instead of nicknames and passwords.** Saves go to Redis on the app server, with
  the same checks and version/conflict handling as the web version.
- **Daily errands for everyone**, picked by calendar day (UTC) from the game's own quests.
- **Streaks, finish order, user flair, and a community town counter.**
- **One-tap sharing** of your result, as a reply to the app's pinned comment on each daily post.
- **A new post every day** at 00:02 UTC (scheduled task), plus a mod menu item to post one now.
- Fonts bundled locally, and the game's own server features (multiplayer streets, nickname accounts)
  switched off inside Reddit.

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

Willowvale is a gentle, all-ages game: there is no typed chat (only emoji), and the art is all drawn in code.
