

# Fix: Pixels not visible on initial map load

## Problem
When the map loads (especially from URL params like `?lat=45.5&lng=9.2&z=16`), the pixels are not visible and the "Zoom in to see pixels" message shows even though the map is already zoomed in enough. Two root causes:

1. **Zoom state stuck at 2**: The `useMapState` hook initializes `zoom: 2`, and it's only updated by `map.on('zoom', ...)` events. When the map loads directly at zoom 16, no zoom event fires, so `canPaint` stays `false` and the "Zoom in" prompt shows.

2. **No initial tile fetch**: The `updateBounds()` function (which triggers `updateViewport` to fetch pixel tiles) is only bound to `moveend` and `zoomend` events, not called on initial load. So no `pixels-fetch-tiles` request is ever made until the user pans or zooms.

## Solution
Add an initial sync inside the existing `map.on('load', ...)` callback in `BitplaceMap.tsx` (around line 532):

After `setMapReady(true)`, immediately:
- Call `setZoomRef.current(map.getZoom())` to sync the zoom state
- Call `updateBounds()` (by moving its definition before the `load` handler, or calling it inline) to trigger the first tile fetch

## Technical Details

In `src/components/map/BitplaceMap.tsx`, the map initialization `useEffect` (line ~500-567):

1. Move the `updateBounds` function definition **before** the `map.on('load', ...)` call
2. Inside `map.on('load', ...)`, after `setMapReady(true)`, add:
   ```typescript
   setZoomRef.current(map.getZoom());
   updateBounds();
   ```

This ensures:
- The React zoom state matches the actual map zoom from the start
- The `canPaint` flag is correct immediately
- The first viewport tile fetch happens on load
- The "Zoom in" message won't show incorrectly
- Pixels will be visible immediately when the map loads at a paintable zoom level

## Secondary Issue (not addressed here)
The console logs show a Realtime channel connect/close loop. This is a separate issue (likely caused by the `reconnectAttempts` state being in the `setupRealtimeSubscription` dependency array, creating a feedback loop). This doesn't affect pixel visibility since initial rendering uses the tile fetch, not realtime.

