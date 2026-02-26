
# Rimozione completa della modalità Trial (Demo)

## Motivazione
Con l'autenticazione Google che offre 300.000 pixel gratuiti, la modalità Trial (10.000 pixel locali, nulla salvato) non aggiunge valore e crea confusione. Rimuoverla semplifica il codice e l'esperienza utente.

## Rischi / Problemi
Nessun rischio reale:
- I dati Trial sono solo in `localStorage`/`sessionStorage` (nessuna tabella DB coinvolta)
- Nessun utente perde dati permanenti (i pixel Trial non venivano mai salvati)
- Il flusso di autenticazione Google + Phantom resta invariato

## File da modificare (14 file coinvolti)

### 1. WalletContext.tsx — Rimuovere stato e logica Trial
- Eliminare costanti: `TRIAL_MODE_KEY`, `TRIAL_WALLET_ADDRESS`, `TRIAL_PE_TOTAL`, `TRIAL_BIT_BALANCE`, `TRIAL_BIT_PRICE`, `trialEnergyState`
- Eliminare stato `isTrialMode` e ref `isTrialModeRef`
- Eliminare funzioni `activateTrialMode`, `exitTrialMode`, `updateTrialPe`
- Rimuovere `isTrialMode` dal tipo del context e dal valore fornito
- Semplificare `isConnected`, `isAuthenticated`, `needsSignature` (rimuovere check `isTrialMode`)
- Rimuovere il branch trial dalla session restore

### 2. WalletSelectModal.tsx — Rimuovere Tier 3 (Demo)
- Rimuovere la prop `onActivateTrial` e il suo blocco UI (icona sparkles, "Try Without Account")
- Rimuovere il separatore "or" prima del Tier Demo

### 3. WalletButton.tsx (desktop) — Rimuovere riferimenti Trial
- Rimuovere prop `onActivateTrial` passata a `WalletSelectModal`
- Rimuovere import/uso di `activateTrialMode` e `isTrialMode`

### 4. MobileWalletButton.tsx — Stessa pulizia
- Rimuovere `activateTrialMode` e `isTrialMode` dal destructuring di `useWallet()`
- Rimuovere `onActivateTrial` dal `WalletSelectModal`

### 5. UserMenuPanel.tsx — Rimuovere badge e sezioni Trial
- Rimuovere il badge "TRIAL", il testo "Test session", il bottone "Exit Trial", il bottone "Connect Real Wallet"
- Semplificare tutte le condizioni `!isTrialMode` (diventano sempre true, quindi rimuovibili)

### 6. useWalletGate.ts — Rimuovere bypass Trial
- Rimuovere `isTrialMode` dal destructuring e dalla prima riga di `requireWallet`
- Rimuovere dalla dependency array del `useCallback`

### 7. BitplaceMap.tsx — Pulizia consistente
- Rimuovere `isTrialMode`, `activateTrialMode`, `updateTrialPe` dal destructuring
- Rimuovere `trialValidationRef`, `TRIAL_PIXELS_KEY`, `MAX_TRIAL_PIXELS`
- Rimuovere `saveTrialPixelsToStorage` e l'effect di restore trial pixels
- Rimuovere tutti i branch `if (isTrialMode)` nel flusso paint/validate/commit
- Rimuovere `isTrialMode` passato a `usePaintQueue`

### 8. usePaintQueue.ts — Rimuovere parametro Trial
- Rimuovere il parametro `isTrialMode` dalla firma
- Rimuovere i branch che saltano il backend in modalita Trial

### 9. useDraftPaint.ts — Rimuovere check Trial
- Rimuovere `isTrialMode` da `useWallet()` e il branch che salta l'auth check

### 10. usePixelDetails.ts — Rimuovere parametro e logica Trial
- Rimuovere il parametro `isTrialMode` e tutta la logica "You (Trial)"
- Rimuovere il lookup in `bitplace_trial_pixels` localStorage

### 11. StatusStrip.tsx — Rimuovere badge Trial
- Rimuovere `isTrialMode` dal destructuring
- Rimuovere il badge "TRIAL" e la condizione `!isTrialMode` su cluster badge

### 12. TermsPage.tsx — Aggiornare copy
- Rimuovere il riferimento a "trial experience" nel testo legale, mantenendo la descrizione VPE/Google

### 13. HudOverlay.tsx (o dove viene passato `isTrialMode` a `usePixelDetails`)
- Rimuovere il passaggio del parametro `isTrialMode`

### 14. Memory file — Eliminare o aggiornare
- Rimuovere `memory/features/test-wallet-trial-mode` e `memory/gameplay/test-account-trial-limits`

## Ordine di implementazione
1. `WalletContext.tsx` (cuore della logica)
2. `WalletSelectModal.tsx` (UI modale)
3. `WalletButton.tsx` + `MobileWalletButton.tsx` (bottoni)
4. `BitplaceMap.tsx` + `usePaintQueue.ts` + `useDraftPaint.ts` (flusso paint)
5. `useWalletGate.ts` + `usePixelDetails.ts` (hooks)
6. `UserMenuPanel.tsx` + `StatusStrip.tsx` (UI)
7. `TermsPage.tsx` (copy legale)
8. Pulizia riferimenti rimanenti
