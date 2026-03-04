

# Shorter pixel share links

## Current format
```
https://bitplace.com/?lat=37.77228&lng=-122.39053&z=18&px=335599&py=810612
```
72 characters of path+query. The `lat`, `lng`, and `z` params are redundant — they can be derived from `px` and `py` via `gridIntToLngLat`, and zoom is always 18 for shared pixels.

## New format
```
https://bitplace.com/p/335599:810612
https://bitplace.com/p/335599:810612?player=abc123
```
~20 characters of path. Clean, memorable, easy to share.

## Changes

### 1. `src/App.tsx` — Add `/p/:coords` route
Add a new route `/p/:coords` that extracts `x:y` from the path, converts to lat/lng, and redirects to `/?lat=...&lng=...&z=18&px=X&py=Y` (preserving `?player` if present). This keeps all existing deep-link logic in `BitplaceMap` working without changes.

```tsx
function PixelRedirect() {
  const { coords } = useParams();
  // parse "335599:810612" → x=335599, y=810612
  // convert to lat/lng via gridIntToLngLat
  // redirect to /?lat=...&lng=...&z=18&px=X&py=Y
}

<Route path="/p/:coords" element={<PixelRedirect />} />
```

### 2. `src/lib/shareLink.ts` — Generate short URLs
Update `generatePixelShareLink` to produce `/p/X:Y` format instead of the query-string format. Profile links with `?player=` are appended as a query param.

### 3. Backward compatibility
The existing `/?lat=...&lng=...&px=...&py=...` format continues to work unchanged — we're only adding a new route, not removing the old parsing logic.

| File | Change |
|------|--------|
| `src/App.tsx` | Add `/p/:coords` route with redirect component |
| `src/lib/shareLink.ts` | Generate `/p/X:Y` short links |

