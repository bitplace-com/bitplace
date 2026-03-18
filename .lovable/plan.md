

# Fix: PE Balance e Pixel Balance indipendenti

## Problema identificato

In `WalletContext.tsx`, la funzione `updatePeStatus` (riga 369-370) quando riceve `isVirtualPe=true` (che accade sempre per PAINT su utenti "both") sovrascrive **anche** `peTotal`, `peUsed`, `peAvailable` con i valori del Pixel Balance virtuale. Questo fa sì che PE e Pixel Balance mostrino gli stessi numeri.

Il backend `game-commit` per utenti "both" in modalità PAINT imposta `isVirtualPe=true` e restituisce solo i valori virtual PE nel `peStatus`. Il frontend poi li copia nei campi PE reali.

## Soluzione

### 1. Fix `updatePeStatus` in `WalletContext.tsx`

Quando `isVirtualPe=true`, aggiornare **solo** i campi `virtualPeTotal/Used/Available` e il cooldown. **Non toccare** `peTotal/peUsed/peAvailable` (che devono riflettere il valore reale del wallet $BIT).

```typescript
// Prima (bug):
if (isVirtualPe) {
  setEnergy(prev => ({ ...prev, 
    peTotal: peStatus.total,        // ← SBAGLIATO: sovrascrive PE reale
    peUsed: peStatus.used,
    peAvailable: peStatus.available,
    virtualPeTotal: peStatus.total, 
    virtualPeUsed: peStatus.used, 
    virtualPeAvailable: peStatus.available,
  }));
}

// Dopo (fix):
if (isVirtualPe) {
  setEnergy(prev => ({ ...prev, 
    // Solo campi virtuali, PE reale invariato
    virtualPeTotal: peStatus.total, 
    virtualPeUsed: peStatus.used, 
    virtualPeAvailable: peStatus.available,
  }));
}
```

Nessuna modifica al backend necessaria — il problema è solo nel frontend che sovrascrive i campi sbagliati.

