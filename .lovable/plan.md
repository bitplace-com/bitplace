

# UI Polish: User Menu e Pixel Control Center

## File 1: `src/components/modals/UserMenuPanel.tsx`

### 1. Riordinare le sezioni per utenti 'both': PIXELS prima, WALLET dopo

Attualmente l'ordine per utenti `both` (righe 169-233) e': WALLET, poi PIXELS.
Invertire: mostrare prima la sezione PIXELS (disponibili, usati, alert 72h), poi la sezione WALLET con i dati del token.

### 2. Colorare i valori in dollari di verde nella sezione WALLET

Il valore `$XXX.XX` accanto al saldo BIT (righe 181-183 e 245-246) sara' colorato in verde usando `text-emerald-500`.

### 3. Sezione PE Overview: 4 card allineate a sinistra (no centratura)

Sostituire il layout 2+1 (grid-cols-2 + full-width centrato) con 4 card in `grid-cols-2`, tutte allineate a sinistra:
- **PE Balance** (totale PE da wallet)
- **PE Used** (PE bloccati in stake/contribuzioni)
- **PE Available** (PE spendibili ora) — rimuovere `text-center`
- **PE Value** (valore in dollari, = `$walletUsd`, mostrato in verde)

### 4. Import `formatUsd` gia' presente (riga 19)

Nessun nuovo import necessario.

## File 2: `src/components/modals/PixelControlPanel.tsx`

### 5. Rinominare "Reinforce Total" in "Staked & Reinforce Total"

Alla riga 218, cambiare il label da `"Reinforce Total"` a `"Staked & Reinforce Total"` e aggiornare il tooltip di conseguenza.

## Risultato visivo

### User Menu (utente 'both')
```text
PIXELS
  297,024 available        2,976 / 300,000
  [alert 72h]

WALLET
  50,000,000.0000 BIT      $291.75 (verde)
  4J2kvq...Za7C
  Synced just now

PIXELS OVERVIEW
  [Pixels Owned: 0]   [Pixel Balance: 297,024]

PE OVERVIEW
  [PE Balance: 291,750]     [PE Used: 11,761]
  [PE Available: 279,989]   [PE Value: $291.75] (verde)
```

### Pixel Control Center
```text
USED PE ALLOCATION
  [DEF Total: X]               [ATK Total: X]
  [Staked & Reinforce Total: X]
```

## File modificati

1. `src/components/modals/UserMenuPanel.tsx`
2. `src/components/modals/PixelControlPanel.tsx`
