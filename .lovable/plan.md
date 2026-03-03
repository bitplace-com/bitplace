

# Show template-detected colors in Custom tab + removable recent colors

## What changes

### `src/components/map/ActionTray.tsx`

1. **Template suggested colors section** in the Custom tab:
   - When `templateGuideColors` has entries, show a "From template" label followed by a scrollable row of color swatches (extracted from the loaded template image)
   - Each swatch is clickable (applies via `handleCustomColorApply` so it also gets added to recents)
   - Limit display to ~30 unique colors to avoid overwhelming the UI; sort by frequency if possible (but frequency data isn't available here — show as-is from the prop)

2. **Removable recent colors**:
   - Each recent color swatch gets a small `×` button (absolute positioned top-right corner) that removes it from `recentCustomColors` and updates `localStorage`
   - Add a `removeRecentCustomColor` callback that filters the color out of state and persists

### Flow
- User loads a template image → `TemplateOverlay` quantizes it → `guideColors` array flows up to `BitplaceMap` → passed as `templateGuideColors` to `ActionTray`
- In Custom tab, those colors appear as "From template" swatches above the "Recent" row
- Clicking a template color applies it and adds it to recents
- User can remove any recent color with the × button

### Layout in Custom tab (top to bottom):
1. Color picker + hex input + Apply (existing)
2. **"From template"** row (only if templateGuideColors.length > 0)
3. **"Recent"** row with × on each swatch (existing, enhanced)

No new files, no backend changes, no new dependencies.

| File | Change |
|------|--------|
| `src/components/map/ActionTray.tsx` | Add template colors section in custom tab; add × remove button on recent swatches |

