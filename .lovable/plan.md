

# Aggiornamento dominio a .com + Eliminazione righe griglia pixel

## Parte 1: Dominio bitplace.app -> bitplace.com

Aggiornare tutti i riferimenti da `bitplace.app` a `bitplace.com` in **13 file**:

### Frontend (2 file)
- `src/pages/TermsPage.tsx` -- email `contact@bitplace.com`
- `src/pages/PrivacyPage.tsx` -- email `contact@bitplace.com` (3 occorrenze)

### Edge Functions CORS (10 file)
Aggiornare `ALLOWED_ORIGINS` da `bitplace.app` a `bitplace.com` in:
- `auth-nonce`, `auth-verify`, `avatar-upload`, `energy-refresh`, `game-commit`, `game-validate`, `alliance-manage`, `notifications-manage`, `pe-status`, `user-update`

### Geocode User-Agent (1 file)
- `supabase/functions/geocode/index.ts` -- User-Agent URL

---

## Parte 2: Eliminare le righe della griglia tra i pixel

### Il problema
Nella screenshot si vedono chiaramente le linee della griglia che separano i pixel disegnati. Questo succede perche `roundToDevicePixel()` arrotonda ogni posizione indipendentemente, creando gap sub-pixel tra pixel adiacenti. Quando lo zoom cambia, questi gap appaiono e scompaiono a seconda dell'allineamento.

### La soluzione
Modificare il calcolo della dimensione di ogni cella in `CanvasOverlay.tsx` per usare **floor per la posizione di inizio** e **calcolare la dimensione come differenza tra la posizione arrotondata del pixel successivo e quella attuale**. In questo modo due pixel adiacenti condividono esattamente lo stesso bordo, eliminando qualsiasi gap.

```text
PRIMA (gap possibili):
  rx = round(screenX)
  ry = round(screenY)
  rSize = round(cellSize)    <-- costante, non si adatta

DOPO (nessun gap):
  rx = floor(screenX)
  ry = floor(screenY)
  rw = floor(screenX + cellSize) - rx   <-- si aggancia al prossimo pixel
  rh = floor(screenY + cellSize) - ry
```

Questa tecnica e chiamata "snap-to-next-pixel" ed e standard nel rendering di griglie su canvas. Il costo computazionale aggiuntivo e trascurabile (un `Math.floor` in piu per pixel).

### File da modificare

| File | Modifica |
|------|----------|
| `src/components/map/CanvasOverlay.tsx` | Sostituire `roundToDevicePixel` con logica floor-based per tutte le chiamate `fillRect` dei pixel (colori solidi, materiali, draft, erase preview). Mantenere `roundToDevicePixel` per gli overlay UI (selezione, hover, badge) dove la precisione al sub-pixel e desiderata. |
| `src/lib/pixelGrid.ts` | Nessuna modifica necessaria (la funzione `roundToDevicePixel` resta disponibile per altri usi) |

### Dettagli tecnici

Creare una helper inline o locale nel draw callback:

```typescript
// Snap pixel rect to device pixel grid ensuring no gaps
const pxFloor = (v: number) => Math.floor(v * dpr) / dpr;
```

Per ogni pixel renderizzato:
```typescript
const sx = pxFloor(screenX);
const sy = pxFloor(screenY);
const sw = pxFloor(screenX + cellSize) - sx;
const sh = pxFloor(screenY + cellSize) - sy;
ctx.fillRect(sx, sy, Math.max(1, sw), Math.max(1, sh));
```

Questo si applica a:
- Batch colori solidi (riga ~132-143)
- Batch materiali (riga ~148-160)
- Draft pixel colori solidi (riga ~188-196)
- Draft pixel materiali (riga ~200-208)

Gli overlay di selezione, hover, invalid e brush restano con `roundToDevicePixel` perche non hanno il problema dei gap (sono disegnati singolarmente con bordi).

### Risultato atteso
I disegni sulla mappa appariranno come blocchi pieni e continui senza righe visibili tra i pixel, a qualsiasi livello di zoom e durante le transizioni di zoom.
