

## Fix VPE: errore paint, icone PE, label e bilanci

### 1. Fix critico: `totalVirtualPeCost is not defined` nel game-commit

**Problema**: La variabile `totalVirtualPeCost` e' dichiarata con `let` dentro il blocco `else if (mode === "PAINT")` (riga 531), ma viene usata alla riga 762 che si trova fuori da quel blocco. Questo causa `ReferenceError` dopo che i pixel sono gia stati scritti nel DB, quindi i pixel appaiono sulla mappa ma:
- Il contatore `virtual_pe_used` non viene aggiornato
- La risposta al client fallisce con errore 500
- I VPE usati non si aggiornano nell'interfaccia

**Fix**: Spostare la dichiarazione `let totalVirtualPeCost = 0` all'inizio della funzione `executeCommit` (dopo riga 284), cosi e' accessibile sia nel blocco PAINT che nel blocco stats update.

| File | Modifica |
|------|----------|
| `supabase/functions/game-commit/index.ts` | Spostare `let totalVirtualPeCost = 0` da riga 531 a riga 285 (scope della funzione) |

### 2. Label UI: "Total Staked" -> "PE Staked", "VPE Avail" -> "VPE Available"

| File | Riga | Da | A |
|------|------|-----|-----|
| `src/components/modals/UserMenuPanel.tsx` | 255 | `Total Staked` | `PE Staked` |
| `src/components/modals/UserMenuPanel.tsx` | 272 | `VPE Avail` | `VPE Available` |

### 3. Icona PE: usare bolt solid ovunque per i PE

Il `PEIcon` gia usa `name="bolt"` (solid). Verifico che nei punti chiave dell'inspector venga usato `PEIcon` e non un'icona diversa. Dai file letti, il `PixelInfoPanel` usa correttamente `PEIcon` e `VPEIcon` in modo differenziato. Non servono modifiche all'icona.

### 4. Deploy e verifica

Dopo le modifiche, deploy della funzione `game-commit` e verifica che:
- Il paint con VPE non genera errori
- `virtual_pe_used` si aggiorna correttamente
- La risposta include `peStatus` con i valori VPE aggiornati
- Le label nel menu utente sono corrette

### Dettaglio tecnico

**game-commit/index.ts** - Fix scoping variabile:
```text
// PRIMA (riga 531, dentro blocco PAINT):
let totalVirtualPeCost = 0;

// DOPO (riga 285, inizio executeCommit):
let totalVirtualPeCost = 0;
// + rimuovere la dichiarazione dalla riga 531
```

**UserMenuPanel.tsx** - Label updates:
- Riga 255: `Total Staked` -> `PE Staked`
- Riga 272: `VPE Avail` -> `VPE Available`

