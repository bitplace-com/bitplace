
# ActionTray UI Improvements: Icons, Text, Spacing, and Shine Effect

## Overview

This plan addresses 5 changes to the ActionTray component:

1. Replace hand icon with "face-thinking" icon
2. Replace pixel eraser icon with Lucide Eraser
3. Change zoom helper text
4. Add spacing between color buttons
5. Add shine animation to special materials

## Changes Summary

| Change | File(s) | Description |
|--------|---------|-------------|
| Face-Thinking Icon | `PixelFaceThinking.tsx`, `iconRegistry.ts`, `ActionTray.tsx` | New icon for drag mode |
| Lucide Eraser | `ActionTray.tsx` | Import Eraser from lucide-react |
| Zoom Text | `ActionTray.tsx` | "Zoom in to see paints" -> "Zoom in to paint" |
| Color Spacing | `ActionTray.tsx` | Increase gap, add padding to avoid clipping |
| Shine Animation | `index.css`, `ActionTray.tsx` | CSS keyframes + apply to special materials |

---

## 1. Create Face-Thinking Icon

Create new icon component from HackerNoon's `face-thinking-solid.svg`:

**File: `src/components/icons/custom/PixelFaceThinking.tsx`**
```tsx
import { PixelSVG, PixelSVGProps } from './base';

export function PixelFaceThinking(props: PixelSVGProps) {
  return (
    <PixelSVG {...props}>
      <polygon points="11 20 10 20 10 22 9 22 9 23 5 23 5 22 4 22 4 16 5 16 5 15 6 15 6 18 8 18 8 17 10 17 10 16 12 16 12 15 14 15 14 17 13 17 13 18 11 18 11 20"/>
      <path d="m22,9v-2h-1v-2h-1v-1h-1v-1h-2v-1h-2v-1h-6v1h-2v1h-2v1h-1v1h-1v2h-1v2h-1v6h1v1h1v-1h1v-1h3v2h2v-1h2v-1h-1v-1h-2v-1h3v1h2v1h2v4h-1v1h-2v2h-1v2h4v-1h2v-1h2v-1h1v-1h1v-2h1v-2h1v-6h-1Zm-7-2h3v1h1v2h-1v-1h-1v-1h-2v-1Zm-1,2h2v2h-2v-2Zm-4,1h-2v-2h2v2Zm1-2v-1h-1v-1h-2v1h-2v-1h1v-1h4v1h1v1h1v1h-2Z"/>
    </PixelSVG>
  );
}
```

**File: `src/components/icons/iconRegistry.ts`** - Add to registry:
```tsx
import { PixelFaceThinking } from './custom/PixelFaceThinking';

// Add to IconName type:
| 'faceThinking'

// Add to icons object:
faceThinking: PixelFaceThinking,
```

---

## 2. Use Lucide Eraser + Face-Thinking in ActionTray

**File: `src/components/map/ActionTray.tsx`**

```tsx
// Add import at top:
import { Eraser } from 'lucide-react';

// Line 237: Replace hand icon with faceThinking
<PixelIcon name="faceThinking" className="h-5 w-5 sm:h-4 sm:w-4" />

// Line 380: Replace PixelIcon eraser with Lucide Eraser
<Eraser className="h-5 w-5 sm:h-4 sm:w-4" />
```

---

## 3. Change Zoom Helper Text

**File: `src/components/map/ActionTray.tsx`** (line 197)

```tsx
// Before:
Zoom in to see paints

// After:
Zoom in to paint
```

---

## 4. Add Spacing Between Colors

**File: `src/components/map/ActionTray.tsx`**

The color grid container (lines 418-421) needs:
- Increase gap from `gap-1.5` to `gap-2`
- Add horizontal padding to prevent edge clipping

```tsx
// Line 418-421 - update the scrollable container
<div className="max-h-48 overflow-y-auto overflow-x-hidden py-1.5 px-2">

// Line 421 - update the grid gap
<div className="grid grid-cols-8 sm:grid-cols-12 gap-2 w-full">
```

Also update special materials grid (line 449):
```tsx
<div className="grid grid-cols-5 sm:grid-cols-8 gap-2.5 sm:gap-2 w-full">
```

---

## 5. Add Shine Animation for Special Materials

### 5a. Add CSS Animation

**File: `src/index.css`** - Add at the end:

```css
/* Premium Shine Animation for Special Materials */
@keyframes premium-shine {
  0% {
    background-position: -200% center;
  }
  100% {
    background-position: 200% center;
  }
}

.animate-shine {
  position: relative;
  overflow: hidden;
}

.animate-shine::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(
    120deg,
    transparent 0%,
    transparent 35%,
    rgba(255, 255, 255, 0.5) 50%,
    transparent 65%,
    transparent 100%
  );
  background-size: 200% 100%;
  animation: premium-shine 3s ease-in-out infinite;
  pointer-events: none;
  border-radius: inherit;
}
```

### 5b. Apply to Special Material Buttons

**File: `src/components/map/ActionTray.tsx`** (line 453-466)

Add the `animate-shine` class to special material buttons:

```tsx
<button
  key={material.id}
  onClick={() => handleColorClick(material.id)}
  disabled={!canPaint}
  className={cn(
    "w-10 h-10 sm:w-7 sm:h-7 rounded-lg sm:rounded-md transition-all duration-100 focus:outline-none relative overflow-hidden touch-target",
    "hover:scale-110 hover:z-10",
    "animate-shine",  // ADD THIS
    canPaint && "hover:ring-1 hover:ring-foreground/30",
    isSelected && "ring-2 ring-foreground scale-110 z-10",
    !canPaint && "opacity-40 cursor-not-allowed"
  )}
  style={{ background: material.cssGradient }}
  title={material.label}
/>
```

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `src/components/icons/custom/PixelFaceThinking.tsx` | Create new icon |
| `src/components/icons/iconRegistry.ts` | Add faceThinking to registry |
| `src/components/map/ActionTray.tsx` | Multiple changes (icons, text, spacing, shine class) |
| `src/index.css` | Add shine animation CSS |

## Visual Result

**Before:**
- Hand icon for drag mode
- Pixel-style eraser icon
- "Zoom in to see paints" text
- Colors tightly packed, possibly clipped at edges
- Special materials have no shine effect

**After:**
- Thinking face icon (more expressive/fun) for drag mode
- Clean Lucide eraser icon
- "Zoom in to paint" text (clearer call to action)
- Colors have breathing room with proper spacing
- Special materials have animated shimmer/shine effect like Bplace
