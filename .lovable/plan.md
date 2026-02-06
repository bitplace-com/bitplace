

# Rules Section Rewrite: Glossario Tecnico Umanamente Comprensibile

## Riepilogo

1. **Riscrivere i contenuti di Rules** con linguaggio chiaro e diretto, senza formule astratte
2. **Spostare Rules** come ultima voce nel menu (dopo White Paper)
3. **Aggiornare le icone** al sistema PixelIcon (Hackernoon) dove disponibili

---

## Filosofia del Nuovo Copy

| Prima | Dopo |
|-------|------|
| `V = owner_stake + DEF − ATK` | Spiegazione del concetto senza formula |
| `max(0, V_floor_next6h) + 1` | Cosa succede in pratica, non come si calcola |
| Termini tecnici non spiegati | Ogni termine contestualizzato con causa ed effetto |

---

## Nuova Struttura Rules Modal

### 1. Pixel Energy (PE)
**Icona**: `bolt` (PixelIcon)

> La tua energia di gioco. Più $BIT hai nel wallet, più PE puoi usare. 
> Ogni azione sulla mappa (dipingere, difendere, attaccare, rinforzare) richiede PE.
> In fase test, il PE viene calcolato dal valore in $SOL del tuo wallet.

### 2. Le 4 Azioni
**Icona**: `brush`, `shield`, `swords`, `plus` (tutte PixelIcon)

| Azione | Descrizione |
|--------|-------------|
| **Paint** | Dipingi pixel vuoti. Costa 1 PE per pixel. Il tuo stake iniziale determina quanto sarà difficile rubarti il pixel. |
| **Defend** | Aggiungi PE a pixel di altri giocatori per aiutarli a proteggersi. Il tuo PE rende più difficile l'attacco. |
| **Attack** | Indebolisci pixel altrui con il tuo PE. Quando un pixel è abbastanza debole, puoi dipingerci sopra. |
| **Reinforce** | Aggiungi PE ai tuoi pixel. Più PE hai in un pixel, più è resistente agli attacchi. |

### 3. Valore di un Pixel
**Icona**: `trendingDown` (PixelIcon)

> Ogni pixel ha un valore determinato da: quanto PE ha messo il proprietario, quanto PE è stato aggiunto in difesa, meno il PE usato per attaccarlo.
> 
> Quando questo valore scende a zero (o sotto), chiunque può rivendicare il pixel dipingendoci sopra.

### 4. Conquista (Takeover)
**Icona**: `flag` (PixelIcon)

> Per conquistare un pixel di un altro giocatore, devi fare stake di più PE di quanto vale attualmente il pixel.
> 
> Quando conquisti un pixel:
> - Diventi il nuovo proprietario
> - Il vecchio proprietario riottiene il suo PE
> - I difensori riottengono il loro PE
> - Gli attaccanti diventano automaticamente i tuoi difensori

### 5. Decay (Decadimento)
**Icona**: `clock` (PixelIcon)

> Se il valore del tuo wallet scende, potresti avere meno PE di quello che hai staccato sui pixel.
> 
> In questo caso, il tuo stake diminuisce gradualmente nell'arco di 3 giorni.
> 
> Puoi fermare il decadimento immediatamente riportando il tuo wallet al valore necessario.

### 6. Glossario
**Formato**: Lista compatta di definizioni

| Termine | Significato |
|---------|-------------|
| **PE** | Pixel Energy - la tua capacità di agire sulla mappa |
| **Stake** | PE che hai bloccato in un pixel |
| **DEF** | Difesa - PE aggiunto da altri per proteggerti |
| **ATK** | Attacco - PE usato da altri per indebolire il pixel |
| **Takeover** | Conquista di un pixel dopo averlo indebolito abbastanza |

### 7. Nota finale
> Zooma al livello 16+ per iniziare a dipingere.

---

## Modifica Menu (MapMenuDrawer.tsx)

**Ordine attuale in BASICS:**
1. Leaderboard
2. Alliance
3. Rules
4. White Paper

**Nuovo ordine:**
1. Leaderboard
2. Alliance
3. White Paper
4. Rules

---

## Icone da Aggiornare

| Elemento | Da (Lucide) | A (PixelIcon) |
|----------|-------------|---------------|
| Title icon | `Book` | `book` |
| PE section | `Zap` | `bolt` |
| Pixel Value | `TrendingDown` | `trendingDown` |
| Paint | `Paintbrush` | `brush` |
| Defend | `Shield` | `shield` |
| Attack | `Swords` | `swords` |
| Reinforce | `Plus` | `plus` |
| Conquest | - (nuovo) | `flag` |
| Decay | - (nuovo) | `clock` |

---

## File da Modificare

| File | Modifiche |
|------|-----------|
| `src/components/modals/RulesModal.tsx` | Riscrittura completa dei contenuti, nuove icone PixelIcon |
| `src/components/map/MapMenuDrawer.tsx` | Spostare Rules dopo White Paper nel menu |

---

## Struttura Visiva Finale

```text
┌─────────────────────────────────────────┐
│  📖 Rules                               │
├─────────────────────────────────────────┤
│                                         │
│  ⚡ PIXEL ENERGY (PE)                   │
│  La tua energia di gioco...             │
│                                         │
│  LE 4 AZIONI                            │
│  🖌 Paint - Dipingi pixel vuoti...      │
│  🛡 Defend - Aiuta altri a proteggersi  │
│  ⚔ Attack - Indebolisci pixel altrui   │
│  ➕ Reinforce - Rafforza i tuoi pixel   │
│                                         │
│  📉 VALORE DI UN PIXEL                  │
│  Ogni pixel ha un valore...             │
│                                         │
│  🚩 CONQUISTA (TAKEOVER)                │
│  Per conquistare un pixel...            │
│                                         │
│  🕐 DECAY (DECADIMENTO)                 │
│  Se il valore del tuo wallet scende...  │
│                                         │
│  GLOSSARIO                              │
│  PE · Stake · DEF · ATK · Takeover      │
│                                         │
│  💡 Zooma al livello 16+ per dipingere  │
│                                         │
└─────────────────────────────────────────┘
```

---

## Dettagli Tecnici

### RulesModal.tsx - Import aggiornati

```tsx
import { PixelIcon } from "@/components/icons";
import { GamePanel } from "./GamePanel";
```

Rimuovere tutti gli import Lucide: `Book`, `Paintbrush`, `Shield`, `Swords`, `Plus`, `Zap`, `TrendingDown`.

### MapMenuDrawer.tsx - Nuovo ordine menu (linee 132-150)

```tsx
{/* White Paper - ora prima */}
<Button
  variant="ghost"
  onClick={() => setWhitePaperOpen(true)}
  ...
>
  <PixelIcon name="book" size="md" />
  White Paper
</Button>

{/* Rules - ora ultimo */}
<Button
  variant="ghost"
  onClick={() => setRulesOpen(true)}
  ...
>
  <PixelIcon name="book" size="md" />
  Rules
</Button>
```

