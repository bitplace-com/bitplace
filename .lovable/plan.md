

# Fix: Withdraw mode button stuck on "Validate"

## Root Cause

Looking at the actual backend response for WITHDRAW_REINFORCE:

```json
{
  "ok": false,
  "partialValid": false,
  "invalidPixels": [... 69 pixels with "MIN_STAKE" ...],
  "breakdown": {
    "pixelCount": 1681,
    "pePerType": { "withdrawRefund": 1612 }
  }
}
```

The backend returns `ok: false` AND `partialValid: false`, even though 1612 out of 1681 pixels are valid for withdrawal (withdrawRefund = 1612). This means the frontend's `isValidated` check -- which requires `ok === true || partialValid === true` -- always fails for withdrawals that have any invalid pixels.

For Deposit (REINFORCE), the backend correctly returns `ok: true` or `partialValid: true`, so the button transitions correctly. But for WITHDRAW modes, the backend doesn't set `partialValid` even when most pixels are valid.

## Fix

**File: `src/components/map/inspector/ActionBox.tsx`** (line 113)

Extend the `isValidated` condition to also consider a withdraw validated when the backend returned a positive `withdrawRefund`, meaning there are processable pixels:

```typescript
const isValidated = (
  validationResult?.ok === true || 
  validationResult?.partialValid === true ||
  // Withdraw: backend may return ok=false/partialValid=false but still have valid pixels
  (isWithdraw && validationResult && (validationResult.breakdown?.withdrawRefund ?? 0) > 0)
) && !isValidationStale;
```

This is safe because:
- The `withdrawRefund` value comes directly from the backend's validation
- If the refund is > 0, there are valid pixels the backend can process
- This only applies to withdraw modes, not deposit/paint/erase

## Files Changed
- `src/components/map/inspector/ActionBox.tsx` -- 1 line change to `isValidated` condition

