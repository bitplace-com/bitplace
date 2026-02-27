

# Fix Info Pixel: Avatar Google e label "Total"

## Modifiche

### 1. Avatar Google nell'info pixel (`src/components/map/PixelInfoPanel.tsx`)

Il codice attuale (riga 250) controlla solo `avatar_url`. Se l'utente non ha caricato un avatar custom ma ha un account Google, l'avatar Google non viene mostrato e si vede il fallback con le iniziali.

**Fix**: aggiungere fallback a `google_avatar_url` nella condizione dell'avatar, esattamente come gia' fatto in `WalletButton.tsx` e `PlayerProfileModal.tsx`.

```
avatar_url || google_avatar_url  -->  mostra immagine
nessuno dei due                  -->  AvatarFallback
```

### 2. Rimuovere "Total" dalle label (stesso file)

Tre label nella sezione OVERVIEW:
- "Total Pixels Painted" -> "Pixels Painted"
- "Total PE Staked" -> "PE Staked"
- "Total PE Value" -> "PE Value"

### 3. Stessa fix avatar in PixelTab.tsx (inspector laterale)

Il `PixelTab.tsx` non mostra affatto l'avatar dell'owner. Non serve intervenire li' perche' non ha sezione avatar, ma il `PixelInfoPanel.tsx` (pannello principale cliccando sul pixel) e' l'unico file da modificare.

## File toccati

1 file: `src/components/map/PixelInfoPanel.tsx`
- Riga 250: condizione avatar -> aggiungere `|| pixel.owner?.google_avatar_url`
- Riga 253: src immagine -> `pixel.owner.avatar_url || pixel.owner.google_avatar_url`
- Riga 342: "Total Pixels Painted" -> "Pixels Painted"
- Riga 351: "Total PE Staked" -> "PE Staked"
- Riga 363: "Total PE Value" -> "PE Value"

