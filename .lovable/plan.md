
# Fix Leaderboard UI: Allineamento, Testi, Icone + Icona Templates

## 1. Sub-categorie: allineamento centrato

Il `SubCategoryToggle` attualmente usa `flex` senza `justify-center`. Aggiungere `justify-center` al container delle pills per centrare le sub-categorie.

## 2. Empty state: testi contestuali per sub-categoria

Attualmente `EmptyState` accetta solo `scope` e mostra sempre "No players have painted yet" / "Start painting to climb the ranks!". Va aggiornato per accettare anche `subCategory` e mostrare messaggi diversi:

- **painters**: "No players have painted yet" / "Start painting to climb the ranks!"
- **investors**: "No investors yet" / "Stake PE in your pixels to climb the ranks!"
- **defenders**: "No defenders yet" / "Defend pixels to climb the ranks!"
- **attackers**: "No attackers yet" / "Attack pixels to climb the ranks!"

Per Countries e Alliances, stessa logica contestuale.

## 3. Nuove icone: cybersecurity (Defenders) e fire (Attackers)

Creare due nuovi componenti SVG custom seguendo il pattern esistente (PixelSVG base):

- `src/components/icons/custom/PixelCybersecurity.tsx` -- dal SVG `cybersecurity.svg` della libreria HackerNoon
- `src/components/icons/custom/PixelFire.tsx` -- dal SVG `fire.svg` (regular) della libreria HackerNoon

Registrarli in `iconRegistry.ts` come `'cybersecurity'` e `'fire'`.

Aggiornare `SUB_CATEGORIES` in `LeaderboardModal.tsx`:
- `defenders`: icona da `"shield"` a `"cybersecurity"`
- `attackers`: icona da `"swords"` a `"fire"`

## 4. Icona Templates: media

Creare `src/components/icons/custom/PixelMedia.tsx` dal SVG `media.svg` della libreria HackerNoon.

Registrarlo in `iconRegistry.ts` come `'media'`.

Aggiornare `TemplatesButton.tsx`: cambiare `name="image"` a `name="media"`.

## Dettaglio tecnico -- File modificati

| File | Modifica |
|------|----------|
| `src/components/icons/custom/PixelCybersecurity.tsx` | Nuovo componente SVG |
| `src/components/icons/custom/PixelFire.tsx` | Nuovo componente SVG |
| `src/components/icons/custom/PixelMedia.tsx` | Nuovo componente SVG |
| `src/components/icons/iconRegistry.ts` | Aggiungere 3 nuove icone al tipo e alla mappa |
| `src/components/modals/LeaderboardModal.tsx` | Centrare sub-categorie, aggiornare icone defenders/attackers, aggiornare EmptyState con subCategory |
| `src/components/map/TemplatesButton.tsx` | Cambiare icona da `image` a `media` |
