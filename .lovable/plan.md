

# Replace global mini-map with inline cluster cards + map-style background

## Problem
The single combined `PixelMiniMap` in the player profile shows all pixels squashed together on a black background, making artwork unrecognizable. The user wants individual cluster artworks shown directly in the profile (like the expanded Paints modal), with the map's actual appearance as background instead of solid black.

## Approach

### File: `src/components/modals/PlayerProfileModal.tsx`

1. **Remove `PixelMiniMap` component** (lines 37-111) — replace with inline cluster rendering using the existing `clusterPixels` algorithm from `OwnerArtworkModal.tsx`.

2. **Import `clusterPixels` from OwnerArtworkModal** — extract it to a shared util or import directly. Since `clusterPixels` is not exported, we'll either export it or duplicate the clustering inline. Cleaner: export it from `OwnerArtworkModal.tsx`.

3. **New inline "Paints" section** replaces `PixelMiniMap`:
   - Use `useMemo` to compute clusters from `profile.pixels`
   - Show clusters in a horizontal scroll or 2-column grid (max height with scroll)
   - Each cluster rendered as a `ClusterCanvas`-style canvas
   - If single cluster: show larger, centered
   - If multiple: show grid of thumbnails, each clickable to jump

4. **Map-style background for cluster canvases**: 
   - Fetching actual map tiles for arbitrary coordinates is complex and slow. Instead, use a **light neutral background** that matches the map's base appearance (light beige/gray like OpenStreetMap) rather than `hsl(var(--muted))` which resolves to black in canvas context.
   - Set canvas background to `#e8e0d8` (light mode map tone) or detect theme and use appropriate neutral. This gives a "map-like" feel without expensive tile fetching.
   - Apply a subtle grid pattern (1px lines every N pixels) to evoke the pixel grid on the map.

### File: `src/components/map/OwnerArtworkModal.tsx`

- **Export `clusterPixels`** function and **`ClusterCanvas`** component so they can be reused in `PlayerProfileModal`.

### Changes in `PlayerProfileModal.tsx` Paints section (lines 344-376):

Replace `PixelMiniMap` with:
```tsx
const clusters = useMemo(() => clusterPixels(profile.pixels, 5), [profile.pixels]);

// In JSX: show clusters inline
{clusters.length === 0 ? (
  <div>No pixels owned yet</div>
) : clusters.length === 1 ? (
  <ClusterCanvas cluster={clusters[0]} size={240} onClick={...} />
) : (
  <ScrollArea className="max-h-48">
    <div className="grid grid-cols-2 gap-2">
      {clusters.map((c, i) => <ClusterCanvas key={i} cluster={c} size={140} onClick={...} />)}
    </div>
  </ScrollArea>
)}
```

### ClusterCanvas background fix (OwnerArtworkModal.tsx line 116-117):

Change from:
```tsx
ctx.fillStyle = 'hsl(var(--muted))';  // doesn't work in canvas
```
To:
```tsx
// Use a map-like neutral background
const isDark = document.documentElement.classList.contains('dark');
ctx.fillStyle = isDark ? '#2a2a2a' : '#e8e0d8';
```

Add subtle grid lines after the background fill to give a map/grid feel.

## Files modified

| File | Change |
|------|--------|
| `src/components/map/OwnerArtworkModal.tsx` | Export `clusterPixels` + `ClusterCanvas`, fix background color |
| `src/components/modals/PlayerProfileModal.tsx` | Replace `PixelMiniMap` with inline clusters using shared components |

