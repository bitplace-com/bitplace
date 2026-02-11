

# Revisione Completa Pinned Locations

## Panoramica

Questa revisione copre 5 aree: icona location-pin, rimozione fulmine da Trending, fix sorting delle categorie, dati mancanti (PE area, bbox per thumbnails, timestamp), e qualita generale del design delle card.

---

## 1. Icona Location Pin (HackerNoon)

Creare un nuovo componente `PixelLocationPin.tsx` basato sull'SVG `location-pin-solid.svg` di HackerNoon (gia presente nel pacchetto). Il path e:

```text
m19,6v-2h-1v-1h-1v-1h-2v-1h-6v1h-2v1h-1v1h-1v2h-1v6h1v2h1v1h1v2h1v1h1v2h1v1h1v2h2v-2h1v-1h1v-2h1v-1h1v-2h1v-1h1v-2h1v-6h-1Zm-5,5h-1v1h-2v-1h-1v-1h-1v-2h1v-1h1v-1h2v1h1v1h1v2h-1v1Z
```

**File da modificare:**
- NUOVO: `src/components/icons/custom/PixelLocationPin.tsx`
- `src/components/icons/iconRegistry.ts` -- aggiungere `locationPin: PixelLocationPin`
- `src/components/map/ActionTray.tsx` -- cambiare `name="thumbtack"` a `name="locationPin"` nel bottone Places
- `src/components/modals/PlacesModal.tsx` -- cambiare `name="thumbtack"` a `name="locationPin"` nell'header dello sheet

---

## 2. Rimuovere icona fulmine da Trending

Nel `PlacesModal.tsx` (riga 172), rimuovere il `PixelIcon name="bolt"` dal bottone Trending nelle sub-tab. Testo semplice "Trending" come New e Popular.

Nel `PlaceCard.tsx` (righe 149-154), rimuovere il badge trending_score con l'icona bolt dal footer della card. Questo dato non e utile visivamente per l'utente.

---

## 3. Fix Sorting Categorie nel Backend

**`supabase/functions/places-feed/index.ts`:**

- **New**: gia corretto (order by `created_at DESC`) -- nessuna modifica
- **Trending**: cambiare la logica da trending_score (likes_24h * 5 + activity) a ordinamento per `likes_count DESC` (quelli con piu like totali). Questo e piu intuitivo e performante rispetto al calcolo complesso attuale. Rimuovere tutta la logica di likes_24h, activity_24h, e trending_score che e costosa (query per bbox per ogni place)
- **Popular**: cambiare da `likes_count DESC` a ordinamento per PE totale nell'area. Questo richiede una query di SUM dei `owner_stake_pe` sui pixel nel bbox di ciascun place. Per efficienza, calcolare il totale PE solo per i places nella pagina corrente (dopo il fetch iniziale)

**Aggiornamento dati nel response:**
Aggiungere al response di `places-feed` un campo `total_pe` per ogni place, calcolato come SUM di `owner_stake_pe` dai pixel nel bbox. Per Popular, ordinare per questo valore. Per le altre categorie, calcolare comunque il valore per mostrarlo nella card.

**Stesso arricchimento per `places-my/index.ts`:** aggiungere `total_pe` e includere i campi `bbox_*` nel response (attualmente mancanti).

---

## 4. Fix Dati Mancanti

### 4a. PlaceStats interface (`usePlaces.ts`)
Aggiungere `total_pe: number` alla interface `PlaceStats`.

### 4b. places-my response mancante bbox
In `places-my/index.ts`, la funzione `enrichPlace` non include `bbox_xmin/ymin/xmax/ymax`. Aggiungerli al response cosi le card nel tab My Pins possano mostrare le thumbnail.

### 4c. places-create response malformato
In `places-create/index.ts` (riga 238), il response ha `likes_count` e `saves_count` a livello root, ma il frontend si aspetta `stats: { likes_all_time, saves_all_time, total_pe }`. Correggere il response shape.

### 4d. Calcolo PE per area
Per ogni place, il backend calcolera:
```sql
SELECT COALESCE(SUM(owner_stake_pe), 0) as total_pe
FROM pixels
WHERE x >= bbox_xmin AND x <= bbox_xmax
  AND y >= bbox_ymin AND y <= bbox_ymax
```
Questo valore viene restituito come `total_pe` nelle stats.

---

## 5. Redesign PlaceCard

La card attuale e funzionale ma manca di informazioni chiave. Il nuovo layout:

```text
+------------------------------------------+
| [Thumbnail 72x72]  Creator  |  3h ago    |
|                     Title                 |
|                     Description           |
|                                           |
|   PE: 1,250 PE ($1.25)                   |
|   [Heart] 12   [Pin]        [Go ->]      |
+------------------------------------------+
```

**Modifiche al `PlaceCard.tsx`:**

1. **Aggiungere riga PE sotto la descrizione:** mostra `total_pe.toLocaleString() PE` e il valore in USD calcolato come `total_pe / 1000` (dato che 1 PE = $0.001). Usare l'icona PEIcon gia esistente.

2. **Timestamp**: il `formatDistanceToNow` gia funziona correttamente con `addSuffix: false` (mostra "3 hours", "2 days"). Aggiungere `ago` al testo per chiarezza: `{formatDistanceToNow(...)} ago`.

3. **Rimuovere il badge trending_score** (come menzionato al punto 2).

4. **Thumbnail**: gia funzionante con `PlaceThumbnail` che fetcha pixel dal bbox -- nessuna modifica al componente thumbnail stesso, ma assicurarsi che i dati bbox arrivino dal backend (fix punto 4b).

---

## File Modificati (riepilogo)

| File | Tipo | Modifica |
|------|------|----------|
| `src/components/icons/custom/PixelLocationPin.tsx` | NUOVO | Icona location-pin da HackerNoon |
| `src/components/icons/iconRegistry.ts` | EDIT | Registrare locationPin |
| `src/components/map/ActionTray.tsx` | EDIT | Cambiare thumbtack -> locationPin |
| `src/components/modals/PlacesModal.tsx` | EDIT | Cambiare thumbtack -> locationPin, rimuovere bolt da Trending |
| `src/components/places/PlaceCard.tsx` | EDIT | Aggiungere riga PE+USD, rimuovere trending badge, fix timestamp |
| `src/hooks/usePlaces.ts` | EDIT | Aggiungere total_pe a PlaceStats |
| `supabase/functions/places-feed/index.ts` | EDIT | Fix sorting (Trending=likes, Popular=PE), aggiungere total_pe, rimuovere calcoli costosi |
| `supabase/functions/places-my/index.ts` | EDIT | Aggiungere bbox e total_pe al response |
| `supabase/functions/places-create/index.ts` | EDIT | Fix response shape per stats |

