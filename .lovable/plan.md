
# Piano di Correzione: Inconsistenza Bilancio PE tra StatusStrip e UserMenuPanel

## Problema Identificato

Due componenti UI mostrano dati PE diversi perché usano **fonti dati differenti**:

| Componente | Fonte Dati | Problema |
|------------|------------|----------|
| **StatusStrip** (barra in basso) | `WalletContext.energy.peUsed/peAvailable` | ✅ Corretto (server truth) |
| **UserMenuPanel** (dropdown) | Ricalcola da `usePixelStats` | ❌ Dati stale, mai aggiornati |

### Verifica Database

```
PE Total:       15,130
Pixels Owned:   3,631
Total Staked:   3,631
PE Available:   11,499
```

Ma `usePixelStats` ritorna dati vecchi: `pixelsOwned = 1,000`, `totalStaked = 1,000`

---

## Soluzione

### 1. UserMenuPanel: Usare la Stessa Fonte di StatusStrip

**File:** `src/components/modals/UserMenuPanel.tsx`

Cambiare da calcolo locale a uso diretto di `energy.peUsed` e `energy.peAvailable`:

```typescript
// PRIMA (calcolo locale con dati stale):
const peUsed = pixelStats.totalStaked + pixelStats.totalDefending + pixelStats.totalAttacking;
const peAvailable = Math.max(0, energy.peTotal - peUsed);

// DOPO (usa direttamente WalletContext):
// Rimuovere completamente il calcolo locale
// Usare energy.peUsed e energy.peAvailable
```

### 2. usePixelStats: Aggiungere Meccanismo di Refetch

**File:** `src/hooks/usePixelStats.ts`

Il hook attualmente fetcha solo al mount. Aggiungere:
- Una funzione `refetch()` esposta
- Dipendenza da un trigger esterno (es. dopo paint)

```typescript
export function usePixelStats(userId: string | undefined): PixelStats & { refetch: () => void } {
  // ... stato esistente ...
  
  const fetchStats = useCallback(async () => {
    // ... logica fetch esistente ...
  }, [userId]);
  
  useEffect(() => {
    fetchStats();
  }, [fetchStats]);
  
  return { ...stats, refetch: fetchStats };
}
```

### 3. WalletContext: Aggiungere pixelsOwned e totalStaked a EnergyState

**File:** `src/contexts/WalletContext.tsx`

L'edge function `energy-refresh` già calcola questi valori internamente. Esporli nel response:

```typescript
interface EnergyState {
  // ... campi esistenti ...
  pixelsOwned: number;    // NUOVO
  pixelStakeTotal: number; // NUOVO
}
```

### 4. energy-refresh: Restituire pixelsOwned e pixelStakeTotal

**File:** `supabase/functions/energy-refresh/index.ts`

Già calcolato internamente, solo aggiungere al response:

```typescript
return new Response(JSON.stringify({
  // ... esistente ...
  pixelsOwned: (ownedPixels || []).length,      // NUOVO
  pixelStakeTotal: ownerUsed,                    // NUOVO
}));
```

---

## Riepilogo Modifiche

| File | Modifica |
|------|----------|
| `src/components/modals/UserMenuPanel.tsx` | Usare `energy.peUsed`, `energy.peAvailable`, `energy.pixelsOwned`, `energy.pixelStakeTotal` |
| `src/hooks/usePixelStats.ts` | Aggiungere `refetch()` + rimuovere dipendenza da UserMenuPanel |
| `src/contexts/WalletContext.tsx` | Aggiungere `pixelsOwned` e `pixelStakeTotal` a EnergyState |
| `supabase/functions/energy-refresh/index.ts` | Restituire `pixelsOwned` e `pixelStakeTotal` |

---

## Risultato Atteso

Dopo le modifiche:
1. **StatusStrip** e **UserMenuPanel** mostreranno **valori identici** perché usano la stessa fonte (WalletContext)
2. I dati si aggiorneranno **automaticamente** dopo ogni operazione paint (via `updatePeStatus`)
3. Al refresh della pagina, `energy-refresh` fornirà tutti i dati necessari senza dipendere da query separate

---

## Test di Verifica

1. Ricaricare la pagina → verificare che StatusStrip e UserMenuPanel mostrino stessi valori
2. Dipingere 100 pixel → verificare che entrambi si aggiornino immediatamente
3. Aprire UserMenuPanel → verificare che "Pixels Owned" e "Total Staked" siano corretti
