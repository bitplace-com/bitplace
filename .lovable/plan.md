

# Fix pixels_painted_total accuracy

## Root Cause
`pixels_painted_total` is a leaderboard counter that can become lower than actual owned pixels due to:
1. The 24h dedup rule skipping self-repaints
2. ERASE decrementing the counter
3. Counter not existing when early pixels were painted (column defaults to 0)

## Recommended Fix
Rather than changing the counter logic (which serves the leaderboard correctly), the **Player Profile** should show the real pixel count from the database for "Pixels Owned" and keep `pixels_painted_total` as a separate leaderboard-oriented metric. The issue is purely cosmetic — both numbers are independently correct for their purpose.

However, if you want `pixels_painted_total` to always be >= `pixels_owned`, we can add a one-time reconciliation and prevent ERASE from decrementing below the current owned count.

## Changes

### 1. `supabase/functions/game-commit/index.ts` — Prevent painted < owned after ERASE
Line 839: Instead of blindly decrementing, clamp to at least the user's current owned pixel count.

```typescript
// Before:
newPixelsPaintedTotal = Math.max(0, (user.pixels_painted_total || 0) - affectedPixels);

// After: query current owned count and clamp
const { count: currentOwned } = await supabase
  .from("pixels")
  .select("id", { count: "exact", head: true })
  .eq("owner_user_id", userId);
newPixelsPaintedTotal = Math.max(currentOwned || 0, (user.pixels_painted_total || 0) - affectedPixels);
```

### 2. Database migration — Reconcile existing data
Run a one-time SQL to set `pixels_painted_total` to at least the owned count for all users where it's currently less:

```sql
UPDATE public.users u
SET pixels_painted_total = sub.owned
FROM (
  SELECT owner_user_id, COUNT(*) as owned
  FROM public.pixels
  WHERE owner_user_id IS NOT NULL
  GROUP BY owner_user_id
) sub
WHERE u.id = sub.owner_user_id
  AND u.pixels_painted_total < sub.owned;
```

| File | Change |
|------|--------|
| `supabase/functions/game-commit/index.ts` | Clamp `pixels_painted_total` on ERASE to never go below owned count |
| Database migration | One-time reconciliation of existing users |

