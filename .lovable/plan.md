

# Fix: Limite 1000 righe sulle chiamate RPC `fetch_pixels_by_coords`

## Problema
Il client Supabase impone un limite di **1000 righe** di default su tutte le risposte, comprese le chiamate RPC. Quando selezioni 1681 pixel, la funzione `fetch_pixels_by_coords` restituisce solo 1000 righe. I restanti 681 pixel non vengono trovati nella mappa e il sistema li classifica erroneamente come "empty" (vuoti), generando il messaggio "681 pixels can't be reinforced -- they are empty".

Quando selezioni solo 600 pixel, tutti rientrano nel limite di 1000 e tutto funziona correttamente.

## Soluzione
Aggiungere `.limit(10000)` a tutte le chiamate `supabase.rpc('fetch_pixels_by_coords', ...)` per alzare il limite di righe restituito. Il valore 10000 corrisponde al limite massimo di selezione gia' definito in `MAX_SELECTION_PIXELS`.

## File da modificare

### 1. `supabase/functions/game-validate/index.ts` (riga ~243)
Aggiungere `.limit(10000)` alla chiamata RPC nella funzione `fetchPixelsByCoords`:
```typescript
const { data, error } = await supabase.rpc("fetch_pixels_by_coords", { 
  coords: coords 
}).limit(10000);
```

### 2. `supabase/functions/game-commit/index.ts` (riga ~137)
Stessa modifica:
```typescript
const { data, error } = await supabase.rpc('fetch_pixels_by_coords', {
  coords: coords,
}).limit(10000);
```

### 3. `src/components/map/inspector/InspectSelectionPanel.tsx` (riga ~51)
Stessa modifica per il pannello ispettore di area:
```typescript
const { data: pixels, error: pixelError } = await supabase.rpc('fetch_pixels_by_coords', {
  coords: coords,
}).limit(10000);
```

## Perche' funziona
La funzione SQL `fetch_pixels_by_coords` non ha un limite interno -- restituisce tutte le righe trovate. Il limite viene applicato dal client SDK di Supabase, che di default tronca a 1000 righe. Aggiungendo `.limit(10000)` esplicitamente, il client richiede fino a 10000 righe, coprendo qualsiasi selezione possibile nel gioco.

