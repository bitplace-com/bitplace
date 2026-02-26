

## Fix "Active Pixels" bloccato a 1000

### Problema
Il hook `useVpeRenew` esegue una query `SELECT expires_at FROM pixels WHERE ...` e conta i risultati client-side con `data.length`. Supabase ha un limite predefinito di 1000 righe per query, quindi il conteggio non supera mai 1000.

### Soluzione

Modificare `src/hooks/useVpeRenew.ts` per usare due query separate:

1. **Count totale**: usare `supabase.from('pixels').select('*', { count: 'exact', head: true })` per ottenere il conteggio totale senza fetchare righe (bypassa il limite di 1000).

2. **Expiry batches**: per il calcolo delle fasce di scadenza (urgent/soon/upcoming/safe) e l'earliest expiry, fetchare solo i pixel con scadenza entro 72h (quelli rilevanti per il renew), ordinati per `expires_at` ascending con limit 1 per l'earliest. In alternativa, usare due query:
   - Una `head: true` con count per il totale
   - Una con `order('expires_at', { ascending: true }).limit(1)` per l'earliest expiry
   - Per le fasce, usare filtri con `lt`/`gte` sulla data per contare ciascuna fascia server-side

### Approccio scelto (piu semplice e robusto)

Riscrivere `fetchBatches` in `useVpeRenew.ts`:

- **Query 1**: `select('*', { count: 'exact', head: true })` con i filtri `owner_user_id`, `is_virtual_stake` -- restituisce solo il count, zero dati trasferiti
- **Query 2**: `select('expires_at').order('expires_at', { ascending: true }).limit(1)` -- per l'earliest expiry
- **Query 3-4**: Count con filtri temporali per urgent (< 6h) e soon (6-24h) usando `lt` e `gte` su `expires_at`

Questo elimina completamente il problema del limite 1000 e riduce anche il traffico di rete (prima scaricava fino a 1000 righe di dati, ora solo conteggi).

### File modificato

`src/hooks/useVpeRenew.ts` -- riscrittura di `fetchBatches` per usare count queries server-side invece di fetch + count client-side.

### Dettaglio tecnico

```text
// Prima (broken):
const { data } = await supabase.from('pixels').select('expires_at').eq(...)
totalVpePixels = data.length  // max 1000!

// Dopo (fixed):
const { count } = await supabase.from('pixels').select('*', { count: 'exact', head: true }).eq(...)
totalVpePixels = count  // numero reale, nessun limite
```

Per le fasce di scadenza, si useranno filtri temporali server-side:
- `urgent`: `.lt('expires_at', now + 6h)`
- `soon`: `.gte('expires_at', now + 6h).lt('expires_at', now + 24h)`
- Per l'earliest expiry: `.order('expires_at').limit(1)`

