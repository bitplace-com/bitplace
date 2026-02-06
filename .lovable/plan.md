
# Swap Icons: Globe for Map, Search for Search Button

## Overview
Simple icon swap to improve semantic clarity:
- **Map menu item**: Use globe icon (represents world/map)
- **Search button**: Use search/magnifying glass icon (represents search action)

## Current State

| Location | Current Icon | New Icon |
|----------|--------------|----------|
| MapMenuDrawer.tsx line 88 | `map` | `globe` |
| QuickActions.tsx line 31 | `globe` | `search` |

## Changes

### 1. MapMenuDrawer.tsx (line 88)
```tsx
// Before:
<PixelIcon name="map" size="md" />

// After:
<PixelIcon name="globe" size="md" />
```

### 2. QuickActions.tsx (line 31)
```tsx
// Before:
<PixelIcon name="globe" size="sm" />

// After:
<PixelIcon name="search" size="sm" />
```

## Files to Modify

| File | Line | Change |
|------|------|--------|
| `src/components/map/MapMenuDrawer.tsx` | 88 | `name="map"` → `name="globe"` |
| `src/components/map/QuickActions.tsx` | 31 | `name="globe"` → `name="search"` |

Both icons (`globe` and `search`) already exist in the icon registry, so no new icons need to be created.
