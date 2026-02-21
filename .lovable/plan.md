

## Analisi e Piano di Sicurezza

Ho analizzato tutti i finding di sicurezza. Ci sono **3 issue attivi** da risolvere (i 2 di Supabase sono gia' stati marcati come "ignore" con motivazione valida, quindi non richiedono azione). Ecco il dettaglio:

---

### Issue 1: Notifications RLS policy troppo permissiva (ERROR)

**Problema:** La policy RLS sulla tabella `notifications` usa `USING (true)`, il che significa che qualsiasi utente potrebbe leggere TUTTE le notifiche di tutti, non solo le proprie.

**Rischio di rottura: ZERO.** Il frontend non accede mai direttamente alla tabella `notifications` -- tutto passa attraverso la Edge Function `notifications-manage` che usa il `service_role` e filtra gia' per `user_id`. Cambiare la policy a `USING (false)` blocca solo l'accesso diretto dal client (che non viene mai usato).

**Fix:** Migration SQL per cambiare la policy da `USING (true)` a `USING (false)`.

---

### Issue 2: Storage policy place-snapshots troppo permissiva (WARNING)

**Problema:** Esiste una policy che permette a qualsiasi utente autenticato di caricare file nel bucket `place-snapshots`. Ma l'upload avviene solo dalla Edge Function `places-create` che usa il `service_role` (bypass RLS).

**Rischio di rottura: ZERO.** La Edge Function usa `adminClient` (service role) per gli upload, quindi non dipende dalla policy `authenticated`. Rimuoverla chiude un vettore di attacco senza impatto funzionale.

**Fix:** Migration SQL per rimuovere la policy `"Auth insert place-snapshots"`.

---

### Issue 3: Alliance search SQL wildcards (WARNING)

**Problema:** L'escaping dei caratteri SQL nella ricerca alleanza e' gia' implementato, ma il pattern viene interpolato in una stringa template dentro `.or()`.

**Rischio di rottura: MINIMO.** L'escaping attuale funziona gia' correttamente nella pratica. Il miglioramento e' aggiungere una validazione dell'input piu' stretta (solo caratteri alfanumerici, spazi e punti) PRIMA dell'escaping, come ulteriore layer di difesa.

**Fix:** Aggiungere validazione regex nell'edge function `alliance-manage` per filtrare input malevoli prima della query.

---

### Riepilogo modifiche

| # | Tipo | File | Rischio rottura |
|---|------|------|-----------------|
| 1 | Migration SQL | Cambia policy notifications da `true` a `false` | Nessuno |
| 2 | Migration SQL | Rimuove policy insert su place-snapshots per `authenticated` | Nessuno |
| 3 | Edge Function | Aggiunge validazione input in `alliance-manage/index.ts` | Minimo |

### Dettaglio tecnico

**Migration SQL (issue 1 + 2):**
```sql
-- Issue 1: Blocca accesso diretto alle notifiche
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  USING (false);

-- Issue 2: Rimuove policy insert non necessaria
DROP POLICY IF EXISTS "Auth insert place-snapshots" ON storage.objects;
```

**Edge Function (issue 3):**
Aggiunta validazione in `alliance-manage/index.ts` prima della query di ricerca:
```typescript
// Valida che l'input contenga solo caratteri sicuri
if (!/^[\p{L}\p{N} .\-_]+$/u.test(query)) {
  return new Response(JSON.stringify({ error: "Invalid search characters" }), {
    status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
}
```

Dopo l'implementazione, i 3 finding di sicurezza verranno rimossi dal registro.

