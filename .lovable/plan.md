

# Fix: Cold Start del Database causa rallentamenti casuali

## Problema Reale (dai log del server)

Il rallentamento NON dipende dalla quantita di pixel. Ecco i dati:

```text
256px (DB caldo):  validate 1.4s + commit 0.8s = ~2s
300px (DB freddo): validate 23s  + commit 16s  = ~40s+
```

La funzione RPC `fetch_pixels_by_coords` impiega 1s con DB caldo e 22s con DB freddo. Il PING warmup viene inviato fire-and-forget ma non attende il completamento, quindi non protegge efficacemente.

## Soluzione

### 1. Warmup AWAIT prima del validate (`src/hooks/useGameActions.ts`)
- Invece di fire-and-forget, inviare il PING a `game-validate` e **attendere** che completi (max 15s timeout) PRIMA di lanciare la richiesta vera
- Se il PING completa velocemente (DB caldo, ~200ms), nessun ritardo percettibile
- Se il PING impiega 10-17s (DB freddo), la richiesta vera dopo trovera il DB caldo e completera in ~1-2s
- Il tempo totale peggiore diventa: 15s (warmup) + 2s (validate) + 1s (commit) = ~18s invece di 40s+
- Il PING a `game-commit` resta fire-and-forget (viene fatto in parallelo durante il validate)

### 2. Pre-warmup al click del bottone Paint (`src/hooks/useGameActions.ts`)  
- Aggiungere una funzione `warmupValidate()` esportata che invia un PING a `game-validate`
- Chiamarla quando l'utente entra in modalita PAINT (preme il bottone per iniziare a disegnare)
- Cosi quando l'utente ha finito di disegnare e preme "Confirm", il DB e gia caldo
- Questa e la difesa primaria; il PING await al punto 1 e il fallback

### 3. Warmup piu aggressivo al draft start (`src/components/map/ActionTray.tsx` o equivalente)
- Quando l'utente inizia a disegnare pixel (primo `addToDraft`), lanciare un warmup a `game-validate`
- Questo da ancora piu tempo al DB per scaldarsi prima del confirm

## Dettagli Tecnici

### Flusso attuale (problematico)

```text
User clicks Confirm
  -> fire-and-forget PING game-commit (non awaited)
  -> fire-and-forget PING game-validate (NON ESISTE)
  -> invoke game-validate (colpisce DB freddo -> 23s)
  -> invoke game-commit (DB ancora freddo -> 16s)
Totale: ~40s+
```

### Flusso nuovo (ottimizzato)

```text
User entra in modalita PAINT
  -> fire-and-forget PING game-validate (pre-scalda)
  
User disegna pixel (draft)
  -> il DB resta caldo grazie al PING iniziale
  
User clicks Confirm
  -> AWAIT PING game-validate (max 15s timeout)
     - Se DB caldo: ~200ms, procede subito
     - Se DB freddo: ~10-15s, ma poi validate sara veloce
  -> fire-and-forget PING game-commit (in parallelo)
  -> invoke game-validate (DB caldo -> ~1.5s)
  -> invoke game-commit (DB caldo grazie al PING -> ~1s)
Totale caso caldo: ~3s
Totale caso freddo: ~18s (invece di 40s+)
```

### Implementazione warmupValidate

```text
// In useGameActions.ts
export function warmupFunction(functionName: string): void {
  const url = `${SUPABASE_URL}/functions/v1/${functionName}`;
  const headers = getAuthHeadersOrExpire();
  if (!headers) return;
  
  fetch(url, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json', apikey: ANON_KEY },
    body: JSON.stringify({ mode: 'PING' }),
  }).catch(() => {});
}
```

### Modifica validate() - PING await

Nel metodo `validate()`, prima della chiamata `invokeWithRetry`:

```text
// Await warmup PING (max 15s) - ensures DB is warm
const pingController = new AbortController();
const pingTimeout = setTimeout(() => pingController.abort(), 15000);
try {
  await fetch(game-validate-url, {
    method: 'POST',
    signal: pingController.signal,
    headers: ...,
    body: JSON.stringify({ mode: 'PING' }),
  });
} catch {} // Ignore errors
clearTimeout(pingTimeout);

// Now DB is warm, proceed with actual validate
const result = await invokeWithRetry(...)
```

### File modificati
- `src/hooks/useGameActions.ts` - PING await + export warmupFunction
- `src/hooks/usePaintStateMachine.ts` o file equivalente che gestisce l'ingresso in PAINT mode - chiamare warmupFunction al draft start

