

# Code Review: Issues Found Before Deploying

## Critical Bugs to Fix

### 1. WITHDRAW_DEF/ATK validation broken -- contributions never fetched
**Files:** `supabase/functions/game-validate/index.ts` (lines 653 and 868-883)

Both the streaming and non-streaming validate paths only fetch user contributions when `mode === "DEFEND" || mode === "ATTACK"`. For `WITHDRAW_DEF` and `WITHDRAW_ATK`, the `userContribSides` map is empty, so every pixel will be flagged as `"NO_CONTRIBUTION"` -- making withdrawal impossible.

**Fix:** Change the condition to also include WITHDRAW modes:
```typescript
if (mode === "DEFEND" || mode === "ATTACK" || mode === "WITHDRAW_DEF" || mode === "WITHDRAW_ATK") {
```
This must be applied in both locations (streaming path ~line 653 and non-streaming path ~line 870).

### 2. `formatMode()` missing WITHDRAW_* cases
**File:** `src/hooks/useGameActions.ts` (lines 696-703)

The `formatMode` function has no cases for `WITHDRAW_DEF`, `WITHDRAW_ATK`, or `WITHDRAW_REINFORCE`. TypeScript may not catch this because the switch is non-exhaustive. When a withdraw commit succeeds, the toast will display `"undefined 5 pixel(s)"`.

**Fix:** Add the missing cases:
```typescript
case 'WITHDRAW_DEF': return 'Withdrew DEF from';
case 'WITHDRAW_ATK': return 'Withdrew ATK from';
case 'WITHDRAW_REINFORCE': return 'Withdrew stake from';
```

### 3. ActionTray summary label says "Required" for withdraw mode
**File:** `src/components/map/ActionTray.tsx` (lines 538-543)

The expanded ActionTray summary section always shows "Required:" even when `actionDirection === 'withdraw'`. It should show "Refund:" in withdraw mode to match the ActionBox behavior.

**Fix:** Conditionally display "Refund" vs "Required" based on `actionDirection`.

## Non-Critical but Worth Noting

### 4. DEFEND/ATTACK commit -- sequential updates for `toUpdate` array
**File:** `supabase/functions/game-commit/index.ts` (lines 384-389)

The DEFEND/ATTACK commit path still processes contribution updates sequentially (one `await` per pixel). For large selections this will be slow, similar to the old REINFORCE issue. Not blocking, but could be parallelized in a future pass.

## Summary of Required Changes

| File | Change | Severity |
|------|--------|----------|
| `game-validate/index.ts` (line ~653) | Add WITHDRAW_DEF/ATK to contribution fetch condition (streaming) | Critical |
| `game-validate/index.ts` (line ~870) | Add WITHDRAW_DEF/ATK to contribution fetch condition (non-streaming) | Critical |
| `useGameActions.ts` (line ~696) | Add WITHDRAW_* cases to `formatMode()` | Critical |
| `ActionTray.tsx` (line ~539) | Show "Refund" label in withdraw mode | Minor |

After these fixes, deploy `game-validate` and `game-commit` edge functions.

