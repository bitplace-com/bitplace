
# Piano di Correzione: Operazioni Paint 300+ Pixel

## Problemi Identificati

### 1. Query Validate Lentissima (47+ secondi per 320 pixel)
I log mostrano:
- `fetchPixelsByCoords: starting for 320 pixels`
- `fetchPixelsByCoords: built 320 conditions` 
- `fetchPixelsByCoords: found 0 in 47480ms` (47 secondi!)

**Causa**: Il client Supabase costruisce una stringa `.or()` con 320 condizioni. Il parsing/interpolazione lato client diventa esponenzialmente lento. La query SQL effettiva sarebbe veloce (~1ms), ma non viene mai raggiunta.

### 2. Upsert Batch Lenti (15-27 secondi per 100 pixel)
I log mostrano:
- `PAINT batch 1/4 completed: 100 pixels` (dopo ~27s)
- `PAINT batch 2/4 completed: 100 pixels` (dopo ~27s)
- `PAINT: all batches completed in 134580ms` (2+ minuti!)

### 3. Connessione Chiusa Prima del Completamento
```
Http: connection closed before message completed
```
Il client HTTP (frontend) chiude la connessione prima che il commit finisca perché supera il timeout.

### 4. Inconsistenza Pixel Paintati
L'utente vede 300 pixel validati ma solo ~50 effettivamente paintati. Questo accade quando la connessione si chiude a metà dei batch.

---

## Soluzione Proposta

### Fase 1: Ottimizzare la Query di Validate

**File: `supabase/functions/game-validate/index.ts`**

Sostituire la query `.or(conditions)` con la funzione RPC `fetch_pixels_by_coords` che già esiste e funziona:

```typescript
async function fetchPixelsByCoords(supabase, pixels) {
  if (pixels.length === 0) return [];
  
  const startTime = Date.now();
  console.log(`[game-validate] fetchPixelsByCoords: starting for ${pixels.length} pixels`);
  
  // Usare la funzione RPC esistente con JSONB
  const coords = pixels.map(p => ({ 
    x: Math.floor(p.x), 
    y: Math.floor(p.y) 
  }));
  
  const { data, error } = await supabase.rpc("fetch_pixels_by_coords", { 
    coords: coords 
  });
  
  if (error) {
    console.error('[game-validate] fetchPixelsByCoords error:', error);
    throw error;
  }
  
  console.log(`[game-validate] fetchPixelsByCoords: found ${(data || []).length} in ${Date.now() - startTime}ms`);
  return data || [];
}
```

### Fase 2: Batch Upsert in Parallelo con Limite

**File: `supabase/functions/game-commit/index.ts`**

Eseguire i batch in parallelo (con limite di concorrenza) invece che sequenzialmente:

```typescript
const UPSERT_BATCH_SIZE = 50;  // Ridurre da 100 a 50
const MAX_PARALLEL_BATCHES = 3; // Max 3 batch in parallelo

// Dividere in batch
const batches = [];
for (let i = 0; i < upsertData.length; i += UPSERT_BATCH_SIZE) {
  batches.push(upsertData.slice(i, i + UPSERT_BATCH_SIZE));
}

// Eseguire batch in parallelo con limite
const results = [];
for (let i = 0; i < batches.length; i += MAX_PARALLEL_BATCHES) {
  const parallelBatches = batches.slice(i, i + MAX_PARALLEL_BATCHES);
  const batchResults = await Promise.all(
    parallelBatches.map(batch => 
      supabase.from("pixels").upsert(batch, { onConflict: 'x,y' }).select(...)
    )
  );
  results.push(...batchResults);
}
```

### Fase 3: Verifica Consistenza PE e Pixel

La verifica ha mostrato che l'accounting PE è corretto:
- `pe_used_pe = 1891`
- `pixels_painted_total = 1891`  
- Count reale pixel: `1891`

Il problema non è nell'accounting ma nell'interruzione a metà. Il database applica correttamente i trigger.

### Fase 4: Chunking delle Operazioni

Per operazioni >200 pixel, dividere lato frontend in chunk da 150 pixel ciascuno:

**File: `src/hooks/useGameActions.ts`**

```typescript
const MAX_CHUNK_SIZE = 150;

if (deduplicatedPixels.length > MAX_CHUNK_SIZE) {
  // Dividere in chunk e processare sequenzialmente
  const chunks = [];
  for (let i = 0; i < deduplicatedPixels.length; i += MAX_CHUNK_SIZE) {
    chunks.push(deduplicatedPixels.slice(i, i + MAX_CHUNK_SIZE));
  }
  
  // Processare ogni chunk
  for (const chunk of chunks) {
    const validateResult = await validate({ ...params, pixels: chunk });
    if (!validateResult?.ok) break;
    const commitResult = await commit({ ...params, pixels: chunk, snapshotHash: validateResult.snapshotHash });
    if (!commitResult?.ok) break;
  }
}
```

---

## Tabella Riepilogo Modifiche

| File | Modifica |
|------|----------|
| `supabase/functions/game-validate/index.ts` | Sostituire `.or()` con RPC `fetch_pixels_by_coords` |
| `supabase/functions/game-commit/index.ts` | Batch paralleli + dimensione ridotta (50) |
| `src/hooks/useGameActions.ts` | Chunking frontend per operazioni >200 pixel |

---

## Prestazioni Attese

| Operazione | Prima | Dopo |
|------------|-------|------|
| Validate 320 pixel | 47+ secondi | < 3 secondi |
| Commit 325 pixel | 134+ secondi | < 15 secondi |
| Successo operazioni grandi | ~15% | ~95% |

---

## Test di Verifica

1. Disegnare esattamente 300 pixel e verificare che validate completi in meno di 5 secondi
2. Confermare i 300 pixel e verificare che commit completi in meno di 20 secondi
3. Verificare che tutti i 300 pixel siano stati effettivamente paintati
4. Verificare che `pe_used_pe` corrisponda al numero di pixel paintati
5. Testare con 400+ pixel per verificare il chunking automatico
