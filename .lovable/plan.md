

## Aggiornamento copy PE/VPE, tooltips educativi, layout Share e sezioni How It Works / Rules

### Panoramica
Aggiornamento sistematico di tutti i copy relativi a PE e VPE per rendere il contesto sempre chiaro. Aggiunta di tooltips educativi sui concetti chiave. Spostamento del link "Share" sotto la preview artwork. Aggiornamento delle sezioni Rules e How It Works con il concetto VPE.

---

### 1. Copy PE/VPE nell'Inspector Pixel (`PixelInfoPanel.tsx`)

| Da | A |
|----|---|
| `Owner Stake` | `PE Owner Stake` (o `VPE Stake` se VPE) |
| `Total Stake` | `PE Total Stake` (o `VPE Stake` se VPE) |
| `Takeover Cost` | `PE Takeover Cost` |
| `Staked` (stats row) | `PE Staked` (o `VPE` se VPE) |

Aggiungere tooltip su "PE Owner Stake" che spiega: "The energy locked by the owner when painting this pixel. Higher stake = harder to take over."
Aggiungere tooltip su "PE Total Stake" che spiega: "Total pixel strength: owner stake + defenders - attackers."
Aggiungere tooltip su "PE Takeover Cost" che spiega: "The minimum PE you need to stake to take over this pixel."

### 2. Copy nel PixelTab Inspector (`inspector/PixelTab.tsx`)

| Da | A |
|----|---|
| `Owner Stake` | `PE Owner Stake` |
| `Total Stake` | `PE Total Stake` |

### 3. Spostare "Share" sotto la preview artwork (`PixelInfoPanel.tsx`)

Attualmente "Share" e "Expand" sono sullo stesso livello accanto a "Paints". Spostare "Share" sotto la `UserMinimap` preview, separandolo da "Expand" per evitare confusione. Layout:
```
Paints                    Expand
[minimap preview]
Share artwork
```

### 4. Aggiornamento Rules Modal (`RulesModal.tsx`)

Aggiungere una nuova sezione dedicata ai VPE dopo la sezione Energy:

**Sezione "Virtual Pixel Energy (VPE)":**
- Spiegazione: VPE e' l'energia gratuita disponibile con un account Google. 300,000 VPE riciclabili.
- I pixel VPE hanno valore 0 e scadono dopo 72h
- Chiunque puo' sovrascrivere un pixel VPE senza costo
- Quando un pixel VPE scade o viene sovrascritto, i VPE vengono rimborsati
- I VPE non possono essere usati per DEF/ATK/REINFORCE
- Per rendere un pixel permanente, serve un wallet con PE reali

Aggiungere VPE nella sezione Quick Reference:
```
VPE | Virtual PE — free energy for Starter accounts (72h expiry)
```

### 5. Aggiornamento WhitePaper/How It Works Modal (`WhitePaperModal.tsx`)

Aggiungere una sezione "Getting Started (Free)" che spiega:
- Puoi iniziare gratis con Google Sign-In
- Ricevi 300,000 VPE (Virtual Pixel Energy) per provare il gioco
- I pixel VPE scadono dopo 72h ma i VPE vengono riciclati
- Per accesso completo e pixel permanenti, connetti un wallet Solana con $BIT

Aggiornare il flow diagram per includere il path VPE:
```
Sign in with Google → Get VPE → Paint (72h) → Want permanent? → Get $BIT
```

### 6. Copy WalletSelectModal (`WalletSelectModal.tsx`)

| Da | A |
|----|---|
| `300,000 recyclable PE — pixels expire after 72h` | `300,000 VPE (Virtual PE) — free, pixels expire after 72h` |
| `Permanent PE based on your $BIT holdings` | `Permanent PE based on your $BIT holdings — full access` |

### 7. Tooltips educativi sui concetti PE e VPE

Aggiungere tooltips nei seguenti punti chiave:

**StatusStrip:**
- Tooltip sulla VPE icon: "Virtual Pixel Energy (VPE): free energy for Starter accounts. VPE pixels expire after 72h and can be painted over by anyone."
- Tooltip sulla PE icon: "Pixel Energy (PE): your energy capacity based on your $BIT wallet value. 1 PE = $0.001."

**UserMenuPanel:**
- Tooltip su "PE Staked": "Total PE locked across all your pixels. This PE is committed and reduces your available balance."
- Tooltip su "VPE Available": "Your remaining Virtual PE budget. VPE is recycled when your pixels expire or are painted over."
- Tooltip su "PE Total": "Your total Pixel Energy, calculated from the dollar value of $BIT in your wallet."

**PixelInfoPanel:**
- Tooltip su "DEF": "Defenders: PE added by other players to protect this pixel. Increases pixel value."
- Tooltip su "ATK": "Attackers: PE spent by others to weaken this pixel. Decreases pixel value."

### 8. Copy ActionBox (`inspector/ActionBox.tsx`)

Aggiungere tooltip sull'icona PE nel cost summary: "PE required to complete this action."

### 9. Copy LeaderboardModal

Label "PE Staked" e' gia' corretto nel PlayerProfileModal. Verificare e allineare.

---

### File da modificare

| File | Modifiche |
|------|-----------|
| `src/components/map/PixelInfoPanel.tsx` | Copy PE/VPE, spostare Share sotto preview, tooltips |
| `src/components/map/inspector/PixelTab.tsx` | Copy Owner Stake -> PE Owner Stake, Total Stake -> PE Total Stake |
| `src/components/modals/RulesModal.tsx` | Aggiungere sezione VPE + Quick Reference VPE |
| `src/components/modals/WhitePaperModal.tsx` | Aggiungere sezione "Getting Started Free" con VPE |
| `src/components/modals/WalletSelectModal.tsx` | Aggiornare copy Google/Phantom descriptions |
| `src/components/map/StatusStrip.tsx` | Tooltips su PE/VPE icons |
| `src/components/modals/UserMenuPanel.tsx` | Tooltips su stats cards |
| `src/components/map/inspector/ActionBox.tsx` | Tooltip su PE required |

### Principi guida
- Ogni menzione di numeri PE deve essere preceduta da "PE" o "VPE" per chiarezza contestuale
- Tooltips concisi (max 2 frasi) che spiegano il concetto in modo accessibile anche a non-crypto users
- Linguaggio semplice: evitare termini blockchain, usare analogie comprensibili
- Consistenza: stesse definizioni ripetute con le stesse parole ovunque

