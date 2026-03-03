

# Admin Privileges for team@bitplace.com + Auto-Paint Templates

## Overview

Three changes: (1) give 1M pixels to the admin account, (2) bypass cooldown and pixel limits on the backend, (3) add an "Auto-Paint" button in the Templates panel that automatically paints all template pixels with a progress bar.

## 1. Load 1M Pixels for team@bitplace.com

**Database update** (via insert tool):
```sql
UPDATE users SET virtual_pe_total = 1000000 WHERE email = 'team@bitplace.com';
```

## 2. Backend: Admin Bypass for Cooldown + Pixel Limits

Add `ADMIN_EMAILS` list to both edge functions. Look up user email to determine admin status.

**File: `supabase/functions/game-validate/index.ts`**
- Add `const ADMIN_EMAILS = ["team@bitplace.com"];`
- After fetching user data in `handlePaintFastPath`, also fetch `email` column
- If admin: skip cooldown check, raise `MAX_PAINT_PIXELS` to 50,000
- In main entry: skip `MAX_PAINT_PIXELS` check for admin (need to fetch email before the limit check, or move limit check after user fetch)

**File: `supabase/functions/game-commit/index.ts`**
- Add `const ADMIN_EMAILS = ["team@bitplace.com"];`
- After fetching user, also select `email`
- If admin: skip cooldown check, skip `MAX_PAINT_PIXELS` limit, skip `PAINT_COOLDOWN_SECONDS` (don't set `paint_cooldown_until`)

Implementation detail: In game-validate, the MAX_PAINT_PIXELS check happens before user fetch. We'll move the pixel count check inside `handlePaintFastPath` (after user fetch) for PAINT mode, or fetch the email early. Simplest: fetch email in a lightweight query before the limit check, or just increase the pre-auth limit to 50,000 globally and enforce 1,000 per-user inside the fast path for non-admins.

Best approach: Change the pre-auth limit from 1,000 to 50,000 for PAINT globally (this is just an input sanity check). Inside `handlePaintFastPath`, after fetching user+email, enforce `MAX_PAINT_PIXELS=1000` for non-admins only. Same for game-commit.

## 3. Frontend: Auto-Paint Template Feature

### 3a. New Hook: `useAutoPaint`

**New file: `src/hooks/useAutoPaint.ts`**

A hook that:
- Takes quantized pixels (from template) + template position
- Calls validate → commit in chunked batches (1,000 pixels per batch for non-admin, but admin will handle more)
- Tracks overall progress: `{ phase, currentBatch, totalBatches, pixelsProcessed, pixelsTotal }`
- Exposes `startAutoPaint()`, `cancelAutoPaint()`, `progress`, `isRunning`

Flow per batch:
1. Build pixel array with absolute grid coordinates (template.positionX + dx, template.positionY + dy) and per-pixel color
2. Call `game-validate` with mode PAINT, get snapshotHash
3. Call `game-commit` with snapshotHash
4. Update progress, move to next batch
5. On error: stop and report

### 3b. Auto-Paint Button in TemplateDetailView

**File: `src/components/map/TemplateDetailView.tsx`**

Add a new button "Auto-Paint" below "Recenter" when the template is in `pixelGuide` mode:
- Only visible if user email === admin email (check from WalletContext user object)
- On click: calls `startAutoPaint(quantizedPixels)`
- While running: shows a progress bar (using the existing `Progress` component) with text like "Painting... 1,240 / 5,000 pixels"
- Cancel button to abort

### 3c. Wire Up in Parent Components

The TemplateDetailView needs access to:
- The quantized pixels from TemplateOverlay (already computed and available)
- The game actions (validate/commit)

Pass `onAutoPaint` callback and `autoPaintProgress` state from MapPage/BitplaceMap down through TemplatesPanel → TemplateDetailView.

### 3d. Frontend Draft Limit Bypass

**File: `src/components/map/hooks/useDraftPaint.ts`**

Not needed for auto-paint (it bypasses the draft system entirely). The auto-paint calls validate/commit directly.

## Technical Details

### Admin Detection

- Backend: `ADMIN_EMAILS` array checked against user.email after DB fetch
- Frontend: Check `user?.email === 'team@bitplace.com'` from WalletContext (already available)

### Chunking Strategy

- Default chunk size: 1,000 pixels (matches existing MAX_PAINT_PIXELS)
- For admin: chunk size can be raised to 5,000 for faster throughput
- Sequential processing (batch N must complete before batch N+1)
- No cooldown between batches for admin

### Progress Bar

Using the existing `Progress` component from `src/components/ui/progress.tsx`:
```tsx
<Progress value={(pixelsProcessed / pixelsTotal) * 100} />
<p className="text-xs text-muted-foreground">
  Painting... {pixelsProcessed.toLocaleString()} / {pixelsTotal.toLocaleString()}
</p>
```

## Files to Create/Edit

1. **`supabase/functions/game-validate/index.ts`** -- admin bypass for cooldown + pixel limit
2. **`supabase/functions/game-commit/index.ts`** -- admin bypass for cooldown + pixel limit + no cooldown set after paint
3. **`src/hooks/useAutoPaint.ts`** -- new hook for chunked auto-paint
4. **`src/components/map/TemplateDetailView.tsx`** -- add Auto-Paint button + progress bar
5. **`src/components/map/TemplatesPanel.tsx`** -- pass new props through
6. **DB update** -- set virtual_pe_total = 1,000,000 for team@bitplace.com

