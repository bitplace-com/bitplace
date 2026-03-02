

# Sostituire "stake" con terminologia standard + aggiungere Pin al tour

## 1. Sostituzione terminologia "stake" -> "use/spend/put"

Cambiare tutte le occorrenze user-facing di "stake" con parole standard. Le variabili interne e i nomi di colonne DB restano invariati -- cambiamo solo il copy visibile agli utenti.

### Regole di sostituzione:
- "stake more PE" -> "use more PE"
- "staked/staking" (come azione) -> "used" / "using"
- "stake energy" -> "use energy"
- "owner's stake" -> "owner's PE" o "owner's energy"
- "pixel stakes" -> "pixel PE" o "PE on pixels"
- "staked PE" -> "used PE"
- "PE Owner Stake" (label) -> "PE Owner"
- "Stake" (glossario) -> riformulare come "PE used on a pixel"
- "Real stakes" (WhitePaper) -> "Real consequences" (qui "stakes" e' metaforico, va bene cambiarlo)

### File e modifiche specifiche:

**`src/components/map/GuidedTour.tsx`** (riga 95):
- "unless they stake more PE" -> "unless they use more PE than you"

**`src/components/modals/RulesModal.tsx`**:
- Riga 135: "you just need to stake more PE" -> "you just need to use more PE"
- Riga 147: "you must stake more PE" -> "you must use more PE"
- Riga 168: "Your pixel stakes stay valid" -> "Your pixel PE stays valid"; "stakes gradually decay" -> "PE gradually decays"
- Riga 180: "backs your pixel stakes" -> "backs your pixel PE"; "total staked PE" -> "total used PE" (x2); "stakes decay" -> "PE decays"
- Riga 197-198: Quick Reference "Stake" -> "Used PE" con descrizione "PE placed on a pixel to claim or strengthen it"
- Riga 210: "staking more PE" -> "using more PE"

**`src/pages/RulesPage.tsx`** (riga 77):
- "you must stake more PE" -> "you must use more PE"

**`src/pages/WhitePaperPage.tsx`**:
- Riga 27: "Stake energy to paint it" -> "Use energy to paint it"
- Riga 32: "The more energy staked" -> "The more energy used"
- Riga 42: "Strengthens your stake" -> "Strengthens your pixels"
- Riga 60: "Real stakes" -> "Real consequences"
- Riga 122-123: "stake more energy" -> "use more energy"

**`src/pages/TermsPage.tsx`**:
- Riga 31: "stake Paint Energy" -> "use Paint Energy"
- Riga 103: "PE is used to stake on pixels" -> "PE is used on pixels"
- Riga 104: "Staked PE is locked" -> "Used PE is locked"
- Riga 112: "defensive stake" -> "defensive energy"
- Riga 184: "Staked PE may be" -> "Used PE may be"

**`src/pages/SpecPage.tsx`**:
- Riga 75: "PE staked by the owner" -> "PE placed by the owner"
- Riga 106: "Remove stake from" -> "Withdraw PE from"

**`src/components/map/inspector/PixelTab.tsx`**:
- Riga 173: "Stake real PE (DEF)" -> "Add real PE (DEF)"
- Riga 191: "PE Owner Stake" -> "PE Owner"
- Riga 290: "Owner's stake is losing value" -> "Owner's PE is losing value"

**`src/components/map/StatusStrip.tsx`** (riga 261):
- "Staked in X px" -> "Used in X px"

**`src/components/modals/PlayerProfileModal.tsx`** (riga 439):
- "Dollar value of staked PE" -> "Dollar value of used PE"

**`src/components/modals/LeaderboardModal.tsx`** (riga 238):
- "Stake PE in your pixels" -> "Use PE on your pixels"

**`src/components/modals/PixelControlPanel.tsx`**:
- Riga 179: "locked in pixel stakes" -> "locked in pixels"
- Riga 214: "strengthens the pixel's stake" -> "strengthens the pixel's value"
- Riga 220: "weakens the pixel's stake" -> "weakens the pixel's value"

**`src/lib/userBadges.ts`** (solo commenti, non user-facing -- opzionale):
- "total staked PE" nel commento -> "total used PE" (solo per coerenza interna)

## 2. Aggiungere Pin al tour step "bottom-right-controls"

**`src/hooks/useGuidedTour.ts`** (righe 107-112):
- Titolo: "Notifications & Pixel Art" -> "Pixel Art, Pins & Notifications"
- Descrizione: aggiungere il concetto del Pin. Nuovo testo:
  "Toggle pixel art opacity to see the map underneath, save your favorite locations as Pins, and check your notifications for attacks, alliance invites and more."

## Riepilogo file coinvolti

1. `src/hooks/useGuidedTour.ts` -- titolo e descrizione step Pin
2. `src/components/map/GuidedTour.tsx` -- copy Phantom
3. `src/components/modals/RulesModal.tsx` -- 6 modifiche di copy
4. `src/pages/RulesPage.tsx` -- 1 modifica
5. `src/pages/WhitePaperPage.tsx` -- 5 modifiche
6. `src/pages/TermsPage.tsx` -- 4 modifiche
7. `src/pages/SpecPage.tsx` -- 2 modifiche
8. `src/components/map/inspector/PixelTab.tsx` -- 3 modifiche
9. `src/components/map/StatusStrip.tsx` -- 1 modifica
10. `src/components/modals/PlayerProfileModal.tsx` -- 1 modifica
11. `src/components/modals/LeaderboardModal.tsx` -- 1 modifica
12. `src/components/modals/PixelControlPanel.tsx` -- 3 modifiche

