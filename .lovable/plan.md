

# Piano di Correzione: Pixel Non Visibili sulla Mappa

## Problema Identificato

I pixel vengono salvati correttamente nel database (340 pixel, confermato) ma non vengono visualizzati sulla mappa dopo il refresh.

### Causa Radice

**Il limite predefinito di 1000 righe del Supabase API sta troncando i risultati:**

| Verificato | Valore |
|------------|--------|
| Pixel nel database (tile 2201:1495) | 2099 |
| Pixel restituiti dalla Edge Function | 1000 (troncati) |
| Pixel mancanti | 1099 |

La chiamata RPC `get_pixels_by_tiles` in `pixels-fetch-tiles` non specifica un limite, quindi PostgREST applica il limite predefinito di 1000 righe.

---

## Soluzione: Fetch Paginato con Loop

Modificare `pixels-fetch-tiles` per richiedere tutti i pixel usando paginazione:

### File: `supabase/functions/pixels-fetch-tiles/index.ts`

```typescript
// Fetch all pixels using pagination (bypass 1000 row limit)
const FETCH_PAGE_SIZE = 1000;
let allPixels: PixelRow[] = [];
let offset = 0;
let hasMore = true;

while (hasMore) {
  const { data, error } = await supabase
    .from('pixels')
    .select('id, x, y, color, tile_x, tile_y')
    .in('tile_x', tileXValues)
    .in('tile_y', tileYValues)
    .range(offset, offset + FETCH_PAGE_SIZE - 1);

  if (error) {
    console.error("Query error:", error);
    throw error;
  }

  allPixels = allPixels.concat(data || []);
  hasMore = (data?.length || 0) === FETCH_PAGE_SIZE;
  offset += FETCH_PAGE_SIZE;
}

const pixels = allPixels as PixelRow[];
```

### Vantaggi

| Aspetto | Prima | Dopo |
|---------|-------|------|
| Pixel per tile | Max 1000 | Illimitati |
| Query method | RPC call | Direct select con `.in()` |
| Paginazione | Nessuna | Automatica |

---

## Alternativa: Suddivisione Tile Più Piccoli

Se le performance diventano un problema con tile molto densi (>5000 pixel), possiamo:

1. Ridurre `DATA_TILE_SIZE` da 512 a 256 in `lib/pixelGrid.ts`
2. Questo riduce i pixel per tile (~4x meno dati per tile)
3. Ma aumenta il numero di richieste HTTP

Questa è un'ottimizzazione futura da valutare in base all'uso effettivo.

---

## File da Modificare

| File | Modifica |
|------|----------|
| `supabase/functions/pixels-fetch-tiles/index.ts` | Sostituire RPC con query paginata |

---

## Impatto Prestazionale

- **Prima**: 1 query RPC, max 1000 righe
- **Dopo**: N query paginate (N = ceil(pixel_count / 1000))
- Per 2099 pixel: 3 query invece di 1, ma nessun dato troncato

## Test di Verifica

1. Ricaricare la mappa sulla stessa area dove sono stati disegnati i 340 pixel
2. Verificare che tutti i pixel siano visibili (colore `#60f7f2`)
3. Verificare nei log che `pixelCount` restituito sia 2099 (tutti i pixel del tile)

