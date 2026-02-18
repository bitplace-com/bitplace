

# Fix: Validate button stuck for Defend/Attack/Reinforce

## Root Cause

The `isValidationStale` check in ActionBox.tsx (line 111-115) compares the backend's `requiredPeTotal` against a naive client-side estimate (`pePerPixel * pixelCount`). These values almost never match because the backend calculates the actual cost per pixel based on existing contributions and ownership state. Since `isValidationStale` is always truthy, `isValidated` stays false and the button remains "Validate" forever.

## Fix

**File: `src/components/map/inspector/ActionBox.tsx`** (lines 110-115)

Replace the naive comparison with a proper staleness check: track whether `pePerPixel` actually changed after validation by comparing against the per-pixel value stored in the validation result's breakdown.

The backend returns `breakdown.pePerType` or the total divided by pixel count. The simplest reliable fix is to remove the staleness check entirely for the `requiredPeTotal` comparison and instead only mark stale when `pePerPixel` differs from the value used during validation. Since the validation result doesn't currently store the input `pePerPixel`, the cleanest approach is:

```typescript
// Check if PE per pixel changed after validation (requires re-validate)
// Compare against the pePerPixel that was embedded in the validation request,
// not against the backend's computed total (which accounts for existing state)
const isValidationStale = validationResult && 
  mode !== 'PAINT' && 
  mode !== 'ERASE' && 
  !isWithdraw &&
  validationResult._inputPePerPixel !== undefined &&
  validationResult._inputPePerPixel !== pePerPixel;
```

However, since `_inputPePerPixel` isn't currently stored, the simpler approach is to remove the comparison that always fails:

```typescript
const isValidationStale = false; // PE staleness tracked by parent via isSelectionChanged
```

The parent component already provides `isSelectionChanged` for this purpose, and the ActionBox already renders a "Selection changed -- re-validate" hint when that flag is true. So we can safely remove the redundant (and broken) staleness check.

## Summary of Changes

1. **`src/components/map/inspector/ActionBox.tsx`** -- Set `isValidationStale` to `false` (or remove the broken comparison). The existing `isSelectionChanged` prop already covers the re-validate hint.

