
# Fix: "PE value has changed" loop + Exclude Invalid Pixels button

## Problem 1: Withdraw validation always shows "PE changed"
The `isValidationStale` check in `ActionBox.tsx` compares `validationResult.requiredPeTotal !== pePerPixel * pixelCount`. For WITHDRAW modes, the backend sets `requiredPeTotal = 0` (since it's a refund, not a cost), and stores the refund amount in `breakdown.withdrawRefund` instead. So `0 !== pePerPixel * pixelCount` is always true, making the yellow "PE changed -- re-validate required" message appear endlessly.

**Fix**: Skip the staleness check for WITHDRAW modes, since the refund amount is computed entirely server-side and doesn't depend on the client's `pePerPixel * pixelCount` matching `requiredPeTotal`.

**File**: `src/components/map/inspector/ActionBox.tsx` (lines 112-115)

Change the condition to:
```typescript
const isValidationStale = validationResult && 
  mode !== 'PAINT' && 
  mode !== 'ERASE' && 
  !isWithdraw &&
  validationResult.requiredPeTotal !== pePerPixel * pixelCount;
```

## Problem 2: "Exclude invalid pixels" only available in Eraser mode
Currently `onExcludeInvalid` is only passed when `mode === 'paint' && selectedColor === null` (i.e. Eraser). It should be available for ALL modes that can produce partial-valid results: DEFEND, ATTACK, REINFORCE, WITHDRAW_*, and ERASE.

**File**: `src/components/map/BitplaceMap.tsx` (lines 1831 and 1865)

Change the condition from:
```
onExcludeInvalid={(mode === 'paint' && selectedColor === null) ? handleExcludeInvalid : undefined}
```
To always pass the handler:
```
onExcludeInvalid={handleExcludeInvalid}
```

## Problem 3: InvalidPixelList has no "Exclude" button in the UI
The `InvalidPixelList` component receives `onExcludeInvalid` as a prop but never renders a button. Users have no way to click "exclude invalid pixels".

**File**: `src/components/map/inspector/InvalidPixelList.tsx`

Add:
- A brief contextual explanation below the reason summary (e.g. "These pixels were skipped because they don't meet the requirements for this action")
- An "Exclude invalid pixels" button at the bottom of the component, only shown when `onExcludeInvalid` is provided and `isPartialValid` is true

Also add missing reason labels and mode verbs for the WITHDRAW_* modes:
```
WITHDRAW_DEF: 'withdrawn'
WITHDRAW_ATK: 'withdrawn'
WITHDRAW_REINFORCE: 'withdrawn'
MIN_STAKE: 'Minimum 1 PE stake required'
NO_CONTRIBUTION: 'No contribution found'
```

## Problem 4: Duplicate invalid pixel messages in ActionBox
The `ActionBox` already shows its own "partial valid" and "inline error" warnings (lines 250-273). With the `InvalidPixelList` rendered separately above it in the `InspectorPanel`, the invalid pixel info appears twice.

**Fix**: Remove the inline partial-valid / error messages from `ActionBox` when `InvalidPixelList` is handling the display (i.e., when `invalidPixels.length > 0`). The `InvalidPixelList` will be the single source of truth for invalid pixel information with its contextual explanation and exclude button.

## Files to modify
1. `src/components/map/inspector/ActionBox.tsx` -- fix `isValidationStale` for withdrawals, remove duplicate invalid pixel display
2. `src/components/map/BitplaceMap.tsx` -- pass `onExcludeInvalid` for all modes
3. `src/components/map/inspector/InvalidPixelList.tsx` -- add exclude button + contextual explanation + WITHDRAW reason labels
