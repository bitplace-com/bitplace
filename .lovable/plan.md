

# Piano di Ottimizzazione: Ridurre Tempi Validate/Paint

## Stato Attuale ✅

| Metrica | Valore | Status |
|---------|--------|--------|
| Pixel dipinti totali | 3131 | ✅ |
| PE usati | 3131 | ✅ Perfetto |
| Consistenza DB | 100% | ✅ |

I 500 pixel sono stati tutti salvati correttamente. L'accounting è perfetto.

---

## Analisi Prestazioni (Il Problema)

I log mostrano tempi molto alti:

| Fase | Tempo | Causa |
|------|-------|-------|
| **PING warmup (DB)** | 35.2 sec | Cold start Postgres |
| `fetchUserMs` | 37.5 sec | Prima query dopo warmup |
| `fetchPixelsMs` | 10.6 sec | OK |
| **Validate totale** | 48.2 sec | Dominato da cold start |
| **Commit (10 batch)** | 22 sec | OK |

**Problema principale**: Il database Postgres di Lovable Cloud entra in "sleep mode" dopo alcuni minuti di inattività. La prima query dopo il risveglio richiede 30-40 secondi.

---

## Soluzioni Proposte

### 1. Warmup Proattivo del Database (ogni 3 minuti)

Attualmente il warmup avviene ogni 4 minuti. Ridurre a 3 minuti e fare warmup **autenticato** per mantenere il database sempre "caldo".

**File:** `src/hooks/useEdgeFunctionWarmup.ts`

```typescript
const WARMUP_INTERVAL_MS = 3 * 60 * 1000; // 3 minuti invece di 4

// Usare warmup autenticato invece di anonimo per intervalli
// Il warmup autenticato fa una vera query al DB
```

### 2. Pre-warmup Quando l'Utente Inizia a Disegnare

Attivare un warmup anticipato quando l'utente entra in modalità PAINT, **prima** che clicchi "Confirm".

**File:** `src/components/map/hooks/usePointerInteraction.ts` o simile

```typescript
// Quando l'utente inizia a selezionare pixel per paint
useEffect(() => {
  if (mode === 'PAINT' && selectedPixels.length > 0 && !hasWarmedUp) {
    // Trigger warmup in background
    warmupAuthenticatedFunctions(token);
    setHasWarmedUp(true);
  }
}, [mode, selectedPixels.length]);
```

### 3. Ottimizzare Query User in game-validate

Attualmente `fetchUserMs` impiega 37 secondi perché è la **prima query** dopo il cold start. Il warmup nel PING mode già fa una query, ma poi si crea un nuovo client Supabase.

**File:** `supabase/functions/game-validate/index.ts`

Riusare lo stesso client creato nel percorso principale per evitare overhead di connessione:

```typescript
// Creare il client UNA SOLA volta all'inizio
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseKey);

if (body.mode === "PING") {
  // Usa lo stesso client già creato
  const dbStart = Date.now();
  await supabase.from("users").select("id").limit(1);
  const dbMs = Date.now() - dbStart;
  // ...
}

// Il resto del codice usa lo stesso 'supabase' già riscaldato
```

### 4. Query Parallele in Validate

Eseguire `fetchUser` e `fetchPixelsByCoords` in parallelo invece che sequenzialmente.

**File:** `supabase/functions/game-validate/index.ts`

```typescript
// Invece di:
const user = await fetchUser(userId);    // 37s
const pixels = await fetchPixels(coords); // 10s
// Totale: 47s

// Fare:
const [user, pixels] = await Promise.all([
  fetchUser(userId),
  fetchPixels(coords)
]);
// Totale: max(37s, 10s) = 37s (risparmio 10s)
```

### 5. Chunking Frontend Automatico per >300 Pixel

Per operazioni molto grandi, dividere automaticamente in chunk da 150 pixel per:
- Ridurre timeout risk
- Mostrare progresso incrementale
- Garantire completamento parziale in caso di errore

**File:** `src/hooks/useGameActions.ts`

```typescript
const MAX_CHUNK_SIZE = 150;

if (pixels.length > MAX_CHUNK_SIZE * 2) {
  // Dividere in chunk e processare sequenzialmente
  for (let i = 0; i < chunks.length; i++) {
    setProgress({ chunk: i + 1, total: chunks.length });
    await validateAndCommit(chunks[i]);
  }
}
```

---

## Riepilogo Modifiche

| File | Modifica |
|------|----------|
| `src/hooks/useEdgeFunctionWarmup.ts` | Intervallo 3 min + warmup autenticato |
| `supabase/functions/game-validate/index.ts` | Creare client prima del PING + query parallele |
| `supabase/functions/game-commit/index.ts` | Stessa ottimizzazione client |
| `src/hooks/useGameActions.ts` | Pre-warmup + chunking per >300 pixel |

---

## Prestazioni Attese

| Scenario | Prima | Dopo |
|----------|-------|------|
| Validate 500px (cold) | 48 sec | 35-40 sec |
| Validate 500px (warm) | 10-15 sec | 5-8 sec |
| Commit 500px | 22 sec | 15-18 sec |
| **Totale operazione (warm)** | ~70 sec | ~25-30 sec |

### Nota Importante

Il cold start del database Postgres (35+ secondi) è una limitazione dell'infrastruttura Lovable Cloud che non può essere completamente eliminata. Le ottimizzazioni proposte mirano a:

1. **Prevenire** il cold start con warmup più frequenti
2. **Mascherare** il cold start facendolo avvenire durante la selezione dei pixel
3. **Ridurre** il tempo percepito con query parallele

---

## Test di Verifica

1. Ricollegare il wallet e verificare che il warmup mostri `db < 500ms`
2. Attendere 5 minuti, poi disegnare 300 pixel
3. Verificare che validate + commit completino in < 30 secondi (scenario warm)
4. Testare con 500 pixel per verificare il chunking automatico

