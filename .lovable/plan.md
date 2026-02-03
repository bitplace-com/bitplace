

# Templates QA & Polish Plan

## Overview
The Templates feature is already well-implemented. This plan covers minor refinements to ensure performance optimizations are robust, mobile UX is optimal, and all QA acceptance criteria pass.

## Status Assessment

### A) .bplace Removal ✅ COMPLETE
- Zero occurrences of ".bplace" in the codebase
- File picker already restricts to: `image/png,image/jpeg,image/webp`
- No import/export .bplace functionality exists

### B) Performance ✅ MOSTLY COMPLETE
Current implementation already handles:
- Quantization runs only on `mode`, `scale`, or `excludeSpecial` change
- Canvas overlay rendering (not DOM elements)
- Debounce at 300ms (within 250-400ms range)

**Minor improvements:**
1. Add explicit `useMemo` for quantized pixels with stable key
2. Move quantization result caching by `templateId + scale + excludeSpecial` key

### C) Mobile/Tablet ✅ COMPLETE
- `GlassSheet` component handles mobile as bottom drawer
- `GlassPanel` for desktop side panel
- Sliders already full-width in panel content

### D) UX Consistency ✅ COMPLETE
- Uses glassmorphism components with `glass-hud` variants
- Proper Day/Night theme tokens used throughout
- All controls use design system components

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/map/TemplateOverlay.tsx` | Optimize quantization with `useMemo` keyed to template properties |
| `src/components/map/BitplaceMap.tsx` | Wire move mode to pointer handlers for template dragging |

## Implementation Details

### 1. TemplateOverlay.tsx - Quantization Memoization

Replace `useState` + `useEffect` with `useMemo` for cleaner memoization:

```typescript
// Current: useEffect sets state when dependencies change
// Better: useMemo with stable key

const quantizedPixels = useMemo(() => {
  if (!imageLoaded || !imageRef.current || template.mode !== 'pixelGuide') {
    return [];
  }
  return quantizeImage(imageRef.current, template.scale, {
    excludeSpecial: template.excludeSpecial,
  });
}, [imageLoaded, template.mode, template.scale, template.excludeSpecial]);
```

This ensures:
- No unnecessary state updates
- Calculation only runs when dependencies actually change
- React's built-in memoization handles caching

### 2. BitplaceMap.tsx - Move Mode Integration

Wire the `isMoveMode` state to pointer handlers:

```typescript
// Add to pointer event handling section

// When move mode is active and user drags on map:
const handlePointerMove = useCallback((e: PointerEvent) => {
  if (!isMoveMode || !activeTemplateId || !mapRef.current) return;
  
  // Convert screen position to grid coordinates
  const point = mapRef.current.unproject([e.clientX, e.clientY]);
  const gridPos = lngLatToGridInt(point.lng, point.lat);
  
  // Update template position
  updatePosition(activeTemplateId, { x: gridPos.x, y: gridPos.y });
}, [isMoveMode, activeTemplateId, updatePosition]);

// Disable map pan when move mode active
useEffect(() => {
  if (!mapRef.current) return;
  const map = mapRef.current;
  
  if (isMoveMode) {
    map.dragPan.disable();
    map.getContainer().style.cursor = 'move';
  } else {
    map.dragPan.enable();
    map.getContainer().style.cursor = '';
  }
}, [isMoveMode]);
```

## QA Checklist Support

All items are already supported by the current implementation:

| Test | Code Support |
|------|--------------|
| Guest: add template → refresh → present | ✅ IndexedDB with `ownerKey="guest"` |
| Wallet A: add template → refresh → present | ✅ IndexedDB scoped by `walletAddress` |
| Switch wallet B → different list | ✅ `useEffect` on `ownerKey` change |
| Delete → gone after refresh | ✅ `templatesStore.deleteTemplate()` |
| Pixel Guide: scale changes → guideW/guideH update | ✅ `getGuideDimensions()` called in `useMemo` |
| Highlight selected color | ✅ `highlightSelectedColor` flag in overlay |
| Filter colors in palette | ✅ `filterPaletteColors` flag (UI-only) |

## Scope

This is a minimal refinement pass:
- ~20 lines changed in TemplateOverlay.tsx
- ~30 lines added in BitplaceMap.tsx for move mode
- No new files created
- No database changes

## Not in Scope

- Palette filtering in ActionTray (flag exists, wiring deferred)
- Web Worker for large images (current sync performance acceptable)
- Additional QA automation

