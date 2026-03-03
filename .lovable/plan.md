

# Fix: Pixels reappear after ERASE on large selections

## Root Cause

The ERASE logic in `game-commit` uses `.in("id", ownedPixelIds)` without batching. When erasing hundreds or thousands of pixels (common after admin auto-paint), PostgREST's URL length limit (~8KB) silently truncates the ID list. This means:

- The first ~400-500 pixel IDs fit in the URL and get deleted
- The remaining IDs are silently dropped — those pixels stay in the database
- The frontend optimistically removes them from the tile cache
- On the next viewport move/zoom, `refetchTiles` or `updateViewport` reloads tiles from the server, and the un-deleted pixels reappear

The same truncation issue affects the `virtual_pe_cost` SELECT and the contributions DELETE in the ERASE block.

## Fix

### `supabase/functions/game-commit/index.ts` — Batch ERASE operations

Chunk all `.in()` calls in the ERASE block into batches of 500 IDs (matching the existing PAINT batch size pattern):

```
const ERASE_BATCH_SIZE = 500;

// 1. Fetch virtual_pe_cost in batches
for (let i = 0; i < ownedPixelIds.length; i += ERASE_BATCH_SIZE) {
  const batch = ownedPixelIds.slice(i, i + ERASE_BATCH_SIZE);
  const { data } = await supabase.from("pixels").select("virtual_pe_cost").in("id", batch);
  // accumulate...
}

// 2. Delete contributions in batches
for (let i = 0; i < ownedPixelIds.length; i += ERASE_BATCH_SIZE) {
  const batch = ownedPixelIds.slice(i, i + ERASE_BATCH_SIZE);
  await supabase.from("pixel_contributions").delete().in("pixel_id", batch);
}

// 3. Delete pixels in batches
for (let i = 0; i < ownedPixelIds.length; i += ERASE_BATCH_SIZE) {
  const batch = ownedPixelIds.slice(i, i + ERASE_BATCH_SIZE);
  await supabase.from("pixels").delete().in("id", batch).eq("owner_user_id", userId);
}
```

### Files modified

| File | Change |
|------|--------|
| `supabase/functions/game-commit/index.ts` | Batch all `.in()` calls in ERASE block into chunks of 500 to avoid PostgREST URL length truncation |

No frontend changes needed — the optimistic removal and reconciliation logic is correct. The bug is entirely server-side: pixels aren't actually being deleted from the database.

