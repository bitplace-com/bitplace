

# Show total area count alongside owned pixel count in ERASER mode

## Problem
After the smart ERASER update, the sidebar counter (`Selected: X px`) only shows owned pixels (the ones that will actually be erased). The user wants to also see the total area selected (including empty/other users' pixels) for context.

## Approach
Track a separate `eraserTotalAreaCount` state that captures the full rectangle/brush area size before filtering. Display both counts in the ActionTray when in ERASER mode: e.g. `Selected: 2,400 / 10,000 px` (owned / total area).

## Changes

### 1. `src/components/map/BitplaceMap.tsx`
- Add state: `const [eraserAreaCount, setEraserAreaCount] = useState(0)`
- In the ERASER rect selection path (~line 1042): before calling `fetchOwnedPixelsInBounds`, compute the total area `(maxX - minX + 1) * (maxY - minY + 1)` and call `setEraserAreaCount(totalArea)`
- In the ERASER brush selection path (~line 1075): set `setEraserAreaCount(selectedPixels.length)` (total brush-painted area before ownership filter)
- In the touch ERASER path (~line 500): same pattern
- Reset `setEraserAreaCount(0)` alongside `setPendingPixels([])` in all clear paths
- Pass `eraserAreaCount` to `ActionTray` as a new prop

### 2. `src/components/map/ActionTray.tsx`
- Add prop `eraserAreaCount?: number`
- When in ERASER mode and `eraserAreaCount > 0`, change the display from `Selected: {selectionCount} px` to `Selected: {selectionCount} owned / {eraserAreaCount} area`
- Keep existing display for non-ERASER action modes

| File | Change |
|------|--------|
| `src/components/map/BitplaceMap.tsx` | Add `eraserAreaCount` state, set it before filtering, pass to ActionTray |
| `src/components/map/ActionTray.tsx` | Accept + display `eraserAreaCount` in ERASER mode |

