
# Templates Feature: Complete Implementation Plan

## Overview
Transform the Templates MVP into a full-featured tool with detail view, position/transform controls, tabs for Image vs Pixel Guide rendering, and Quick Settings. The Pixel Guide mode will quantize image pixels to the closest Bitplace palette colors.

## Architecture

```text
+----------------------------+
|    TemplatesPanel.tsx      |
|  (list OR detail view)     |
+-----------+----------------+
            |
    +-------+--------+
    |                |
+---v----+     +-----v------+
| List   |     | Detail     |
| View   |     | View       |
+---------+    | - Position |
               | - Move     |
               | - Transform|
               | - Tabs     |
               | - Settings |
               +------+-----+
                      |
            +---------+---------+
            |                   |
    +-------v-------+  +--------v-------+
    | Image Mode    |  | Pixel Guide    |
    | (raw overlay) |  | (quantized)    |
    +---------------+  +----------------+
```

## Database Schema Update

Extend `TemplateSettings` in IndexedDB to include new fields:

| Field | Type | Description |
|-------|------|-------------|
| `rotation` | number | 0-360 degrees |
| `mode` | 'image' \| 'pixelGuide' | Render mode |
| `highlightSelectedColor` | boolean | Show only selected color at full opacity |
| `filterPaletteColors` | boolean | Filter palette to guide colors |
| `showAbovePixels` | boolean | Render overlay above committed pixels |
| `excludeUnlocked` | boolean | Skip locked colors during quantization |
| `excludeSpecial` | boolean | Skip material/special colors |

## Files to Create

| File | Description |
|------|-------------|
| `src/lib/paletteQuantizer.ts` | Color quantization logic: finds nearest palette color |
| `src/components/map/TemplateDetailView.tsx` | Detail panel UI with all controls |

## Files to Modify

| File | Changes |
|------|---------|
| `src/lib/templatesStore.ts` | Add new settings fields + migration logic |
| `src/hooks/useTemplates.ts` | Add `updateSettings()`, expose new fields, add rotation/mode/settings |
| `src/components/map/TemplatesPanel.tsx` | Add detail view with back navigation, tabs, controls |
| `src/components/map/TemplateOverlay.tsx` | Support rotation, two render modes (Image/Pixel Guide), z-order toggle |
| `src/components/map/BitplaceMap.tsx` | Pass template settings to ActionTray for palette filtering, wire move mode |
| `src/components/map/ActionTray.tsx` | Accept `templateGuideColors` prop to filter/highlight palette |

## Implementation Details

### 1. paletteQuantizer.ts (New File)

Color distance and nearest palette lookup:

```typescript
interface QuantizedPixel {
  dx: number;      // Offset from anchor (0 to guideW-1)
  dy: number;      // Offset from anchor (0 to guideH-1)
  hexColor: string;
}

interface QuantizeOptions {
  excludeUnlocked?: boolean;
  excludeSpecial?: boolean;
  unlockedColors?: string[];  // Colors the user has unlocked
}

// Euclidean RGB distance
function colorDistance(c1: RGB, c2: RGB): number;

// Find nearest palette color
function nearestPaletteColor(
  rgb: RGB, 
  palette: string[],
  options?: QuantizeOptions
): string;

// Main quantization function
function quantizeImage(
  imageData: ImageData,
  scale: number,     // 1-400% 
  options?: QuantizeOptions
): QuantizedPixel[];

// Extract unique colors from guide
function getGuideColors(pixels: QuantizedPixel[]): string[];
```

Performance target: quantize 500x500 image in <100ms using web worker if needed.

### 2. TemplateSettings Schema Update

```typescript
interface TemplateSettings {
  visible: boolean;
  x: number;
  y: number;
  scale: number;        // 1-400
  opacity: number;      // 0-100
  rotation: number;     // 0-360 degrees
  mode: 'image' | 'pixelGuide';
  
  // Quick settings
  highlightSelectedColor: boolean;
  filterPaletteColors: boolean;
  showAbovePixels: boolean;
  excludeUnlocked: boolean;
  excludeSpecial: boolean;
}
```

### 3. TemplatesPanel.tsx - Detail View

When a template is selected, show detail view instead of list:

**Header:**
- Back arrow (returns to list)
- Thumbnail + name + dimensions badge (e.g. "202 / 202" for guide dimensions)
- Delete button

**Tabs:** [Image] [Pixel Guide]
- Switch between render modes

**Position Section:**
- Label: "Position"
- Two number inputs: X and Y (grid coordinates)
- "Recenter" button: centers viewport on template OR template on viewport center

**Move Button:**
- Toggle button: when active, dragging on map moves template (not map pan)
- Visual indicator (active state)

**Transform Section:**
- Scale slider: 1-400% with live value display
- Opacity slider: 0-100% with live value display
- Rotation slider: 0-360 degrees (or -180 to 180)

**Guide Dimensions (Pixel Guide mode only):**
- Show computed size: `guideW x guideH` or "202 / 202"
- Updates live when scale changes

**Quick Settings (Collapsible or dropdown menu):**
- Toggle: "Highlight selected color" - emphasize current palette color in guide
- Toggle: "Filter colors when painting" - filter ActionTray palette to guide colors
- Toggle: "Show template above pixels" - z-order control
- Toggle: "Exclude not unlocked colors" - quantization filter
- Toggle: "Exclude special colors" - skip materials in quantization

### 4. TemplateOverlay.tsx - Dual Render Modes

**Image Mode (existing, enhanced):**
- Apply rotation transform around image center
- Use anchor (x, y) as top-left grid coordinate
- `ctx.rotate(rotation * Math.PI / 180)` after translating to center

**Pixel Guide Mode (new):**
- On image load or scale/settings change: run quantization
- Cache quantized pixels in `useMemo` with dependency on scale, excludes, etc.
- Render each pixel as a small square at grid position:
  ```
  for each {dx, dy, hexColor}:
    gridX = anchorX + dx
    gridY = anchorY + dy
    screenPos = mapProject(gridIntToLngLat(gridX, gridY))
    fillRect at screenPos with hexColor
  ```
- Apply opacity (e.g., 0.6-0.7) to differentiate from real paints
- If `highlightSelectedColor` active:
  - Full opacity for pixels matching `selectedColor`
  - Very low opacity (0.15) for other pixels

**z-order toggle (showAbovePixels):**
- If true: z-index higher than CanvasOverlay (z-[6] instead of z-[4])
- If false: z-index lower or same as CanvasOverlay

**Rotation rendering:**
```typescript
ctx.translate(centerX, centerY);
ctx.rotate(rotation * Math.PI / 180);
ctx.translate(-centerX, -centerY);
// Draw image/pixels
```

### 5. Move Mode Integration

Add new state to useTemplates: `isMoveMode: boolean`

When Move mode active:
1. Template overlay gets `pointer-events: auto` on a drag handle layer
2. Or: BitplaceMap intercepts drag and updates template position
3. Map dragPan disabled during move
4. Mouse cursor: 'move'

Implementation approach (in BitplaceMap):
```typescript
// When isMoveMode and drag on map:
const handleTemplateMove = (e: MouseEvent) => {
  const gridPos = lngLatToGridInt(map.unproject([e.clientX, e.clientY]));
  updatePosition(activeTemplateId, { x: gridPos.x, y: gridPos.y });
};
```

### 6. ActionTray Palette Integration

New props for ActionTray:
```typescript
interface ActionTrayProps {
  // ... existing
  templateGuideColors?: string[];  // Colors in active guide
  highlightTemplateColor?: boolean; // Highlight active color in guide
  filterToGuideColors?: boolean;    // Show only guide colors
}
```

When `filterToGuideColors` is active:
- `ALL_COLORS.filter(c => templateGuideColors.includes(c))`
- Show a toggle/chip to disable filter and see full palette

When painting and `highlightTemplateColor` is active:
- In TemplateOverlay, only the currently selected color is shown at full opacity

### 7. Recenter Logic

Two interpretations (implement both, let user choose or smart default):
1. **Center viewport on template:** `map.flyTo({ center: gridIntToLngLat(template.x, template.y) })`
2. **Move template to viewport center:** 
   ```typescript
   const center = map.getCenter();
   const gridCenter = lngLatToGridInt(center.lng, center.lat);
   updatePosition(id, { x: gridCenter.x, y: gridCenter.y });
   ```

Implement as: single "Recenter" button that moves template to current viewport center (more intuitive for placing).

## Data Flow

```text
User loads template
     |
     v
+----+-----+
| IndexedDB|---> Blob + Settings
+----+-----+
     |
     v
useTemplates hook
     |
     +---> objectUrl (for Image mode)
     |
     +---> quantizedPixels (for Pixel Guide, computed on scale/settings change)
     |
     v
TemplateOverlay
     |
     +---> mode === 'image': draw image with transforms
     |
     +---> mode === 'pixelGuide': draw pixel grid with palette colors
```

## Performance Considerations

1. **Quantization caching:** Memoize quantized pixel array, recompute only on:
   - Scale change
   - Exclude toggles change
   - Image source change

2. **Efficient guide rendering:**
   - Batch by color (like CanvasOverlay does)
   - Skip pixels outside viewport
   - Use single canvas draw call with fillRect batching

3. **Debounce slider updates:**
   - Scale/opacity/rotation: 100ms debounce for IndexedDB
   - Immediate visual update (optimistic)

4. **Worker for large images:**
   - If image > 1024x1024, consider OffscreenCanvas or Web Worker for quantization
   - For MVP: synchronous is acceptable for images up to 500x500

## Mobile Considerations

- All controls fit in GlassSheet drawer
- Sliders have touch-friendly size (already handled by existing Slider component)
- Move mode works with touch drag
- Tabs and toggles are touch-friendly

## Checklist

- [ ] Create `paletteQuantizer.ts` with color distance and quantization functions
- [ ] Extend `TemplateSettings` interface with new fields
- [ ] Update `templatesStore.ts` with migration for new fields
- [ ] Create `TemplateDetailView.tsx` component
- [ ] Update `TemplatesPanel.tsx` with list/detail view switching
- [ ] Update `useTemplates.ts` with rotation, mode, quick settings
- [ ] Update `TemplateOverlay.tsx` with Pixel Guide rendering and rotation
- [ ] Implement Move mode in `BitplaceMap.tsx`
- [ ] Add palette filtering to `ActionTray.tsx`
- [ ] Test quantization performance
- [ ] Verify Day/Night theme compatibility
- [ ] Mobile drawer testing

## File Summary

| File | Action |
|------|--------|
| `src/lib/paletteQuantizer.ts` | Create |
| `src/components/map/TemplateDetailView.tsx` | Create |
| `src/lib/templatesStore.ts` | Modify |
| `src/hooks/useTemplates.ts` | Modify |
| `src/components/map/TemplatesPanel.tsx` | Modify (major) |
| `src/components/map/TemplateOverlay.tsx` | Modify (major) |
| `src/components/map/BitplaceMap.tsx` | Modify |
| `src/components/map/ActionTray.tsx` | Modify |
