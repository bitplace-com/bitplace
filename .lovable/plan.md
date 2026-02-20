
## Fix: Trial Mode viene sovrascritta dalla riconnessione Phantom

### Problema identificato
Ci sono **due bug** che impediscono il disegno in trial mode:

**Bug 1 - Race condition `restoreSession` vs `activateTrialMode`**

La funzione `restoreSession` in `WalletContext.tsx` e asincrona e cattura `isTrialMode=false` nella sua closure al mount. Quando l'utente clicca "try for free" DURANTE l'attesa del riconnesso Phantom:

1. `restoreSession` parte con `isTrialMode=false`
2. Fa `await attemptTrustedReconnect()` (asincrono)  
3. L'utente attiva il trial -> `walletState='AUTHENTICATED'`, `isTrialMode=true`
4. Phantom ritorna -> `restoreSession` sovrascrive con `walletState='AUTH_REQUIRED'`
5. Trial mode rotto: `walletState` non e piu `AUTHENTICATED`

Ma anche se il trial viene attivato DOPO che `restoreSession` ha finito, il Phantom disconnect handler (linea 843) non protegge il trial.

**Bug 2 - `usePaintQueue` blocca il painting senza token**

Anche se `requireWallet()` ritorna `true` (trial mode), il flusso per la modalita PAINT passa per `addToQueue()` che controlla `localStorage.getItem('bitplace_session_token')`. In trial mode non esiste nessun token, quindi `addToQueue` ritorna `false` silenziosamente.

### Soluzione

#### File 1: `src/contexts/WalletContext.tsx`

**A) Aggiungere un ref per il trial mode**
Creare `isTrialModeRef = useRef(isTrialMode)` sincronizzato con lo state. Questo permette di leggere il valore aggiornato dentro le closure asincrone.

**B) Guard in `restoreSession`**
Dopo `await attemptTrustedReconnect()`, ri-controllare `isTrialModeRef.current`. Se `true`, fare `return` immediato senza modificare lo stato.

**C) Guard in `activateTrialMode`**
Settare `restoreInFlightRef.current = false` e `isTrialModeRef.current = true` per impedire che un restore in corso sovrascriva.

**D) Guard nel Phantom disconnect handler**
Aggiungere `if (isTrialModeRef.current) return;` all'inizio di `handleDisconnect` per evitare che Phantom resetti lo stato trial.

#### File 2: `src/components/map/hooks/usePaintQueue.ts`

**A) Ricevere `isTrialMode` come parametro**
Il hook deve accettare un flag `isTrialMode` per bypassare i controlli del token.

**B) `addToQueue`: skip token check in trial**
Cambiare il check del token (linea 47-51) per accettare trial mode:
```
if (!isTrialMode) {
  const token = localStorage.getItem('bitplace_session_token');
  if (!token) { return false; }
}
```

**C) `flushQueue`: skip backend in trial**
In trial mode, `flushQueue` deve solo confermare i pixel localmente senza chiamare `validate`/`commit`:
```
if (isTrialMode) {
  // Confirm locally, no backend
  pixelsToCommit.forEach(({ x, y }) => confirmPixel(x, y));
  pendingPixelsRef.current = new Map();
  setQueue(new Set());
  return;
}
```

#### File 3: `src/components/map/BitplaceMap.tsx`

**Passare `isTrialMode` a `usePaintQueue`**
Aggiornare la chiamata al hook per passare il flag trial.

### Riepilogo modifiche

| File | Modifica |
|------|----------|
| `WalletContext.tsx` | Ref per trial mode + guard nel restore asincrono + guard nel Phantom disconnect |
| `usePaintQueue.ts` | Accettare `isTrialMode`, skip token check, skip backend flush |
| `BitplaceMap.tsx` | Passare `isTrialMode` a `usePaintQueue` |

### Cosa NON cambia
- La logica di `useWalletGate` e gia corretta (ritorna `true` in trial mode)
- Il `trialValidate` e `handleConfirm` trial gia implementati restano invariati
- Nessuna modifica al database o edge functions
