

# Fix: Barra di progresso REINFORCE bloccata al 29%

## Problema
La barra di progresso durante il REINFORCE si ferma al ~29% e poi salta al 100%. Questo succede perche' la edge function `game-commit` invia eventi di progresso SSE solo durante la fase di **fetch dei pixel** (che e' veloce e finisce presto), ma non durante la fase di **update dei pixel** (che e' la parte piu' lunga). Quindi il frontend vede il progresso arrivare a ~29% (fine fetch), poi non riceve piu' aggiornamenti fino al completamento.

## Soluzione
Aggiungere eventi di progresso SSE anche durante la fase di update REINFORCE nel `game-commit`. Dopo ogni batch di update completato, inviare un evento `progress` al frontend, cosi' la barra avanza in modo continuo e coerente con il lavoro effettivo.

## File da modificare

### 1. `supabase/functions/game-commit/index.ts`
Nella sezione REINFORCE (righe ~311-345), dopo ogni gruppo parallelo di batch update completato, inviare un evento SSE di progresso:

```typescript
// Dentro il loop REINFORCE, dopo ogni Promise.all di batch
for (let i = 0; i < reinforceBatches.length; i += MAX_PARALLEL) {
  const parallelGroup = reinforceBatches.slice(i, i + MAX_PARALLEL);
  const results = await Promise.all(
    parallelGroup.map(async (batch) => {
      // ... update logic esistente ...
    })
  );
  affectedPixels += results.reduce((a, b) => a + b, 0);
  
  // NUOVO: Inviare progresso SSE dopo ogni gruppo parallelo
  const processedSoFar = Math.min(i + MAX_PARALLEL, reinforceBatches.length);
  sendSSE(encoder, controller, {
    type: 'progress',
    phase: 'commit',
    processed: processedSoFar * REINFORCE_BATCH,
    total: ownedPixels.length
  });
}
```

Questo richiede che la funzione `sendSSE` (o equivalente gia' presente nel file) sia accessibile nella sezione REINFORCE, e che il `controller` dello stream SSE sia in scope.

### 2. `src/components/map/OperationProgress.tsx`
Nessuna modifica necessaria -- il componente gia' gestisce correttamente gli eventi `progress` con fase `commit`. Quando riceve `processed/total`, la barra avanza automaticamente.

## Risultato atteso
- La barra di progresso avanza in modo continuo durante tutto il REINFORCE
- Per 1681 pixel con batch da 100 e 5 paralleli: circa 4 aggiornamenti di progresso (17 batch / 5 paralleli = ~4 gruppi)
- Nessun salto improvviso da 29% a 100%

