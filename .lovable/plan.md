

## Fix: ERASE Network Error on Large Selections

### Root Cause

The `game-commit` edge function uses `.in("pixel_id", pixelIds)` to fetch pixel data. With 1650 pixels, this generates a URL query string that exceeds PostgREST's URL length limit, resulting in a **400 Bad Request** error that surfaces as "Network error" in the UI.

The `game-validate` function already solved this problem by using an RPC function (`fetch_pixels_by_coords`) that passes coordinates as JSONB -- no URL limit issue.

### Fix

Replace `fetchPixelsByIds` in `game-commit/index.ts` with `fetchPixelsByCoords` using the same RPC approach as `game-validate`.

### Technical Details

**File: `supabase/functions/game-commit/index.ts`**

1. Replace the `fetchPixelsByIds` function (lines 117-150) with a `fetchPixelsByCoords` function that calls the existing `fetch_pixels_by_coords` RPC (same as game-validate)
2. Update both call sites (streaming handler ~line 669, non-streaming handler) to use the new function
3. Remove the `computePixelId` helper since it won't be needed for the fetch anymore (keep it if used elsewhere for pixelMap keys)

The RPC function already exists in the database -- no schema changes needed. The function accepts a JSONB array of `{x, y}` coordinates and returns matching pixel rows, bypassing PostgREST's URL length limit entirely.

