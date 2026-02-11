
# Fix Progress Bar: Completamento Visivo e Continuita

## Problemi Identificati

### 1. La barra scompare senza mostrare il 100%
Nel `finally` di validate/commit in `useGameActions.ts`, `setProgress(null)` e `setIsValidating(false)` vengono chiamati nello stesso ciclo di render. In `OperationProgress.tsx`, la riga `if (!progress && !showComplete) return null` fa sparire il componente PRIMA che il `useEffect` possa settare `showComplete=true` e mostrare il flash a 100%.

### 2. Nessuna continuita visiva tra validate e commit
Quando il validate finisce, la barra sparisce. Quando il commit inizia, ne appare una nuova da 0%. L'utente percepisce un "reset" confuso.

### 3. La guardia `!progress` e troppo aggressiva
La condizione a riga 95 impedisce la visualizzazione della barra simulata perche `progress` puo essere null anche quando l'operazione e attiva.

## Modifiche

### 1. `src/components/map/OperationProgress.tsx`
- Rimuovere la guardia `if (!progress && !showComplete) return null` (riga 95) -- la barra deve mostrarsi ogni volta che `isActive` e true, indipendentemente da `progress`
- Semplificare la logica: mostrare il componente quando `isActive || showComplete`
- La simulazione parte immediatamente quando `isActive` diventa true, senza dipendere da `progress`

### 2. `src/hooks/useGameActions.ts`
- Nel `finally` di `validate()` (riga 468-472): NON settare `setProgress(null)` immediatamente. Lasciare che `OperationProgress` gestisca la transizione visiva tramite `isActive`
- Nel `finally` di `commit()` (riga 622-626): stesso fix
- Spostare `setProgress(null)` nel reset esplicito (`clearValidation`) e nell'inizio di una nuova operazione, non nel finally
- In alternativa, separare il flusso: settare `setProgress(null)` con un piccolo delay (700ms) dopo la fine dell'operazione per permettere il flash a 100%

### 3. `src/components/map/OperationProgress.tsx` - Miglioramento useEffect
- L'useEffect che gestisce il completamento (quando `isActive` diventa false) deve funzionare senza dipendere da `progress`
- Rimuovere `hasRealProgress` dalle dipendenze dell'effect principale per evitare restart indesiderati della simulazione
- Aggiungere un ref `wasActiveRef` per tracciare la transizione `isActive: true -> false` e triggerare il flash a 100% in modo affidabile

## Dettagli Tecnici

### OperationProgress.tsx - Nuova Logica

La logica di rendering diventa:

```text
isActive=true  -> mostra barra con simulazione (0% -> 90% logaritmico)
isActive=false, wasActive=true -> flash 100% per 600ms, poi nascondi
isActive=false, wasActive=false -> nascondi (null)
```

L'effetto usera un ref `wasActiveRef` per detectare la transizione:
- Quando `isActive` passa da true a false, setta `showComplete=true` e `simPercent=100`
- Dopo 600ms, setta `showComplete=false` e `simPercent=0`

### useGameActions.ts - Rimozione setProgress(null) dal finally

Nel `finally` di `validate()` e `commit()`:
- Rimuovere `setProgress(null)` 
- Mantenere `setIsValidating(false)` / `setIsCommitting(false)` e `setIsStalled(false)`
- `setProgress(null)` viene chiamato solo in `clearValidation()` e all'inizio di una nuova operazione (`validate()` e `commit()`)

Questo permette a `OperationProgress` di vedere `isActive=false` PRIMA che `progress` venga azzerato, dando tempo al flash di 100%.
