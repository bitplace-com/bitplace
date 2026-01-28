
# Piano di Correzione: Inconsistenza Bilancio PE ✅ COMPLETATO

## Problema Risolto

Due componenti UI mostravano dati PE diversi perché usavano **fonti dati differenti**.

## Modifiche Implementate

| File | Modifica | Status |
|------|----------|--------|
| `supabase/functions/energy-refresh/index.ts` | Aggiunto `pixelsOwned` e `pixelStakeTotal` nel response | ✅ |
| `src/contexts/WalletContext.tsx` | Aggiunto `pixelsOwned` e `pixelStakeTotal` a EnergyState | ✅ |
| `src/components/modals/UserMenuPanel.tsx` | Usa `energy.*` invece di `usePixelStats` | ✅ |
| `src/hooks/usePixelStats.ts` | Aggiunto `refetch()` per uso futuro | ✅ |

## Risultato

- **StatusStrip** e **UserMenuPanel** ora mostrano **valori identici** (stessa fonte: WalletContext)
- I dati si aggiornano **automaticamente** dopo ogni operazione paint
- Al refresh pagina, `energy-refresh` fornisce tutti i dati necessari

## Test di Verifica

1. ✅ Ricaricare la pagina → verificare che StatusStrip e UserMenuPanel mostrino stessi valori
2. Dipingere pixel → verificare che entrambi si aggiornino immediatamente
3. Aprire UserMenuPanel → verificare che "Pixels Owned" e "Total Staked" siano corretti
