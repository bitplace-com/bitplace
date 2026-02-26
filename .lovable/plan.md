
## Fix: PRO Badge, Google Connect, Modal Copy e Contesto PE

### Problema 1: Badge PRO non mostrato per utenti wallet-only
Il blocco "Fully authenticated (wallet)" in `WalletButton.tsx` (righe 127-148) non controlla mai `energy.nativeBalance` per mostrare il ProBadge. Lo stesso vale per il path wallet-only in `UserMenuPanel.tsx` (righe 369-378).

**Fix in `WalletButton.tsx` (righe 127-148):**
- Aggiungere `<ProBadge shine size="sm" />` quando `energy.nativeBalance >= 1`, dopo il dot verde e l'indirizzo wallet

**Fix in `UserMenuPanel.tsx` (righe 99-109):**
- Nel blocco che gestisce il nome utente, aggiungere la condizione per wallet-only (non Google, non trial): se `energy.nativeBalance >= 1`, mostrare il ProBadge

### Problema 2: Opzione "Connect Google" mancante per utenti wallet-only
L'utente connesso solo con wallet non ha modo di aggiungere Google dal menu.

**Fix in `UserMenuPanel.tsx` (righe 369-378):**
- Nel blocco `else` (wallet-only), aggiungere un bottone "Connect Google" prima di "Disconnect" che chiama `googleSignIn()` (importato dal WalletContext), permettendo all'utente di ottenere i 300,000 Virtual PE aggiuntivi

### Problema 3: Indirizzo wallet nel modal di Sign In
In `WalletSelectModal.tsx`, la sezione `needsSignature` (riga 144) mostra `shortenAddress(connectedWalletAddress)`. Questo va rimosso perche' nel pannello deve esserci solo testo contestuale.

**Fix in `WalletSelectModal.tsx`:**
- Riga 144: sostituire `{shortenAddress(connectedWalletAddress)} · Sign to authenticate` con `Sign to complete authentication`
- Rimuovere la funzione `shortenAddress` (righe 14-16) non piu' usata

### Problema 4: "Test Wallet" -> "Test Account"
In `WalletSelectModal.tsx` riga 249, il bottone dice "Try Test Wallet". Va cambiato in "Try Test Account".

### Problema 5: Descrizioni PE piu' contestuali
Le descrizioni attuali sono troppo generiche. Vanno migliorate per spiegare concisamente la differenza:

**In `WalletSelectModal.tsx`:**
- **Phantom** (riga 208-211): sotto il nome, cambiare la descrizione in `"Permanent PE based on your $BIT holdings"` (o equivalente basato sullo stato di installazione)
- **Google** (riga 179-180): cambiare `"Start with 300,000 Starter PE"` in `"300,000 recyclable PE — pixels expire after 72h"`
- **Trial** (righe 234-238): cambiare il testo in `"Preview only — 10,000 test PE, nothing is saved to the map."`
- **DialogDescription** (riga 119): cambiare in `"Choose how to play Bitplace. Each method gives you different Pixel Energy."`

### Riepilogo file da modificare
- `src/components/wallet/WalletButton.tsx` — ProBadge nel path wallet-only
- `src/components/modals/UserMenuPanel.tsx` — ProBadge per wallet-only + bottone "Connect Google"
- `src/components/modals/WalletSelectModal.tsx` — rimuovere indirizzo wallet, rinominare Test Account, migliorare descrizioni PE
