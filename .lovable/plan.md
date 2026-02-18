

# Remove Duplicate PE Input from Right Panel

## Problem
The PE per-pixel input (number field + preset buttons 1, 2, 5, 10) is shown twice: once in the bottom ActionTray and again in the right sidebar's ActionBox. This creates visual clutter.

## Change

**File: `src/components/map/inspector/ActionBox.tsx`**

Remove lines 173-180 -- the `PeInput` component block that renders for DEF/ATK/REINFORCE/WITHDRAW modes. The ActionTray already provides this input, so the sidebar only needs to show the cost summary, alerts, and action buttons.

The `PeInput` import (line 5) can also be removed since it will no longer be used in this file.

No other files need changes -- the ActionTray continues to provide the PE input as before.

