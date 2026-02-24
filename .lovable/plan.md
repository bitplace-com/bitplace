

## Rename "Buy $BIT" a "Get $BIT" + aggiunta sezione Tokenomics

### Cosa cambia

1. **Rinominare "Buy $BIT" in "Get $BIT"** in tutti i punti dove appare (menu drawer e user menu panel)
2. **Aggiungere una sezione Tokenomics** in fondo al `ShopModal`, con le informazioni chiave sul token

### Modifiche

**File: `src/components/map/MapMenuDrawer.tsx`**
- Riga 102/109: cambiare il commento e il testo del bottone da "Buy $BIT" a "Get $BIT"

**File: `src/components/modals/UserMenuPanel.tsx`**
- Riga 212: cambiare il testo da "Buy $BIT" a "Get $BIT"

**File: `src/components/modals/ShopModal.tsx`**
- Aggiungere dopo l'Info Box (dopo riga 177) una sezione "Tokenomics" con:
  - Network: Solana
  - CA (Contract Address) con il mint address e bottone copia
  - Total Supply: 1,000,000,000 $BIT (standard Pump.fun)
  - Team allocation: 20% (di cui 10% lockato con vesting a 12 mesi)
  - Il restante 20% del team viene usato per operations, airdrops, community events, incentives e development
  - Link a Pump.fun per tradare il token
- La sezione sara visibile sia per utenti connessi che non connessi (info pubblica), posizionata come ultima sezione dentro il pannello

### Struttura della sezione Tokenomics

```text
+------------------------------------------+
| Tokenomics                               |
+------------------------------------------+
| Network        Solana                     |
| CA             6az8wE...pump  [copy]      |
| Total Supply   1,000,000,000 $BIT         |
| Team           20% of supply              |
|   - 10% locked (12-month vesting)         |
|   - 10% for ops, airdrops, community      |
|     events, incentives & development      |
|                                           |
| [Trade on Pump.fun]  (link esterno)       |
+------------------------------------------+
```

Stile: stesso `rounded-xl bg-muted border border-border` usato per l'Info Box esistente, mantenendo lo stile conciso e compatto del progetto.

