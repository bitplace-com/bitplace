

# Fix Preview Artwork + PE Prominence nelle Pinned Locations

## Problemi Identificati

1. **Preview sgranata nel form di creazione**: L'`ArtworkPreview` in `CreatePlaceForm` usa una canvas fissa di 280px con un `pixelSize` capped a 10, ma il bbox calcolato dall'Union-Find puo essere enorme (range di centinaia di pixel), risultando in pixel da 1-2px ciascuno -- illeggibili
2. **PlaceThumbnail nella card**: Stesso problema -- il canvas e piccolo (400x128) ma il bbox puo coprire centinaia di pixel, rendendo ogni pixel sub-pixel
3. **PE e valore USD troppo piccoli**: Usano `text-[11px]` e `text-[10px]`, quasi invisibili nella card
4. **DPR non gestito in PlaceThumbnail**: Il canvas non usa `devicePixelRatio`, risultando sfocato su display retina

---

## Soluzione

### 1. Fix ArtworkPreview nel CreatePlaceForm

Il problema principale e che il bbox e troppo grande rispetto alla canvas. La soluzione:

- Usare `devicePixelRatio` correttamente (gia fatto)
- Rimuovere il cap `pixelSize <= 10` -- lasciare che i pixel si adattino allo spazio disponibile
- Il `pixelSize` deve essere semplicemente `available / Math.max(rangeX, rangeY)` senza cap superiore, cosi pixel artwork piccoli vengono ingranditi per riempire la preview
- Aumentare SIZE a 320 per dare piu spazio
- Ridurre padding a 4

**File: `src/components/places/CreatePlaceForm.tsx`**
- `ArtworkPreview`: cambiare la formula del `pixelSize` da `Math.max(1, Math.min(available / rangeX, available / rangeY, 10))` a `Math.max(1, Math.min(available / rangeX, available / rangeY))` (rimuovere il cap a 10)
- SIZE da 280 a 320

### 2. Fix PlaceThumbnail (card nel feed)

Stesso fix: il canvas non usa DPR e il rendering e impreciso.

**File: `src/components/places/PlaceThumbnail.tsx`**
- Aggiungere `devicePixelRatio` scaling al canvas (come fa `ClusterCanvas` in `OwnerArtworkModal`)
- Il canvas interno deve avere dimensioni `width * dpr` e `height * dpr`, con `ctx.scale(dpr, dpr)`
- Rimuovere il `Math.ceil` sui rect che causa artefatti -- usare `pixelSize - 0.3` come fa `ClusterCanvas`
- Il `cellSize` non deve avere cap superiore, per permettere ai pixel di riempire la card quando il bbox e piccolo

### 3. PE e USD piu prominenti nella PlaceCard

**File: `src/components/places/PlaceCard.tsx`**

Cambiare la sezione PE da:
- `text-[11px]` e `text-[10px]` (quasi invisibile)
A:
- Una riga dedicata con `text-sm font-semibold` per il valore PE e `text-xs` per USD
- Usare un layout con sfondo `bg-muted/30 rounded-md px-2 py-1` per dare risalto
- Mostrare sempre la riga PE (anche se 0, mostrare "0 PE")
- Icona PEIcon size `sm` invece di `xs`

Nuovo layout della riga PE:
```
[PEIcon] 1,250 PE  ~  $1.25
```
Con `text-sm font-semibold tabular-nums` per il numero PE e `text-xs text-muted-foreground` per il dollaro.

---

## File Modificati

| File | Modifica |
|------|----------|
| `src/components/places/CreatePlaceForm.tsx` | Fix pixelSize formula (rimuovere cap 10), SIZE a 320 |
| `src/components/places/PlaceThumbnail.tsx` | Aggiungere DPR scaling, fix cellSize formula, fix rect rendering |
| `src/components/places/PlaceCard.tsx` | PE row piu grande e prominente con sfondo e font piu grandi |

