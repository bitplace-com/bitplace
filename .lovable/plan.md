
# Fix: Snapshot Distorsione, PE in places-my, Spacing Bottoni

## Tre Problemi

### 1. Snapshot della mappa stretchato nelle card
In `PlaceThumbnail.tsx`, lo snapshot viene disegnato con `ctx.drawImage(img, 0, 0, cw, ch)` che lo allunga per riempire il canvas (container 100% x 128px). L'immagine originale ha proporzioni diverse dal container, causando la distorsione.

**Fix**: Usare un calcolo "cover" per mantenere le proporzioni originali dell'immagine, centrando e ritagliando l'eccesso:

```text
// In PlaceThumbnail.tsx, dentro img.onload
const imgAspect = img.naturalWidth / img.naturalHeight;
const canvasAspect = cw / ch;
let sx = 0, sy = 0, sw = img.naturalWidth, sh = img.naturalHeight;
if (imgAspect > canvasAspect) {
  sw = img.naturalHeight * canvasAspect;
  sx = (img.naturalWidth - sw) / 2;
} else {
  sh = img.naturalWidth / canvasAspect;
  sy = (img.naturalHeight - sh) / 2;
}
ctx.drawImage(img, sx, sy, sw, sh, 0, 0, cw, ch);
```

**File**: `src/components/places/PlaceThumbnail.tsx` - modifica sia `onload` che `onerror` nel blocco snapshotUrl

### 2. PE limitato a 1000 nella tab "My Pins"
Il file `supabase/functions/places-my/index.ts` (righe 124-139) usa ancora il vecchio pattern: `.select("owner_stake_pe")` + reduce in JS. Questo e soggetto al limite di 1000 righe. Inoltre, non filtra per `owner_user_id`, sommando i PE di tutti gli utenti.

**Fix**: Sostituire con la RPC `sum_owner_stake_in_bbox` (gia creata), parallelizzando le chiamate con `Promise.all`.

**File**: `supabase/functions/places-my/index.ts` - righe 124-139

### 3. Bottoni Cancel/Create tagliati
Il `CreatePlaceForm` termina con `<div className="flex gap-2 pt-2">` per i bottoni. Il container `GlassSheet` ha `pb-4` ma quando il form e lungo e scrolla, i bottoni finiscono troppo vicini al bordo inferiore.

**Fix**: Aggiungere `pb-6` al div dei bottoni nel `CreatePlaceForm` per garantire spazio sufficiente in fondo.

**File**: `src/components/places/CreatePlaceForm.tsx` - riga 224

---

## Riepilogo File Modificati

| File | Modifica |
|------|----------|
| `src/components/places/PlaceThumbnail.tsx` | Rendering "cover" per lo snapshot (proportional crop) |
| `supabase/functions/places-my/index.ts` | Usare RPC `sum_owner_stake_in_bbox` con `Promise.all` |
| `src/components/places/CreatePlaceForm.tsx` | Aggiungere `pb-6` ai bottoni finali |
