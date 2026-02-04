
# Template Overlay Fixes: Mode Switching, Performance, and Pixel Visibility

## Problems Identified

### 1. Mode Switching Bug
When switching from "Pixel Guide" back to "Image" mode, the image disappears because:
- The `quantizedPixels` useMemo returns `[]` when mode is not `pixelGuide`
- But the render functions aren't being triggered properly on mode change
- The imageRef might be stale after the mode switch

### 2. Performance Issue with Large Templates
Current rendering is slow because:
- Calls `gridIntToLngLat()` and `map.project()` for EVERY pixel (O(n) API calls)
- For 200x200 = 40,000 pixels, this becomes extremely laggy
- The Bplace reference remains smooth even with large templates

### 3. Pixels Too Small
Current implementation:
- Uses `pixelSize * 0.9` which becomes microscopic at low zoom
- Renders squares, not circles
- No minimum size enforcement

The Bplace reference (from screenshots):
- Renders large, visible **circles** filling ~70-80% of each grid cell
- Maintains consistent visual appearance at any zoom level
- Easy to identify which color to paint at each position

## Architecture Solution

The key insight from Bplace is that they use **grid-relative rendering** rather than per-pixel projection:

```text
Current (slow):                      Better (fast):
┌─────────────────┐                  ┌─────────────────┐
│ For each pixel: │                  │ Calculate once: │
│  - gridIntToLngLat()              │  - Anchor screen position
│  - map.project()  │               │  - Cell size from zoom
│  = O(n) slow API calls            │
└─────────────────┘                  │ Then for each pixel:
                                     │  - Simple math offset
                                     │  = O(n) fast arithmetic
                                     └─────────────────┘
```

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/map/TemplateOverlay.tsx` | Complete rewrite of Pixel Guide rendering |

## Implementation Details

### 1. Fix Mode Switching

The issue is that when switching modes, we need to ensure the image is re-rendered. Add the mode to the image render dependencies and clear canvas before rendering:

```typescript
// In renderOverlay, always render based on current mode
const renderOverlay = useCallback(() => {
  if (!imageLoaded || !map) return;
  
  const canvas = canvasRef.current;
  const ctx = canvas?.getContext('2d');
  if (canvas && ctx) {
    // Always clear canvas first
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  if (template.mode === 'pixelGuide') {
    renderPixelGuideMode();
  } else {
    renderImageMode();
  }
}, [imageLoaded, map, template.mode, renderImageMode, renderPixelGuideMode]);
```

### 2. Optimize Pixel Guide Rendering (Critical Performance Fix)

Replace the current per-pixel projection with grid-relative math:

```typescript
const renderPixelGuideMode = useCallback(() => {
  const canvas = canvasRef.current;
  const ctx = canvas?.getContext('2d');
  if (!canvas || !ctx || !map || quantizedPixels.length === 0) return;

  // Canvas setup (same as before)
  const container = map.getContainer();
  const width = container.clientWidth;
  const height = container.clientHeight;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);

  // === OPTIMIZATION: Calculate anchor position ONCE ===
  const zoom = map.getZoom();
  const cellSize = getCellSize(zoom);  // Use same function as CanvasOverlay
  
  // Get viewport top-left in float grid coords (same as CanvasOverlay)
  const tlLngLat = map.unproject([0, 0]);
  const tlGrid = lngLatToGridFloat(tlLngLat.lng, tlLngLat.lat);
  
  // Calculate screen position from grid coords (like CanvasOverlay does)
  // anchorScreenX = (template.positionX - tlGrid.x) * cellSize
  
  // Visible bounds for culling
  const brLngLat = map.unproject([width, height]);
  const brGrid = lngLatToGridInt(brLngLat.lng, brLngLat.lat);
  const topLeft = lngLatToGridInt(tlLngLat.lng, tlLngLat.lat);

  // Group pixels by color (batch rendering)
  const colorBatches = new Map<string, {dx: number, dy: number}[]>();
  
  for (const pixel of quantizedPixels) {
    const gridX = template.positionX + pixel.dx;
    const gridY = template.positionY + pixel.dy;
    
    // Quick bounds check (skip if off-screen)
    if (gridX < topLeft.x - 1 || gridX > brGrid.x + 1) continue;
    if (gridY < topLeft.y - 1 || gridY > brGrid.y + 1) continue;
    
    if (!colorBatches.has(pixel.hexColor)) {
      colorBatches.set(pixel.hexColor, []);
    }
    colorBatches.get(pixel.hexColor)!.push({ dx: pixel.dx, dy: pixel.dy });
  }

  // Render as CIRCLES (like Bplace reference)
  const baseOpacity = template.opacity / 100;
  const radius = cellSize * 0.4;  // 80% of cell diameter (0.4 radius = 0.8 diameter)
  
  colorBatches.forEach((positions, color) => {
    let alpha = baseOpacity * 0.85;
    if (highlightMode) {
      alpha = (color === highlightHex) ? baseOpacity : baseOpacity * 0.15;
    }
    
    ctx.fillStyle = color;
    ctx.globalAlpha = alpha;
    
    // Batch all circles of same color in one path for performance
    ctx.beginPath();
    for (const { dx, dy } of positions) {
      const gridX = template.positionX + dx;
      const gridY = template.positionY + dy;
      
      // Calculate screen position using GRID MATH (no map.project calls!)
      const screenX = (gridX - tlGrid.x) * cellSize + cellSize / 2;  // Center of cell
      const screenY = (gridY - tlGrid.y) * cellSize + cellSize / 2;
      
      ctx.moveTo(screenX + radius, screenY);
      ctx.arc(screenX, screenY, radius, 0, Math.PI * 2);
    }
    ctx.fill();
  });
  
  ctx.globalAlpha = 1;
}, [map, template, quantizedPixels, selectedColor]);
```

### 3. Pixel Size Like Bplace

The Bplace reference shows circles that:
- Fill approximately 70-80% of each cell
- Are clearly visible at any zoom level
- Use consistent proportions regardless of zoom

Implementation:
```typescript
// Circle radius = 40% of cell size (means 80% diameter)
const radius = cellSize * 0.4;

// Use ctx.arc() for circles instead of fillRect()
ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
```

## Performance Comparison

| Metric | Before | After |
|--------|--------|-------|
| API calls per frame | O(n) map.project() | O(1) unproject |
| Position calculation | gridIntToLngLat + project | Simple arithmetic |
| Rendering | fillRect per pixel | Batched path + fill |
| Expected improvement | - | 10-50x faster |

## Expected Behavior After Fix

1. **Mode switching**: Image mode renders correctly after switching from Pixel Guide
2. **Performance**: Smooth panning/zooming even with 200x200 pixel templates
3. **Visibility**: Large, clear circles showing exactly where to paint each color
4. **Consistency**: Same grid alignment as the actual pixel canvas (CanvasOverlay)

## Visual Reference from Bplace

Based on the screenshots provided:
- Circles fill most of the grid cell
- Colors are clearly distinguishable
- Even at low zoom, the pattern is visible
- At high zoom, each circle corresponds to one paintable pixel

