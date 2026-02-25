

## Fix: Rinominare "Connect Wallet" in "Sign In"

### Problema
Il codice backend e il modal di selezione sono gia completi (Google + Phantom + Trial). Ma il bottone iniziale visibile all'utente dice "Connect Wallet", dando l'impressione che serva per forza un wallet crypto. L'utente non sa che puo anche usare Google.

### Modifiche

**1. `src/components/wallet/WalletButton.tsx`**
- Stato disconnesso (riga 155-168): cambiare testo da "Connect Wallet" a "Sign In" e icona da `wallet` a `user`
- Stato AUTH_REQUIRED (riga 58-70): cambiare testo da "Connect Wallet" a "Sign In" (questo stato si attiva quando il wallet e connesso ma manca la firma)
- Rimuovere il link "or try for free" sotto il bottone (la trial option e gia dentro il WalletSelectModal)

**2. `src/components/wallet/MobileWalletButton.tsx`**
- Stato non connesso (riga 72-93): cambiare `aria-label` da "Connect Wallet" a "Sign In", icona da `wallet` a `user`
- Rimuovere il link "or try for free" (gia presente nel modal)

### Dettagli tecnici

```text
WalletButton disconnected state:
  Before: <PixelIcon name="wallet" /> Connect Wallet
  After:  <PixelIcon name="user" /> Sign In

WalletButton AUTH_REQUIRED state:
  Before: <PixelIcon name="wallet" /> Connect Wallet  
  After:  <PixelIcon name="wallet" /> Sign In

MobileWalletButton disconnected state:
  Before: <PixelIcon name="wallet" /> aria-label="Connect Wallet"
  After:  <PixelIcon name="user" /> aria-label="Sign In"
```

### Risultato
- L'utente vede "Sign In" -- clicca -- si apre il modal con Google e Phantom come opzioni
- Chiaro che non serve un wallet per iniziare
- Il link "or try for free" sparisce dal bottone principale (ma resta nel modal come opzione)

