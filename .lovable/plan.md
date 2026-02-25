

## Tre fix: rimuovere ID cooldown, icona empty-state Places, e thumbnail pixel art

### 1. Rimuovere l'ID dal messaggio di cooldown

Nel pannello di azione (inspector), quando appare l'errore di cooldown, sotto al messaggio viene mostrato anche l'ID della richiesta (es. `ID: b0daeb69-...`). Questo dato tecnico non serve all'utente.

**File: `src/components/map/inspector/ActionBox.tsx`**
- Rimuovere le righe 280-284 che mostrano il `requestId` sotto al messaggio di errore. Il messaggio di errore resta visibile, solo l'ID viene eliminato.

### 2. Icona rotta nello stato vuoto "No saved places yet"

L'icona `map` usata nello stato vuoto della lista Places non viene renderizzata correttamente.

**File: `src/components/modals/PlacesModal.tsx`**
- Riga 156: sostituire `name="map"` con `name="locationPin"` - semanticamente piu appropriato per le Pinned Locations e garantito funzionante dal registry delle icone custom pixel-art.

### 3. Thumbnail delle Places con pixel "spezzati"

Il rendering dei pixel nella thumbnail delle Places mostra gap visibili tra i pixel (stessa problematica che era stata risolta nel CanvasOverlay principale). Il problema e che `PlaceThumbnail` usa `Math.max(cellSize, 1)` come dimensione fissa per ogni pixel, senza la tecnica "snap-to-next-pixel".

**File: `src/components/places/PlaceThumbnail.tsx`**
- Nella funzione `drawPixels` (righe 146-153), applicare la stessa tecnica usata in `CanvasOverlay`:
  - La posizione di ogni pixel viene calcolata con `Math.floor()` 
  - La dimensione viene calcolata come differenza tra la posizione floor del pixel successivo e quella attuale
  - Questo elimina i gap sub-pixel tra pixel adiacenti

```typescript
// Prima (con gap):
const px = offsetX + (pixel.x - viewXmin) * scale;
const py = offsetY + (pixel.y - viewYmin) * scale;
ctx.fillRect(px, py, Math.max(cellSize, 1), Math.max(cellSize, 1));

// Dopo (snap-to-next-pixel, senza gap):
const px = Math.floor(offsetX + (pixel.x - viewXmin) * scale);
const py = Math.floor(offsetY + (pixel.y - viewYmin) * scale);
const pw = Math.floor(offsetX + (pixel.x - viewXmin + 1) * scale) - px;
const ph = Math.floor(offsetY + (pixel.y - viewYmin + 1) * scale) - py;
ctx.fillRect(px, py, pw, ph);
```

