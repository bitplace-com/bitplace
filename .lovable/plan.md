

# Ottimizzazione velocita' REINFORCE per aree grandi

## Problema identificato
Il REINFORCE su 1681 pixel e' lento perche' la funzione `game-commit` esegue **1681 query UPDATE individuali in sequenza** (una per pixel, linee 310-325). Ogni query richiede ~5-10ms di round-trip al database, quindi 1681 query = ~10-15 secondi solo per gli update, piu' il tempo di fetch.

## Soluzione
Sostituire il loop sequenziale con due ottimizzazioni:

### 1. Batch UPDATE parallelo per REINFORCE (game-commit)
Invece di aggiornare un pixel alla volta, raggruppare i pixel in batch da 100 e processarli in parallelo (fino a 5 batch contemporaneamente), usando lo stesso pattern gia' implementato per PAINT.

```text
PRIMA:  1681 query sequenziali (~15s)
DOPO:   17 batch da 100, 5 in parallelo (~0.6s)
```

### 2. Fetch batches in parallelo (game-validate + game-commit)
Le chiamate RPC `fetch_pixels_by_coords` in batch da 900 sono attualmente sequenziali. Per 1681 pixel servono 2 batch -- eseguirli in parallelo con `Promise.all` dimezza il tempo di fetch.

## File da modificare

### `supabase/functions/game-commit/index.ts` (righe 310-325)
Sostituire il loop sequenziale REINFORCE con batch paralleli. Ogni batch usa una singola query SQL con `.in()` per aggiornare tutti i pixel del batch, e i batch vengono eseguiti in parallelo con `Promise.all`.

Stessa funzione: modificare anche `fetchPixelsByCoords` (righe 139-149) per eseguire i batch RPC in parallelo con `Promise.all` invece che sequenzialmente.

### `supabase/functions/game-validate/index.ts`
Modificare `fetchPixelsByCoords` per eseguire i batch RPC in parallelo con `Promise.all`.

### `src/components/map/inspector/InspectSelectionPanel.tsx`
Modificare il fetch dei pixel per eseguire i batch RPC in parallelo con `Promise.all`.

## Risultato atteso
- REINFORCE su 1681 pixel: da ~15-20 secondi a ~2-3 secondi
- Fetch pixel: da ~500ms (sequenziale) a ~300ms (parallelo)
- Nessun cambio nel comportamento o nei risultati, solo molto piu' veloce

