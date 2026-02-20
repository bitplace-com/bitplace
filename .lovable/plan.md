

## Fix: Trial PE 10.000 + Trial Wallet su Mobile

### 3 problemi

**1. Limite PE trial troppo basso (1.000 invece di 10.000)**
In `WalletContext.tsx`, la costante `TRIAL_PE_TOTAL` e impostata a 1000. Va cambiata a 10000. Il toast di attivazione va aggiornato.

**2. Tasto Trial Wallet mancante su mobile**
Il componente `MobileWalletButton` quando lo stato e "disconnected" mostra solo il bottone wallet e apre `WalletSelectModal` senza passargli `onActivateTrial`. Inoltre, non mostra il link "or try for free" che invece esiste nel `WalletButton` desktop. Serve aggiungere entrambe le opzioni.

**3. Trial drawing non funziona su mobile web**
Questo e una conseguenza del punto 2: se l'utente non puo attivare il trial mode (perche il bottone non esiste), quando prova a disegnare `requireWallet()` restituisce `false` e mostra l'alert "Connect your wallet". Una volta che il trial mode viene attivato correttamente (fix punto 2), il drawing funzionera perche `useWalletGate` gia gestisce `isTrialMode` correttamente (riga 27: `if (isTrialMode) return true`).

---

### Modifiche

#### File 1: `src/contexts/WalletContext.tsx`
- Riga 153: cambiare `TRIAL_PE_TOTAL = 1000` in `TRIAL_PE_TOTAL = 10000`
- Riga 278: aggiornare toast da `'1,000 trial PE'` a `'10,000 trial PE'`

#### File 2: `src/components/wallet/MobileWalletButton.tsx`
- Aggiungere `activateTrialMode` e `isTrialMode` dal `useWallet()` hook
- Nello stato "Not connected": aggiungere `onActivateTrial={activateTrialMode}` al `WalletSelectModal`
- Sotto al `GlassIconButton`, aggiungere il link "or try for free" (come nel `WalletButton` desktop) che chiama `activateTrialMode`

#### File 3: `src/components/modals/WalletSelectModal.tsx`
Nessuna modifica necessaria: il componente gia supporta `onActivateTrial` come prop opzionale e mostra il box "Try Test Wallet" quando e presente.

---

### Risultato atteso
- Trial PE parte da 10.000 invece di 1.000
- Su mobile, nella finestra wallet e sotto il bottone wallet, appare l'opzione trial
- Il disegno in trial mode funziona sia su desktop che su mobile

