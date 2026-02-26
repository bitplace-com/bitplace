
## Fix: Connessioni Wallet+Google, Separatori Migliaia, Badge PRO

### Problema 1: CORS mancante per `x-link-token`
**File:** `supabase/functions/auth-verify/index.ts` (riga 22)

Il header `x-link-token` usato dal flow `linkWallet` (Google -> Wallet) NON e' incluso nei CORS allowed headers. Il browser blocca il preflight e la funzione non riceve mai la richiesta, causando l'errore "Server could not verify your signature".

**Fix:** Aggiungere `x-link-token` alla lista degli headers CORS consentiti.

### Problema 2: Race condition Wallet -> Google
**File:** `src/contexts/WalletContext.tsx` (riga 749)

Quando un utente wallet-only clicca "Connect Google", la pagina redirige a Google OAuth. Al ritorno, `onAuthStateChange` fires `SIGNED_IN`, ma il guard `if (walletState === 'AUTHENTICATED') return;` blocca il processing perche' il session restore ha gia' ripristinato la sessione wallet.

**Fix:** Cambiare il guard: permettere il processing quando la sessione corrente e' wallet-only (non Google/both). Se l'utente e' gia' autenticato con wallet, il callback Google deve procedere per eseguire l'upgrade a 'both'.

### Problema 3: Stato energia dopo Google callback per utenti 'both'
**File:** `src/contexts/WalletContext.tsx` (righe 791-803)

Quando `auth-google` ritorna un utente con `auth_provider: 'both'`, il client imposta l'energia su soli virtual PE, perdendo il bilancio wallet. Per utenti 'both', bisogna preservare i dati wallet e aggiungere i virtual PE.

**Fix:** Dopo il callback auth-google, se l'utente e' 'both', chiamare `updateEnergyFromUser` e poi `refreshEnergy` per ripristinare il bilancio wallet completo, e impostare i virtual PE separatamente.

### Problema 4: Separatori migliaia nei toast
**File:** `src/contexts/WalletContext.tsx` (riga 531)

La riga `${data.nativeBalance.toFixed(4)}` non usa separatori delle migliaia. "100000000.0000 BIT" deve diventare "100,000,000.0000 BIT".

**Fix:** Usare `data.nativeBalance.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 })` nel toast.

### Problema 5: Badge PRO prevale su STARTER
**File:** `src/components/wallet/WalletButton.tsx` (righe 83-125)

Per utenti con `auth_provider: 'both'` e `nativeBalance >= 1`, il badge deve essere PRO, non STARTER. La logica attuale nel path Google mostra STARTER per `isGoogleOnly`, ma quando l'utente ha entrambi (`auth_provider: 'both'`) e ha $BIT, il badge STARTER non deve comparire.

La logica attuale e' gia' quasi corretta (riga 108-116), ma serve assicurarsi che il path 'both' non mostri STARTER e mostri sempre PRO se ha $BIT >= 1.

### Problema 6: Mostrare entrambi i bilanci PE per utenti 'both'
**File:** `src/components/wallet/WalletButton.tsx`

Per utenti 'both' con PRO, il WalletButton dovrebbe mostrare il PE disponibile totale (reale + virtuale). L'utente deve vedere che ha sia i PE del wallet che i 300k virtual PE.

### Problema 7: Connect Google per wallet-only utenti
**File:** `src/contexts/WalletContext.tsx`

La funzione `googleSignIn` redirige a Google OAuth. Al ritorno, `auth-google` deve gestire correttamente l'upgrade da wallet-only a 'both'. Il session restore deve riconoscere il nuovo token 'both'.

### Riepilogo file da modificare

| File | Modifica |
|------|----------|
| `supabase/functions/auth-verify/index.ts` | Aggiungere `x-link-token` ai CORS headers |
| `src/contexts/WalletContext.tsx` | Fix race condition guard (riga 749), fix energia per 'both' (righe 791-803), fix toast separatori (riga 531) |
| `src/components/wallet/WalletButton.tsx` | Assicurare che badge PRO prevalga su STARTER per 'both' con $BIT |

### Dettagli tecnici delle modifiche

**auth-verify CORS (riga 22):**
```text
"Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-link-token"
```

**onAuthStateChange guard (riga 749):**
```text
// Solo skip se gia' autenticato con Google/both (non wallet-only)
if (walletState === 'AUTHENTICATED') {
  const currentProvider = user?.auth_provider || 
    parseJwtPayload(getSessionToken() || '')?.authProvider;
  if (currentProvider === 'google' || currentProvider === 'both') {
    return; // Gia' Google/both, skip
  }
  // Wallet-only -> allow upgrade to 'both'
}
```

**Toast con separatori (riga 531):**
```text
`${data.nativeBalance.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 })} ${data.nativeSymbol} = ${data.peTotal.toLocaleString()} PE`
```

**Energia per 'both' users dopo Google callback (righe 791-803):**
Controllare `user.auth_provider` -- se 'both', non sovrascrivere con energy virtual-only. Usare `updateEnergyFromUser` e impostare i virtual PE come aggiunta.
