
# Piano di Ottimizzazione: Operazioni 400-500 Pixel

## Problemi Identificati

### 1. Cold Start del Database (Problema Principale)
I log mostrano tempi estremi:
- `fetchUserMs: 17134` (17 secondi per una semplice SELECT)
- `fetchPixelsMs: 30752` (30 secondi per RPC)
- Totale validate: **47896ms** (~48 secondi!)

**Causa**: Il PING warmup attuale riscalda solo il JWT auth path, ma NON fa query al database. La prima connessione al DB dopo cold start è lentissima.

### 2. Timeout Frontend Insufficiente
Per 500 pixel:
- Timeout attuale: 180s
- Tempo reale con cold start: validate (48s) + commit (40s+) = **88s+**
- Se entrambe le funzioni sono fredde: validate (48s) + commit (48s) = **96s+**

Questo funziona al limite, ma se c'è qualsiasi ritardo aggiuntivo (network, CPU) → timeout.

### 3. Nessun Chunking Automatico
Operazioni >200 pixel dovrebbero essere divise automaticamente per evitare timeout e garantire completamento parziale in caso di errore.

---

## Soluzioni Proposte

### Fase 1: Warmup Completo del Database Connection Pool

**File: `supabase/functions/game-validate/index.ts`** e **`game-commit/index.ts`**

Modificare il PING mode per eseguire una query leggera al DB, riscaldando la connessione:

```typescript
if (body.mode === "PING") {
  const authMs = Date.now() - t0;
  
  // WARM UP: Execute lightweight DB query to prime connection pool
  const dbStart = Date.now();
  await supabase.from("users").select("id").limit(1);
  const dbMs = Date.now() - dbStart;
  
  console.log(`[game-validate] PING warmed (auth=${authMs}ms, db=${dbMs}ms)`);
  return new Response(JSON.stringify({ 
    ok: true, 
    warm: true, 
    ts: Date.now(),
    authMs,
    dbMs  // Report DB warmup time
  }), ...);
}
```

### Fase 2: Aumentare Timeout per Operazioni Grandi

**File: `src/hooks/useGameActions.ts`**

Aumentare i timeout per operazioni 400+ pixel considerando cold start:

```typescript
function getTimeoutForPixelCount(count: number): number {
  if (count >= 500) return 240000; // 240s (4 min) per 500 pixels
  if (count >= 400) return 180000; // 180s (3 min) per 400+ pixels
  if (count >= 200) return 120000; // 120s per 200+ pixels
  if (count >= 100) return 90000;  // 90s per 100+ pixels
  return BASE_TIMEOUT_MS;          // 45s per operazioni piccole
}
```

### Fase 3: Chunking Automatico Frontend per Operazioni >200 Pixel

**File: `src/hooks/useGameActions.ts`**

Per operazioni molto grandi, dividere automaticamente in chunk sequenziali:

```typescript
const MAX_CHUNK_SIZE = 150;

// In validate() prima di chiamare l'API:
if (deduplicatedPixels.length > MAX_CHUNK_SIZE) {
  // Dividere in chunk e processare sequenzialmente
  const chunks = [];
  for (let i = 0; i < deduplicatedPixels.length; i += MAX_CHUNK_SIZE) {
    chunks.push(deduplicatedPixels.slice(i, i + MAX_CHUNK_SIZE));
  }
  
  let allValid = true;
  let totalRequiredPe = 0;
  
  for (let i = 0; i < chunks.length; i++) {
    setProgress({ processed: i * MAX_CHUNK_SIZE, total: deduplicatedPixels.length });
    
    const chunkResult = await validateSingleChunk(chunks[i], ...);
    if (!chunkResult?.ok) {
      allValid = false;
      break;
    }
    totalRequiredPe += chunkResult.requiredPeTotal;
  }
  
  // Return combined result
  return { ok: allValid, requiredPeTotal: totalRequiredPe, ... };
}
```

### Fase 4: Warmup Database su Connessione Wallet

**File: `src/hooks/useEdgeFunctionWarmup.ts`**

Aggiungere un warmup più aggressivo che include DB ping:

```typescript
export async function warmupWithDatabase(token: string): Promise<void> {
  // Warmup con query leggera al DB (1 sola chiamata parallela)
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  
  const warmupBoth = CRITICAL_FUNCTIONS.map(async (fn) => {
    try {
      const response = await fetch(`${supabaseUrl}/functions/v1/${fn}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ mode: 'PING', warmDb: true }),
      });
      
      const data = await response.json();
      console.debug(`[warmup] ${fn} ready (auth=${data.authMs}ms, db=${data.dbMs}ms)`);
    } catch {}
  });
  
  await Promise.all(warmupBoth);
}
```

---

## Riepilogo Modifiche

| File | Modifica |
|------|----------|
| `supabase/functions/game-validate/index.ts` | PING mode con DB query warmup |
| `supabase/functions/game-commit/index.ts` | PING mode con DB query warmup |
| `src/hooks/useGameActions.ts` | Timeout aumentati + chunking automatico |
| `src/hooks/useEdgeFunctionWarmup.ts` | Warmup include DB connection |

---

## Prestazioni Attese Post-Fix

| Scenario | Prima | Dopo |
|----------|-------|------|
| Validate 500px (cold) | 48+ secondi | 5-10 secondi |
| Validate 500px (warm) | 5-10 secondi | 2-5 secondi |
| Commit 500px | 20-40 secondi | 15-25 secondi |
| Success rate 500px | ~50% | >95% |

---

## Test di Verifica

1. Connettere wallet → verificare nei log che PING mostra `dbMs` < 500ms
2. Attendere 5 minuti (cold start forzato) → disegnare 500 pixel
3. Verificare che validate completi in <15 secondi
4. Verificare che commit completi senza timeout
5. Verificare che tutti i 500 pixel siano visibili sulla mappa
