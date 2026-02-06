

# White Paper Redesign: Landing-Style Centered Modal

## Overview

Completely redesign the White Paper as a polished, centered popup landing page that presents Bitplace with concrete language, focusing on **actions** rather than character archetypes. The design will feel premium and intentional, using your existing glass UI system.

## Key Changes

| Before | After |
|--------|-------|
| Side-sheet modal (GlassSheet) | Centered landing-style dialog |
| Fuzzy character roles (Artist, Guardian, etc.) | Concrete actions anyone can take |
| Story-told narrative | Clear, direct statements with emotional depth |
| Standard page layout | Landing page sections with visual hierarchy |

---

## New Content Structure

### Hero Section
**Headline:** "Own a piece of the world."
**Subline:** A single, direct sentence about what Bitplace is.

### Section 1: What You Can Do
Actions presented as clear cards:
- **Paint** — Claim any unclaimed pixel. Stake energy to own it.
- **Protect** — Add energy to pixels you believe in. Make them harder to take.
- **Attack** — Drain energy from pixels you want. Weaken before you conquer.
- **Take Over** — Stake enough energy to flip ownership. The pixel is now yours.

### Section 2: Why It Matters
- Territory on a real map. Your mark on the world.
- Every action costs energy. Commitment is visible.
- When someone takes your pixel, you feel it. When you defend one, it means something.

### Section 3: How Value Works
- Energy comes from $BIT holdings
- More $BIT = more energy = more territory you can hold
- Contested pixels = active economy = $BIT utility
- Simple flow: Hold $BIT → Get Energy → Claim Territory → Defend or Lose

### Section 4: Social Reality
No roles. Everyone does everything. What emerges:
- Coordination to build large-scale art
- Rivalry over contested areas
- Alliances to protect shared interests
- Drama when someone disrupts the balance

### Closing
Direct CTA without fluff.

---

## Visual Design

### Centered Landing Modal
- Full-width centered dialog with max-width constraint
- Dark overlay with subtle blur (existing dialog pattern)
- Scroll-contained content
- Glass styling for sections
- No side-sheet behavior

### Component Structure

```text
┌──────────────────────────────────────────────────────┐
│  ╳                                                   │
│                                                      │
│              ┌────────────────────┐                  │
│              │   BITPLACE LOGO    │                  │
│              └────────────────────┘                  │
│                                                      │
│           Own a piece of the world.                  │
│                                                      │
│    ┌──────────────────────────────────────┐         │
│    │ Paint · Protect · Attack · Take Over │         │
│    └──────────────────────────────────────┘         │
│                                                      │
│    ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐      │
│    │ PAINT  │ │PROTECT │ │ ATTACK │ │TAKEOVER│      │
│    │  ...   │ │  ...   │ │  ...   │ │  ...   │      │
│    └────────┘ └────────┘ └────────┘ └────────┘      │
│                                                      │
│    ─────────────────────────────────────────        │
│                                                      │
│    WHY IT MATTERS                                    │
│    • Territory on a real map                         │
│    • Every action costs energy                       │
│    • Commitment is visible                           │
│                                                      │
│    ─────────────────────────────────────────        │
│                                                      │
│    HOW VALUE WORKS                                   │
│    $BIT → Energy → Territory                         │
│                                                      │
│    ─────────────────────────────────────────        │
│                                                      │
│            [ Start Playing ]                         │
│                                                      │
└──────────────────────────────────────────────────────┘
```

---

## Files to Modify

| File | Action | Purpose |
|------|--------|---------|
| `src/components/modals/WhitePaperModal.tsx` | Rewrite | New landing-style centered dialog |
| `src/pages/WhitePaperPage.tsx` | Rewrite | Mirror modal content for direct page access |
| `src/index.css` | Add | New utility classes for landing sections |

---

## Technical Implementation

### WhitePaperModal.tsx

Replace GlassSheet/GamePanel with Radix Dialog for centered behavior:

```tsx
import { Dialog, DialogContent } from "@/components/ui/dialog";

export function WhitePaperModal({ open, onOpenChange }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0">
        <div className="p-8 space-y-10">
          {/* Hero */}
          <header className="text-center space-y-3">
            <h1 className="text-3xl font-bold tracking-tight">
              Own a piece of the world.
            </h1>
            <p className="text-muted-foreground">
              Bitplace is a world map where every pixel can be claimed, 
              contested, and defended with real value.
            </p>
          </header>

          {/* Action Cards */}
          <section>
            <div className="grid grid-cols-2 gap-4">
              <ActionCard title="Paint" ... />
              <ActionCard title="Protect" ... />
              <ActionCard title="Attack" ... />
              <ActionCard title="Take Over" ... />
            </div>
          </section>

          {/* Value Flow */}
          <section>
            <h2>How Value Works</h2>
            <FlowDiagram />
          </section>

          {/* CTA */}
          <footer className="text-center">
            <Button onClick={onOpenChange(false)}>
              Start Playing
            </Button>
          </footer>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

### New Helper Components

**ActionCard** — Compact card showing action + description:
```tsx
function ActionCard({ icon, title, description }) {
  return (
    <div className="p-4 rounded-xl bg-card border border-border/50">
      <div className="flex items-center gap-3 mb-2">
        {icon}
        <h3 className="font-semibold">{title}</h3>
      </div>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
```

**ValueFlow** — Visual representation of $BIT → Energy → Territory

---

## Content Draft (Final Copy)

### Hero
**"Own a piece of the world."**
Bitplace is a world map where every pixel can be claimed, contested, and defended with real value.

### What You Can Do

**Paint**
Claim any unclaimed pixel. You stake energy to own it. The pixel becomes yours until someone takes it.

**Protect**
Add energy to any pixel you believe in. More protection makes it harder to take. You can protect anyone's work.

**Attack**
Drain energy from pixels you want. Each attack weakens the pixel. When it's weak enough, you can take it.

**Take Over**
Stake enough energy to flip ownership. The pixel is now yours. Previous owner gets their stake back.

### Why It Matters

- **Real territory.** The map is Earth. Your pixels mark real places.
- **Visible commitment.** Every action costs energy. You can see who cares about what.
- **Real stakes.** When someone takes your pixel, you feel it. When you defend one, it means something.
- **Emergent behavior.** No rules about how to play. People coordinate, compete, disrupt, and create.

### How Value Works

Your $BIT holdings determine your energy. More $BIT means more energy to spend on pixels.

```text
Hold $BIT → Get Energy → Claim Territory → Defend or Lose
```

When the map is active—pixels contested, defended, attacked—$BIT has utility. Utility creates demand.

### Closing
**"Claim your first pixel."**
Button: [Open Map]

---

## Tone Examples

| Before (Fuzzy) | After (Concrete) |
|----------------|------------------|
| "The world map becomes a living canvas where every pixel tells a story" | "The map is Earth. Every pixel is a real place you can own." |
| "The Guardian defends community works" | "You can protect any pixel. Add energy to make it harder to take." |
| "Value emerges from human behavior" | "$BIT has utility because people contest the map. Activity creates demand." |
| "The thrill of claiming new territory" | "Claim a pixel. It's yours until someone takes it." |

---

## Mobile Considerations

- On mobile: Full-screen modal with scrollable content
- Action cards stack vertically (1 column)
- Larger touch targets on CTA buttons
- Same content, responsive layout

