
# White Paper: "Paint the World Bit by Bit" + Theme-Aware Colors

## Summary of Changes

1. **Title Update**: "Own a piece of the world" → "Paint the world bit by bit"
2. **Content Reframe**: Shift language from ownership to painting/creating
3. **Color Fix**: Make modal theme-aware (currently hardcoded dark background)

---

## Problem: Color Issues

The `DialogContent` component has a hardcoded dark background:
```tsx
bg-[hsl(0_0%_7%)]  // Near-black, always
```

This creates:
- **Day Mode**: Dark modal on light interface (jarring, as shown in screenshot)
- **Night Mode**: Works correctly (dark on dark)

The action cards use `bg-card` which adapts to theme, but against the forced-dark dialog they look washed out in day mode.

---

## Solution

### 1. Update DialogContent to be Theme-Aware

Modify `src/components/ui/dialog.tsx` to use theme tokens instead of hardcoded color:

```tsx
// Before:
bg-[hsl(0_0%_7%)]

// After:
bg-background
```

Also update border from `border-white/14` to `border-border`:
```tsx
// Before:
border border-white/14

// After:
border border-border
```

### 2. Update WhitePaperModal Content

**Title Change:**
```tsx
// Before:
"Own a piece of the world."

// After:
"Paint the world bit by bit."
```

**Subline Update:**
```tsx
// Before:
"Bitplace is a world map where every pixel can be claimed, contested, and defended with real value."

// After:
"Bitplace is a world map where every pixel can be painted, defended, and contested."
```

**Action Card Descriptions (reframe from ownership to painting):**

| Action | Before | After |
|--------|--------|-------|
| Paint | "Claim any unclaimed pixel. Stake energy to own it. The pixel becomes yours until someone takes it." | "Color any pixel on the map. Stake energy to paint it. Your mark stays until someone paints over it." |
| Protect | "Add energy to any pixel you believe in. More protection makes it harder to take." | "Add energy to any pixel. More energy makes it harder to paint over." |
| Attack | "Drain energy from pixels you want. Each attack weakens the pixel. When it's weak enough, you can take it." | "Drain energy from pixels you want to repaint. Each attack weakens it. When it's weak enough, you can paint over it." |
| Take Over | "Stake enough energy to flip ownership. The pixel is now yours. Previous owner gets their stake back." | "Stake enough energy to repaint. The pixel is now your color. Previous painter gets their stake back." |

**Why It Matters section (reframe):**

| Before | After |
|--------|-------|
| "Real territory" | "Real places" |
| "The map is Earth. Your pixels mark real places." | "The map is Earth. Your paintings mark real locations." |
| "When someone takes your pixel, you feel it. When you defend one, it means something." | "When someone paints over your pixel, you feel it. When you defend one, it means something." |

**Flow diagram update:**
```tsx
// Before:
"Claim Territory" → "Defend or Lose"

// After:
"Paint Pixels" → "Defend or Fade"
```

**CTA update:**
```tsx
// Before:
"Claim your first pixel."

// After:
"Paint your first pixel."
```

### 3. Update WhitePaperPage.tsx

Mirror all the same content changes as the modal.

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/ui/dialog.tsx` | Replace hardcoded dark bg with theme-aware `bg-background`, update border |
| `src/components/modals/WhitePaperModal.tsx` | Update all text content |
| `src/pages/WhitePaperPage.tsx` | Mirror text updates |

---

## Visual Result

**Day Mode:**
- Modal with light background matching app theme
- Cards with proper contrast
- All text readable

**Night Mode:**
- Modal with dark background (as before)
- Cards with proper contrast
- No change from current working state

**Messaging:**
- Title: "Paint the world bit by bit." (the actual tagline)
- Language focused on painting/creating rather than owning
- More inviting, creative framing
