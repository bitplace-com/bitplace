

## Fix: RPC Call Format in game-commit

### Problem

The `fetchPixelsByCoords` function in `game-commit` passes `JSON.stringify(coords)` to the RPC, which sends a string instead of a JSONB array. The database function expects an actual JSONB array, causing the error: `cannot call jsonb_to_recordset on a non-array`.

### Root Cause

In `game-validate`, the RPC is called correctly:
```typescript
coords: coords  // passes the array directly
```

But in `game-commit`, the previous edit incorrectly used:
```typescript
coords: JSON.stringify(coords)  // passes a string - WRONG
```

### Fix

**File: `supabase/functions/game-commit/index.ts`** (line 138)

Remove `JSON.stringify()` and pass `coords` directly, matching how `game-validate` does it:

```typescript
// Before (broken):
const { data, error } = await supabase.rpc('fetch_pixels_by_coords', {
  coords: JSON.stringify(coords),
});

// After (fixed):
const { data, error } = await supabase.rpc('fetch_pixels_by_coords', {
  coords: coords,
});
```

One-line change, then redeploy the edge function.
