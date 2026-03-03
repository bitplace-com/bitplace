

# Aggiornamento pagine modali + close-on-outside-click

Ci sono 4 aree di intervento: ShopModal (Buy $BIT), WhitePaperModal (How it works), RulesModal (Rules), e il fix globale per chiusura cliccando fuori / Esc.

---

## 1. Fix globale: chiusura cliccando fuori dal pannello

**File: `src/components/ui/glass-sheet.tsx`**

Il problema: su desktop, `DialogPrimitive.Content` occupa l'intero viewport (`fixed inset-0`) quindi il click fuori dal pannello interno non viene rilevato come "outside" da Radix. 

Fix: aggiungere `onClick={(e) => { if (e.target === e.currentTarget) onOpenChange(false); }}` sul `DialogPrimitive.Content`, e `onClick={(e) => e.stopPropagation()}` sul div interno del pannello. Cosi cliccando nell'area vuota attorno al pannello si chiude il modale. Esc gia funziona nativamente grazie a Radix.

**File: `src/components/modals/WhitePaperModal.tsx`** -- Usa `Dialog`/`DialogContent` standard di shadcn che gia supporta click-outside e Esc. Nessun fix necessario qui per la chiusura.

---

## 2. ShopModal (Buy $BIT) -- riscrittura contenuti

**File: `src/components/modals/ShopModal.tsx`**

Cambiamenti:
- **Titolo**: da "Get more PE" a "Get $BIT"
- **Rimuovere**: tutta la `TokenomicsSection` (team allocation, vesting, etc.) -- mantenere solo Network, CA, Total Supply, e il link Pump.fun
- **Aggiungere sezione educativa** (sempre visibile, prima del wallet):
  - "What is $BIT?" -- spiegazione semplice: il token che alimenta Bitplace, su rete Solana
  - "How it connects to the game" -- i tuoi $BIT determinano quanta Paint Energy (PE) hai. Piu $BIT = piu PE = piu azioni sulla mappa. I tuoi token non vengono mai spesi, restano nel tuo wallet.
  - Rate: $1 di $BIT = 1,000 PE
- **Copy aggiornato**: linguaggio user-friendly, no jargon crypto, evitare "stake/staking"
- Mantenere la parte wallet (QR, copy address, refresh) per utenti connessi

---

## 3. WhitePaperModal (How it works) -- allineamento UI + miglioramenti

**File: `src/components/modals/WhitePaperModal.tsx`**

**UI**: Convertire da `Dialog`/`DialogContent` diretto a `GamePanel` (che wrappa `GlassSheet`). Cosi avra lo stesso header con icona, titolo e X delle altre pagine. Rimuovere il sound effect manuale (gia incluso in GamePanel).

**Contenuti -- riorganizzazione**:
- Hero piu pulito e conciso
- Sezione "Getting started": sostituire "VPE" con "Pixel Balance" / "Pixels" (terminologia corretta)
- Sezione "Mechanics": ok cosi
- Sezione "How value works": semplificare, rimuovere "locked into the system" (evitare "stake"), usare linguaggio chiaro
- Sezione "Your money, your choice": ok
- Sezione "Value creation": rimuovere riferimenti a "stake", usare "place energy" / "use PE"
- Footer CTA: mantenere

---

## 4. RulesModal -- riorganizzazione e miglioramento qualita

**File: `src/components/modals/RulesModal.tsx`**

**Riorganizzazione sezioni** (ordine piu logico):
1. **Rules** (community rules) -- mantenere cosi, va bene
2. **Getting Started** (nuovo) -- breve intro su come si inizia, Pixel Balance per account Google, PE per wallet
3. **Paint Energy (PE)** -- cos'e e come funziona, rate
4. **Actions** -- Paint, Defend, Attack, Reinforce spiegate in modo chiaro
5. **Pixel Value & Takeover** -- come funziona il valore pixel, quando avviene un takeover
6. **Decay & Collateralization** -- spiegazione semplificata

**Miglioramenti**:
- Rimuovere "Stake" come termine (sostituire con "PE placed on pixels" o "energy used")
- Quick Reference: semplificare, rimuovere voci ridondanti
- Linguaggio piu chiaro per non-crypto users

---

## File modificati

| File | Tipo modifica |
|------|--------------|
| `src/components/ui/glass-sheet.tsx` | Fix click-outside close |
| `src/components/modals/ShopModal.tsx` | Riscrittura contenuti |
| `src/components/modals/WhitePaperModal.tsx` | Conversione a GamePanel + copy update |
| `src/components/modals/RulesModal.tsx` | Riorganizzazione e miglioramento |

