
## Fix: Emoji, PRO Badge, e Race Condition Google Auth

### Problema 1: Emoji nel testo (righe 163 e 211 di UserMenuPanel)
Due occorrenze di `⏱` nel testo "Starter pixels expire after 72h". Vanno rimosse entrambe.

**File:** `src/components/modals/UserMenuPanel.tsx`
- Riga 163: `⏱ Starter pixels expire after 72h` -> `Starter pixels expire after 72h`
- Riga 211: `⏱ Starter pixels expire after 72h` -> `Starter pixels expire after 72h`

---

### Problema 2: Badge PRO quando l'utente ha $BIT nel wallet
Quando `auth_provider === 'both'` e l'utente ha almeno 1 $BIT (cioe `energy.nativeBalance >= 1`), il badge deve passare da "STARTER" a "PRO" usando l'icona PixelPro con l'effetto dorato animato identico al badge admin (PixelBadgeCheck con `shine`).

**File da modificare:**

1. **`src/components/icons/custom/PixelPro.tsx`** -- Aggiungere supporto per la prop `shine` con lo stesso `linearGradient` animato del `PixelBadgeCheck`, applicato al `fill` del path principale.

2. **`src/components/ui/pro-badge.tsx`** -- Aggiungere una variante "connected" (non tier-based) che mostra il badge PRO dorato quando l'utente ha $BIT. Aggiungere prop `shine` per attivare l'animazione.

3. **`src/components/modals/UserMenuPanel.tsx`** -- Nel header utente (riga 98-103), quando `auth_provider === 'both'` e `energy.nativeBalance >= 1`, mostrare il badge PRO con effetto dorato al posto del badge STARTER.

4. **`src/components/wallet/WalletButton.tsx`** -- Nella sezione Google auth (riga ~80), quando `auth_provider === 'both'` e il bilancio $BIT e positivo, mostrare il badge PRO dorato invece di "STARTER".

---

### Problema 3: Google Auth non persiste (loader infinito + 0 PE al reload)
C'e una **race condition** tra il session restore e il callback `onAuthStateChange`:

**Sequenza del bug:**
1. L'utente torna dal redirect Google
2. L'effetto `restoreSession` (riga 990) parte: non trova token -> va al path Phantom -> `attemptTrustedReconnect()` (asincrono)
3. Nel frattempo, `onAuthStateChange` (riga 740) riceve `SIGNED_IN` -> chiama `auth-google` -> imposta `AUTHENTICATING`
4. Il restore finisce (no Phantom trovato) -> chiama `clearSession()` -> imposta `DISCONNECTED`
5. `auth-google` ritorna con successo -> salva il token -> imposta `AUTHENTICATED`
6. MA il token e stato salvato solo dopo `clearSession()`, quindi funziona... oppure no?

Il problema reale e che:
- `restoreInFlightRef` non viene MAI resettato a `false` nel path Google (riga 1015-1037) - impedisce future restore
- Sul reload, il restore trova il token Google e lo usa, MA la `walletAddress` non viene salvata in `WALLET_ADDRESS_KEY` durante il callback Google (riga 774), causando potenziali problemi
- Se `onAuthStateChange` si attiva anche al reload (Supabase detecta sessione attiva), puo' sovrascrivere lo stato gia' ripristinato dalla restore

**Fix in `src/contexts/WalletContext.tsx`:**

1. **Salvare `WALLET_ADDRESS_KEY`** nel callback `onAuthStateChange` (dopo riga 774): aggiungere `localStorage.setItem(WALLET_ADDRESS_KEY, walletAddress)` per garantire che il restore funzioni al reload.

2. **Guard nel callback `onAuthStateChange`**: Se lo stato e gia `AUTHENTICATED` (restore riuscito), non rieseguire il flusso auth-google. Evita doppia esecuzione al reload.

3. **Resettare `restoreInFlightRef`**: Aggiungere `restoreInFlightRef.current = false` dopo il restore Google (riga ~1037).

4. **Guard nel session restore**: Se `walletState` e gia `AUTHENTICATING` (il callback Google sta gia' lavorando), non procedere con il path Phantom che chiamerebbe `clearSession()`.

### Riepilogo file da modificare
- `src/components/modals/UserMenuPanel.tsx` (emoji + badge PRO)
- `src/components/wallet/WalletButton.tsx` (badge PRO)
- `src/components/icons/custom/PixelPro.tsx` (animazione shine)
- `src/components/ui/pro-badge.tsx` (variante shine)
- `src/contexts/WalletContext.tsx` (race condition fix)
