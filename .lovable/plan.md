

# Menu Reorganization: Sections and Leaderboard Move

## Overview

Reorganize the navigation menu into two clear sections and move Leaderboard from the map quick actions into the menu. Keep Places only as a standalone icon near the drawing bar.

## Current Structure vs New Structure

```text
CURRENT                              NEW
─────────────────────────────────    ─────────────────────────────────
MapMenuDrawer:                       MapMenuDrawer:
├─ Map                               ├─ HOME
├─ Places                            │   ├─ Map
├─ Alliance                          │   └─ Buy $BIT (was Shop)
├─ Rules                             │
├─ Shop                              └─ BASICS
└─ [footer: Settings, Theme]             ├─ Leaderboard (NEW)
                                         ├─ Alliance
QuickActions (map buttons):              └─ Rules
├─ Search (globe)                    
├─ Leaderboard (trophy)              [footer: Settings, Theme]
└─ Notifications (bell)              
                                     QuickActions (map buttons):
ActionTray header:                   ├─ Search (globe)
├─ [Thumbtack - Places]              └─ Notifications (bell)
├─ [separator]                       
└─ [Hand/Draw toggle + tools]        ActionTray header:
                                     ├─ [Thumbtack - Places] ← visually standalone
                                     ├─ [larger visual gap]
                                     └─ [Hand/Draw toggle + tools]
```

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/map/MapMenuDrawer.tsx` | Add sections, move Leaderboard, rename Shop, remove Places |
| `src/components/map/QuickActions.tsx` | Remove Leaderboard button |
| `src/components/map/ActionTray.tsx` | Make Places button more visually separated |

## Implementation Details

### 1. MapMenuDrawer.tsx

Add section labels and reorganize items:

```tsx
// Add LeaderboardModal import
import { LeaderboardModal } from "@/components/modals/LeaderboardModal";

// Add state for leaderboard
const [leaderboardOpen, setLeaderboardOpen] = useState(false);

// In the nav, structure with sections:
<nav className="mt-6 space-y-4 flex-1">
  {/* HOME section */}
  <div>
    <p className="px-3 mb-2 text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
      Home
    </p>
    <div className="space-y-1">
      {/* Map button */}
      {/* Buy $BIT button (was Shop) */}
    </div>
  </div>
  
  {/* BASICS section */}
  <div>
    <p className="px-3 mb-2 text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
      Basics
    </p>
    <div className="space-y-1">
      {/* Leaderboard button - NEW */}
      {/* Alliance button */}
      {/* Rules button */}
    </div>
  </div>
</nav>

// Add LeaderboardModal at the end
<LeaderboardModal open={leaderboardOpen} onOpenChange={setLeaderboardOpen} />
```

**Button order:**
- HOME: Map, Buy $BIT
- BASICS: Leaderboard, Alliance, Rules

**Remove:** Places button and state (no longer in menu)

### 2. QuickActions.tsx

Remove the Leaderboard button and its state:

```tsx
// Remove:
// - leaderboardOpen state
// - LeaderboardModal import
// - Leaderboard button JSX
// - LeaderboardModal component

// Keep only: Search (globe) and Notifications (bell)
```

### 3. ActionTray.tsx

Make the Places button more visually standalone by increasing the gap:

```tsx
// Current: w-px separator between thumbtack and toggle
// Change to: larger gap with subtle visual break

<div className="flex items-center gap-1 shrink-0">
  {/* Pin button for Places - standalone with extra spacing */}
  <GlassIconButton
    variant="ghost"
    size="sm"
    onClick={() => setPlacesOpen(true)}
    title="Pinned Locations"
    className="mr-1.5"  // Extra margin to separate
  >
    <PixelIcon name="thumbtack" className="h-4 w-4" />
  </GlassIconButton>
  
  {/* More prominent visual separator */}
  <div className="w-px h-6 bg-border/70 mx-1" />
  
  {/* Hand/Draw toggle */}
  {canPaint && (
    <div className="flex items-center gap-0.5 bg-muted/50 rounded-lg p-0.5">
      ...
    </div>
  )}
</div>
```

This creates more visual breathing room so the Places button feels "standalone" rather than part of the toolbar.

## Visual Result

**Menu (when opened):**
```
┌─────────────────────────┐
│ Bitplace                │
├─────────────────────────┤
│ HOME                    │
│   🗺️  Map               │
│   🛒  Buy $BIT          │
│                         │
│ BASICS                  │
│   🏆  Leaderboard       │
│   👥  Alliance          │
│   📖  Rules             │
├─────────────────────────┤
│ ⚙️  Settings            │
│ 🌙  Night Mode          │
└─────────────────────────┘
```

**Quick Actions (map buttons):**
```
┌─────┐
│ 🌍  │  Search
├─────┤
│ 🔔  │  Notifications (with badge)
└─────┘
```

**ActionTray header:**
```
┌──────────────────────────────────────────┐
│ 📍 │ │ ✋ 🖌️ │  ... color/tools ...  │ ⬆️ │
│    │ │       │                        │    │
│pin │ │ mode  │                        │    │
└──────────────────────────────────────────┘
 ↑    ↑
 |    larger gap/separator
 standalone
```

