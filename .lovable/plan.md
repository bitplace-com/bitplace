

# Fix: Withdraw button not updating after validation

## Root Cause

The backend response puts `withdrawRefund` inside `breakdown.pePerType`, not directly on `breakdown`:

```text
Backend returns:
  breakdown: {
    pixelCount: 1681,
    pePerType: { withdrawRefund: 1612 }   <-- here
  }

Frontend checks:
  validationResult.breakdown?.withdrawRefund  <-- always undefined!
```

So the `isValidated` condition for Withdraw never evaluates to true from a fresh Withdraw validation. The reason it "works" after first doing a Deposit validation is that the old validation result with `ok: true` persists in state, making the button appear validated regardless.

## Fix

**File: `src/components/map/inspector/ActionBox.tsx`**

Two places reference `breakdown.withdrawRefund` and need to be changed to `breakdown.pePerType?.withdrawRefund`:

1. **Line 101** (cost display): `validationResult?.breakdown?.withdrawRefund` should be `validationResult?.breakdown?.pePerType?.withdrawRefund`

2. **Line 116** (isValidated check): `validationResult.breakdown?.withdrawRefund` should be `validationResult.breakdown?.pePerType?.withdrawRefund`

### Before
```typescript
// Line 101
return validationResult?.breakdown?.withdrawRefund ?? pePerPixel * pixelCount;

// Line 116
(isWithdraw && validationResult && (validationResult.breakdown?.withdrawRefund ?? 0) > 0)
```

### After
```typescript
// Line 101
return validationResult?.breakdown?.pePerType?.withdrawRefund ?? pePerPixel * pixelCount;

// Line 116
(isWithdraw && validationResult && (validationResult.breakdown?.pePerType?.withdrawRefund ?? 0) > 0)
```

This is a two-line change that fixes both the "validated" state detection and the refund amount display for all withdraw modes (WITHDRAW_DEF, WITHDRAW_ATK, WITHDRAW_REINFORCE).
