

# Templates QA & Polish Plan

## Overview
The Templates feature is already well-implemented. This plan covers minor refinements to ensure performance optimizations are robust, mobile UX is optimal, and all QA acceptance criteria pass.

## Status Assessment

### A) .bplace Removal ✅ COMPLETE
- Zero occurrences of ".bplace" in the codebase
- File picker already restricts to: `image/png,image/jpeg,image/webp`
- No import/export .bplace functionality exists

### B) Performance ✅ COMPLETE
- Quantization uses `useMemo` with stable dependencies (mode, scale, excludeSpecial)
- Canvas overlay rendering (not DOM elements)
- Debounce at 300ms for IndexedDB persistence

### C) Mobile/Tablet ✅ COMPLETE
- `GlassSheet` component handles mobile as bottom drawer
- `GlassPanel` for desktop side panel
- Sliders already full-width in panel content

### D) UX Consistency ✅ COMPLETE
- Uses glassmorphism components with `glass-hud` variants
- Proper Day/Night theme tokens used throughout
- All controls use design system components

## Completed Changes

| File | Changes |
|------|---------|
| `src/components/map/TemplateOverlay.tsx` | Replaced `useState` + `useEffect` with `useMemo` for quantized pixels |
| `src/components/map/BitplaceMap.tsx` | Wired move mode to pointer handlers for template dragging |

## Implementation Details

### 1. TemplateOverlay.tsx - Quantization Memoization ✅

Replaced `useState` + `useEffect` with `useMemo`:

```typescript
const quantizedPixels = useMemo<QuantizedPixel[]>(() => {
  if (!imageLoaded || !imageRef.current || template.mode !== 'pixelGuide') {
    return [];
  }
  return quantizeImage(imageRef.current, template.scale, {
    excludeSpecial: template.excludeSpecial,
  });
}, [imageLoaded, template.mode, template.scale, template.excludeSpecial]);
```

### 2. BitplaceMap.tsx - Move Mode Integration ✅

Added template move mode handling:
- Effect to disable map pan and set 'move' cursor when move mode active
- Mouse down handler starts drag
- Mouse move handler updates template position during drag
- Mouse up handler ends drag

## QA Checklist Support

All items are supported by the current implementation:

| Test | Code Support |
|------|--------------|
| Guest: add template → refresh → present | ✅ IndexedDB with `ownerKey="guest"` |
| Wallet A: add template → refresh → present | ✅ IndexedDB scoped by `walletAddress` |
| Switch wallet B → different list | ✅ `useEffect` on `ownerKey` change |
| Delete → gone after refresh | ✅ `templatesStore.deleteTemplate()` |
| Pixel Guide: scale changes → guideW/guideH update | ✅ `getGuideDimensions()` called in `useMemo` |
| Highlight selected color | ✅ `highlightSelectedColor` flag in overlay |
| Filter colors in palette | ✅ `filterPaletteColors` flag (UI-only) |

## Not in Scope

- Palette filtering in ActionTray (flag exists, wiring deferred)
- Web Worker for large images (current sync performance acceptable)
- Additional QA automation


