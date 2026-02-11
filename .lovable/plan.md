

# Fix: Minimap e Artwork Modal mostrano disegni incompleti

## Problema Identificato

L'utente possiede **1.681 pixel** ma le query ne restituiscono solo **1.000**. Questo succede perche il default di PostgREST limita le risposte a 1.000 righe, indipendentemente dal valore passato a `.limit()`. Risultato:
- Il disegno Bitcoin appare incompleto (mancano ~680 pixel)
- Una parte del disegno viene separata in un cluster diverso perche i pixel "ponte" tra le due aree sono tra quelli tagliati

## Modifiche

### 1. `src/components/map/OwnerArtworkModal.tsx` - Fetch paginato
- Sostituire la singola query con un loop paginato usando `.range(offset, offset + 999)` 
- Continuare a fetchare finche la pagina restituita ha esattamente 1000 righe
- Questo garantisce di ottenere TUTTI i pixel dell'utente, non solo i primi 1000

### 2. `src/components/UserMinimap.tsx` - Stesso fix di paginazione
- Applicare la stessa logica di fetch paginato
- Stesso pattern: loop con `.range()` fino a esaurimento dati

### 3. `src/components/map/OwnerArtworkModal.tsx` - Aumentare il gap di clustering
- Cambiare il gap da 3 a 5 nella chiamata `clusterPixels(pixels, 5)`
- Un gap piu ampio riduce la probabilita di separare parti dello stesso disegno in cluster diversi
- 5 pixel di distanza e un buon compromesso: unisce parti vicine senza fondere disegni realmente separati

## Dettagli Tecnici

La funzione di fetch paginato sara:

```text
PAGE_SIZE = 1000
offset = 0
allPixels = []

loop:
  fetch .range(offset, offset + PAGE_SIZE - 1)
  append results to allPixels
  if results.length < PAGE_SIZE -> break
  offset += PAGE_SIZE
```

Questo pattern e gia usato con successo nella edge function `pixels-fetch-tiles`.

### File modificati
- `src/components/map/OwnerArtworkModal.tsx`
- `src/components/UserMinimap.tsx`

