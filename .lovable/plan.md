

# Fix: Validate button not transitioning to Deposit/Withdraw

## Root Cause

`isValidated` on line 117 only checks `validationResult?.ok === true`. For withdraw (and deposit) operations with mixed selections, the backend returns `{ ok: false, partialValid: true }` -- meaning some pixels are valid. Since `ok` is false, `isValidated` stays false and the UI keeps showing the "Validate" button endlessly.

## Changes

**File: `src/components/map/inspector/ActionBox.tsx`**

1. **Fix `isValidated` to include `partialValid`** (line 117):
   ```typescript
   const isValidated = (validationResult?.ok === true || validationResult?.partialValid === true) && !isValidationStale;
   ```
   This allows the user to proceed with valid pixels even when some are invalid.

2. **Update confirm button labels for Deposit/Withdraw** (lines 338-350):
   Replace the generic `config.label` with context-aware labels:
   - DEFEND/ATTACK/REINFORCE -> "Deposit"
   - WITHDRAW_DEF/WITHDRAW_ATK/WITHDRAW_REINFORCE -> "Withdraw"
   - PAINT/ERASE -> keep existing labels ("Paint"/"Erase")

   The committing state text will also use "Depositing..." / "Withdrawing..." accordingly.

## No other files need changes

