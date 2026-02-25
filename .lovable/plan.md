

## Aggiornare Trial PE da 100,000 a 10,000

Tutti i riferimenti al valore 100,000 PE nella modalita trial vanno aggiornati a 10,000.

### File da modificare

**1. `src/contexts/WalletContext.tsx`**
- Riga 166: `TRIAL_PE_TOTAL = 100000` -> `TRIAL_PE_TOTAL = 10000`
- Riga 167: `TRIAL_BIT_BALANCE = 50000` -> `TRIAL_BIT_BALANCE = 5000` (ricalcolato: 5000 * $0.002 = $10 -> 10,000 PE)
- Riga 301: toast description da `'100,000 trial PE ready to use...'` a `'10,000 trial PE ready to use...'`

**2. `src/components/modals/WalletSelectModal.tsx`**
- Riga 237: testo da `"Paint with 100,000 free test PE"` a `"Paint with 10,000 free test PE"`

Nessun altro file necessita modifiche: le UI (UserMenuPanel, ActionTray, StatusStrip) leggono i valori dinamicamente da `energy.peTotal` / `energy.peAvailable`, quindi si aggiornano automaticamente.

