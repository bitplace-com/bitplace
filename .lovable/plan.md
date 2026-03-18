

# Fix: Badge "Protected" fuorviante + Riepilogo ERASE migliorato

## Problema 1: Badge "Protected"
Il badge "Protected" appare su pixel virtuali (is_virtual_stake) senza scadenza, ma con 0 PE. È fuorviante perché suggerisce protezione inesistente.

**Fix**: Mostrare "Protected" solo se il pixel ha effettivamente PE > 0 (owner_stake_pe > 0 o vNow > 0). Se PE è 0, non mostrare alcun badge.

**File**: `src/components/map/inspector/PixelTab.tsx` riga 194
```
// Da:
{pixel.isVirtualStake && !pixel.expiresAt && (

// A:
{pixel.isVirtualStake && !pixel.expiresAt && pixel.vNow > 0 && (
```

## Problema 2: ActionBox ERASE non mostra conteggio pixel e bilancio
Quando si seleziona un'area per ERASE, il Cost Summary mostra solo il riepilogo PE ma non:
- Quanti pixel verranno cancellati (validPixelCount dal backend)
- Quanti pixel tornano al Pixel Balance (virtual PE refund)
- Il bilancio pixel aggiornato dopo l'azione

**Fix in `ActionBox.tsx`**: Aggiungere nel blocco Cost Summary per ERASE:

1. **Conteggio pixel da cancellare**: Mostrare `validPixelCount` o `breakdown.pixelCount` come "Pixels to erase: X"
2. **Pixel refund**: Mostrare quanti pixel virtuali vengono restituiti al Pixel Balance (separato dal PE refund che è già presente)
3. **Bilancio post-azione**: Aggiungere riga "Pixels after" con il nuovo bilancio

Il blocco Cost Summary per ERASE viene attualmente nascosto (la condizione alla riga 206 esclude ERASE: `mode !== 'ERASE'`). Il riepilogo PE per ERASE appare solo dopo validazione alle righe 265-270 come un piccolo "PE Refund" isolato.

**Soluzione**: Ristrutturare la sezione per ERASE in modo che dopo validazione mostri:
- Riga: "Pixels to erase" → `validPixelCount`  
- Riga: "PE Refund" → `+unlockPeTotal` (se > 0, in verde)
- Riga: "Pixel Balance after" → saldo aggiornato

Questo mantiene la stessa gerarchia visuale (testo 11px, sfondo muted/30, separatori border-t) usata in tutti gli altri modi.

| File | Modifica |
|------|----------|
| `PixelTab.tsx` | Aggiungere condizione `pixel.vNow > 0` al badge Protected |
| `ActionBox.tsx` | Aggiungere riepilogo pixel count + refund per ERASE nel Cost Summary |

