
# Fix Pixel Limit: 500→300 Message and Multi-Pixel Brush Overflow

## Problems Identified

### 1. Wrong Error Message (Screenshot)
In `src/hooks/useGameActions.ts` line 416, the error message is hardcoded as "Maximum 500 pixels per paint" instead of the correct 300 limit.

### 2. Multi-Pixel Brush Exceeds Limit
When using the 2x2 brush (4 pixels per click), the current implementation calls `addToDraft` in a loop:
```typescript
block.forEach(p => addToDraft(p.x, p.y, selectedColor));
```

The problem is that React state updates are asynchronous. All 4 calls see the same `draft.size` value, so if you're at 298 pixels, all 4 get added (reaching 302) before the limit check rejects them.

## Solution Architecture

### Option A: Pre-check remaining capacity in BitplaceMap (Chosen)
Before calling `addToDraft` for a 2x2 block, check if there's enough room:
```typescript
const remainingCapacity = PAINT_MAX_PIXELS - draftCount;
if (remainingCapacity <= 0) return;

const block = getSnapped2x2Block(x, y);
// Only add pixels that fit
const pixelsToAdd = block.slice(0, remainingCapacity);
pixelsToAdd.forEach(p => addToDraft(p.x, p.y, selectedColor));
```

### Option B: Add batch function to useDraftPaint
Create `addBatchToDraft(pixels: {x,y}[], color)` that atomically checks and adds all pixels up to the limit.

**I recommend Option A** because it's simpler and doesn't require changing the draft hook API.

## Files to Modify

| File | Change |
|------|--------|
| `src/hooks/useGameActions.ts` | Fix hardcoded "500" to use correct limit |
| `src/components/map/BitplaceMap.tsx` | Add remaining capacity check before 2x2 brush operations |
| `src/components/map/hooks/useDraftPaint.ts` | Export remaining capacity for use in checks |

## Implementation Details

### 1. Fix Error Message in useGameActions.ts

```typescript
// Line 413-420 - Import and use PAINT_MAX_PIXELS constant
import { PAINT_MAX_PIXELS } from '@/components/map/hooks/useDraftPaint';

// Change message:
if (data.error === 'MAX_PIXELS_EXCEEDED') {
  setLastError({
    code: 'MAX_PIXELS_EXCEEDED',
    message: `Maximum ${PAINT_MAX_PIXELS} pixels per paint`,
    requestId: data.requestId,
    canRetry: false,
  });
```

### 2. Add Remaining Capacity to useDraftPaint

Add a new return value:
```typescript
const remainingCapacity = MAX_DRAFT - draft.size;

return {
  // ... existing
  remainingCapacity,
};
```

### 3. Fix 2x2 Brush in BitplaceMap.tsx

In all places where 2x2 brush is used, add capacity check:

**handleTouchPaintStart (line ~172):**
```typescript
if (brushSize === '2x2') {
  const block = getSnapped2x2Block(x, y)
    .filter(p => !draftPixels.has(`${p.x}:${p.y}`));  // Skip duplicates
  const toAdd = block.slice(0, remainingCapacity);
  if (toAdd.length === 0) return;
  toAdd.forEach(p => addToDraft(p.x, p.y, selectedColor));
  lastDraftedPixelRef.current = block[0];
}
```

**handleTouchPaintMove (line ~210):**
```typescript
if (brushSize === '2x2') {
  const block = getSnapped2x2Block(x, y);
  const topLeft = block[0];
  if (!last || last.x !== topLeft.x || last.y !== topLeft.y) {
    const toAdd = block
      .filter(p => !draftPixels.has(`${p.x}:${p.y}`))
      .slice(0, remainingCapacity);
    if (toAdd.length > 0) {
      toAdd.forEach(p => addToDraft(p.x, p.y, selectedColor));
      lastDraftedPixelRef.current = topLeft;
    }
  }
}
```

**Space key handler (line ~493, ~870, ~1055):**
Same pattern - filter existing, slice to remaining capacity, then add.

## Expected Behavior After Fix

| Scenario | Before | After |
|----------|--------|-------|
| Error message from server | "Maximum 500 pixels per paint" | "Maximum 300 pixels per paint" |
| 2x2 brush at 298 pixels | Adds 4 → reaches 302 | Adds 2 → reaches 300 |
| 2x2 brush at 300 pixels | Toast shown but cursor shows as if adding | No action, limit toast shown |
| 1x1 brush behavior | Works correctly | Unchanged |

## Technical Notes

- The `remainingCapacity` value is derived from `draftCount` which updates on every render
- Slicing the block array ensures we never exceed the limit, even by 1 pixel
- The filter for existing drafts prevents duplicate counting
