

## Rebranding: VPE diventa "Pixel" (bilancio pixel)

### Concetto

Il termine "VPE" (Virtual Paint Energy) viene eliminato ovunque. L'energia rimane solo **PE (Paint Energy)** -- serve a rendere permanenti i pixel. Il bilancio gratuito degli account Google diventa semplicemente **Pixel** (un budget di pixel da spendere per disegnare). Se l'utente vuole rendere i disegni permanenti, deve allocare PE.

### Riepilogo modifiche per file

| File | Cosa cambia |
|------|-------------|
| `src/components/ui/vpe-icon.tsx` | Rinominare a `PixelBalanceIcon` o rimuovere del tutto e usare un'icona pixel generica (es. `grid2x2`) al posto dell'outline bolt |
| `src/components/modals/PixelControlPanel.tsx` | Sezione 1: "Virtual Paint Energy (VPE)" → "Pixel Balance". Tutti i copy VPE → Pixel. Tooltip aggiornati. Icona sezione cambiata |
| `src/components/modals/UserMenuPanel.tsx` | Label "VPE" → "Pixel Balance". Tooltip e copy aggiornati. Icona da VPEIcon a nuova icona |
| `src/components/wallet/WalletButton.tsx` | Display "VPE" → "Pixel". Import VPEIcon sostituito |
| `src/components/map/StatusStrip.tsx` | Tooltip VPE → Pixel. Label "VPE expiring" → "Pixel expiring". Icona aggiornata |
| `src/components/map/PixelInfoPanel.tsx` | Tooltip "VPE pixels have no real value" → "This pixel has no PE staked". Rimuovere import VPEIcon |
| `src/components/modals/WalletSelectModal.tsx` | "300,000 VPE (Virtual PE)" → "300,000 Pixels — free, expire after 72h" |
| `src/components/modals/RulesModal.tsx` | Sezione "Virtual Paint Energy (VPE)" → "Pixel Balance". Tutti i bullet point VPE → Pixel. Glossario aggiornato |
| `src/hooks/useVpeRenew.ts` | Toast messages: "VPE pixel" → "pixel". Nomi interni invariati (non visibili all'utente) |

### Dettaglio per ogni file

#### 1. `src/components/ui/vpe-icon.tsx`
- Rinominare componente da `VPEIcon` a `PixelBalanceIcon`
- Cambiare icona da `boltOutline` a `grid2x2` (griglia pixel, rappresenta il bilancio pixel)
- Aggiornare commento JSDoc

#### 2. `src/components/modals/PixelControlPanel.tsx`
Sezione 1 (attualmente "Virtual Paint Energy (VPE)"):
- Titolo: **"Pixel Balance"**
- Tooltip titolo: "Your free pixel budget. Sign in with Google to get 300,000 pixels to draw with. These pixels expire 72h after painting and can be painted over by anyone until you add PE."
- Icona sezione: `PixelBalanceIcon` (o `grid2x2`)
- StatBox "Available" tip: "Pixels you can spend right now to draw on the map."
- StatBox "Used" tip: "Pixels currently placed on the map. Recycled when they expire or are painted over."
- StatBox "Active Pixels" tip: invariato
- Renew copy: "Your pixels expire **72h** after painting..." (rimuovere "VPE")
- Bottone: "Renew X Pixel/Pixels" (non "VPE Pixel")
- Bottone disabilitato: "All pixels up to date"
- Fallback non-Google: "Sign in with Google to get 300,000 free pixels — a recyclable budget to try the game."

#### 3. `src/components/modals/UserMenuPanel.tsx`
- Google-only section: label "VPE" → "Pixel Balance", uppercase tracker → "PIXELS"
- Tooltip: "Your free pixel budget. Pixels expire after 72h but you can renew them to reset the timer."
- "{N} VPE available" → "{N} Pixels available"
- "VPE pixels expire after 72h — repaint to reset the timer" → "Your pixels expire after 72h — renew them from Pixel Control to reset the timer"
- Sezione "both" user: stessa logica, label VPE → Pixels

#### 4. `src/components/wallet/WalletButton.tsx`
- Per utenti "both": dove mostra `{realPeAvailable} PE + VPEIcon {virtualPeAvailable}` → mostrare `{realPeAvailable} PE + {virtualPeAvailable} Pixels` (con nuova icona)
- Per Google-only: `VPEIcon {N}` → `PixelBalanceIcon {N}` o `{N} Pixels`

#### 5. `src/components/map/StatusStrip.tsx`
- Google-only tooltip: "Virtual Paint Energy (VPE)..." → "Pixel Balance: your free pixel budget. These pixels expire after 72h and can be painted over by anyone."
- Label: "{N} VPE expiring" → "{N} pixels expiring"
- Tooltip expiring: "VPE pixels expire in less than 6h" → "pixels expire in less than 6h. Open Pixel Control to renew."
- Sezione "both" con VPEIcon → PixelBalanceIcon

#### 6. `src/components/map/PixelInfoPanel.tsx`
- Tooltip su "Total PE Staked" per pixel virtuali: "Virtual PE staked. VPE pixels have no real value..." → "No PE staked. This pixel has no energy allocated and will expire after 72h."
- Rimuovere import `VPEIcon` (non usato dopo le modifiche precedenti)

#### 7. `src/components/modals/WalletSelectModal.tsx`
- "300,000 VPE (Virtual PE) — free, pixels expire after 72h" → "300,000 free Pixels — draw anywhere, expire after 72h"

#### 8. `src/components/modals/RulesModal.tsx`
- Titolo sezione: "Virtual Paint Energy (VPE)" → "Pixel Balance"
- Icona: invariata (outline bolt → grid2x2)
- Copy introduttivo: "Free energy available when you sign in with Google. You get 300,000 recyclable VPE..." → "Free pixel budget when you sign in with Google. You get 300,000 recyclable pixels..."
- Bullet points:
  - "VPE pixels have a value of 0" → "Pixels from your budget have a PE value of 0"
  - "VPE pixels expire after 72h" → "They expire after 72h"
  - "VPE is recycled back to you" → "pixels are recycled back to your budget"
  - "VPE cannot be used for Defend, Attack, or Reinforce" → "Budget pixels cannot be used for Defend, Attack, or Reinforce"
  - "renew all your VPE pixels at once" → "renew all your pixels at once"
- Glossario:
  - "VPE" → "Pixel Balance" con descrizione "Free pixel budget for Starter accounts (72h expiry)"
  - "VPE Renew" → "Pixel Renew" con descrizione "Batch-reset the 72h timer on all eligible pixels"

#### 9. `src/hooks/useVpeRenew.ts`
- Toast success: "Renewed X VPE pixel(s)" → "Renewed X pixel(s)"
- Toast error: "Failed to renew VPE pixels" → "Failed to renew pixels"
- Nomi di variabili/interfacce interne restano `vpe*` per non rompere i consumer (refactoring interno opzionale in futuro)

### Note
- I nomi di variabili interne nel codice (`virtualPeTotal`, `virtualPeAvailable`, `isVirtualPe`, `useVpeRenew`, ecc.) e le colonne DB (`virtual_pe_total`, `virtual_pe_used`, `is_virtual_stake`) **non** vengono rinominati -- sono dettagli tecnici invisibili all'utente
- Le edge functions (`vpe-renew`, `game-commit`) restano invariate
- L'icona della sezione Pixel Balance cambia da bolt outline a `grid2x2` (griglia pixel) per distinguerla visivamente da PE (bolt pieno)

