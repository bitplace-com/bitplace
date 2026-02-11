

# Cambio Valutazione: 1 PE = $0.001 (1 USD = 1000 PE)

## Riepilogo

Ripristiniamo il valore originale di 1 PE = $0.001 ($1 = 1000 PE). Questo cambiamento tocca la configurazione frontend, due edge function backend, e tutti i testi/UI che mostrano il valore del PE.

## File da Modificare

### 1. Configurazione centrale
**`src/config/energy.ts`** (linea 18-19)
- Commento: `1 PE = $0.001, so 1 USD = 1000 PE`
- `PE_PER_USD = 1000`

### 2. Edge Functions
**`supabase/functions/energy-refresh/index.ts`** (linea 36-37)
- Commento e costante: `PE_PER_USD = 1000`

**`supabase/functions/sol-balance/index.ts`** (linea 16-17)
- Commento e costante: `PE_PER_USD = 1000`

### 3. UI - Testi e formule
**`src/components/map/PixelInspectorCard.tsx`**
- Linea 151: `~$0.01` diventa `~$0.001`
- Linea 273: `* 0.01` diventa `* 0.001`

**`src/pages/SpecPage.tsx`** (linee 33-34)
- `1 PE = $0.001 USD` e `1 USD = 1,000 PE`

**`src/pages/ProfilePage.tsx`** (linea 268)
- `1 PE = $0.001`

**`src/components/modals/RulesModal.tsx`**
- Linea 34: `1 PE = $0.001`
- Linea 71: `$0.001 (1 PE)` per il valore di un pixel vuoto

**`src/components/modals/ShopModal.tsx`**
- La riga del rate usa gia `PE_PER_USD.toLocaleString()` quindi si aggiorna automaticamente

### 4. Documentazione
**`docs/bitplace_rules.md`** (linea 7)
- `1 PE = $0.001`

## Note Tecniche
- La mappa e gia stata svuotata nella migrazione precedente, quindi non servono ricalcoli sui pixel esistenti
- Il `pe_total_pe` degli utenti verra ricalcolato automaticamente al prossimo `energy-refresh` (il wallet avra 10x piu PE a parita di saldo)
- Nessuna migrazione SQL necessaria: il cambio e puramente applicativo
- Il componente `ShopModal` si aggiorna automaticamente grazie all'uso della costante `PE_PER_USD`

