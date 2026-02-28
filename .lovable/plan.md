
Obiettivo: risolvere in modo definitivo i due sintomi che stai vedendo insieme:
1) Phantom che resta in loading senza popup;
2) pixel non visibili di nuovo al primo caricamento nella zona corretta.

Diagnosi confermata dal codice:
- Non c’è un conflitto “logico” tra ordine Google→Phantom o Phantom→Google a livello account linking: il backend gestisce entrambe le direzioni (incluso merge).
- I blocchi che restano sono dovuti a race/timeout lato frontend, non al modello dati account.
- La regressione mappa è ancora presente perché il primo fetch viewport usa uno zoom interno non ancora aggiornato (race tra setState e fetch).

Piano di implementazione

1) Stabilizzare il flusso wallet (src/contexts/WalletContext.tsx)
- Introdurre helper centrali:
  - `withTimeout(promise, ms, label)`
  - `invokeWithTimeout(functionName, options, ms)`
- Applicare timeout non solo a `phantom.connect`, ma anche a:
  - richiesta nonce,
  - firma (`phantom.request` / `phantom.signMessage`),
  - verifica firma.
- Aggiungere lock di flusso auth (es. `authFlowRef`) per evitare operazioni concorrenti (restore/connect/signin/link) che si sovrascrivono.
- Rafforzare i reset di stato in tutti i branch di errore:
  - mai lasciare `CONNECTING`/`AUTHENTICATING` bloccato.
- Migliorare il ramo `connect()`:
  - evitare riuso “cieco” di `phantom.publicKey` quando può essere stale;
  - forzare handshake controllato con timeout.
- Applicare la stessa resilienza anche a `linkWallet()` (oggi è il punto più vulnerabile quando si parte da Google).

2) Eliminare race tra session restore e click utente (sempre WalletContext)
- Nel restore:
  - usare refs aggiornate (`walletStateRef`) invece di closure stale;
  - aggiungere `finally` per rilasciare sempre `restoreInFlightRef`;
  - non permettere al restore di sovrascrivere uno user-flow già in corso (`connectInFlightRef`/`signInFlightRef`).
- Risultato: niente “reset a DISCONNECTED” mentre l’utente sta tentando connessione.

3) Correggere definitivamente il fetch iniziale dei pixel (src/hooks/useSupabasePixels.ts + src/components/map/BitplaceMap.tsx)
- Root cause attuale: al `map.load` si chiama `setZoom(...)` + `updateBounds()`, ma `useSupabasePixels` vede ancora zoom vecchio (2) e svuota `dbPixels`.
- Fix:
  - estendere `updateViewport(bounds, zoomOverride?)` in `useSupabasePixels`;
  - usare `effectiveZoom = zoomOverride ?? zoomRef.current` nel gate `< 12`;
  - in `BitplaceMap` passare `map.getZoom()` dentro `updateViewport` dal `load` handler (e dagli update bounds generali).
- Risultato: i pixel appaiono subito al primo load anche con URL `?lat=...&lng=...&z=16` senza pan/zoom manuale.

4) Stabilizzare realtime (src/hooks/useSupabasePixels.ts)
- Rimuovere dipendenze che causano loop di subscribe/reconnect (`reconnectAttempts` nel callback di setup).
- Usare `reconnectAttemptsRef` + stato UI separato.
- Garantire una sola sottoscrizione attiva e backoff coerente.
- Questo non è la causa principale dei pixel mancanti, ma oggi peggiora la stabilità percepita.

5) Ridurre rumore auth che confonde il debug (src/hooks/useEdgeFunctionWarmup.ts)
- Evitare dispatch di “token expired” quando l’utente non è autenticato:
  - per warmup periodico leggere token in modo passivo (senza evento globale).
- Risultato: niente spam periodico di `token_expired_event` in console quando non serve.

Verifiche end-to-end previste
1) Phantom-first (utente nuovo, no Google):
- click “Phantom Wallet” → popup/flow parte;
- in caso errore/timeout ritorna stato riutilizzabile (no spinner infinito).

2) Google-first poi link wallet:
- login Google,
- “Connect Wallet” da menu,
- link completato con provider `both` senza blocchi.

3) Deep-link mappa:
- aprire `/?lat=45.5&lng=9.2&z=16` (o coordinate reali del cluster team),
- pixel visibili immediatamente, senza interazione manuale.

4) Realtime:
- niente loop aggressivi subscribe/closed;
- fallback polling attivo solo quando necessario.

File toccati in implementazione
- `src/contexts/WalletContext.tsx`
- `src/hooks/useSupabasePixels.ts`
- `src/components/map/BitplaceMap.tsx`
- `src/hooks/useEdgeFunctionWarmup.ts`

Note tecniche importanti
- Nessuna modifica schema database necessaria.
- Nessuna modifica ai flussi di linking account lato backend: la logica resta compatibile.
- Focus sul rendere deterministico il frontend (timeout + serializzazione flussi + zoom override iniziale).

