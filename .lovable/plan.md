

# Fix: Icona sbagliata nel riepilogo ERASE

L'icona per "Pixel Balance after" usa `grid2x2` ma deve usare `pencil` (penna), coerente con la StatusStrip.

**File**: `src/components/map/inspector/ActionBox.tsx`, riga 241

```typescript
// Da:
<PixelIcon name="grid2x2" size="xs" />

// A:
<PixelIcon name="pencil" size="xs" />
```

Stessa modifica per qualsiasi altra riga nel file che usa `grid2x2` per indicare i pixel — verificare anche la riga "Pixels to erase" (dovrebbe usare `trash` che è già corretto).

