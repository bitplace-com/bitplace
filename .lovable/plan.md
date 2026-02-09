
# Tooltip Decay: aggiunta valori numerici

## Cosa cambia

Il tooltip del badge Decay nella StatusStrip mostrera' i valori concreti in formato compatto:

- Wallet: X PE (valore attuale del wallet)
- Staked: Y PE (totale PE bloccato nei pixel)
- Deficit: Z PE (quanto manca per fermare il decay)

## Dettaglio tecnico

**File: `src/components/map/StatusStrip.tsx`**

1. Calcolare il deficit: `energy.pixelStakeTotal - energy.peTotal` (se positivo)
2. Sostituire il testo del tooltip (righe 199-202) con righe concise che mostrano wallet PE, staked PE, deficit e il suggerimento di ricaricare.

Formato tooltip (esempio):

```
Pixel Decay Active
Wallet: 450 PE · Staked: 800 PE
Deficit: 350 PE — top up to stop decay
```

Nessun altro file da modificare. Tutti i dati necessari sono gia' disponibili nel componente tramite `energy.peTotal`, `energy.pixelStakeTotal` e `healthPercent`.
