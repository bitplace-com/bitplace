

## Fix: Leaderboard "Top Painters" mostra conteggio errato

### Problema

La classifica "Top Painters" ricalcola i pixel da zero usando la tabella `paint_events`, sommando i PAINT e sottraendo gli ERASE. Ma i dati storici in `paint_events` sono corrotti: la cancellazione ha registrato 1424+8=1432 pixel invece dei 1500 reali (stesso bug del limite 1000 righe). Il risultato e un netto di 68 pixel invece di 0.

Il campo `pixels_painted_total` nella tabella `users` e gia corretto (0), ma la classifica non lo usa.

Inoltre, la query su `paint_events` nella funzione `leaderboard-get` e soggetta al limite di 1000 righe di Supabase, quindi man mano che i dati crescono il problema si ripresentera.

### Soluzione

1. **Per "All time"**: usare `pixels_painted_total` dalla tabella `users` invece di ricalcolare da `paint_events`. E piu affidabile, piu performante, e gia mantenuto correttamente.

2. **Per periodi filtrati (today/week/month)**: continuare a usare `paint_events` ma con paginazione per superare il limite di 1000 righe. I dati corrotti sono storici e usciranno dai filtri temporali.

3. **Fix dati storici**: correggere i record `paint_events` errati per il tuo account.

### Dettagli tecnici

**File: `supabase/functions/leaderboard-get/index.ts`**

Nella sezione "painters" con `scope === "players"`:
- Se `period === "all"`: query diretta sulla tabella `users` per `pixels_painted_total` (ordinata per valore decrescente, top 50)
- Se periodo filtrato: mantenere la logica attuale con `paint_events`, ma aggiungere paginazione per superare il limite di 1000 righe (loop con `.range()` fino a esaurimento dati)

Stessa logica per `scope === "countries"` e `scope === "alliances"`:
- "All time": aggregare `pixels_painted_total` dalla tabella `users` raggruppando per `country_code` o `alliance_tag`
- Periodi filtrati: mantenere `paint_events` con paginazione

**Fix dati**: aggiornare i record `paint_events` per l'account `76f4ab9b-5f04-44e6-91e0-0ac208995ffc` in modo che il primo ERASE abbia `pixel_count = 1492` (1424 + 68 mancanti) cosi anche le query temporali saranno corrette.

