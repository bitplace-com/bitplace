

# Fix: Withdraw Refund Shows 0 PE

## Root Cause

The backend (game-validate) correctly calculates the refund amount for WITHDRAW modes but stores it in `breakdown.withdrawRefund`, while keeping `requiredPeTotal = 0` (because withdrawals have no cost). The ActionBox reads `requiredPeTotal` for the "Refund" display, which is always 0.

## Fix

**File: `src/components/map/inspector/ActionBox.tsx`** (lines 90-105)

Update the `requiredPe` calculation for withdraw modes to read from `breakdown.withdrawRefund` when a validation result exists:

```typescript
if (isWithdraw) {
  return validationResult?.breakdown?.withdrawRefund ?? pePerPixel * pixelCount;
}
```

This way:
- Before validation: shows the estimate (`pePerPixel * pixelCount`)
- After validation: shows the actual refund from the backend (`breakdown.withdrawRefund`)

The "After action" line (line 226) already handles withdraw math correctly (`availablePe + Math.abs(requiredPe)`), so once `requiredPe` is correct, the post-action balance will also be correct.

## Files Changed
- `src/components/map/inspector/ActionBox.tsx` -- 1 line change in the `requiredPe` calculation

