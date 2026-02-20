
## Fix: Multi-Color Paint Support

### Root Cause

The system was architected to handle **only one color per paint batch**. When the user paints with multiple colors, the following chain breaks:

1. `getDraftPixels()` in `useDraftPaint.ts` returns only `{ x, y }` — it **discards the color stored per pixel**.
2. `freezePayload()` in `usePaintStateMachine.ts` stores a single `color` string (the `selectedColor` at the moment Validate is pressed).
3. `game-validate` and `game-commit` backend functions accept a single `color?: string` field applied uniformly to all pixels.
4. At commit time, every pixel in the batch gets painted with `frozenPayload.color` — the **last selected color** — overriding colors painted earlier.

### Solution

The fix requires changes in three layers:

---

### Layer 1 — `useDraftPaint.ts`

Add `getDraftPixelsWithColor()` that returns `{ x, y, color }[]` preserving each pixel's individual color from the draft Map.

```ts
// NEW helper — returns per-pixel colors
getDraftPixelsWithColor: () => Array.from(draft.values()).map(({ x, y, color }) => ({ x, y, color }))
```

---

### Layer 2 — `usePaintStateMachine.ts`

Update `FrozenPayload` to store `pixels` as `{ x, y, color }[]` instead of `{ x, y }[]`, and update `freeze()` to accept colored pixels. The single `color` field on `FrozenPayload` becomes optional/deprecated (kept for backward compat).

```ts
// BEFORE
pixels: { x: number; y: number }[];
color: string;

// AFTER
pixels: { x: number; y: number; color: string }[];
color: string; // kept as fallback / display color
```

---

### Layer 3 — `BitplaceMap.tsx` (validate & commit calls)

**In `handleValidate`**: call `getDraftPixelsWithColor()` when in PAINT mode instead of `getDraftPixels()`, and pass colored pixels to `freezePayload`.

**In `handleConfirm`**: when building the commit payload for PAINT, pass `pixels` with per-pixel colors. Since the backend currently expects a single `color`, we need to send per-pixel colors in the pixels array.

---

### Layer 4 — Backend: `game-validate` and `game-commit` edge functions

Update both functions to accept **per-pixel colors**:

**`game-validate/index.ts`**: the pixels array can now include an optional `color` field per pixel. No structural change needed — validate doesn't use color to write to DB, only to compute cost.

**`game-commit/index.ts`**: update the `upsertData` build loop to use `pixel.color` (per-pixel) with a fallback to the top-level `color` field:

```ts
// BEFORE
upsertData.push({
  x: pixel.x,
  y: pixel.y,
  color: color!,   // ← same color for every pixel
  ...
});

// AFTER
upsertData.push({
  x: pixel.x,
  y: pixel.y,
  color: pixel.color ?? color!,  // ← per-pixel color, fallback to batch color
  ...
});
```

The `CommitRequest` interface is updated to accept `pixels: { x: number; y: number; color?: string }[]`.

---

### Summary of files changed

| File | Change |
|---|---|
| `src/components/map/hooks/useDraftPaint.ts` | Add `getDraftPixelsWithColor()` helper |
| `src/hooks/usePaintStateMachine.ts` | Update `FrozenPayload.pixels` type to include `color` |
| `src/components/map/BitplaceMap.tsx` | Use `getDraftPixelsWithColor()` in validate/commit flow |
| `supabase/functions/game-commit/index.ts` | Use per-pixel color with fallback in upsert loop |
| `supabase/functions/game-validate/index.ts` | Accept `color?` field on individual pixels in the request type |

### Backward compatibility

The backend change is fully backward compatible: if pixels don't have a per-pixel `color`, it falls back to the top-level `color` field. Existing single-color paint flows continue to work without any change.
