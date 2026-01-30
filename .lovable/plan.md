
# Fix: Posizionamento Dinamico Pannello Disegno su Mobile

## Problema Identificato
Dallo screenshot nel browser in-app di Phantom, il pannello ActionTray si sovrappone ancora alla StatusStrip. L'hook `useStatusStripHeight` non misura correttamente l'altezza perché:

1. **`ResizeObserver.contentRect.height` non include padding** - la StatusStrip ha `py-2.5` (10px sopra + 10px sotto = 20px totale) che non viene contato
2. **Timing issues nei browser in-app** - l'altezza iniziale potrebbe essere misurata prima che il contenuto sia renderizzato completamente

## Analisi Tecnica

| Problema | Causa |
|----------|-------|
| Altezza sottostimata | `contentRect.height` esclude padding (`py-2.5` = 20px) |
| Overlap su Phantom | L'altezza misurata è ~20px inferiore a quella reale |

## Soluzione

### File da Modificare

| File | Modifica |
|------|----------|
| `src/hooks/useStatusStripHeight.ts` | Usare `borderBoxSize` o `getBoundingClientRect()` per includere padding |

### Modifica a useStatusStripHeight.ts

Il `ResizeObserver` ha accesso a `borderBoxSize` che include padding e border. Dobbiamo usare quello invece di `contentRect`:

**Codice attuale (problematico):**
```typescript
observerRef.current = new ResizeObserver((entries) => {
  for (const entry of entries) {
    const newHeight = Math.ceil(entry.contentRect.height); // ❌ Non include padding
    setHeight(prev => prev !== newHeight ? newHeight : prev);
  }
});
```

**Codice corretto:**
```typescript
observerRef.current = new ResizeObserver((entries) => {
  for (const entry of entries) {
    // Usa borderBoxSize se disponibile (include padding e border)
    // Fallback a getBoundingClientRect per massima compatibilità
    let newHeight: number;
    if (entry.borderBoxSize?.length > 0) {
      newHeight = Math.ceil(entry.borderBoxSize[0].blockSize);
    } else {
      // Fallback per browser che non supportano borderBoxSize
      newHeight = Math.ceil(entry.target.getBoundingClientRect().height);
    }
    setHeight(prev => prev !== newHeight ? newHeight : prev);
  }
});
```

### Anche la misurazione iniziale deve usare `getBoundingClientRect`:

```typescript
if (element) {
  // Initial measurement - usa getBoundingClientRect che include tutto
  const rect = element.getBoundingClientRect();
  setHeight(Math.ceil(rect.height));
  // ...
}
```

## Calcolo Risultante

| Componente | Prima (contentRect) | Dopo (borderBox) |
|------------|---------------------|------------------|
| StatusStrip min-h-12 | ~38px (senza padding) | ~48px (corretto) |
| StatusStrip con wrap | ~70px | ~90px (corretto) |
| Gap visivo | overlap 10-20px | gap 8px (sempre positivo) |

## Risultato Atteso

1. L'altezza misurata include padding (`py-2.5`)
2. Il pannello ActionTray rimane sempre staccato dalla StatusStrip
3. Funziona correttamente anche su browser in-app (Phantom, MetaMask, etc.)
4. La misura è reattiva quando la StatusStrip cambia dimensione (contenuti che vanno a capo)

## Test di Verifica

1. Apri l'app nel browser in-app di Phantom
2. Verifica che il pannello colori sia staccato dalla barra inferiore
3. Connetti/disconnetti wallet - il pannello deve rimanere staccato
4. Quando la barra mostra più contenuti su più righe, il pannello si sposta verso l'alto
