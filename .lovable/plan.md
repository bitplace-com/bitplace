

# Pixel link deep-link: suppress tour, keep explore mode, compact inspector

## Context
When a user arrives via a pixel link (`/?lat=...&lng=...&z=18&px=X&py=Y`), three things go wrong:
1. The guided tour pops up over the pixel info
2. The auto-switch logic restores draw mode when zoom crosses the paint threshold
3. The `PixelInspectorDrawer` opens full-screen on mobile, overwhelming new users

## Changes

### 1. Detect "pixel link" arrival — `src/components/map/BitplaceMap.tsx`
Create a ref `isPixelLink` set to `true` when `initialUrlPos` has `pixelX`/`pixelY`. This flag will be used to:
- **Suppress auto-switch to draw**: In the `useEffect` at line 268, skip restoring draw mode when `isPixelLink.current` is true. Clear the flag after first user interaction (manual mode change).
- **Force drag mode on load**: After map load (line 571), explicitly call `setInteractionMode('drag')` when it's a pixel link.

### 2. Suppress tour on pixel link — `src/hooks/useGuidedTour.ts`
Add a check in the `useEffect` that triggers `shouldShow`: if URL contains `px` and `py` params, skip showing the tour prompt (set `TOUR_SEEN_KEY` or simply don't set `shouldShow`).

### 3. Compact pixel inspector on link arrival — `src/components/map/PixelInspectorDrawer.tsx`
On mobile, instead of opening the full `Drawer` immediately, show a **compact summary chip** (coordinates + color swatch + owner name) fixed at the bottom. Tapping it expands the full drawer. Add a `compact` prop to control this.

Alternatively (simpler approach): change the mobile drawer to use `snap points` so it opens partially (30-40% height) rather than full screen, and the user can swipe up for more details.

### 4. Wire `compact` mode from BitplaceMap
Pass `fromPixelLink` to `PixelInspectorDrawer` when the inspector was opened via URL pixel ref, so it starts in compact/snapped mode.

## File summary

| File | Change |
|------|--------|
| `src/hooks/useGuidedTour.ts` | Skip tour when URL has `px`+`py` params |
| `src/components/map/BitplaceMap.tsx` | Add `isPixelLink` ref; suppress draw auto-switch; force drag on pixel link load; pass `fromLink` to inspector |
| `src/components/map/PixelInspectorDrawer.tsx` | Mobile: use snap points (`[0.35, 1]`) so drawer opens at 35% height initially instead of full screen; allow swipe up for full details |

