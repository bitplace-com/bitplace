

# Fix Thumbnail con Mappa + PE Styling

## Problemi

1. **Thumbnail sgranata**: Il canvas ha dimensioni fisse inline (`style={{ width: 400, height: 128 }}`) che sovrascrivono `w-full`, causando overflow o scaling scorretto. Inoltre non c'e sfondo mappa -- solo rettangoli colorati su grigio.
2. **PE row**: Ha un sfondo `bg-muted/30` indesiderato. L'utente vuole testo semplice con colore verde per il valore USD.

## Soluzione

### 1. PlaceThumbnail con sfondo mappa (come Bplace)

Il grid di Bitplace usa `GRID_ZOOM=12` con `TILE_SIZE=512`, quindi la risoluzione totale e `512 * 2^12 = 2,097,152 px`. Questo corrisponde esattamente ai tile raster OSM a zoom 13 (`256 * 2^13 = 2,097,152`).

Quindi: **1 pixel grid = 1 pixel tile OSM a zoom 13**.

Per ogni bbox:
- Calcolare quali tile OSM a zoom 13 coprono l'area: `tileX = floor(gridX / 256)`, `tileY = floor(gridY / 256)`
- Caricare le immagini tile da `https://tile.openstreetmap.org/13/{tx}/{ty}.png`
- Disegnare i tile come sfondo sul canvas
- Disegnare i pixel artwork sopra

**File: `src/components/places/PlaceThumbnail.tsx`**

Modifiche:
- Rimuovere `style={{ width, height }}` dal container. Usare solo CSS (`w-full`, `aspect-[3/1]` o altezza fissa via className)
- Il canvas misura il container con `ResizeObserver` o semplicemente usa `containerRef.current.clientWidth/clientHeight`
- Prima disegna i tile OSM come sfondo, poi i pixel artwork sopra
- I tile vengono caricati con `new Image()` e `crossOrigin = "anonymous"`
- Cache dei tile gia caricati per evitare ri-download

### 2. PlaceThumbnail responsive

Rimuovere le prop `width`/`height` fisse. Il componente si adatta al suo container:

```text
Container (w-full, h-40 via className)
  -> Canvas (absolute inset-0, si adatta)
```

Da PlaceCard passare solo `className="w-full h-40 rounded-t-xl rounded-b-none"` senza width/height.

### 3. PE e USD senza sfondo, $ in verde

**File: `src/components/places/PlaceCard.tsx`**

Cambiare la riga PE da:
```
<div className="... bg-muted/30 rounded-md px-2 py-1">
```
A:
```
<div className="flex items-center gap-1.5">
  <PEIcon size="sm" className="text-foreground/70" />
  <span className="text-sm font-semibold tabular-nums">
    {total_pe.toLocaleString()} PE
  </span>
  <span className="text-xs font-medium text-emerald-500">
    ${(total_pe / PE_PER_USD).toFixed(2)}
  </span>
</div>
```

Nessuno sfondo, testo semplice, dollaro in verde emerald.

### 4. CreatePlaceForm ArtworkPreview

Stesso fix per la preview nel form di creazione: usare tile OSM come sfondo dietro i pixel dell'artwork, cosi l'utente vede esattamente come apparira il pin con la mappa dietro.

---

## File Modificati

| File | Modifica |
|------|----------|
| `src/components/places/PlaceThumbnail.tsx` | Sfondo mappa OSM tiles, responsive (no width/height fissi), DPR corretto |
| `src/components/places/PlaceCard.tsx` | PE row senza sfondo, USD in verde emerald |
| `src/components/places/CreatePlaceForm.tsx` | ArtworkPreview con sfondo mappa OSM tiles |

