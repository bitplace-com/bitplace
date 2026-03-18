

# Fix: "Pixel Balance after" in ERASE mostra PE invece di Pixel Balance

## Problema
Nella riga 240 di `ActionBox.tsx`, il calcolo "Pixel Balance after" usa `availablePe` (che proviene da `validationResult.availablePe` — il saldo PE reale dai token $BIT). Per i pixel virtuali (senza PE), il conteggio deve usare il **Pixel Balance** (virtual PE) dal WalletContext.

Lo screenshot mostra: "Pixel Balance after: 200,201" — ma il valore 200,200 in basso a destra è il PE reale, non il Pixel Balance (999,870 mostrato sempre in basso).

## Soluzione

### 1. Aggiungere prop `pixelBalance` ad ActionBox
Passare il saldo Pixel Balance corrente (`energy.virtualPeAvailable`) come nuova prop.

**ActionBox.tsx** — nuova prop:
```typescript
pixelBalance?: number; // Virtual pixel balance for ERASE summary
```

### 2. Fix calcolo "Pixel Balance after"
Riga 240: sostituire `availablePe` con `pixelBalance`:
```typescript
// Da:
{(availablePe + (validationResult?.validPixelCount ?? 0)).toLocaleString()}

// A:  
{((pixelBalance ?? 0) + (validationResult?.validPixelCount ?? 0)).toLocaleString()}
```

### 3. Usare icona Pixel (matita) invece di PE nel label
Il label dice "Pixel Balance after" ma l'icona non c'è — aggiungere l'icona matita per coerenza con la StatusStrip.

### 4. Passare la prop da InspectorPanel
**InspectorPanel.tsx** — aggiungere prop e passarla:
- Riceve `pixelBalance` dal parent
- Lo passa a `<ActionBox pixelBalance={pixelBalance} />`

### 5. Passare dal componente parent (BitplaceMap o equivalente)
Leggere `energy.virtualPeAvailable` dal WalletContext e passarlo lungo la catena: parent → InspectorPanel → ActionBox.

| File | Modifica |
|------|----------|
| `ActionBox.tsx` | Nuova prop `pixelBalance`, fix calcolo riga 240 |
| `InspectorPanel.tsx` | Nuova prop `pixelBalance`, passarla ad ActionBox |
| Parent component | Passare `energy.virtualPeAvailable` a InspectorPanel |

