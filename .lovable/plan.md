

# Fix Preview: Cattura Mappa Reale + Tutti i Pixel

## Problemi

1. **Mappa sbagliata nello sfondo**: La preview usa tile raster OSM (`tile.openstreetmap.org/13/...`) ma la mappa reale usa OpenFreeMap Liberty (stile vettoriale completamente diverso). Risultato: colori diversi, scritte greche, rendering differente.
2. **Pixel mancanti**: La query usa `.limit(1000)` senza paginazione. Se l'area selezionata contiene piu di 1000 pixel, il disegno appare incompleto.

## Soluzione

### 1. Catturare la mappa reale come sfondo

Invece di scaricare tile OSM separatamente, **catturare il canvas di MapLibre** al momento della selezione. Il canvas gia mostra lo stile corretto (Liberty). 

Al `mouseup` del drag-to-select:
- Usare `map.getCanvas().toDataURL()` per ottenere uno screenshot della mappa
- Croppare l'immagine all'area del rettangolo di selezione (usando le coordinate `screenX`/`screenY` del drag start/end)
- Passare il data URL croppato come `mapSnapshot` nell'evento `bitplace:pin-placed`

Questo elimina completamente il problema dei tile OSM diversi.

**File: `src/components/map/BitplaceMap.tsx`**
- Nel `handleMouseUp`: dopo calcolo bbox, creare un canvas temporaneo, copiare la porzione selezionata dal canvas della mappa, convertire a `dataURL`
- Aggiungere `mapSnapshot: string` al detail dell'evento `bitplace:pin-placed`

### 2. Paginazione pixel fetch

Sostituire la query singola con `.limit(1000)` con un loop paginato usando `.range()`:

```
let allPixels = [];
let offset = 0;
while (true) {
  const { data } = await supabase.from('pixels')...range(offset, offset + 999);
  allPixels.push(...data);
  if (data.length < 1000) break;
  offset += 1000;
}
```

**File: `src/components/map/BitplaceMap.tsx`**
- Sostituire la query singola nel `handleMouseUp` con il loop paginato

### 3. ArtworkPreview usa lo snapshot

La `ArtworkPreview` in `CreatePlaceForm` riceve `mapSnapshot` come prop e lo disegna come sfondo invece di caricare tile OSM.

**File: `src/components/places/CreatePlaceForm.tsx`**
- Aggiungere prop `mapSnapshot?: string` a `CreatePlaceFormProps`
- `ArtworkPreview` riceve `mapSnapshot` e lo disegna come immagine di sfondo sul canvas (stretched per riempire), poi disegna i pixel sopra
- Rimuovere tutta la logica di caricamento tile OSM (`loadTile`, `OSM_ZOOM`, etc.)

### 4. PlaceThumbnail nelle card (feed)

Per le card nel feed, non abbiamo lo snapshot della mappa. Due opzioni:
- **Opzione A**: Salvare lo snapshot nel DB (troppo pesante)
- **Opzione B**: Usare uno sfondo semplice scuro senza mappa per le card nel feed, mostrando solo i pixel artwork

Scegliamo **Opzione B**: le card nel feed mostrano solo i pixel su sfondo scuro. Lo sfondo mappa reale e visibile solo nella preview di creazione dove possiamo catturarlo live.

**File: `src/components/places/PlaceThumbnail.tsx`**
- Rimuovere logica tile OSM
- Usare sfondo solido `hsl(var(--muted))` 
- Paginazione per il fetch pixel (loop `.range()`)
- Rendering pixel centrato con DPR corretto

### 5. PlacesModal passa mapSnapshot al form

**File: `src/components/modals/PlacesModal.tsx`**
- Estrarre `mapSnapshot` dal detail dell'evento `bitplace:pin-placed`
- Passarlo a `CreatePlaceForm` come prop

---

## File Modificati

| File | Modifica |
|------|----------|
| `src/components/map/BitplaceMap.tsx` | Cattura canvas MapLibre come snapshot, paginazione pixel fetch |
| `src/components/places/CreatePlaceForm.tsx` | ArtworkPreview usa mapSnapshot come sfondo, rimuove logica tile OSM |
| `src/components/places/PlaceThumbnail.tsx` | Rimuove tile OSM, sfondo solido, paginazione pixel fetch |
| `src/components/modals/PlacesModal.tsx` | Passa mapSnapshot dal pin-placed event al CreatePlaceForm |

## Dettagli Tecnici

### Cattura Canvas MapLibre

```js
// Nel handleMouseUp di BitplaceMap
const mapCanvas = map.getCanvas();
const cropCanvas = document.createElement('canvas');
const sx = Math.min(pinDragStart.screenX, e.point.x);
const sy = Math.min(pinDragStart.screenY, e.point.y);
const sw = Math.abs(e.point.x - pinDragStart.screenX);
const sh = Math.abs(e.point.y - pinDragStart.screenY);

// Account for DPR
const dpr = window.devicePixelRatio || 1;
cropCanvas.width = sw * dpr;
cropCanvas.height = sh * dpr;
const cropCtx = cropCanvas.getContext('2d');
cropCtx.drawImage(mapCanvas, sx * dpr, sy * dpr, sw * dpr, sh * dpr, 0, 0, sw * dpr, sh * dpr);
const mapSnapshot = cropCanvas.toDataURL('image/jpeg', 0.8);
```

### Paginazione Pixel

```js
const PAGE = 1000;
let allPixels = [];
let offset = 0;
let hasMore = true;
while (hasMore) {
  const { data } = await supabase.from('pixels')
    .select('x, y, color')
    .gte('x', bbox.xmin).lte('x', bbox.xmax)
    .gte('y', bbox.ymin).lte('y', bbox.ymax)
    .range(offset, offset + PAGE - 1);
  allPixels.push(...(data || []));
  hasMore = (data?.length || 0) === PAGE;
  offset += PAGE;
}
```

