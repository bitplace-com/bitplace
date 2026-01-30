
# Riduzione Limite Massimo Pixel per Paint: 500 → 300

## Obiettivo
Ridurre il limite massimo di pixel per operazione PAINT da 500 a 300 per garantire performance veloci e affidabili.

## File da Modificare

| File | Linea | Modifica |
|------|-------|----------|
| `supabase/functions/game-validate/index.ts` | 56 | `MAX_PAINT_PIXELS = 300` |
| `supabase/functions/game-commit/index.ts` | 55 | `MAX_PAINT_PIXELS = 300` |
| `src/pages/SpecPage.tsx` | 117 | `"300 pixels"` |

## Dettagli Modifiche

### 1. Edge Function: game-validate
```typescript
// Linea 56
const MAX_PAINT_PIXELS = 300;  // Era 500
```

### 2. Edge Function: game-commit
```typescript
// Linea 55
const MAX_PAINT_PIXELS = 300;  // Era 500
```

### 3. Documentazione UI: SpecPage
```typescript
// Linea 117
<TableRow label="Max Pixels per PAINT" value="300 pixels" />
```

## Nessuna Modifica Richiesta

- `MAX_SELECTION_PIXELS = 10000` - Questo è il limite UI per la selezione generale, non per PAINT
- `MAX_BATCH_SIZE = 200` in `usePaintQueue.ts` - Questo è per il batching interno, già sotto 300
- Timeout dinamici in `useGameActions.ts` - Già gestiscono operazioni più piccole correttamente

## Risultato Atteso

| Metrica | Prima | Dopo |
|---------|-------|------|
| Limite massimo | 500 pixel | 300 pixel |
| Tempo validazione | ~4-5 secondi | ~2-3 secondi |
| Tempo commit | ~30-40 secondi | ~15-20 secondi |
| Affidabilità | Timeout frequenti | Stabile |

## Test di Verifica

1. Prova a selezionare 301+ pixel in PAINT mode → deve mostrare errore "Maximum 300 pixels per paint"
2. Dipingi 300 pixel → deve completare in pochi secondi
3. Verifica che SpecPage mostri "300 pixels"
