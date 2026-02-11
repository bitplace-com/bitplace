
# Ottimizzazione Velocita e Progresso Visivo

## Analisi dai Log

I log mostrano chiaramente il problema:
- **DB caldo**: validate ~1.5s, commit ~600ms (veloce)
- **DB freddo**: validate ~5.7s (fetchPixelsByCoords), commit PING 8.6s + fetch 2.1s (lento)
- La barra si ferma a 89% perche la curva attuale raggiunge quel valore dopo ~17 secondi, ma le operazioni durano 2-10 secondi

## Modifiche

### 1. Curva di progresso piu veloce (`src/components/map/OperationProgress.tsx`)
- Cambiare il divisore della curva logaritmica da 8 a 3
- Con divisore 3: raggiunge 60% in ~3s, 80% in ~5s, 89% in ~7s
- Questo si allinea meglio ai tempi reali delle operazioni (1.5-6s)
- Formula: `90 * (1 - Math.exp(-elapsed / 3))`

### 2. Pre-warmup di game-commit durante il validate (`src/hooks/useGameActions.ts`)
- Quando il validate inizia, lanciare un PING fire-and-forget a `game-commit`
- Questo scalda il DB pool del commit mentre l'utente aspetta la validazione
- Quando il commit parte dopo, il DB e gia caldo e risponde in ~600ms invece di 8+ secondi
- Aggiungere una funzione helper `warmupCommit()` che invia un PING a game-commit senza attendere la risposta

### 3. Ridurre intervallo warmup periodico (`src/hooks/useEdgeFunctionWarmup.ts`)
- Ridurre `WARMUP_INTERVAL_MS` da 3 minuti a 2 minuti
- Questo riduce la probabilita di cold start durante l'uso attivo

## Dettagli Tecnici

### Curva di progresso (prima vs dopo)

```text
Tempo    Prima (d=8)    Dopo (d=3)
1s       11%            26%
2s       21%            43%
3s       31%            55%
5s       47%            72%
7s       58%            81%
10s      71%            87%
15s      85%            89%
```

Con la nuova curva, per un'operazione tipica (2-6 secondi) la barra mostra un avanzamento significativo (43-72%) e non resta mai visibilmente "bloccata".

### Pre-warmup durante validate

Nel metodo `validate()`, subito dopo l'invio della richiesta a `game-validate`, invieremo un PING parallelo a `game-commit`. Questo non rallenta il validate (e fire-and-forget) ma assicura che quando il commit parte subito dopo, il database sia gia pronto.
