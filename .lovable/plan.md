

# Aggiornamento UI Completo: Player Profile, Leaderboard, Alliance e Correzioni Varie

## 1. Player Profile Modal - Redesign con Glass Style

**File: `src/components/modals/PlayerProfileModal.tsx`**

- Sostituire `Dialog` con `GamePanel` (glass-sheet) per coerenza con gli altri pannelli
- Applicare glass style (usa `GlassSheet` tramite `GamePanel`)
- Rendere la mini-map cliccabile per aprire `OwnerArtworkModal` (riutilizzando lo stesso componente del PixelInfoPanel) - serve anche un prop `onJumpToPixel` da passare (navigazione alla mappa)
- Rimuovere le icone `externalLink` dai social link, mantenere solo icona social + testo cliccabile
- Aggiungere stat "Total Staked" con valore in $ (verde emerald)
- Aggiungere stat "Value" in verde emerald ($)
- Correggere "Pixels Painted" per usare `pixels_painted_total` dal DB (attualmente mostra `totalPixelsOwned` che e sbagliato)

**File: `src/hooks/usePlayerProfile.ts`**

- Aggiungere campo `pixelsPaintedTotal` all'interfaccia `PlayerProfile`
- Popolare con `pixels_painted_total` dalla query `public_user_profiles`

## 2. Admin Badge - Colore Dorato con Effetto Shiny

**File: `src/components/ui/admin-badge.tsx`**

- Cambiare il colore da `text-violet-500` a `text-yellow-500` (dorato)
- Aggiungere la classe `animate-shine` (stessa usata dal ProBadge) per l'effetto shiny

## 3. Leaderboard - Centrare Toggle, Effetti Podio, Colori

**File: `src/components/modals/LeaderboardModal.tsx`**

- Centrare `MetricToggle` e `Period pills` (aggiungere `justify-center`)
- Nella sezione "PE Staked", rimuovere la riga secondaria che mostra i total pixels (nel `MetricValue` quando `metric === "pe_staked"`)
- Colorare il valore in `$` con `text-emerald-500` ovunque appaia nella leaderboard
- Aggiungere effetto shiny alle prime 3 posizioni nel `RankBadge` (oro, argento, bronzo con `animate-shine`)
- Aggiungere colori podio anche alle righe (sottile highlight di sfondo per top 3)

## 4. Alliance - Rimuovere Sottotitolo + Immagine

**File: `src/components/modals/AllianceModal.tsx`**

- Rimuovere `description="Manage your alliance"` e `description="Join forces with other players"` e `description="Create an alliance and invite players"` dai GamePanel
- Cambiare titolo consistente: "Alliance" (non "Alliances" o "My Alliance")

**Immagine Alleanza**: Questo richiede una modifica al database (aggiunta colonna `image_url` alla tabella alliances) e un meccanismo di upload. Verra incluso nel piano ma richiede una migrazione DB.

## 5. GlassSheet - Rimuovere Sottotitoli (Description)

**File: `src/components/ui/glass-sheet.tsx`**

- Nessuna modifica strutturale; i sottotitoli vengono rimossi rimuovendo il prop `description` dai singoli pannelli

**File: `src/components/modals/GamePanel.tsx`**

- Il prop `description` e gia opzionale, basta non passarlo

## 6. Artwork -> Paints (Rename globale)

Cambiare "Artwork" in "Paints" in:

- `src/components/map/PixelInfoPanel.tsx` - label "Artwork" -> "Paints", bottone "Expand"
- `src/components/map/OwnerArtworkModal.tsx` - titolo `{name}'s Artwork` -> `{name}'s Paints`, `Owner's Artwork` -> `Owner's Paints`
- `src/hooks/useWalletGate.ts` - toast `'Sign in to save your artwork'` -> `'Sign in to save your paints'`
- `src/components/map/hooks/usePaintQueue.ts` - toast `'Sign in to save your artwork'` -> `'Sign in to save your paints'`
- `src/components/places/CreatePlaceForm.tsx` - label `"Artwork Preview"` -> `"Paints Preview"`, variabili interne non rinominate (non visibili all'utente)

## 7. Pixel Info Panel - Rimuovere Corona + "Owned by"

**File: `src/components/map/PixelInfoPanel.tsx`**

- Rimuovere l'icona `crown` dalla riga "You own this pixel" (linea ~160)
- Quando il pixel non e tuo, mostrare "Owned by" (al posto di nessun testo/solo il nome)
- Cambiare "Available to claim" in "Available to paint" (linea ~233)

## 8. Default a Brush 1x quando si switcha a Draw Mode

**File: `src/components/map/hooks/useMapState.ts`**

- Modificare `setInteractionMode` per resettare `paintTool: 'BRUSH'` e `brushSize: '1x'` e ripristinare `selectedColor` al `lastBrushColor` quando si passa a `'draw'`

## 9. Rimuovere Bottone Matita Extra

Dall'analisi del codice, nel pannello ActionTray il bottone nel toggle di interazione (drag/draw) mostra un'icona `ModeIcon` che cambia in base al mode (brush/shield/swords). Il bottone "draw" nel toggle `drag`/`draw` non e un bottone extra superfluo - e il toggle stesso. L'utente potrebbe riferirsi a un elemento specifico visibile nella UI. Dall'analisi del codice non trovo un bottone matita duplicato separato dal toggle. Verra verificato e rimosso se presente.

---

## Dettagli Tecnici

### Modifiche al Database (per immagine alleanza)

Nuova colonna nella tabella `alliances`:
```sql
ALTER TABLE alliances ADD COLUMN image_url text;
```

Modifica alla edge function `alliance-manage` per supportare upload/update immagine alleanza.

### File coinvolti (riepilogo)

| File | Modifiche |
|------|-----------|
| `src/components/modals/PlayerProfileModal.tsx` | Redesign glass style, pixel cliccabili, social fix, stats corretti |
| `src/hooks/usePlayerProfile.ts` | Aggiungere `pixelsPaintedTotal` |
| `src/components/ui/admin-badge.tsx` | Colore dorato + shine |
| `src/components/modals/LeaderboardModal.tsx` | Centrare toggle, rimuovere px da PE staked, $ verde, podio shiny |
| `src/components/modals/AllianceModal.tsx` | Rimuovere sottotitoli, titolo "Alliance" |
| `src/components/map/PixelInfoPanel.tsx` | Rimuovere corona, "Owned by", "Available to paint", "Paints" |
| `src/components/map/OwnerArtworkModal.tsx` | "Paints" |
| `src/components/map/hooks/useMapState.ts` | Default BRUSH 1x su draw mode |
| `src/hooks/useWalletGate.ts` | "paints" |
| `src/components/map/hooks/usePaintQueue.ts` | "paints" |
| `src/components/places/CreatePlaceForm.tsx` | "Paints Preview" |

