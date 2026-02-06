

# White Paper Update: Actions, Mechanics, and Value Dynamics

## Summary

Update the White Paper to align with the 4 core game actions (Paint, Defend, Attack, Reinforce) and add the economic feedback loop explaining how activity increases $BIT value.

---

## Content Changes

### 1. Four Action Cards Update

| Current | New |
|---------|-----|
| **Protect** | **Defend** |
| **Take Over** | **Reinforce** |

**New Descriptions:**

| Action | Icon | New Description |
|--------|------|-----------------|
| **Paint** | `brush` | Color any pixel on the map. Stake energy to paint it. Your mark stays until someone paints over it. |
| **Defend** | `shield` | Add energy to protect any pixel. The more energy staked, the harder it is to Attack. |
| **Attack** | `swords` | Drain energy from pixels you want to repaint. Each Attack weakens the pixel. When it's weak enough, you can paint over it. |
| **Reinforce** | `plus` | Add more energy to pixels you already painted. Strengthens your stake and makes your artwork harder to take. |

---

### 2. Section Title Change

| Current | New |
|---------|-----|
| "Why it matters" | "Mechanics" |

---

### 3. Flow Diagram Update

| Current | New |
|---------|-----|
| `Defend or Fade` | `Defend or Attack` |

New flow:
```
Hold $BIT → Get Energy → Paint Pixels → Defend or Attack
```

---

### 4. Add Value Creation Section

Add a new section called **"Value creation"** after "How value works" to explain:

- Every action (Paint, Defend, Attack, Reinforce) consumes energy
- Energy comes from $BIT holdings
- More activity = more $BIT locked = higher demand = higher $BIT price
- When someone paints over your pixel, it stings - but they had to stake more energy than you did, increasing $BIT utility
- There's no unlimited griefing: every attack, every takeover costs real value and creates real demand

**Draft content:**

> **Value creation**
>
> Every action on the map requires energy. Energy comes from holding $BIT. 
>
> When someone paints, defends, attacks, or reinforces, they lock $BIT into the system. More locked $BIT means less circulating supply. Less supply, same demand: price rises.
>
> Here's the twist: when someone paints over your pixel, it hurts. But to do it, they had to stake more energy than was already there. That means more $BIT locked, more utility, more value for everyone who holds.
>
> There's no free griefing. Every disruption costs. Every attack funds the economy. The more contested the map, the more valuable $BIT becomes.

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/modals/WhitePaperModal.tsx` | Update action cards, section titles, flow diagram, add value creation section |
| `src/pages/WhitePaperPage.tsx` | Mirror all changes |

---

## Technical Details

### WhitePaperModal.tsx Changes

**Action Cards (lines 41-61):**
```tsx
<ActionCard
  icon={<PixelIcon name="brush" size="md" />}
  title="Paint"
  description="Color any pixel on the map. Stake energy to paint it. Your mark stays until someone paints over it."
/>
<ActionCard
  icon={<PixelIcon name="shield" size="md" />}
  title="Defend"
  description="Add energy to protect any pixel. The more energy staked, the harder it is to Attack."
/>
<ActionCard
  icon={<PixelIcon name="swords" size="md" />}
  title="Attack"
  description="Drain energy from pixels you want to repaint. Each Attack weakens the pixel. When it's weak enough, you can paint over it."
/>
<ActionCard
  icon={<PixelIcon name="plus" size="md" />}
  title="Reinforce"
  description="Add more energy to pixels you already painted. Strengthens your stake and makes your artwork harder to take."
/>
```

**Section title (line 66):**
```tsx
<h2 className="text-lg font-semibold text-foreground">Mechanics</h2>
```

**Flow diagram (line 100):**
```tsx
<span className="px-3 py-1.5 rounded-lg bg-muted">Defend or Attack</span>
```

**New "Value creation" section (after "How value works"):**
```tsx
<section className="space-y-4">
  <h2 className="text-lg font-semibold text-foreground">Value creation</h2>
  <div className="space-y-3 text-sm text-muted-foreground">
    <p>
      Every action on the map requires energy. Energy comes from holding{" "}
      <span className="text-foreground font-medium">$BIT</span>.
    </p>
    <p>
      When someone paints, defends, attacks, or reinforces, they lock $BIT into the system. 
      More locked $BIT means less circulating supply. Less supply, same demand: price rises.
    </p>
    <p>
      Here's the twist: when someone paints over your pixel, it stings. But to do it, they had to 
      stake more energy than was already there. That means more $BIT locked, more utility, more 
      value for everyone who holds.
    </p>
    <p>
      There's no free griefing. Every disruption costs. Every Attack funds the economy. 
      The more contested the map, the more valuable $BIT becomes.
    </p>
  </div>
</section>
```

### WhitePaperPage.tsx Changes

Mirror all the same changes from the modal version.

---

## Visual Structure After Changes

```
┌─────────────────────────────────────────────┐
│                                             │
│     Paint the world bit by bit.             │
│                                             │
│  ┌─────────────┐  ┌─────────────┐          │
│  │   PAINT     │  │   DEFEND    │          │
│  └─────────────┘  └─────────────┘          │
│  ┌─────────────┐  ┌─────────────┐          │
│  │   ATTACK    │  │  REINFORCE  │          │
│  └─────────────┘  └─────────────┘          │
│                                             │
│  MECHANICS                                  │
│  • Real places                              │
│  • Visible commitment                       │
│  • Real stakes                              │
│  • Emergent behavior                        │
│                                             │
│  HOW VALUE WORKS                            │
│  Hold $BIT → Energy → Paint → Defend/Attack │
│                                             │
│  VALUE CREATION                             │
│  Every action locks $BIT...                 │
│  No free griefing...                        │
│                                             │
│          [ Paint your first pixel ]         │
│                                             │
└─────────────────────────────────────────────┘
```

