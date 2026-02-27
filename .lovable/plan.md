
# Pixel Control Center — Riordino e miglioramenti

## Modifiche al file `src/components/modals/PixelControlPanel.tsx`

### 1. Riordinare le card PE per coerenza con Pixel Balance

Ordine attuale PE: Total, Available, Used
Nuovo ordine (coerente con Pixel Balance): **Available, Used, Total**

Rinominare "Total" in qualcosa di piu' coerente: la sezione Pixel usa "Active Pixels", quindi per PE usiamo lo stesso pattern. L'ordine finale sara':
- Pixel Balance: Available | Used | Active Pixels
- Paint Energy: Available | Used | Total (come "Total PE")

### 2. Rimuovere il pannello Collateralization

Eliminare tutto il blocco righe 199-248 (il pannello con grace period / decay).

### 3. Rinominare "Active Stakes" in "USED PE ALLOCATION"

Cambiare il titolo da "Active Stakes" a "Used PE Allocation" (riga 252-253).

### 4. Aggiungere Reinforce sotto Defend e Attack

Trasformare il layout da `grid-cols-2` (DEF + ATK) a:
- Riga 1: `grid-cols-2` con **Defend** e **Attack**
- Riga 2: **Reinforce** da solo a larghezza piena

Reinforce mostra il totale PE usato per rinforzare i propri pixel (valore "0" per ora, come ATK).

### Risultato finale sezione PE (quando ha wallet)

```text
PAINT ENERGY (PE)
  [Available: X]  [Used: X]  [Total: X]

USED PE ALLOCATION
  [DEF Total: X]    [ATK Total: X]
  [REINFORCE Total: X]              (full width)
```

## File modificato

1 solo file: `src/components/modals/PixelControlPanel.tsx`
