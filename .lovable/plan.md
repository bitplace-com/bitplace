

# Extract exact image colors for Custom tab

## Problem
`TemplateOverlay` uses `quantizeImageAsync` which maps every pixel to the nearest **palette** color. The "From template" section in Custom tab therefore only shows palette colors, never the actual image colors.

## Fix

### 1. `src/lib/paletteQuantizer.ts` — Add `extractImageColors`
New function that reads raw pixel data from the image, counts color frequency, and returns the top N most-used exact hex colors (e.g. top 50). No palette matching. Uses the existing `prepareImageData` helper.

```ts
export async function extractImageColors(
  image: HTMLImageElement,
  maxColors?: number // default 50
): Promise<string[]>
```

Logic: draw image to small canvas (~200px wide for speed), read pixels, build frequency map of `#RRGGBB`, sort by count descending, return top N. Optionally merge very similar colors (delta < 10) to avoid near-duplicates.

### 2. `src/components/map/TemplateOverlay.tsx` — Extract raw colors
- Add a new effect that runs `extractImageColors` when image loads (regardless of mode — works in both image and pixelGuide mode)
- Pass result up via a new prop `onRawColorsChange?: (colors: string[]) => void`

### 3. `src/components/map/BitplaceMap.tsx` — Wire new prop
- Add `templateRawColors` state, pass setter to `TemplateOverlay`, pass value to `ActionTray` as `templateGuideColors` (replacing the palette-quantized version)

### Result
The "From template" section in Custom tab will show the **actual dominant colors** from the uploaded image, sorted by how frequently they appear.

| File | Change |
|------|--------|
| `src/lib/paletteQuantizer.ts` | Add `extractImageColors` function |
| `src/components/map/TemplateOverlay.tsx` | Call `extractImageColors`, expose via new callback prop |
| `src/components/map/BitplaceMap.tsx` | Wire raw colors to ActionTray instead of palette-quantized colors |

