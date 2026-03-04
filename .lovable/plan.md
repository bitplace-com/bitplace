

# Fix creator name truncation + thumbnail pixel coverage

## Problem 1: Creator name truncated
Line 113 in `PlaceCard.tsx` uses `max-w-20` (80px) which cuts names like "Bitplace_Team" to "Bitplace_Te...". Need to widen this.

## Problem 2: Missing pixels in thumbnail
`fetchPixels` queries only within the exact bbox bounds, but the canvas renders a padded view area (20% padding on each side). Pixels outside the strict bbox but inside the padded view are never fetched, creating gaps at the edges. Additionally, the padded view should include those pixels so the artwork looks complete in context.

## Changes

### `src/components/places/PlaceCard.tsx`
- Change `max-w-20` to `max-w-[40%]` on the creator name span (line 113), so it scales with the card width and shows more of the name before truncating.

### `src/components/places/PlaceThumbnail.tsx`
- Update `fetchPixels` call to use the padded bounds (`viewXmin`, `viewYmin`, `viewXmax`, `viewYmax`) instead of the strict bbox, so all visible pixels in the thumbnail area are fetched and rendered.
- Update the cache key to include the padded bounds so different views don't share stale cache entries.

| File | Change |
|------|--------|
| `src/components/places/PlaceCard.tsx` | Widen creator name `max-w-20` → `max-w-[40%]` |
| `src/components/places/PlaceThumbnail.tsx` | Fetch pixels for padded view area, not just strict bbox |

