
## Fix: Disegno in trial mode su mobile + Aggiornamento testi PE

### 3 modifiche

---

### 1. Bug critico: Disegno bloccato in trial mode (mobile e desktop)

**Causa**: In `useDraftPaint.ts`, la funzione `addToDraft` usa `useCallback` con dipendenza `[draft]` (riga 94), ma legge `isTrialMode` dalla closure. Quando l'utente attiva il trial mode, `isTrialMode` diventa `true` ma il callback ha ancora il valore vecchio (`false`) perche non e nelle dipendenze. Quindi il check alla riga 54 non viene mai skippato e il token non esiste, mostrando "Sign in to paint".

**Fix**: Aggiungere `isTrialMode` alle dipendenze del `useCallback` a riga 94:
```
}, [draft, isTrialMode]);
```

**File**: `src/components/map/hooks/useDraftPaint.ts` (riga 94)

---

### 2. Testo toast attivazione trial: "10,000" -> "100,000"

**File**: `src/contexts/WalletContext.tsx` (riga 278)
- Da: `'10,000 trial PE ready to use. Nothing is saved.'`
- A: `'100,000 trial PE ready to use. Nothing is saved.'`

---

### 3. Testo modale wallet: "1,000" -> "100,000"

**File**: `src/components/modals/WalletSelectModal.tsx` (riga 196)
- Da: `Paint with 1,000 free test PE.`
- A: `Paint with 100,000 free test PE.`
