

# Aumento limite pixel per operazione: da 300 a 1000

## Contesto

Il limite attuale di 300 pixel per singola operazione PAINT viene portato a 1000. Questo riguarda sia il numero di pixel disegnabili che i PE utilizzabili per operazione.

## Perche' serve piu' tempo con piu' pixel

Il backend esegue queste operazioni per ogni PAINT:
- **1 query di lettura** (batch da 900 coord) per verificare lo stato attuale dei pixel
- **N batch di scrittura** (100 pixel ciascuno, max 5 in parallelo) per salvare nel DB
- Calcolo threshold e ownership per ogni pixel

Con 300 pixel: 1 batch lettura + 3 batch scrittura = ~2-5s
Con 1000 pixel: 2 batch lettura + 10 batch scrittura (2 round) = ~5-10s

I timeout dinamici gia' presenti nel codice gestiscono questo scenario. Serve solo aggiungere una soglia per 1000 pixel.

## Modifiche

### 1. Frontend - Limite draft (1 riga)
**File:** `src/components/map/hooks/useDraftPaint.ts`
- `PAINT_MAX_PIXELS`: 300 -> 1000

### 2. Backend - Validazione (1 riga)
**File:** `supabase/functions/game-validate/index.ts` (linea 56)
- `MAX_PAINT_PIXELS`: 300 -> 1000

### 3. Backend - Commit (1 riga)
**File:** `supabase/functions/game-commit/index.ts` (linea 55)
- `MAX_PAINT_PIXELS`: 300 -> 1000

### 4. Frontend - Timeout e chunking (2 righe)
**File:** `src/hooks/useGameActions.ts`
- `MAX_CHUNK_SIZE`: 200 -> 500 (meno round-trip: 2 chunk invece di 5)
- Aggiunta soglia timeout: `if (count >= 1000) return 300000;` (5 minuti)

## Cosa NON cambia

- Budget totale Starter (300.000 pixel) invariato
- Cooldown 30 secondi invariato
- Space Paint (batch da 200) invariato
- Brush/rect selection (limite 10.000) invariato
- Nessuna modifica al database
- Nessuna modifica RLS

## Riepilogo

5 modifiche su 4 file. Zero rischi critici. Le infrastrutture esistenti (timeout dinamici, batching parallelo, warmup PING) gia' supportano operazioni di questa dimensione.
