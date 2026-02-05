
# Quick Settings Polish: Tooltips, Palette Filtering, and Cleanup

## Overview
Complete the Quick Settings toggles with full functionality, add info tooltips for each toggle, wire palette filtering to ActionTray, and remove the unnecessary "Exclude special colors" toggle.

## Changes Summary

### 1. Remove "Exclude special colors" toggle
As you noted, images use standard RGB colors and the Bitplace palette quantizer already maps them to the closest available palette colors. The `excludeSpecial` option was designed to filter out material/special colors, but since:
- ALL_COLORS already contains only the standard palette
- Materials are stored separately in the MATERIALS registry
- The current implementation checks for `MAT_` prefix which doesn't apply to hex colors

This toggle serves no purpose and should be removed.

### 2. Add Info Tooltips to Quick Settings
Each toggle will have an info icon that shows a tooltip explaining its function:
- Desktop: hover to see tooltip
- Mobile: tap to see tooltip (using Radix Tooltip's built-in touch support)

| Toggle | Tooltip Text |
|--------|-------------|
| Highlight selected color | Shows only the selected palette color at full opacity, dimming others to help you focus on painting one color at a time |
| Filter palette colors | Shows only the colors used in the template in the color palette, making it faster to pick the right color |
| Show above pixels | Displays the template overlay above painted pixels instead of behind them |

### 3. Wire Palette Filtering to ActionTray
When `filterPaletteColors` is active, the ActionTray will receive the list of colors used in the template and filter its palette accordingly.

**Data flow:**
```
TemplateOverlay → quantizedPixels → getGuideColors() → BitplaceMap → ActionTray.templateGuideColors
```

### 4. Performance (already optimized)
The current implementation is already lightweight:
- Image mode: single drawImage call with grid-relative math
- Pixel Guide: O(1) projection + batched canvas drawing
- No DOM elements for pixels
- 300ms debounce for IndexedDB

## Files to Modify

| File | Changes |
|------|---------|
| `src/lib/templatesStore.ts` | Remove `excludeSpecial` from TemplateSettings |
| `src/hooks/useTemplates.ts` | Remove `excludeSpecial` from Template interface |
| `src/components/map/TemplateDetailView.tsx` | Remove "Exclude special colors" toggle, add Tooltip info icons |
| `src/lib/paletteQuantizer.ts` | Remove `excludeSpecial` option (simplify) |
| `src/components/map/TemplateOverlay.tsx` | Remove `excludeSpecial` usage, export guide colors |
| `src/components/map/BitplaceMap.tsx` | Pass template guide colors to ActionTray |
| `src/components/map/ActionTray.tsx` | Add `templateGuideColors` prop, filter palette when active |

## Implementation Details

### TemplateDetailView.tsx - Info Tooltips
Add info icon buttons next to each toggle label:

```tsx
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';

// In Quick Settings content:
<div className="flex items-center justify-between">
  <div className="flex items-center gap-1.5">
    <label className="text-sm text-muted-foreground">Highlight selected color</label>
    <Tooltip>
      <TooltipTrigger asChild>
        <button className="text-muted-foreground/60 hover:text-muted-foreground">
          <PixelIcon name="info" size="xs" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[200px]">
        Shows only the selected palette color at full opacity, dimming others to help you focus on painting one color at a time
      </TooltipContent>
    </Tooltip>
  </div>
  <Switch ... />
</div>
```

### ActionTray Palette Filtering
Add new props and filter logic:

```tsx
interface ActionTrayProps {
  // ... existing
  templateGuideColors?: string[];  // Colors used in active template
  filterToGuideColors?: boolean;   // Whether to filter palette
}

// In palette rendering:
const displayColors = filterToGuideColors && templateGuideColors?.length 
  ? ALL_COLORS.filter(c => templateGuideColors.includes(c.toUpperCase()))
  : ALL_COLORS;
```

### BitplaceMap - Pass Guide Colors
Compute guide colors from TemplateOverlay and pass to ActionTray:

```tsx
// Compute guide colors when template is in pixelGuide mode
const templateGuideColors = useMemo(() => {
  if (!activeTemplate || activeTemplate.mode !== 'pixelGuide') return [];
  // Will need to expose quantized data or compute here
  return []; // Implementation detail
}, [activeTemplate]);

<ActionTray
  // ... existing props
  templateGuideColors={templateGuideColors}
  filterToGuideColors={activeTemplate?.filterPaletteColors ?? false}
/>
```

## Toggle Behavior Summary

| Toggle | Effect |
|--------|--------|
| **Highlight selected color** | In Pixel Guide mode, selected color = full opacity, others = 15% opacity |
| **Filter palette colors** | ActionTray shows only colors used in the Pixel Guide (e.g., 8 colors instead of 64) |
| **Show above pixels** | Template z-index switches from z-[4] to z-[6], appearing above painted pixels |

## Schema Change
The `excludeSpecial` field will be removed from:
- `TemplateSettings` interface in templatesStore.ts
- `Template` interface in useTemplates.ts
- `DEFAULT_SETTINGS` in templatesStore.ts

Existing records in IndexedDB will simply ignore the now-unused field (backward compatible).
