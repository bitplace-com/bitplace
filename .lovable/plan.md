
## Diagnosi: Pixel Inspector mostra "vuoto" per pixel esistenti

### Causa Root

Ho trovato il problema. Non c'entra nulla con i due tipi di PE o conflitti nei dati. I pixel nel database sono perfetti (11.761 pixel, tutti con owner, colore e stake corretti).

Il problema e' una **policy RLS mancante sulla tabella `users`**:

1. La tabella `users` ha RLS abilitato ma **zero policy di SELECT** -- nessun ruolo client (anon/authenticated) puo' leggere righe dalla tabella
2. Le view `public_pixel_owner_info`, `public_user_profiles` e `public_alliances` hanno tutte `security_invoker=true`, quindi quando il client le interroga, PostgreSQL verifica le policy RLS di `users` con il ruolo del chiamante
3. Nessuna policy = zero righe restituite = owner sempre `null` = "Unclaimed pixel"

Le tiles si caricano perche' la edge function `pixels-fetch-tiles` usa `service_role` (bypass RLS), ma l'inspector usa query client dirette che passano per RLS.

### Cosa NON serve

- **Nessun reset dei pixel** -- i dati sono integri, il disegno e' intatto
- **Nessuna modifica al codice frontend** -- la logica funziona correttamente
- **Nessun conflitto PE** -- il problema e' solo un'autorizzazione DB mancante

### Fix

Aggiungere una policy di SELECT permissiva alla tabella `users`:

```text
CREATE POLICY "Users publicly readable"
ON public.users FOR SELECT USING (true);
```

Questo e' sicuro perche':
- Le view gia' limitano le colonne esposte (niente wallet_address completo, solo wallet_short troncato)
- Il client non interroga mai `users` direttamente, passa sempre per le view
- La tabella `users` non contiene dati sensibili critici (niente password, il wallet address e' gia' pubblico on-chain)

### Dettagli tecnici

**Tabelle/view coinvolte:**
- `users` -- tabella base, RLS attivo, 0 policy (il bug)
- `public_pixel_owner_info` -- view con `security_invoker=true`, usata dall'inspector pixel
- `public_user_profiles` -- view con `security_invoker=true`, usata per nomi nei contributi
- `public_alliances` -- view con `security_invoker=on`, usata per info alleanze

**Operazione:** Una singola migrazione SQL per aggiungere la policy SELECT sulla tabella `users`.
