

# Smart ERASER selection: only count user-owned pixels

## Problem
When selecting a large area for erasing, the 10,000 pixel limit counts ALL coordinates in the rectangle (including empty pixels and pixels owned by others). This means you might hit the limit but only a fraction of those are actually your pixels.

## Solution
When the ERASER builds its selection from a rectangle, query the database for only pixels owned by the current user within the bounding box, instead of enumerating every coordinate. This way the 10,000 limit applies only to pixels you can actually erase.

## Changes

### 1. `src/components/map/BitplaceMap.tsx` — Smart ERASER rect selection

Replace the coordinate-enumeration logic for ERASER in both the SPACE-release handler (keyboard rect, ~line 962) and the touch handler (~line 439) with an async function that:

1. Queries `pixels` table: `SELECT x, y FROM pixels WHERE owner_user_id = currentUserId AND x >= minX AND x <= maxX AND y >= minY AND y <= maxY LIMIT 10000`
2. Uses the returned coordinates as `committedPixels` (already filtered to user-owned only)
3. Shows a toast if > 0 results, or "No pixels to erase" if empty

```typescript
// New helper function in BitplaceMap
const fetchOwnedPixelsInBounds = async (
  minX: number, maxX: number, minY: number, maxY: number, userId: string
): Promise<{ x: number; y: number }[]> => {
  const { data, error } = await supabase
    .from('pixels')
    .select('x, y')
    .eq('owner_user_id', userId)
    .gte('x', minX).lte('x', maxX)
    .gte('y', minY).lte('y', maxY)
    .limit(MAX_BRUSH_SELECTION);
  if (error || !data) return [];
  return data.map(p => ({ x: Number(p.x), y: Number(p.y) }));
};
```

Then in the ERASER rect selection path, instead of:
```typescript
for (let x = minX; x <= maxX && selectedPixels.length < MAX_BRUSH_SELECTION; x++)
  for (let y = minY; y <= maxY && selectedPixels.length < MAX_BRUSH_SELECTION; y++)
    selectedPixels.push({ x, y });
```

Use:
```typescript
const ownedPixels = await fetchOwnedPixelsInBounds(minX, maxX, minY, maxY, user.id);
// ... proceed with ownedPixels as committedPixels
```

### 2. `src/components/map/hooks/useBrushSelection.ts` — No change needed
The brush (pixel-by-pixel) selection doesn't hit the same issue since users draw over specific pixels. The rect selection is the main problem.

### 3. Touch handler in BitplaceMap (~line 439)
Same change: when ERASER + rect selection ends on touch, use the async query instead of coordinate enumeration.

### 4. `src/components/map/BitplaceMap.tsx` — Also filter brush-painted ERASER selections
For single-pixel ERASER brush strokes, also filter: in `addToBrushSelection` calls for ERASER, check `dbPixels.has(key)` before adding to skip empty pixels.

## Summary

| File | Change |
|------|--------|
| `src/components/map/BitplaceMap.tsx` | Add `fetchOwnedPixelsInBounds` helper; use it for ERASER rect selections (keyboard + touch); filter brush ERASER against `dbPixels` |

