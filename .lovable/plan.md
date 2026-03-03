

# Fix auto-paint to use exact image colors + fix swatch selection border

## Problem 1: Auto-paint uses palette colors
`quantizeImageAsync` maps every pixel to the nearest Bitplace palette color. Auto-paint feeds from `templateQuantizedPixels` (output of this function), so painted pixels use palette colors instead of the image's actual colors.

## Problem 2: White swatch selection border
The `ring-2 ring-foreground` selection indicator looks broken on light-colored swatches (especially white) because there's no base border/shadow to provide contrast.

## Changes

### `src/lib/paletteQuantizer.ts`
Add `quantizeImageRawAsync` — identical to `quantizeImageAsync` but skips palette matching, using the pixel's actual `#RRGGBB` hex as `hexColor`. This gives auto-paint the exact image colors.

### `src/components/map/TemplateOverlay.tsx`
- Add a second quantization effect that runs `quantizeImageRawAsync` when in pixelGuide mode
- Expose via new callback prop `onRawQuantizedPixelsChange?: (pixels: QuantizedPixel[]) => void`
- Keep the palette-quantized version for the guide overlay rendering (visual circles on map still snap to palette for consistency with manual painting)

### `src/components/map/BitplaceMap.tsx`
- Add `templateRawQuantizedPixels` state
- Pass it to `TemplateOverlay` via the new callback
- Change `handleAutoPaint` to use `templateRawQuantizedPixels` instead of `templateQuantizedPixels`

### `src/components/map/ActionTray.tsx`
- Add `shadow-[inset_0_0_0_1px_rgba(0,0,0,0.15)]` (or `ring-1 ring-black/10`) as a base style on all color swatches in the "From template" and "Recent" sections so light colors (white) have a visible boundary
- The selection indicator `ring-2 ring-foreground` then sits cleanly on top

| File | Change |
|------|--------|
| `src/lib/paletteQuantizer.ts` | Add `quantizeImageRawAsync` (no palette mapping) |
| `src/components/map/TemplateOverlay.tsx` | Run raw quantization, expose via new callback |
| `src/components/map/BitplaceMap.tsx` | Wire raw quantized pixels to auto-paint |
| `src/components/map/ActionTray.tsx` | Fix swatch borders for light colors |

