

## Fix: Wallet Linking + 72h Countdown + UI per doppia connessione

### Problema 1: "Connect Wallet" dice "coming soon"
In `WalletContext.tsx` riga 643, `linkWallet` mostra solo un toast "coming soon" invece di attivare il flusso Phantom. Va implementato il flusso reale: aprire il modale di connessione Phantom, e dopo la connessione + firma, chiamare `auth-verify` con il token Google esistente per fare upgrade a `auth_provider: 'both'`.

**Approccio**: Dato che il flusso di connessione Phantom esiste gia (`connect` + `performAuthentication`), `linkWallet` deve:
1. Verificare che Phantom sia disponibile
2. Chiamare `connect()` di Phantom per ottenere l'indirizzo wallet
3. Chiamare `performAuthentication(wallet)` per ottenere nonce + firma
4. Il backend `auth-verify` deve gestire il caso in cui l'utente ha gia una sessione Google: aggiornare `auth_provider` da `google` a `both` e aggiungere `wallet_address`

**File da modificare**:
- `src/contexts/WalletContext.tsx`: Riscrivere `linkWallet` per eseguire il flusso Phantom reale (connect + sign + auth-verify)
- `supabase/functions/auth-verify/index.ts`: Aggiungere logica per gestire il linking: se l'utente esiste gia con `auth_provider: 'google'`, aggiornare a `both` e salvare il `wallet_address`

### Problema 2: Countdown dice 24h invece di 72h
In `UserMenuPanel.tsx` riga 163, il testo dice "Starter pixels expire after 24h" ma il backend usa correttamente 72h. Fix semplice: cambiare il testo.

**File da modificare**:
- `src/components/modals/UserMenuPanel.tsx`: Riga 163, cambiare "24h" in "72h"

### Problema 3: UI per doppia connessione (auth_provider: 'both')
Quando un utente Google collega anche il wallet, il `UserMenuPanel` deve mostrare **entrambi** i tipi di PE:
- Virtual PE (Starter PE) con countdown 72h
- Real PE dal wallet $BIT

**File da modificare**:
- `src/components/modals/UserMenuPanel.tsx`: Aggiungere sezione wallet quando `auth_provider === 'both'`, mostrando sia Starter PE che Real PE
- `src/components/wallet/WalletButton.tsx`: Aggiornare lo stato Google auth per mostrare il badge corretto quando `auth_provider === 'both'` (rimuovere badge STARTER, mostrare indirizzo wallet)

### Dettagli tecnici

#### auth-verify (edge function)
Aggiungere al flusso di verifica:
```text
Se il JWT in arrivo contiene authProvider === 'google' o 'both':
  1. Cercare l'utente per wallet_address
  2. Se non esiste un utente con quel wallet MA esiste l'utente Google (dal JWT):
     - Aggiornare auth_provider a 'both'
     - Salvare wallet_address
     - Emettere nuovo JWT con authProvider: 'both' e wallet
  3. Se esiste gia un utente con quel wallet: errore (wallet gia in uso)
```

#### linkWallet (WalletContext)
```text
1. Ottenere provider Phantom
2. phantom.connect() -> walletAddress
3. Chiamare auth-nonce con wallet
4. Firmare il nonce con Phantom
5. Chiamare auth-verify con:
   - wallet, signature, nonce
   - Header Authorization con il token Google corrente (per identificare l'utente)
6. Ricevere nuovo JWT con authProvider: 'both'
7. Aggiornare stato locale (user, energy, walletAddress)
8. Refreshare energy e PE status
```

#### UserMenuPanel - Sezione Wallet per 'both'
Quando `authProvider === 'both'`:
- Mostrare sezione Wallet con balance $BIT e indirizzo
- Mostrare sezione Starter PE separata con contatore VPE
- Nelle stats, mostrare PE totali (real + virtual)
- Rimuovere il bottone "Connect Wallet", mostrare solo "Disconnect"

