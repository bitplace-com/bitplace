

# Add Custom Color Picker Tab

## Analysis

**Backend safety**: Both `game-validate` and `game-commit` use `isValidPaintId()` which accepts **any** valid `#RRGGBB` hex string. No palette whitelist exists server-side, so custom colors work out of the box with zero backend changes.

**Risk**: None. The palette arrays are only used for rendering the UI swatches. The backend doesn't care which color is sent as long as it's a valid 6-digit hex.

## Approach

Add a third tab **"Custom"** alongside "Colors" and "Gradients" in `ActionTray.tsx`.

### Custom Tab UI
- A simple **HSL color wheel/slider** built with native HTML `<input type="color">` plus manual hex input field
- Show the selected custom color as a large swatch preview
- A **hex input** field (`#RRGGBB`) for precise entry
- A **"Recent" row** (last 8-10 custom colors used, stored in `localStorage`) so users can quickly reuse their picks
- Selecting a custom color calls the same `handleColorClick(color)` — no other changes needed

### Changes

| File | Change |
|------|--------|
| `src/components/map/ActionTray.tsx` | Add `'custom'` to `paletteTab` type, add third tab button, render custom picker UI when active |

The custom picker section would contain:
1. Native `<input type="color">` for visual picking (works on all browsers/mobile)
2. Hex text input for manual entry with validation
3. Row of recent custom colors from localStorage

No new dependencies needed — the native color input provides a full color picker on all platforms. The palette tab state just gains a third option.

