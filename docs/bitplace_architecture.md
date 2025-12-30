# Bitplace Architecture

## Overview

Bitplace is a real-time pixel painting web app layered over a world map. Users stake BTP tokens to claim, defend, and attack pixels.

## Tech Stack

- **Frontend**: React + TypeScript + Tailwind CSS + React Router
- **Map**: MapLibre GL JS with OpenFreeMap vector tiles
- **Pixel Rendering**: HTML Canvas overlay (no DOM per-pixel)
- **Backend**: Lovable Cloud (Supabase foundation)
  - PostgreSQL database
  - Realtime subscriptions
  - Edge Functions for validation

## Component Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        App Shell                            │
│  ┌─────────────┐  ┌─────────────────────────────────────┐  │
│  │   Sidebar   │  │           Main Content              │  │
│  │  (NavMenu)  │  │  ┌─────────────────────────────┐    │  │
│  │             │  │  │      Route Pages            │    │  │
│  │  • Map      │  │  │  • MapPage (/)              │    │  │
│  │  • Rules    │  │  │  • RulesPage (/rules)       │    │  │
│  │  • Profile  │  │  │  • ProfilePage (/profile)   │    │  │
│  │  • Leaders  │  │  │  • LeaderboardPage          │    │  │
│  │             │  │  └─────────────────────────────┘    │  │
│  └─────────────┘  └─────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Map Page Components

```
┌─────────────────────────────────────────┐
│              MapPage                     │
│  ┌───────────────────────────────────┐  │
│  │         MapLibre GL JS            │  │
│  │  ┌─────────────────────────────┐  │  │
│  │  │     Canvas Overlay          │  │  │
│  │  │   (Pixel Grid Rendering)    │  │  │
│  │  └─────────────────────────────┘  │  │
│  └───────────────────────────────────┘  │
│  ┌───────────────────────────────────┐  │
│  │      Selection Tools              │  │
│  │  • Drag select                    │  │
│  │  • Action panel (Paint/DEF/ATK)   │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

## Data Flow

```
User Action
    │
    ▼
┌─────────────────┐
│  React State    │◄──────────────────┐
│  (Local)        │                   │
└────────┬────────┘                   │
         │                            │
         ▼                            │
┌─────────────────┐          ┌────────┴────────┐
│  Validate       │          │   Supabase      │
│  (Edge Func)    │◄────────►│   Realtime      │
└────────┬────────┘          └─────────────────┘
         │                            ▲
         ▼                            │
┌─────────────────┐                   │
│  Commit         │───────────────────┘
│  (Database)     │
└─────────────────┘
```

## Database Tables (Planned)

| Table | Purpose |
|-------|---------|
| `pixels` | Pixel state: owner, stakes, position |
| `wallets` | User wallet balances and collateral |
| `stakes` | Individual DEF/ATK stake records |
| `floors` | Historical floor values (6h snapshots) |
| `actions` | Action log for audit/replay |

## Key Modules

1. **MapRenderer** - MapLibre integration with tile loading
2. **PixelCanvas** - Canvas overlay for pixel grid
3. **SelectionManager** - Drag-to-select and multi-pixel actions
4. **StakeCalculator** - Computes takeover thresholds and costs
5. **RealtimeSync** - Supabase subscription management
6. **WalletManager** - Balance tracking and collateral checks
