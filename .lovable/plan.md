
## Fix: Multi-Color Paint & Recolor Owned Pixels

### Root Cause Analysis

There are **3 bugs** preventing multi-color paint from working correctly:

---

### Bug 1 — Backend `executeCommit` function signature drops per-pixel colors

`executeCommit` is declared as:
```ts
pixels: Array<{ x: number; y: number }>  // ← no color field!
```
Even though the frontend sends `{ x, y, color }` per pixel, the `color` is silently stripped when passed to `executeCommit`. Inside the function, `pixel.color` (line 529) refers to the `PixelData` color field — which is the **existing DB color**, not the new requested color.

**Fix**: Change `executeCommit` signature to `pixels: Array<{ x: number; y: number; color?: string }>` and build a lookup map from the incoming request pixels (with their colors) so that per-pixel colors are correctly applied in the upsert loop.

---

### Bug 2 — `pixelStates` color field contains the old DB color, not the new requested color

When building `pixelStates` (lines 1144–1160), the code does:
```ts
color: existing?.color ?? undefined  // ← this is the OLD color from DB
```
Then in `executeCommit`, the upsert uses `pixel.color ?? color!` — but `pixel.color` is the old DB color, so the pixel gets painted in its existing color instead of the new one.

**Fix**: Build a `requestedColorMap` from the raw `pixels` array received in the request body (which does have per-pixel colors), and use it when building the upsert data: `requestedColorMap.get(key) ?? color!`.

---

### Bug 3 — Color validation blocks multi-color batches

Line 1014 in `game-commit`:
```ts
if (mode === "PAINT" && (!color || !isValidPaintId(color)))
```
This requires a valid **top-level** `color` field. The frontend always sends a `selectedColor` as the top-level color (the last used color), so this doesn't block execution — but the top-level color ends up being used as the fallback for ALL pixels instead of their individual colors.

The validation is fine as a fallback guard, but we need to ensure per-pixel colors take priority.

---

### Bug 4 — `addToDraft` refuses to update color for an already-drafted pixel

In `useDraftPaint.ts` line 66:
```ts
if (draft.has(key)) return false;  // ← can't repaint a pixel already in draft
```
This means if a user paints pixel A in red, then switches to blue and tries to repaint pixel A — it silently fails. The user cannot change their mind about a pixel's color once it's in the draft.

**Fix**: Allow updating the color of an existing draft pixel instead of rejecting it. If the pixel is already in draft with a different color, update it to the new color.

---

### Recolor Owned Pixels (zero PE cost)

The backend already has the right logic at lines 521–523:
```ts
} else if (!isEmpty && isOwnedByUser) {
  stake = pixel.owner_stake_pe || 1;  // keep existing stake
}
```
So recoloring owned pixels already preserves PE. The issue is only that the wrong color ends up being written (Bug 1 & 2). Once those are fixed, recoloring will work correctly at zero additional PE cost.

---

### Files to Change

| File | Changes |
|---|---|
| `supabase/functions/game-commit/index.ts` | 1) Update `executeCommit` signature to include `color?` per pixel. 2) Build `requestedColorMap` from raw request `pixels`. 3) Use `requestedColorMap.get(key) ?? color!` in upsert. 4) Pass the raw pixels (with colors) through to `executeCommit`. |
| `src/components/map/hooks/useDraftPaint.ts` | Allow updating existing draft pixels with a new color instead of rejecting them silently. |

No other files need changes — the frontend already calls `getDraftPixelsWithColor()` correctly and sends per-pixel colors in the request. The state machine and `BitplaceMap.tsx` are fine.

---

### Technical Detail: Backend Fix

In `game-commit/index.ts`, the fix in the non-streaming path:

```ts
// Build a map of requested colors from the incoming pixels (preserves per-pixel colors)
const requestedColorMap = new Map<string, string>();
(rawPixels || []).forEach((p: { x: number; y: number; color?: string }) => {
  if (p.color) requestedColorMap.set(`${p.x}:${p.y}`, p.color);
});

// Pass this map into executeCommit (or use it directly in the upsert loop)
```

And in `executeCommit`, in the PAINT upsert loop:
```ts
upsertData.push({
  x: pixel.x,
  y: pixel.y,
  color: requestedColorMap?.get(`${pixel.x}:${pixel.y}`) ?? color!,  // per-pixel first
  owner_user_id: userId,
  owner_stake_pe: stake,
  updated_at: now,
});
```

The simplest approach: pass `requestedColorMap` as an additional parameter to `executeCommit`, or inline the map lookup directly in the PAINT branch since `pixels` (the original request array with colors) is accessible.

### Technical Detail: Frontend Fix (`useDraftPaint.ts`)

```ts
// BEFORE: silently reject duplicate keys
if (draft.has(key)) return false;

// AFTER: update color if pixel is already in draft
if (draft.has(key)) {
  const existing = draft.get(key)!;
  if (existing.color === color) return false; // same color, no change
  setDraft(prev => {
    const next = new Map(prev);
    next.set(key, { x, y, color, createdAt: existing.createdAt });
    return next;
  });
  setDraftDirty(true);
  return true;
}
```
