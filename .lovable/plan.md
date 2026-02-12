
# Nuove Icone, Badge Pro e Admin

## Riepilogo

Questo piano copre 6 aree di modifica:

1. **Nuove icone custom** da HackerNoon SVG: `expand`, `pro`, `badgeCheck`, `usersCrown`
2. **Sostituzione icone** in vari componenti
3. **Badge Pro** (bronzo/argento/oro) con effetto brillante
4. **Badge Admin** con icona `badgeCheck`
5. **Assegnazione default oro + admin** al wallet attivo (`76f4ab9b-...`)
6. **Sostituzione icona Leaderboard** ovunque

---

## 1. Creare 4 nuove icone custom

Nuovi file in `src/components/icons/custom/`:

| File | Sorgente SVG | Nome registry |
|------|-------------|---------------|
| `PixelExpand.tsx` | `expand-solid.svg` | `expand` |
| `PixelPro.tsx` | `pro-solid.svg` | `pro` |
| `PixelBadgeCheck.tsx` | `badge-check-solid.svg` | `badgeCheck` |
| `PixelUsersCrown.tsx` | `users-crown-solid.svg` | `usersCrown` |

Ogni file segue il pattern `PixelSVG` gia in uso (base.tsx wrapper).

**File**: `src/components/icons/iconRegistry.ts` - aggiungere le 4 nuove icone al registro e al tipo `IconName`.

---

## 2. Sostituzione icone esistenti

| Componente | Icona attuale | Nuova icona |
|-----------|--------------|-------------|
| `TemplatesButton.tsx` | `image` (PixelIcon) | `image` (invariata - gia corretta, la SVG di HackerNoon `image-solid` e gia mappata) |
| `ActionTray.tsx` riga 231 | `Hand` (lucide) | `PixelIcon name="expand"` |
| `ActionTray.tsx` riga 373 | `Eraser` (lucide) | `PixelIcon name="trash"` |
| `TemplateDetailView.tsx` riga 126 | `Hand` (lucide) | `PixelIcon name="expand"` |
| `InteractionModeToggle.tsx` riga 76 | `Hand` (lucide) | `PixelIcon name="expand"` |
| `ActionBox.tsx` riga 44 | `Eraser` (lucide) | `PixelIcon name="trash"` + riga 115 |
| `ActionBox.tsx` riga 40 | `Paintbrush` (lucide) | `PixelIcon name="brush"` |
| `ActionBox.tsx` riga 41 | `Shield` (lucide) | `PixelIcon name="shield"` |
| `ActionBox.tsx` riga 42 | `Swords` (lucide) | `PixelIcon name="swords"` |
| `AppSidebar.tsx` riga 21 | `Trophy` (lucide) | Componente wrapper con `PixelIcon name="usersCrown"` |
| `LeaderboardModal.tsx` riga 280 | `PixelIcon name="trophy"` | `PixelIcon name="usersCrown"` |
| `LeaderboardPage.tsx` | `PixelIcon name="trophy"` | `PixelIcon name="usersCrown"` |
| `MapMenuDrawer.tsx` riga 110 | `PixelIcon name="trophy"` | `PixelIcon name="usersCrown"` |
| `LeaderboardModal.tsx` EmptyState riga 200 | `PixelIcon name="trophy"` | `PixelIcon name="usersCrown"` |

---

## 3. Badge Pro con effetto brillante

Creare un componente `ProBadge` in `src/components/ui/pro-badge.tsx`:

- Props: `tier: 'bronze' | 'silver' | 'gold'` e `size`
- Usa `PixelIcon name="pro"` con colori:
  - Bronzo: `text-amber-700` (soglia: $100 in BTP)
  - Argento: `text-slate-400` (soglia: $500)
  - Oro: `text-yellow-500` (soglia: $1000)
- Effetto brillante continuo: animazione CSS `shine` con gradiente diagonale trasparente che scorre in loop infinito (3s), simile a quello gia usato per i materiali speciali

Creare anche un componente `AdminBadge` in `src/components/ui/admin-badge.tsx`:

- Usa `PixelIcon name="badgeCheck"` colorato in modo contestuale (es. `text-primary` o un colore admin dedicato come blu/viola)
- Mostra "Admin" come testo a fianco

---

## 4. Determinazione tier e admin

Creare un helper `src/lib/userBadges.ts`:

```text
ADMIN_WALLET = '4J2kvqRR3cb9tHdyhdyTgsnuidpmtKUKDk3AJaMhZa7C'

getProTier(totalStakedPe): 'bronze' | 'silver' | 'gold' | null
  - $1000+ (1_000_000 PE) -> gold
  - $500+ (500_000 PE) -> silver  
  - $100+ (100_000 PE) -> bronze
  - else -> null

isAdmin(walletAddress): boolean
  - walletAddress === ADMIN_WALLET
```

Nota: per ora il tier Pro si basa sul PE stakato (proxy del valore in $BIT). Quando BTP sara live, si potra aggiornare la logica.

---

## 5. Dove mostrare i badge

### Badge Pro (dove contestualmente ha senso):

| Componente | Posizione |
|-----------|-----------|
| `LeaderboardModal.tsx` PlayerRow | Dopo il nome utente, prima del tag alleanza |
| `LeaderboardPage.tsx` (usa lo stesso `PlayerRow`) | Idem |
| `PixelInfoPanel.tsx` | Dopo il nome dell'owner, nella riga nome+alliance |
| `PlayerProfileModal.tsx` | Nell'header del profilo, accanto al nome |

### Badge Admin:

| Componente | Posizione |
|-----------|-----------|
| Stessi componenti del Pro | Mostrato prima del Pro badge, con icona `badgeCheck` + "Admin" |

Per determinare admin: confrontare `wallet_address` con `ADMIN_WALLET`. Per il tier Pro: usare `total_staked_pe` (gia disponibile nei dati della leaderboard e del pixel info).

---

## 6. Animazione Shine CSS

Aggiungere in `src/index.css` (o nel file dove sono gia le animazioni):

```text
@keyframes badge-shine {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
```

Il componente `ProBadge` applica l'effetto come background-image gradient animato sull'icona.

---

## Riepilogo File

| File | Azione |
|------|--------|
| `src/components/icons/custom/PixelExpand.tsx` | Nuovo |
| `src/components/icons/custom/PixelPro.tsx` | Nuovo |
| `src/components/icons/custom/PixelBadgeCheck.tsx` | Nuovo |
| `src/components/icons/custom/PixelUsersCrown.tsx` | Nuovo |
| `src/components/icons/iconRegistry.ts` | Aggiungere 4 icone |
| `src/components/ui/pro-badge.tsx` | Nuovo componente |
| `src/components/ui/admin-badge.tsx` | Nuovo componente |
| `src/lib/userBadges.ts` | Nuovo helper |
| `src/index.css` | Aggiungere keyframe `badge-shine` |
| `src/components/map/ActionTray.tsx` | Sostituire Hand/Eraser lucide |
| `src/components/map/TemplateDetailView.tsx` | Sostituire Hand lucide |
| `src/components/map/InteractionModeToggle.tsx` | Sostituire Hand lucide |
| `src/components/map/inspector/ActionBox.tsx` | Sostituire Eraser/Paintbrush/Shield/Swords lucide |
| `src/components/layout/AppSidebar.tsx` | Sostituire Trophy lucide con usersCrown |
| `src/components/modals/LeaderboardModal.tsx` | usersCrown + ProBadge/AdminBadge in PlayerRow |
| `src/pages/LeaderboardPage.tsx` | usersCrown |
| `src/components/map/MapMenuDrawer.tsx` | usersCrown |
| `src/components/map/PixelInfoPanel.tsx` | ProBadge + AdminBadge nell'owner section |
| `src/components/modals/PlayerProfileModal.tsx` | ProBadge + AdminBadge nell'header profilo |
