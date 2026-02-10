

# Discord Social Link + Artwork Navigation Fix

## 1. Add Discord Social Link

### Database
Add `social_discord` column to the `users` table (nullable text, max 100 chars).

### Backend: `supabase/functions/user-update/index.ts`
Add validation block for `social_discord` (same pattern as `social_x` and `social_instagram` -- string, max 100 chars) and include it in the `updates` object.

### Frontend: `src/hooks/useSettings.ts`
- Add `social_discord` to the memoized `settings` object
- Add `social_discord` to `ProfileUpdates` interface
- Add normalization for Discord links in `saveProfile` (handle `discord.gg/` and `discord.com/users/` prefixes)

### Frontend: `src/components/modals/SettingsModal.tsx`
- Add `socialDiscord` state variable
- Add Discord input field in the Links section (between Instagram and Website)
- Use a globe icon (no custom Discord pixel icon exists) with label "Discord"
- Include it in `hasChanges()` check and `handleSave()` payload
- Sync it in the `useEffect` reset

### Frontend: Profile display
Where social links are shown (e.g. `PixelInfoPanel.tsx` owner section), add Discord link display alongside X/Instagram/Website.

---

## 2. Fix Artwork Click-to-Navigate

The core bug: `PixelInspectorDrawer` renders `PixelInfoPanel` but never passes `onJumpToPixel`. When `OwnerArtworkModal` calls `onJumpToPixel`, it goes to `handleJumpToPixel` in `PixelInfoPanel` which checks `if (onJumpToPixel)` -- always `undefined`.

### Fix: `src/components/map/PixelInspectorDrawer.tsx`
- Accept `onJumpToPixel` prop and pass it through to `PixelInfoPanel`

### Fix: `src/components/map/BitplaceMap.tsx`
- Create a `handleJumpToPixel` callback that converts grid coords to lng/lat using `gridIntToLngLat`, then calls `mapRef.current.flyTo()` at high zoom (e.g. zoom 18) and opens the inspector after animation
- Pass this callback to `PixelInspectorDrawer` as `onJumpToPixel`

### Fix: `src/components/map/OwnerArtworkModal.tsx`
- Improve the artwork display: group pixels into connected clusters using flood-fill, render each cluster as a separate clickable thumbnail card with pixel count and bounding-box preview
- If there's only one cluster (or pixels are close together), show a single canvas as today but with working navigation
- Show cluster list as a scrollable grid of mini-canvases, each clickable to jump to that area

---

## 3. Artwork Modal Improvements

### Cluster Detection
Add a simple connected-component algorithm to group adjacent pixels into clusters. Two pixels belong to the same cluster if they share an edge (4-connectivity) or are within a small gap (tolerance of 2-3 pixels to handle sparse areas).

### Visual Layout
- Show clusters sorted by size (largest first)
- Each cluster rendered as a mini-canvas card showing the artwork fragment
- Display pixel count per cluster
- Click on any cluster card to fly to its center on the map
- Keep the "all artwork" overview canvas at the top for context

---

## Technical Summary

| Area | File | Change |
|------|------|--------|
| DB | migration | Add `social_discord` text column |
| Backend | `user-update/index.ts` | Validate + persist `social_discord` |
| Hook | `useSettings.ts` | Add discord to settings + normalize |
| UI | `SettingsModal.tsx` | Discord input field |
| UI | `PixelInfoPanel.tsx` | Display discord link in owner socials |
| Navigation | `PixelInspectorDrawer.tsx` | Pass `onJumpToPixel` prop through |
| Navigation | `BitplaceMap.tsx` | Create + pass `handleJumpToPixel` with `flyTo` |
| Artwork | `OwnerArtworkModal.tsx` | Cluster grouping + mini-canvas cards + working navigation |

