
## Mantenere l'ultimo strumento attivo quando si passa da Esplora a Crea

### Problema
Quando passi da modalita Crea a Esplora e poi torni su Crea, il sistema resetta sempre lo strumento a Pennello 1x, perdendo la selezione precedente (es. Gomma o Pennello 2x2).

### Causa
In `useMapState.ts` (riga 73-84), la funzione `setInteractionMode` forza `paintTool: 'BRUSH'` e `brushSize: '1x'` ogni volta che si entra in modalita `draw`.

### Soluzione
Rimuovere il reset forzato del tool e del brush size quando si passa a `draw`. Lo stato precedente (`paintTool`, `brushSize`, `selectedColor`) verra semplicemente mantenuto com'era.

### Dettagli tecnici

**File: `src/components/map/hooks/useMapState.ts`**

Modificare `setInteractionMode` (righe 73-84): rimuovere il blocco che resetta `paintTool`, `brushSize` e `selectedColor` quando `interactionMode === 'draw'`. Invece, ripristinare solo il `selectedColor` in base al tool corrente (se era ERASER rimane null, se era BRUSH rimane il lastBrushColor).

```typescript
// Prima (resetta tutto):
...(interactionMode === 'draw' ? {
  paintTool: 'BRUSH',
  brushSize: '1x',
  selectedColor: prev.lastBrushColor,
} : {}),

// Dopo (mantiene lo stato precedente):
...(interactionMode === 'draw' ? {
  selectedColor: prev.paintTool === 'ERASER' ? null : prev.lastBrushColor,
} : {}),
```

Questo garantisce che tornando in modalita Crea, lo strumento attivo (Pennello o Gomma) e la dimensione del pennello restino invariati.
