

# Rallentare animazione STARTER e rinominare in BITPLACER

## 1. Rallentare animazione SVG

**File: `src/components/icons/custom/PixelStarterText.tsx`**

- Cambiare `dur="2s"` a `dur="3.5s"` sui 4 `<animate>` (stessa cosa per `PixelStarter.tsx`)
- Aggiornare il testo SVG da `STARTER` a `BITPLACER`
- Allargare il viewBox da `0 0 52 14` a `0 0 68 14` per il testo piu' lungo, e centrare `x="34"`

**File: `src/components/icons/custom/PixelStarter.tsx`**

- Cambiare `dur="2s"` a `dur="3.5s"` sui 4 `<animate>` (icona penna usata nella leaderboard)

## 2. Rinominare STARTER -> BITPLACER ovunque

**File: `src/components/wallet/WalletButton.tsx`** (riga 79)
- Fallback testo: `'Starter'` -> `'Bitplacer'`

**File: `src/components/modals/WalletSelectModal.tsx`** (riga 122)
- Badge inline: `STARTER` -> `BITPLACER`

**File: `src/components/modals/GuidedTour.tsx`** (riga 84)
- Label: `"Google (Starter)"` -> `"Google (Bitplacer)"`

**File: `src/components/modals/RulesModal.tsx`** (riga 214)
- Descrizione: `"Starter accounts"` -> `"Bitplacer accounts"`

**File: `src/components/map/inspector/ActionBox.tsx`** (riga 100)
- Testo: `"Starter accounts"` -> `"Bitplacer accounts"`

**File: `src/components/ui/starter-badge.tsx`** (riga 17)
- Title: `"Starter — Playing with free Pixels"` -> `"Bitplacer — Playing with free Pixels"`

## File coinvolti

1. `src/components/icons/custom/PixelStarterText.tsx` -- rallentare + testo BITPLACER
2. `src/components/icons/custom/PixelStarter.tsx` -- rallentare animazione
3. `src/components/wallet/WalletButton.tsx` -- rinominare fallback
4. `src/components/modals/WalletSelectModal.tsx` -- rinominare badge
5. `src/components/map/GuidedTour.tsx` -- rinominare label
6. `src/components/modals/RulesModal.tsx` -- rinominare descrizione
7. `src/components/map/inspector/ActionBox.tsx` -- rinominare testo
8. `src/components/ui/starter-badge.tsx` -- rinominare title

