# Bitplace

A real-time collaborative pixel canvas on top of a world map.

🌐 [bitplace.com](https://bitplace.com)

---

## The idea

In 2017, Reddit ran an experiment called r/place. A blank canvas. Anyone could place one pixel every few minutes. No rules, no teams, no prizes. Over 72 hours, a million people showed up and created something remarkable - pixel art, flags, logos, memes, all emerging from pure coordination.

The experiment lasted 72 hours and never came back in that form. But it proved something important: people genuinely enjoy building and defending things together, even when there's no prize. The coordination itself is the fun.

Bitplace builds on that insight. The canvas is persistent - it doesn't reset. It's layered on a world map, so where you paint carries geographic and cultural meaning. And pixels can hold value through the $BIT token, which introduces real stakes to what you create and defend.

---

## The two forces

Bitplace is built around two forces in constant tension: **collaboration** and **contestation**.

You can paint your own pixels. You can paint over someone else's pixels. And others can paint over yours. This is the core loop - creation and destruction, cooperation and griefing, all happening on the same canvas.

The interesting part is what emerges. People coordinate to build artwork together. Communities claim territories around cities, landmarks, or symbols that matter to them. Rivals attack each other's pixels. Alliances form to defend shared creations. Political statements, memes, territorial disputes, local pride - all of it plays out on the map.

Geography adds meaning. Painting over the Colosseum feels different than painting over an empty field. Claiming your hometown matters. The map isn't just a grid - it's a layer of social and cultural significance.

---

## How pixels work

Anyone can paint anywhere on the map - on empty spots or directly over someone else's pixels.

**Starter accounts** (Google sign-in) get 300,000 Pixels for free. These pixels are temporary - they disappear after 72 hours. But you can renew them with one click if you want to keep your drawing. This creates a natural retention loop: if you care about what you made, you come back to maintain it.

**Pro accounts** (Phantom wallet) have access to Paint Energy (PE). PE makes pixels permanent. Your PE balance is calculated from the dollar value of $BIT tokens in your connected wallet - 1 PE equals $0.001 USD worth of $BIT. The platform only reads your balance, it never moves your tokens.

A pixel with PE stays on the map until someone conquers it. A pixel without PE fades after 72 hours unless renewed.

---

## Mechanics

There are four actions you can take with Paint Energy.

**Paint** - Place a pixel on an empty spot, or paint over an existing pixel if your PE exceeds its current value. This is how you conquer territory. If someone's pixel has 10 PE staked, you need more than 10 PE to paint over it.

**Attack** - Stake your PE against someone else's pixel to lower its effective value. You're not painting over it yet - you're weakening it so that you or someone else can conquer it more cheaply. Attackers can withdraw their PE at any time.

**Defend** - Stake your PE on someone else's pixel to raise its value. This makes it harder for attackers to take it down. You're protecting their creation. Defenders can withdraw at any time.

**Reinforce** - Add PE to your own pixels to make them harder to conquer. The more PE staked on a pixel, the more expensive it becomes to paint over.

When a pixel is conquered, the previous owner and defenders get their PE back. Nothing is burned - value flows between players.

---

## Features

- World map canvas with MapLibre GL and OpenFreeMap tiles
- Real-time pixel updates across all users
- Alliances for coordinated territory control
- Places - save and share points of interest
- Templates - upload images as pixel-art painting guides
- Leaderboard for painters, defenders, attackers
- Sound and haptic feedback
- Works on desktop and mobile

---

## Tech stack

| Layer | Tech |
|-------|------|
| Frontend | React 19, TypeScript, Vite, Tailwind, shadcn/ui |
| Map | MapLibre GL JS, OpenFreeMap vector tiles |
| Rendering | HTML Canvas overlay |
| Backend | Supabase (PostgreSQL, Realtime, Edge Functions) |
| Auth | Google OAuth 2.0, Phantom Wallet |
| Blockchain | Solana Mainnet (read-only) |

---

## Token

**$BIT** powers permanent pixel ownership.

| | |
|---|---|
| Contract | `6az8wE4Gmns7bPLwfeR9Ed9pnGjqN5Cv9FJ3vs4Cpump` |
| Network | Solana Mainnet |
| Utility | Paint Energy calculation - 1 PE = $0.001 USD equivalent |

The platform does not custody, transfer, or transact tokens. It reads on-chain balances only.

---

## Links

- [bitplace.com](https://bitplace.com)
- [@Bitplace_com](https://twitter.com/Bitplace_com)
- [Token on pump.fun](https://pump.fun/coin/6az8wE4Gmns7bPLwfeR9Ed9pnGjqN5Cv9FJ3vs4Cpump)

---

## License

All rights reserved.
