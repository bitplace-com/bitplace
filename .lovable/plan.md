
# Fix: RPC `fetch_pixels_by_coords` restituisce solo 1000 righe nonostante `.limit(10000)`

## Problema
Il `.limit(10000)` aggiunto alle chiamate RPC non ha effetto perche' il progetto ha un'impostazione PostgREST `max_rows = 1000` a livello server che sovrascrive qualsiasi limite richiesto dal client. I log confermano: `fetchPixelsByCoords: found 1000` per 1681 pixel inviati.

## Soluzione
Invece di tentare di alzare il limite (che non funziona), **dividere le coordinate in batch da 900** prima di inviarle alla RPC. Ogni batch restituira' al massimo 900 righe (ben sotto il limite di 1000), e i risultati vengono combinati.

## File da modificare

### 1. `supabase/functions/game-validate/index.ts` (righe 236-266)
Sostituire la singola chiamata RPC con un loop di batch:

```typescript
const BATCH_SIZE = 900;
const coords = pixels.map(p => ({ 
  x: Math.floor(p.x), 
  y: Math.floor(p.y) 
}));

const allData: any[] = [];
for (let i = 0; i < coords.length; i += BATCH_SIZE) {
  const batch = coords.slice(i, i + BATCH_SIZE);
  const { data, error } = await supabase.rpc("fetch_pixels_by_coords", { 
    coords: batch 
  });
  if (error) throw error;
  if (data) allData.push(...data);
}
```

### 2. `supabase/functions/game-commit/index.ts` (righe 135-147)
Stessa modifica a batch:

```typescript
const BATCH_SIZE = 900;
const coords = pixels.map(p => ({ x: p.x, y: p.y }));

const allData: any[] = [];
for (let i = 0; i < coords.length; i += BATCH_SIZE) {
  const batch = coords.slice(i, i + BATCH_SIZE);
  const { data, error } = await supabase.rpc('fetch_pixels_by_coords', {
    coords: batch,
  });
  if (error) throw error;
  if (data) allData.push(...data);
}
```

### 3. `src/components/map/inspector/InspectSelectionPanel.tsx` (riga 49-55)
Stessa modifica a batch per il pannello ispettore:

```typescript
const BATCH_SIZE = 900;
const coords = selectedPixels.map(p => ({ x: p.x, y: p.y }));
const allPixels: any[] = [];
for (let i = 0; i < coords.length; i += BATCH_SIZE) {
  const batch = coords.slice(i, i + BATCH_SIZE);
  const { data, error } = await supabase.rpc('fetch_pixels_by_coords', {
    coords: batch,
  });
  if (error) { /* handle */ }
  if (data) allPixels.push(...data);
}
```

## Perche' funziona
Ogni batch contiene al massimo 900 coordinate, quindi la risposta RPC avra' al massimo 900 righe -- sempre sotto il limite di 1000 imposto dal server. Per 1681 pixel servono 2 batch (900 + 781). I risultati vengono combinati e il resto del codice funziona senza modifiche.

## Dopo le modifiche
Le edge functions `game-validate` e `game-commit` verranno ridistribuite automaticamente.
