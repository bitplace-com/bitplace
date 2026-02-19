

# Piano: Guided Tour + Test Wallet (Trial Mode)

## Panoramica

Due funzionalita' di onboarding che lavorano insieme:

1. **Guided Tour** - Tour step-by-step con overlay scuro che illumina le aree chiave
2. **Test Wallet** - Wallet fittizio con 1000 PE attivabile dall'utente con un click esplicito

---

## 1. Guided Tour

### Come funziona
- Al primo accesso (senza wallet connesso e senza `localStorage.bitplace_tour_seen`), appare un dialog centrale: **"Welcome to Bitplace!"** con due bottoni: **"Take a tour"** e **"Skip"**
- Se l'utente accetta, parte un tour di 7 step con overlay scuro (`bg-black/60`) e un "buco" illuminato sull'elemento target
- Ogni step ha un tooltip/card con testo breve e bottoni **"Next"** / **"Skip tour"**
- Il buco viene calcolato con `getBoundingClientRect()` + `clip-path: polygon()` in tempo reale
- Gli elementi target vengono identificati con attributi `data-tour="nome"`

### Step del tour

| # | Target | Testo | Azione speciale |
|---|--------|-------|-----------------|
| 1 | Centro (dialog) | "Welcome to Bitplace! Paint pixels on a real-world map and claim territory." | Bottoni: Take a tour / Skip |
| 2 | MapToolbar | "Switch between Paint, Defend, Attack and Reinforce modes here." | - |
| 3 | ActionTray (collapsed) | "This is your drawing panel. Tap to expand and pick colors." | Al click Next, si espande il tray |
| 4 | ActionTray (expanded) | "Choose a color, pick a brush, and start painting!" | - |
| 5 | MapMenuDrawer | "Access Rules, Leaderboard, Alliance and more from this menu." | - |
| 6 | QuickActions | "Search any location and check your notifications." | - |
| 7 | WalletButton | "Connect your Phantom wallet to save paintings, or try the Test Wallet to paint for free!" | Bottone finale: "Got it!" |

### Transizione step 3 -> 4
- Il tour dispatcha un evento `bitplace:tour-expand-tray` che l'ActionTray ascolta per auto-espandersi
- L'ActionTray espone un listener per questo evento

### File coinvolti
- **Nuovo:** `src/components/map/GuidedTour.tsx` - Componente overlay + tooltip
- **Nuovo:** `src/hooks/useGuidedTour.ts` - Stato del tour, step corrente, logica skip/complete
- **Modificato:** `src/components/map/BitplaceMap.tsx` - Aggiungere `<GuidedTour />`, attributi `data-tour`
- **Modificato:** `src/components/map/MapToolbar.tsx` - `data-tour="toolbar"`
- **Modificato:** `src/components/map/ActionTray.tsx` - `data-tour="action-tray"`, listener evento expand
- **Modificato:** `src/components/map/MapMenuDrawer.tsx` - `data-tour="menu"`
- **Modificato:** `src/components/map/QuickActions.tsx` - `data-tour="quick-actions"`
- **Modificato:** `src/components/wallet/WalletButton.tsx` - `data-tour="wallet"`
- **Modificato:** `src/components/wallet/MobileWalletButton.tsx` - `data-tour="wallet"`

---

## 2. Test Wallet (Trial Mode)

### Attivazione esplicita dall'utente
L'utente attiva il trial mode cliccando un bottone in uno di questi posti:

1. **WalletSelectModal** - Sotto il bottone Phantom, un link: "Or try without a wallet" con breve spiegazione ("Paint with 1,000 free test PE. Nothing is saved -- it's just a preview.")
2. **WalletButton** (disconnected) - Sotto "Connect Wallet", un testo cliccabile "or try for free"
3. **Ultimo step del tour** - Bottone "Try Test Wallet" accanto a "Got it!"

### Cosa succede quando si attiva
- Il `WalletContext` entra in `isTrialMode = true`
- Viene generato un fake user con:
  - `walletAddress`: `"TRIAL...MODE"` 
  - `user.id`: UUID locale (crypto.randomUUID())
  - `user.display_name`: `"Test Player"`
  - `energy.peTotal`: 1000
  - `energy.peAvailable`: 1000
  - `energy.nativeBalance`: 0.5 (fake SOL)
  - `energy.walletUsd`: calcolato
  - `energy.cluster`: `"devnet"`
  - `walletState`: `"AUTHENTICATED"`
- Lo stato viene salvato in `sessionStorage` (sparisce chiudendo il tab)

### Intercettazione del commit
- In `BitplaceMap.tsx`, nel `handleConfirm`, se `isTrialMode`:
  - I pixel vengono applicati SOLO localmente via `paintPixel()` / `addPixels()`
  - I PE vengono decrementati localmente (1 PE per pixel)
  - Non viene chiamata nessuna edge function (ne' validate ne' commit)
  - Viene mostrato un toast di successo con badge "TRIAL"
  - Se i PE finiscono: toast "Trial PE exhausted -- connect your wallet for unlimited painting"

### Badge TRIAL visibile ovunque
- **StatusStrip**: badge `TRIAL` arancione accanto al cluster badge, tooltip "This is a test session. Connect a real wallet to save your work."
- **WalletButton**: mostra "Test Wallet" con icona e badge TRIAL arancione invece dell'indirizzo
- **UserMenuPanel**: header con "Test Player" e badge TRIAL, tutti i valori mostrano i dati fake, bottone "Connect Real Wallet" al posto di "Disconnect"

### Disattivazione
- Quando l'utente collega il wallet reale: `isTrialMode` diventa `false`, `sessionStorage` pulito, pixel locali non committati spariscono
- Bottone "Exit Trial" visibile nel UserMenuPanel in trial mode

### File coinvolti
- **Modificato:** `src/contexts/WalletContext.tsx` - `isTrialMode`, `activateTrialMode()`, `exitTrialMode()`, fake user/energy, esporre nel context
- **Modificato:** `src/hooks/useWalletGate.ts` - In trial mode, `requireWallet()` ritorna `true` (bypass del gate)
- **Modificato:** `src/components/map/BitplaceMap.tsx` - Intercettare commit in trial mode, simulare localmente
- **Modificato:** `src/components/map/StatusStrip.tsx` - Badge TRIAL
- **Modificato:** `src/components/wallet/WalletButton.tsx` - UI trial mode + link "try for free"
- **Modificato:** `src/components/wallet/MobileWalletButton.tsx` - Badge TRIAL
- **Modificato:** `src/components/modals/WalletSelectModal.tsx` - Bottone "Or try without a wallet" con spiegazione
- **Modificato:** `src/components/modals/UserMenuPanel.tsx` - Dati trial + badge + "Connect Real Wallet"

---

## Sequenza di implementazione

1. **WalletContext** - Aggiungere `isTrialMode`, `activateTrialMode()`, `exitTrialMode()`, dati fake
2. **useWalletGate** - Bypass gate in trial mode
3. **WalletSelectModal** - Bottone "Or try without a wallet"
4. **WalletButton + MobileWalletButton** - Link "try for free" + UI trial
5. **UserMenuPanel** - Adattamento dati trial + badge
6. **StatusStrip** - Badge TRIAL
7. **BitplaceMap** - Intercettazione commit in trial mode
8. **GuidedTour + useGuidedTour** - Componente tour + hook
9. **Attributi data-tour** - Su tutti gli elementi target
10. **Collegamento tour -> trial** - Ultimo step suggerisce trial wallet

## Valutazione rischi

**Nessun rischio critico.** Entrambe le feature sono additive:
- Il tour e' un overlay sopra la mappa che non modifica nulla sotto
- Il trial mode intercetta il commit PRIMA che arrivi alle edge function, quindi nessun dato sporco in DB
- Il wallet reale sovrascrive sempre il trial (pulizia automatica)
- Se qualcosa va storto nel tour, la mappa funziona normalmente sotto l'overlay

