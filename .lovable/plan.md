
# Fix: Info pixel non mostrate per selezioni grandi

## Problema
Quando selezioni piu' di circa 500-700 pixel con la spacebar in modalita' esplora, il pannello mostra "Select pixels to view stats" invece delle informazioni reali. Questo succede perche' la query costruisce una stringa `.or()` enorme con tutte le coordinate dei pixel (es. `and(x.eq.100,y.eq.200),and(x.eq.101,y.eq.200),...`) che supera il limite di lunghezza URL di PostgREST, causando un errore silenzioso.

## Soluzione
Modificare `InspectSelectionPanel.tsx` per:

1. **Usare l'RPC `fetch_pixels_by_coords`** gia' esistente nel database, che accetta coordinate come JSONB nel body (nessun limite URL). Questo e' lo stesso approccio gia' usato da game-validate e game-commit.

2. **Paginare la query delle contributions** usando `.range()` per gestire selezioni con piu' di 1000 pixel che hanno contributions.

3. **Gestire errori visivamente** - mostrare un messaggio di errore nel pannello invece di fallire silenziosamente.

## Dettagli tecnici

### File: `src/components/map/inspector/InspectSelectionPanel.tsx`

Sostituire la query pixels (righe 46-53):
```typescript
// PRIMA (problematico per grandi selezioni):
const orCondition = selectedPixels
  .map(p => `and(x.eq.${p.x},y.eq.${p.y})`)
  .join(',');
const { data: pixels } = await supabase
  .from('pixels')
  .select('id, x, y, owner_user_id, owner_stake_pe')
  .or(orCondition);

// DOPO (usa RPC, nessun limite):
const coords = selectedPixels.map(p => ({ x: p.x, y: p.y }));
const { data: pixels } = await supabase.rpc('fetch_pixels_by_coords', {
  coords: coords,
});
```

Per le contributions, aggiungere paginazione con `.range()` in batch da 1000 per gestire selezioni con molti pixel che hanno contributions nel database.

Aggiungere anche un messaggio di errore visibile nel pannello nel caso la query fallisca, invece di restituire silenziosamente nessun dato.
