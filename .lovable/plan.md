
Diagnosi rapida
- Il comportamento “si ferma a 1000” è coerente con l’attuale implementazione: in `BitplaceMap.tsx` la funzione `fetchOwnedPixelsInBounds` usa una singola query con `.limit(10000)`, ma la risposta lato API è comunque paginata/cappata a 1000 righe per richiesta.
- Quindi la selezione ERASER rettangolare oggi non arriva mai realmente a 10.000 pixel owned, anche quando nell’area ce ne sono molti di più.

Obiettivo
- Applicare il limite 10.000 solo ai pixel effettivamente cancellabili (esistenti + owned dall’utente), non all’area geometrica.
- Scartare automaticamente vuoti/non-owned prima che finiscano nel counter/selection operativa.

Implementazione proposta

1) `src/components/map/BitplaceMap.tsx` — paginazione reale della selezione owned in bbox
- Riscrivere `fetchOwnedPixelsInBounds(...)` in modalità paginata:
  - page size = 1000
  - loop con `.range(offset, offset + pageSize - 1)` + filtri bbox + `owner_user_id = user.id`
  - accumulo fino a `MAX_BRUSH_SELECTION` (10.000) o fine dati
- Questo elimina il collo di bottiglia dei 1000 e rende il cap 10.000 effettivo.

2) `src/components/map/BitplaceMap.tsx` — path SPACE rettangolare ERASER
- Mantenere la logica attuale “rettangolo -> query owned”, ma usare la nuova funzione paginata.
- `pendingPixels` deve essere popolato solo con il risultato owned effettivo (max 10.000).
- Se 0 risultati: toast “No pixels to erase in this area”.

3) `src/components/map/BitplaceMap.tsx` — path brush/touch ERASER (auto-scarto non-owned)
- Aggiungere filtro ownership anche per selezioni non-rettangolari (touch/brush), non solo `dbPixels.has(...)`.
- Implementare helper batch su coordinate selezionate (chunk <= 900) via RPC `fetch_pixels_by_coords`, filtrando `owner_user_id === user.id`.
- Usare questo filtro prima di `setPendingPixels(...)`, così il counter mostra solo pixel realmente cancellabili (coerente con la richiesta “scartare automaticamente non disegnati/non miei”).

4) Limite funzionale coerente
- Conservare `MAX_BRUSH_SELECTION = 10000` come tetto finale sui pixel owned validi.
- Se l’area contiene più di 10.000 pixel owned, si prendono i primi 10.000 in modo deterministico (query ordinata) e il resto viene ignorato.

Verifiche (desktop + mobile)
- Caso A: area 30.000 celle, owned effettivi 2.500 -> selection/counter = 2.500.
- Caso B: area 30.000 celle, owned effettivi >10.000 -> selection/counter = 10.000.
- Caso C: area senza pixel owned -> toast informativo, niente pending.
- Mobile (drag/touch eraser): non-owned e vuoti non devono entrare nel pending/counter.

Impatto file
- `src/components/map/BitplaceMap.tsx` (unico file da modificare, con 2 helper + integrazione nei flow ERASE rect e brush/touch).
- Nessuna migrazione database necessaria.
