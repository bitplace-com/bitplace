
## Fix: Modalita Trial completa con tutte le azioni di gioco

### Problema
La modalita Trial ha tre bug critici che impediscono il funzionamento:

1. **Token expired listener rompe il trial**: Il listener `handleTokenExpired` in `WalletContext.tsx` (linea 853) controlla `walletState === 'AUTHENTICATED'` e resetta a `AUTH_REQUIRED`, senza verificare se `isTrialMode` e attivo. Poiche il token del wallet reale e scaduto, l'evento `TOKEN_EXPIRED_EVENT` si attiva ogni 2 minuti e sovrascrive lo stato trial.

2. **Session restore sovrascrive il trial al reload**: Se la pagina viene ricaricata con trial attivo, la session restore imposta `walletState` a `AUTH_REQUIRED` (dal wallet Phantom reale con token scaduto), sovrascrivendo lo stato `AUTHENTICATED` del trial.

3. **Trial mode bloccato per DEFEND/ATTACK/REINFORCE**: `handleConfirm` blocca esplicitamente tutte le azioni non-PAINT/ERASE in trial mode, e `handleValidate` richiede un token di sessione valido.

4. **Costo PE piatto**: Il trial usa un costo fisso di 1 PE per pixel, senza considerare il valore reale dei pixel occupati.

### Soluzione

#### File 1: `src/contexts/WalletContext.tsx`

**A) Token expired listener - proteggere il trial mode**
Alla linea 853, aggiungere un check `isTrialMode` prima di resettare lo stato:
```
if (walletState === 'AUTHENTICATED' && !isTrialMode) {
```

**B) Session restore - saltare se trial mode attivo**
All'inizio della funzione `restoreSession` (circa linea 745), aggiungere:
```
// Skip session restore if trial mode is active
if (isTrialMode) {
  walletDebug('session_restore_skip', { reason: 'trial_mode_active' });
  // Re-establish trial state
  activateTrialMode();
  restoreInFlightRef.current = false;
  return;
}
```
Nota: `isTrialMode` nella closure si riferisce allo state inizializzato da sessionStorage, quindi sara `true` se il trial era attivo prima del reload.

#### File 2: `src/components/map/BitplaceMap.tsx`

**A) handleValidate - branch trial mode**
All'inizio di `handleValidate` (dopo `clearError()`), aggiungere un branch per trial mode che:
- Salta il check del token
- Recupera i dati dei pixel selezionati dal DB (lettura pubblica, no auth)
- Calcola i costi reali basandosi su ownership e stake
- Crea un `ValidateResult` simulato e lo imposta tramite `setValidationResult` (riutilizzando il metodo `clearValidation` e il flow esistente)

Per il fetch dei dati pixel, usare `supabase.rpc('fetch_pixels_by_coords')` che e `SECURITY DEFINER` e accessibile con la sola anon key.

Logica di calcolo costi per trial:
- **PAINT su pixel vuoto**: 1 PE
- **PAINT su pixel occupato** (takeover): `max(0, owner_stake + def_total - atk_total) + 1` PE
- **PAINT su pixel proprio** (repaint): 0 PE (gia di proprieta)
- **ERASE proprio pixel**: 0 PE (refund simulato)
- **DEFEND**: `pePerPixel * pixelCount` (solo pixel propri)
- **ATTACK**: `pePerPixel * pixelCount` (solo pixel altrui)
- **REINFORCE**: `pePerPixel * pixelCount`
- **WITHDRAW_***: refund simulato

La risposta simulata segue la struttura `ValidateResult` con `ok`, `requiredPeTotal`, `breakdown`, `snapshotHash` (hash fittizio), e `invalidPixels`.

**B) handleConfirm - espandere trial mode per tutti i game modes**
Rimuovere il blocco alle linee 1417-1421 che limita il trial a PAINT e ERASE. Espandere il branch trial per gestire:

- **PAINT**: (gia funzionante) Aggiungere calcolo costi reali basato sui dati pixel fetchati durante la validazione, invece del costo fisso di 1 PE/pixel.
- **ERASE**: (gia funzionante) Come prima.
- **DEFEND/ATTACK/REINFORCE**: Detrarre PE dal trial, mostrare toast di successo. I pixel non cambiano visivamente (come nel gioco reale), ma il PE viene detratto.
- **WITHDRAW_***: Aggiungere PE al trial (refund), mostrare toast di successo.

Per tutti i modi, usare `updateTrialPe()` per aggiornare il bilancio trial.

**C) Trial ownership tracking (opzionale, miglioramento futuro)**
Aggiungere un `useRef<Map<string, { ownerId: string; stake: number }>>` per tracciare i pixel "posseduti" dal trial user. Quando l'utente dipinge su un pixel in trial mode, aggiornare questa mappa. Questo permette al calcolo dei costi successivi di considerare i pixel gia dipinti nella stessa sessione trial.

### Considerazioni

- **Nessun dato salvato**: Tutte le azioni trial modificano solo lo stato locale (React state, tile cache). Nessuna edge function viene chiamata.
- **Lettura DB pubblica**: `fetch_pixels_by_coords` e un RPC function SECURITY DEFINER accessibile con anon key, quindi funziona senza auth.
- **Reload pagina**: Al reload, tutti i pixel trial spariscono (tile cache resettato) ma il trial mode rimane attivo (sessionStorage).
- **Nessun conflitto con il gioco reale**: I pixel trial non vengono scritti nel DB, quindi non interferiscono con altri giocatori.
- **PE realistici**: I costi seguono le regole reali del gioco basandosi sullo stato attuale dei pixel nel database.
