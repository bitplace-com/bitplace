

# Aggiornamento Rate PE: da $0.001 a $0.01

## Impatto

Questa modifica cambia il tasso di conversione fondamentale del gioco:
- **Prima**: 1 PE = $0.001, quindi $1 = 1,000 PE
- **Dopo**: 1 PE = $0.01, quindi $1 = 100 PE

Ogni pixel vuoto costa sempre 1 PE, ma ora 1 PE vale 10x di prima ($0.01 invece di $0.001).

---

## File da Modificare

### 1. Configurazione centrale (fonte di verita frontend)
**`src/config/energy.ts`**
- `PE_PER_USD` da `1000` a `100`
- Commento da "1 PE = $0.001, so 1 USD = 1000 PE" a "1 PE = $0.01, so 1 USD = 100 PE"

### 2. Backend Edge Functions (fonti di verita backend)
**`supabase/functions/energy-refresh/index.ts`**
- `PE_PER_USD` da `1000` a `100`
- Commento da "1 PE = $0.001" a "1 PE = $0.01"

**`supabase/functions/sol-balance/index.ts`**
- `PE_PER_USD` da `1000` a `100`
- Commento da "1 PE = $0.001" a "1 PE = $0.01"

### 3. UI - Testi e display
**`src/components/modals/RulesModal.tsx`** (linea 34)
- "1 PE = $0.001" diventa "1 PE = $0.01"

**`src/components/map/PixelInspectorCard.tsx`**
- Linea 151: `(~$0.001)` diventa `(~$0.01)`
- Linea 273: `pixel.thresholdWithFloor * 0.001` diventa `pixel.thresholdWithFloor * 0.01`

**`src/pages/RulesPage.tsx`** (linea 25)
- "1 PE = $0.001" diventa "1 PE = $0.01"

**`src/pages/ProfilePage.tsx`** (linea 268)
- "1 PE = $0.001" diventa "1 PE = $0.01"

**`src/pages/SpecPage.tsx`** (linee 33-34)
- "1 PE = $0.001 USD" diventa "1 PE = $0.01 USD"
- "1 USD = 1,000 PE" diventa "1 USD = 100 PE"

### 4. Documentazione
**`docs/bitplace_rules.md`** (linea 7)
- "1 PE = $0.001" diventa "1 PE = $0.01"

---

## Cosa NON cambia

- **ShopModal**: usa gia `PE_PER_USD` dinamicamente, si aggiorna automaticamente
- **soundEngine.ts**: i valori `0.001` li dentro sono parametri audio, non hanno relazione con PE
- **rebalance-tick**: il `0.001` e una soglia di confronto per multiplier, non correlato
- **Costo pixel vuoto**: resta 1 PE (ma ora vale $0.01 invece di $0.001)
- **Logica takeover/decay**: non cambia, opera tutto in PE

---

## Rischio e Attenzione

Questa modifica e puramente di configurazione. I calcoli interni del gioco lavorano tutti in PE. L'unico punto critico e che i 3 punti dove si definisce `PE_PER_USD` (config frontend + 2 edge functions) devono essere allineati. Il piano li aggiorna tutti e tre simultaneamente.

