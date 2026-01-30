

# Fix: Sincronizzare Limite UI con Edge Functions (500 → 300)

## Problema
Il limite massimo di pixel nelle edge functions è stato aggiornato a 300, ma l'UI permette ancora di disegnare fino a 500 pixel prima di mostrare l'errore.

## Causa
Il file `src/components/map/hooks/useDraftPaint.ts` ha un limite locale:
```typescript
export const PAINT_MAX_PIXELS = 500;  // ← Ancora a 500!
```

## Soluzione

### File da Modificare
| File | Linea | Modifica |
|------|-------|----------|
| `src/components/map/hooks/useDraftPaint.ts` | 5 | `PAINT_MAX_PIXELS = 300` |

### Dettaglio Modifica

```typescript
// Linea 5 - src/components/map/hooks/useDraftPaint.ts
export const PAINT_MAX_PIXELS = 300;  // Era 500
```

## Nessuna Altra Modifica Richiesta

- Edge functions `game-validate` e `game-commit` già aggiornate a 300
- `SpecPage.tsx` già aggiornata a "300 pixels"
- Il limite in `useDraftPaint.ts` viene usato sia per bloccare nuovi pixel (`addToDraft`) che per il toast di avviso

## Risultato Atteso

1. L'utente non potrà più aggiungere pixel oltre i 300
2. Il toast mostrerà "Max 300 pixels per paint" quando raggiunge il limite
3. Il contatore si ferma a 300 durante il disegno

## Test di Verifica

1. Inizia a disegnare pixel → il contatore deve fermarsi a 300
2. Al 300° pixel deve apparire toast "Max 300 pixels per paint"
3. Non deve essere possibile aggiungere altri pixel dopo i 300

