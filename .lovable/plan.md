
# Fix: Map Snapshot, PE Layout, PE Calcolo per Owner

## 3 Problemi da Risolvere

### 1. Map snapshot vuoto (sfondo nero)
La mappa MapLibre usa WebGL, che per default cancella il framebuffer dopo ogni render. `map.getCanvas().toDataURL()` restituisce un'immagine nera/vuota.

**Fix**: Aggiungere `preserveDrawingBuffer: true` alla configurazione della mappa MapLibre. Questo mantiene il contenuto del canvas WebGL leggibile anche dopo il render, permettendo a `toDataURL()` di catturare correttamente lo screenshot.

**File: `src/components/map/BitplaceMap.tsx`** (riga 345-359)
- Aggiungere `preserveDrawingBuffer: true` alle opzioni di `new maplibregl.Map()`

### 2. PE e USD allineati con Like/Save nella footer row
Attualmente PE e USD sono su una riga separata sopra la footer. L'utente vuole che siano allineati nella stessa riga dei bottoni like/save/go.

**File: `src/components/places/PlaceCard.tsx`**
- Rimuovere il `div` separato per PE/USD (righe 115-124)
- Spostare PE e USD nella footer row (riga 127), dopo i bottoni like e save, prima del bottone "Go"
- Layout: `[Heart 0] [Pin] [PE icon] 1,000 PE $1.00 ... [Go]`

### 3. Calcolo PE totali = solo owner_stake_pe dei pixel nell'area
Il feed attualmente calcola `total_pe` sommando `owner_stake_pe` di TUTTI i pixel nell'area. L'utente vuole che vengano contati solo i PE stakati dall'owner/creator del pin rispetto ai pixel che possiede nell'area selezionata.

**File: `supabase/functions/places-feed/index.ts`**
- Modificare la query: filtrare `owner_user_id = creator_user_id` nella somma di `owner_stake_pe`
- Questo mostra solo i PE investiti dal creatore del pin nell'area, non quelli di altri utenti

**File: `supabase/functions/places-create/index.ts`**
- Alla creazione, calcolare il total_pe iniziale con la stessa logica (filtrando per `creator_user_id`)

---

## Dettagli Tecnici

### preserveDrawingBuffer
```js
const map = new maplibregl.Map({
  container: containerRef.current,
  style: 'https://tiles.openfreemap.org/styles/liberty',
  // ... existing options ...
  preserveDrawingBuffer: true, // <-- NEW: enables canvas snapshot
});
```
Nota: questo ha un costo minimo di performance ma e necessario per catturare screenshot.

### PlaceCard footer layout
```
<div className="flex items-center gap-2 pt-1">
  {/* Like button */}
  {/* Save button */}
  {/* PE inline */}
  <div className="flex items-center gap-1 ml-auto mr-1">
    <PEIcon size="sm" className="text-foreground/70" />
    <span className="text-xs font-semibold tabular-nums">
      {total_pe.toLocaleString()} PE
    </span>
    <span className="text-xs font-medium text-emerald-500">
      ${(total_pe / PE_PER_USD).toFixed(2)}
    </span>
  </div>
  {/* Go button */}
</div>
```

### PE query filtrata per creator
```sql
-- In places-feed: per ogni place
SELECT owner_stake_pe FROM pixels
WHERE x >= bbox_xmin AND x <= bbox_xmax
  AND y >= bbox_ymin AND y <= bbox_ymax
  AND owner_user_id = creator_user_id  -- solo pixel del creatore
```

## File Modificati

| File | Modifica |
|------|----------|
| `src/components/map/BitplaceMap.tsx` | Aggiungere `preserveDrawingBuffer: true` |
| `src/components/places/PlaceCard.tsx` | Spostare PE/USD nella footer row con like/save |
| `supabase/functions/places-feed/index.ts` | Filtrare owner_stake_pe per creator_user_id |
| `supabase/functions/places-create/index.ts` | Calcolare total_pe iniziale filtrato per creator |
