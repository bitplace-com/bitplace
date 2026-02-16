

# Fix ActionTray: Always Show Explore/Draw Toggle + Dim Palette in Explore Mode

## Problem
The explore/draw mode toggle buttons are wrapped in `{canPaint && (...)}`, so they disappear when zoomed out. The user needs these buttons always visible. Additionally, the color palette should be dimmed (opacity-40, non-interactive) when in explore mode, but the Colors/Gradients tabs should remain visible.

## Changes

**File: `src/components/map/ActionTray.tsx`**

1. **Remove `canPaint` gate from the explore/draw toggle** (line 217): Change `{canPaint && (` to always render the toggle buttons, so the user can always switch between explore and draw modes regardless of zoom level.

2. **Dim palette in explore (drag) mode**: Update the palette dimming condition from:
   ```
   isEraser && "opacity-40 pointer-events-none"
   ```
   to:
   ```
   (isEraser || interactionMode === 'drag') && "opacity-40 pointer-events-none"
   ```
   This ensures colors are visible but dimmed/non-interactive in explore mode, and fully interactive in draw mode.

3. **Tool row stays as-is**: The 1px/4px/eraser buttons already correctly hide in explore mode via `{canPaint && interactionMode === 'draw' && (...)}`. No change needed there.

## Summary
- Explore/Draw toggle: always visible (remove `canPaint` guard)
- Colors/Gradients tabs: always visible (already correct)
- Color palette: dimmed in explore mode + dimmed when eraser active
- Tool buttons (1px, 4px, eraser): hidden in explore mode (already correct)

