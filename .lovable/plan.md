

# Fix cluster clipping + map tile background

## Problems
1. **Hover ring clipped**: The `hover:ring-2` on `ClusterCanvas` gets cut off by the `ScrollArea`'s overflow:hidden — need padding inside the scroll container.
2. **Map background**: User wants the actual map portion behind each artwork instead of the plain beige/grid background.

## Approach

### 1. Fix clipping (`PlayerProfileModal.tsx`)
Add `p-1` padding inside the ScrollArea's content wrapper and on the single-cluster container so the ring outline has room to render without being clipped.

### 2. Map tile background (`OwnerArtworkModal.tsx` — `ClusterCanvas`)

Use the cluster's center coordinates to compute an OpenStreetMap raster tile URL, load it as an `Image`, and draw it as the canvas background before rendering pixels on top.

- Convert cluster center (grid int) → lng/lat via `gridIntToLngLat`
- Compute OSM tile coordinates at a suitable zoom (z=14–16 depending on cluster spread)
- Load tile from `https://tile.openstreetmap.org/{z}/{x}/{y}.png`
- Draw the tile image (cropped/centered on the exact position) as background
- Then draw the pixel artwork on top with slight opacity or as-is
- Fallback to the current beige background if tile fails to load

Tile math:
```
tileX = floor((lng + 180) / 360 * 2^z)
tileY = floor((1 - ln(tan(latRad) + 1/cos(latRad)) / π) / 2 * 2^z)
```

The tile image is 256×256. We calculate the fractional position within the tile to center the drawing correctly.

### Files modified

| File | Change |
|------|--------|
| `src/components/map/OwnerArtworkModal.tsx` | Load OSM raster tile as canvas background in `ClusterCanvas`; import `gridIntToLngLat` |
| `src/components/modals/PlayerProfileModal.tsx` | Add padding inside ScrollArea and single-cluster wrapper to prevent ring clipping |

