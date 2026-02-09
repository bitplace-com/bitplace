
# Miglioramento Rebalancing Status e Icone Stake nel PixelTab

## Modifiche

### 1. Icone Owner Stake e Total Stake (ex Pixel Value)
- **Owner Stake**: sostituire l'icona `Coins` con `PEIcon` (il fulmine)
- **Pixel Value** rinominato in **Total Stake**: aggiungere `PEIcon` come icona e cambiare il label

### 2. Sezione Owner Rebalancing migliorata
Riscrivere il blocco rebalancing (righe 238-272) per dare contesto chiaro:

- **Titolo**: "Stake Decaying" con health % e icona warning
- **Barra progresso**: rimane
- **Testo descrittivo breve**: "Owner's stake is losing value every tick until wallet is topped up"
- **Next tick**: timer + valore atteso dopo il tick, es. "Next tick: 3h 5m -- Value after: 0 PE"
- Rimuovere la notazione formula "V ->" e sostituirla con linguaggio chiaro

## Dettaglio tecnico

**File: `src/components/map/inspector/PixelTab.tsx`**

1. Aggiungere import di `PEIcon` da `@/components/ui/pe-icon`
2. Righe 159-167: sostituire icona `Coins` con `PEIcon` per Owner Stake
3. Righe 170-181: rinominare "Pixel Value" in "Total Stake", aggiungere `PEIcon`
4. Righe 238-272: riscrivere il blocco rebalancing:
   - Titolo: "Stake Decaying" con percentuale health
   - Barra progresso invariata
   - Testo esplicativo breve sotto la barra
   - Riga "Next tick in: Xh Ym" e "After tick: Z PE" con linguaggio chiaro
