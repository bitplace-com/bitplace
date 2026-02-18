

# Fix: Withdraw button click does nothing after validation

## Root Cause

In `handleConfirm` (BitplaceMap.tsx, line 1448), there's a gate:

```typescript
if (!validationResult?.ok && !frozenPayload?.snapshotHash) {
  if (gameMode === 'PAINT') { ... }
  else if (gameMode === 'ERASE') { ... }
  return;  // <-- WITHDRAW hits this and exits silently
}
```

For WITHDRAW modes, the backend returns `ok: false` (because some pixels have MIN_STAKE violations), so the code enters this branch. But only PAINT and ERASE are handled inside -- there's no WITHDRAW case. The function exits on `return;` without ever calling `commit()`.

Additionally, the success handler (lines 1550-1559) is missing cases for `WITHDRAW_DEF`, `WITHDRAW_ATK`, and `WITHDRAW_REINFORCE`.

## Fix

**File: `src/components/map/BitplaceMap.tsx`**

### Change 1: Allow WITHDRAW modes to bypass the `ok: false` gate

The `isValidated` logic in ActionBox already correctly considers a withdraw validated when `withdrawRefund > 0`. The `handleConfirm` function needs to match this logic. We need to modify the condition on line 1448 to let withdraw modes (which have valid pixels despite `ok: false`) pass through to the commit path below.

Add a check: if it's a withdraw mode and the validation has a positive `withdrawRefund`, skip the early-return branch and proceed to the commit code.

```typescript
const isWithdrawMode = gameMode.startsWith('WITHDRAW_');
const hasWithdrawRefund = isWithdrawMode && validationResult && 
  (validationResult.breakdown?.pePerType?.withdrawRefund ?? 0) > 0;

if (!validationResult?.ok && !frozenPayload?.snapshotHash && !hasWithdrawRefund) {
  // existing PAINT/ERASE handling...
}
```

### Change 2: Add WITHDRAW success handlers

After lines 1556-1558 (the REINFORCE case), add handlers for the three withdraw modes:

```typescript
} else if (gameMode === 'WITHDRAW_DEF' || gameMode === 'WITHDRAW_ATK' || gameMode === 'WITHDRAW_REINFORCE') {
  if (success.peStatus) updatePeStatus(success.peStatus);
  playSound('reinforce_success'); // reuse sound
}
```

### Change 3: Handle missing snapshotHash for withdraw commits

The commit call on line 1516 uses `snapshotHash: snapshotHashToUse!` which may be undefined for WITHDRAW (the backend might not return a snapshotHash with `ok: false`). We need to pass it as optional or handle the case.

## Files Changed
- `src/components/map/BitplaceMap.tsx` -- 3 targeted changes in the `handleConfirm` function

