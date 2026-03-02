

# Unificare badge STARTER e PRO + aggiornare copy login

## Problemi identificati

1. **StarterBadge component inutilizzato** -- Il componente `src/components/ui/starter-badge.tsx` non e' importato da nessun file. Tutti i badge STARTER sono `<span>` inline duplicati.
2. **Animazione STARTER inconsistente** -- In LeaderboardModal usa `animate-shine` (sweep bianco CSS, stessa dei podio). In WalletButton e UserMenuPanel non ha nessuna animazione.
3. **ProBadge usa PixelPro con SVG gradient shine** -- Animazione diversa e piu' sofisticata rispetto al CSS shine.
4. **Nessun badge STARTER riusa il componente centralizzato** -- Copy-paste ovunque.
5. **Copy login da aggiornare** -- "expire after 72h unless renewed" e "Permanent PE from $BIT holdings" da riscrivere.

## Piano

### 1. Creare icona pixel-art `PixelStarter` con animazione SVG gradient shine

Creare `src/components/icons/custom/PixelStarter.tsx` seguendo lo stesso pattern di `PixelPro.tsx`:
- Icona pixel-art che rappresenta lo Starter (un pennello stilizzato o una stella/sparkle pixel)
- Prop `shine?: boolean` che attiva un `linearGradient` animato identico a quello di PixelPro
- Colori del gradiente: tonalita' neutre/cool (slate/zinc) anziche' gold, per differenziare visivamente da PRO mantenendo qualita'
  - Gradiente: `#64748b` -> `#94a3b8` -> `#cbd5e1` -> `#ffffff` (sweep) -> `#cbd5e1` -> `#94a3b8` -> `#64748b`
- Stessa struttura SVG animate di PixelPro (x1/y1/x2/y2 da -12 a 24/36, dur 2s)

### 2. Aggiornare `src/components/ui/starter-badge.tsx`

Riscrivere per seguire lo stesso pattern di `ProBadge`:
- Importare `PixelStarter`
- Props: `shine?: boolean`, `size?: 'sm' | 'md'`, `className?: string`
- Renderizzare icona + testo "Starter" (opzionale, solo con size md)
- Colore: `text-slate-400` (neutro ma elegante)
- Titolo: "Starter -- Playing with free Pixels"

### 3. Sostituire tutti gli inline STARTER badge con `<StarterBadge />`

**`src/components/wallet/WalletButton.tsx`** (riga 89-91):
- Sostituire `<span>STARTER</span>` con `<StarterBadge shine size="sm" />`

**`src/components/modals/UserMenuPanel.tsx`** (riga 100-102):
- Sostituire `<span>STARTER</span>` con `<StarterBadge shine size="sm" />`

**`src/components/modals/LeaderboardModal.tsx`** (riga 129-132):
- Sostituire `<span className="... animate-shine">STARTER</span>` con `<StarterBadge shine size="sm" />`

**`src/components/modals/WalletSelectModal.tsx`** (riga 122):
- Sostituire `<TierBadge label="STARTER" />` con `<StarterBadge shine size="sm" />`
- Sostituire `<TierBadge label="PRO" variant="pro" />` con `<ProBadge shine size="sm" />`
- Rimuovere il componente locale `TierBadge` (non piu' necessario)

### 4. Aggiornare copy login in `WalletSelectModal.tsx`

**Google (Starter) -- riga 121:**
- Da: `"300,000 free Pixels — draw anywhere, expire after 72h unless renewed"`
- A: `"300,000 free Pixels to draw anywhere — renew them all with one click"`

**Phantom (Pro) -- riga 143:**
- Da: `"Permanent PE from $BIT holdings — full pixel ownership"`
- A: `"Your $BIT gives you Paint Energy — use it for permanent pixels no one can overwrite"`

**Phantom non installato (desktop) -- riga 146:**
- Da: `"Install to get permanent PE"`
- A: `"Install to get permanent pixels"`

### 5. Registrare icona in `iconRegistry.ts`

Aggiungere `starter` al registry se necessario per coerenza (opzionale, dato che l'icona sara' importata direttamente).

## File coinvolti

1. `src/components/icons/custom/PixelStarter.tsx` -- NUOVO: icona pixel-art con SVG gradient shine
2. `src/components/ui/starter-badge.tsx` -- Riscrivere con PixelStarter + shine
3. `src/components/wallet/WalletButton.tsx` -- Usare StarterBadge
4. `src/components/modals/UserMenuPanel.tsx` -- Usare StarterBadge
5. `src/components/modals/LeaderboardModal.tsx` -- Usare StarterBadge (rimuovere animate-shine CSS)
6. `src/components/modals/WalletSelectModal.tsx` -- Usare StarterBadge + ProBadge, aggiornare copy, rimuovere TierBadge

