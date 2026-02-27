# Bitplace

**The world map is your canvas. Every pixel is a battlefield.**

Paint, defend, attack, and claim territory — pixel by pixel, anywhere on Earth.

🌐 **Live:** [bitplace.com](https://bitplace.com)

---

## What is Bitplace?

Bitplace is a persistent, real-time pixel canvas layered on top of a world map. Imagine r/place on Google Maps, powered by Solana.

Anyone can paint pixels on real geographic locations. But pixels aren't free — they carry value, can be defended by allies, attacked by rivals, and conquered through strategy. Communities naturally form around cities, landmarks, and territories. The map is always live, always evolving.

---

## Getting Started

Bitplace has two account tiers. You choose how deep you want to go.

### Starter (Free)

Sign in with **Google** — no wallet, no crypto, no friction.

- **300,000 Virtual Paint Energy (VPE)** to paint with
- Pixels expire after **72 hours**, then VPE is recycled back to your balance
- Up to **1,000 pixels per operation**
- Full access to all game mechanics (paint, defend, attack, reinforce)

Starter is the easiest way to try Bitplace. Your drawings are temporary, but the gameplay is real.

### Pro (Wallet)

Connect a **Phantom** wallet holding **$BIT** tokens on Solana.

- Your **Paint Energy (PE)** is calculated from your $BIT balance (1 PE = $0.001 USD equivalent)
- Pixels painted with PE are **permanent** — they stay on the map until someone conquers them
- True ownership: your pixels, your territory
- $BIT is **never spent or transferred** — the platform only reads your balance

Upgrade from Starter to Pro anytime by connecting your wallet.

---

## Core Mechanics

Every pixel on the map has an owner, a stake value, and can be reinforced or attacked.

### 🎨 Paint

Place pixels on empty spots or conquer existing ones. Each pixel costs PE based on the current owner's stake. Select up to 1,000 pixels at once — the app calculates the total cost automatically.

### 🛡️ Defend

Contribute PE to someone else's pixels to increase their value, making them harder to conquer. Defenders can withdraw their contribution at any time.

### ⚔️ Attack

Stake PE against an enemy pixel to weaken it. When attack value exceeds the pixel's total defense, it becomes vulnerable to takeover. Attackers can withdraw at any time.

### 💪 Reinforce

As the owner, add more PE to your own pixels to strengthen them against attacks. Higher stake = harder to conquer.

### How Value Works

Every pixel's value is calculated as:

```
V = owner_stake + DEF - ATK
```

When a pixel is conquered, the previous owner and defenders get their PE back. Attackers become defenders of the new owner. No PE is ever "burned" — it flows between players.

---

## Features

- 🗺️ **World Map Canvas** — Paint on any location on Earth with a high-performance canvas overlay on MapLibre GL
- ⚔️ **Territory Warfare** — Paint, Defend, Attack, and Reinforce mechanics with real-time value calculation
- 👥 **Alliances** — Form teams with other players, coordinate territory control, share a tag
- 📍 **Places** — Save and share points of interest on the map, like and bookmark community spots
- 🏆 **Leaderboard** — Rankings for top painters, defenders, attackers, and investors
- 🖼️ **Templates** — Upload images and use them as pixel-art guides for painting on the map
- 🔊 **Sound & Haptics** — Audio feedback and vibration for painting actions
- 📱 **Responsive** — Full experience on desktop and mobile
- ⚡ **Real-time** — See every pixel change as it happens across the world
- 🔐 **Two-Tier Access** — Free Starter for everyone, Pro with wallet for permanent ownership

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 19 · TypeScript · Vite · Tailwind CSS · shadcn/ui |
| **Map Engine** | MapLibre GL JS with OpenFreeMap vector tiles |
| **Pixel Rendering** | HTML Canvas overlay (no DOM per-pixel) |
| **Backend** | PostgreSQL · Realtime subscriptions · Edge Functions |
| **Auth** | Google OAuth 2.0 · Phantom Wallet (Solana) |
| **Blockchain** | Solana Mainnet (balance reads only) |

---

## Token

**$BIT** is the utility token that powers permanent pixel ownership on Bitplace.

| | |
|---|---|
| **Contract** | `6az8wE4Gmns7bPLwfeR9Ed9pnGjqN5Cv9FJ3vs4Cpump` |
| **Network** | Solana Mainnet |
| **Utility** | Paint Energy (PE) calculation — 1 PE = $0.001 USD equivalent |

The platform **does not** buy, sell, transfer, or custody tokens. It reads your on-chain $BIT balance to calculate available Paint Energy. Your tokens stay in your wallet at all times.

---

## Links

- 🌐 **Website:** [bitplace.com](https://bitplace.com)
- 🐦 **Twitter:** [@Bitplace_com](https://twitter.com/Bitplace_com)
- 🪙 **Token:** [pump.fun/coin/6az8...pump](https://pump.fun/coin/6az8wE4Gmns7bPLwfeR9Ed9pnGjqN5Cv9FJ3vs4Cpump)

---

## License

All rights reserved.
