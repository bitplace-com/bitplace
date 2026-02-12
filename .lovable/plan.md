

# Fix Pin Placement: Selezione Area Rettangolare

## Problema

L'auto-detection artwork via Union-Find produce risultati scadenti: il bbox e troppo grande, i pixel sono sub-pixel nella preview, e la mappa di sfondo non si allinea. L'utente non ha controllo su cosa viene catturato.

## Soluzione

Cambiare il flusso: l'utente **trascina un rettangolo** sulla mappa per definire l'area da pinnare. Il sistema poi:
1. Fetcha tutti i pixel nell'area selezionata
2. Calcola il bbox dall'area disegnata
3. Genera la preview con mappa OSM di sfondo + pixel artwork sopra

### Nuovo Flusso UX

1. Click "Place a Pin on Map" -> chiude pannello
2. Banner overlay: "Click and drag to select an area"
3. L'utente clicca e trascina -> appare un rettangolo semi-trasparente sulla mappa
4. Al rilascio del mouse: il sistema converte le coordinate in pixel grid, fetcha i pixel nell'area, e riapre il form con la preview
5. ESC o Cancel per annullare

### Implementazione

**`BitplaceMap.tsx`** -- Riscrivere il handler pin-placement:

- Al `mousedown`/`touchstart`: registrare il punto iniziale in coordinate LngLat e grid
- Al `mousemove`/`touchmove`: aggiornare il rettangolo visuale (overlay CSS o canvas)
- Al `mouseup`/`touchend`: calcolare bbox grid dai due angoli, fetchare pixel nell'area dal DB, emettere `bitplace:pin-placed`
- Disabilitare `dragPan` durante il trascinamento (come gia fatto per template move mode)
- Mostrare un rettangolo di selezione con bordo tratteggiato bianco e sfondo semi-trasparente

Rimuovere tutta la logica Union-Find dal pin placement. Non serve piu: l'utente decide l'area.

La query pixel diventa semplicemente:
```sql
SELECT x, y, color FROM pixels 
WHERE x >= bbox.xmin AND x <= bbox.xmax 
  AND y >= bbox.ymin AND y <= bbox.ymax 
LIMIT 1000
```

**`PlaceThumbnail.tsx`** -- Nessuna modifica logica, il componente gia funziona con bbox + pixel fetch. Il problema attuale e che i bbox dall'Union-Find sono troppo grandi. Con la selezione manuale, i bbox saranno ragionevoli e le preview funzioneranno.

**`CreatePlaceForm.tsx` `ArtworkPreview`** -- Stesso: nessuna modifica necessaria, il componente gia renderizza correttamente quando il bbox e ragionevole.

**`PlaceCard.tsx`** -- Rimuovere lo sfondo dalla riga PE/USD. Layout semplice:
```
[PEIcon] 1,250 PE  $1.25 (verde)
```
Senza wrapper con sfondo, solo flex items inline.

## File Modificati

| File | Modifica |
|------|----------|
| `src/components/map/BitplaceMap.tsx` | Sostituire click-to-detect con drag-to-select rectangle. Rimuovere Union-Find. Aggiungere overlay rettangolo selezione visuale. Disabilitare dragPan durante selezione. |
| `src/components/places/PlaceCard.tsx` | Semplificare riga PE: nessun wrapper sfondo, solo testo inline |

## Dettagli Tecnici

### Rettangolo Overlay sulla Mappa

Un `div` assolutamente posizionato sopra la mappa con:
- `border: 2px dashed white`
- `background: rgba(255,255,255,0.1)`
- Coordinate calcolate da `map.project(lngLat)` per convertire da LngLat a pixel schermo
- Aggiornato via state React durante il drag

### Conversione Coordinate

Al `mousedown`: `map.unproject(point)` -> `lngLatToGridInt()` per il primo angolo.
Al `mouseup`: stesso per il secondo angolo. I due punti definiscono il bbox grid.

### Disabilitare Pan durante Drag

```js
map.dragPan.disable();
// ... al termine
map.dragPan.enable();
```

Questo impedisce che la mappa si muova mentre l'utente trascina il rettangolo.

### Banner Overlay

Un div fisso sopra la mappa durante `isPinPlacementMode`:
```
[Pin icon] Click and drag to select an area  [Cancel]
```
Con sfondo glass/blur, stesso stile degli altri overlay.

