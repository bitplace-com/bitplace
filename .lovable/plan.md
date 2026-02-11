
# Fix Loading UI: Rimuovi Spinner Duplicato e Aggiungi Progresso Visivo

## Problema 1: Spinner Duplicato
Il bottone "Validate"/"Paint" mostra un `Loader2` animato dentro il testo del bottone, e il componente `OperationProgress` sotto il bottone mostra un altro `Loader2`. Rimuoviamo lo spinner dal bottone e manteniamo solo quello in `OperationProgress`.

## Problema 2: Barra di Progresso Ferma
La modalita PAINT usa richieste JSON non-streaming (`invokeWithRetry`), che non emettono eventi di progresso intermedi. Il `progress` rimane a `{processed: 0, total: N}` per tutta la durata. La barra resta a 0%.

### Soluzione: Progresso Simulato a Fasi

Dato che le richieste PAINT sono chiamate HTTP singole senza progresso incrementale reale, implementiamo un progresso simulato basato su fasi temporali:

- **Validate**: Anima da 0% a 90% durante l'attesa, salta a 100% al completamento
- **Commit**: Anima da 0% a 90% durante l'attesa, salta a 100% al completamento

Il progresso accelera all'inizio e rallenta verso la fine (easing), dando un feedback realistico.

## Modifiche Tecniche

### 1. `src/components/map/inspector/ActionBox.tsx`
- Rimuovere `Loader2` e spinner animato dal testo dei bottoni "Validate" e "Paint" durante il loading
- Mostrare solo testo statico ("Validating..." / "Painting...") nel bottone, senza icona rotante
- Lo spinner rimane solo nel componente `OperationProgress` sotto

### 2. `src/components/map/OperationProgress.tsx`
- Aggiungere un hook `useEffect` con `requestAnimationFrame` per simulare il progresso quando `progress.processed === 0` (nessun progresso reale dal server)
- L'animazione usa una curva logaritmica: avanza rapidamente fino al 60%, poi rallenta fino al 90% dove si ferma in attesa del completamento
- Quando `isActive` diventa `false`, il progresso salta brevemente a 100% prima di scomparire
- Mostrare la label della fase corrente ("Validating..." / "Painting...") con la percentuale simulata

### 3. `src/hooks/useGameActions.ts`
- Nel path non-streaming (PAINT), aggiungere aggiornamenti di progresso nelle transizioni di fase:
  - Inizio validate: `setProgress({ processed: 0, total: pixelCount })`
  - Fine validate / Inizio commit: `setProgress({ processed: Math.floor(pixelCount * 0.5), total: pixelCount })`
  - Questo da almeno un salto al 50% tra le due fasi, migliorando il feedback anche senza simulazione

## Performance
L'analisi dei log conferma che le edge function sono performanti:
- Validate: ~2.8s per 300px (la maggior parte e il fetch parallelo user+pixels)
- Commit: ~590ms per 300px (fetch 175ms + upsert 414ms)
- I tempi piu lunghi (5-7s) sono dovuti a cold start del DB, gia mitigati dal sistema di PING warmup

Non servono modifiche backend per la performance.
