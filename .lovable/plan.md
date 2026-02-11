

# Delete Pin + Anteprima Grande + Pin Placement su Mappa

## Panoramica

Tre macro-funzionalita:

1. **Bottone Delete pin** nella sezione "Created by Me" (My Pins)
2. **Anteprima thumbnail molto piu grande** nella card dei pin
3. **Nuova UX di creazione pin**: click su "Create Pin" chiude il pannello, il cursore diventa un pin, l'utente clicca sulla mappa per posizionarlo, il sistema identifica l'artwork (tutti i pixel dello stesso owner connessi) e riapre il pannello con i dati compilati

---

## 1. Delete Pin

### Backend: Nuovo edge function `places-delete`

Creare `supabase/functions/places-delete/index.ts`:
- Autenticazione JWT (stesso pattern delle altre funzioni)
- Riceve `{ place_id: string }`
- Verifica che `creator_user_id = userId` prima di cancellare
- Cancella anche le righe correlate in `place_likes` e `place_saves` (cascade manuale via service role)
- Cancella la riga da `places`
- Ritorna `{ success: true }`

### Frontend: Hook `usePlaces.ts`

Aggiungere funzione `deletePlace(placeId: string)`:
- Chiama `places-delete` con il token
- Rimuove il place da `createdPlaces` e `feed` nello state locale
- Ritorna `true/false`

### UI: `PlaceCard.tsx`

Aggiungere prop `onDelete?: (placeId: string) => void` e `isOwner?: boolean`.
Quando `isOwner` e true, mostrare un bottone trash (icona `PixelTrash`) nel footer della card, accanto al bottone "Go". Click apre un dialog di conferma (o direttamente cancella con toast undo).

### UI: `PlacesModal.tsx`

Nella sezione "Created by Me", passare `onDelete` e `isOwner={true}` a ogni `PlaceCard`. Il handler chiama `deletePlace` e mostra un toast di conferma.

---

## 2. Anteprima Thumbnail Piu Grande

### `PlaceCard.tsx`

Cambiare il layout della card: la thumbnail passa da 72x72 a occupare l'intera larghezza della card in alto (aspect ratio 16:9 o simile, circa `w-full h-32`). Il contenuto testuale va sotto.

Nuovo layout:

```text
+------------------------------------------+
| [Thumbnail - full width, h-32]           |
+------------------------------------------+
| Creator avatar + name  |  3h ago         |
| Title                                    |
| Description                              |
| PE: 1,250 PE ($1.25)                    |
| [Heart] 12   [Pin]   [Trash?]  [Go ->]  |
+------------------------------------------+
```

### `PlaceThumbnail.tsx`

Aggiornare per accettare dimensioni piu grandi e rendere meglio: aumentare `maxPixels` da 100 a 500 per catturare piu dettaglio nell'area. Il componente gia supporta `width`/`height` dinamici.

---

## 3. Nuova UX Creazione Pin (Click su Mappa)

Questo e il cambiamento piu significativo. Il flusso diventa:

### Flusso UX

1. Utente apre Places > My Pins > clicca "Create Pin"
2. Il pannello Places si chiude
3. La mappa entra in **modalita pin-placement**: il cursore cambia (icona pin via CSS `cursor: url(...)`)
4. Un banner in overlay dice "Tap on the map to place your pin" con bottone Cancel
5. L'utente clicca su un punto della mappa
6. Il sistema:
   a. Converte click in coordinate pixel (x, y) usando `lngLatToGridInt`
   b. Cerca il pixel a quelle coordinate nel DB
   c. Se il pixel ha un `owner_user_id`, fetcha tutti i pixel dello stesso owner nella zona (usando Union-Find clustering come in `OwnerArtworkModal`)
   d. Calcola il bbox dell'artwork (cluster di pixel connessi che contiene il pixel cliccato)
   e. Se non c'e un pixel/owner, usa un bbox default centrato sul punto
7. Riapre il pannello Places con il form di creazione pre-compilato: lat/lng del click, zoom corrente, bbox dell'artwork trovato, e una preview grande del disegno
8. L'utente inserisce titolo e descrizione e conferma

### Implementazione Tecnica

#### Stato globale pin-placement: evento custom

Usare eventi `window.dispatchEvent` (pattern gia usato per `bitplace:navigate`):
- `bitplace:start-pin-placement` -- emesso da PlacesModal quando clicca "Create Pin"
- `bitplace:cancel-pin-placement` -- emesso dal banner Cancel
- `bitplace:pin-placed` -- emesso da BitplaceMap quando l'utente clicca durante pin-placement, con `{ lat, lng, x, y, zoom, bbox, artworkPixels }`

#### `BitplaceMap.tsx`

- Aggiungere stato `isPinPlacementMode: boolean`
- Listener per `bitplace:start-pin-placement`: setta `isPinPlacementMode = true`
- Quando `isPinPlacementMode`:
  - Cursor cambia a pin (CSS custom cursor con SVG del pin)
  - Click sulla mappa: calcola coordinate pixel, cerca artwork, emette `bitplace:pin-placed`
  - ESC o Cancel: esce dalla modalita
- Overlay banner "Tap to place pin" + Cancel

#### Ricerca Artwork al click

Al click durante pin-placement:
1. `lngLatToGridInt(lng, lat)` per ottenere (x, y)
2. Query al DB: `SELECT * FROM pixels WHERE x = $x AND y = $y` per trovare il pixel
3. Se il pixel ha un owner, query: `SELECT x, y, color FROM pixels WHERE owner_user_id = $ownerId` (limitato a 1000 pixel piu vicini)
4. Usare `clusterPixels()` (Union-Find, gap=5) per trovare il cluster che contiene (x, y)
5. Il bbox del cluster diventa il bbox del place
6. I pixel del cluster diventano la preview artwork

Se non c'e pixel o owner, bbox default 256x256 centrato sul punto.

#### `PlacesModal.tsx`

- Listener per `bitplace:pin-placed`: riceve i dati, apre il pannello con form pre-compilato
- Il form mostra la preview grande dell'artwork (usando i pixel ricevuti dall'evento)
- Passare `bbox` esplicito a `places-create` (gia supportato nel backend)

#### `CreatePlaceForm.tsx`

Estendere per accettare:
- `artworkPixels?: PixelData[]` -- pixel dell'artwork per renderizzare la preview inline
- `bbox?: { xmin, ymin, xmax, ymax }` -- bbox calcolato
- Mostrare una preview canvas grande (stile `ClusterCanvas` di OwnerArtworkModal) sopra il form

---

## File Modificati (riepilogo)

| File | Tipo | Modifica |
|------|------|----------|
| `supabase/functions/places-delete/index.ts` | NUOVO | Edge function per cancellare un place |
| `src/hooks/usePlaces.ts` | EDIT | Aggiungere `deletePlace()` |
| `src/components/places/PlaceCard.tsx` | EDIT | Layout thumbnail grande + bottone delete |
| `src/components/places/PlaceThumbnail.tsx` | EDIT | Aumentare maxPixels, supportare dimensioni grandi |
| `src/components/modals/PlacesModal.tsx` | EDIT | Handler delete, listener pin-placed, emettere start-pin-placement |
| `src/components/places/CreatePlaceForm.tsx` | EDIT | Accettare artwork pixels e bbox, mostrare preview |
| `src/components/map/BitplaceMap.tsx` | EDIT | Pin placement mode (cursor, click handler, artwork detection, overlay banner) |

## Dettagli Tecnici

### Cursor Pin Custom

CSS custom cursor generato da SVG inline del pin (24x24), usato come `cursor: url('data:image/svg+xml,...') 12 24, crosshair` dove 12,24 e l'hotspot alla punta del pin.

### Query Artwork Efficiente

Per evitare di fetchare troppi pixel, la ricerca artwork al click:
1. Prima trova il pixel singolo clickato
2. Se ha un owner, cerca pixel dello stesso owner con filtro spaziale (entro 500 unita dal click in ogni direzione)
3. Clustering locale con Union-Find
4. Seleziona il cluster che contiene il pixel clickato

### Limite di 1000 righe

La query dei pixel dell'owner e limitata a 1000 righe (limite Supabase). Per artwork molto grandi, il bbox sara approssimativo ma comunque funzionale per la preview.

