

# Fix: Spacebar nei Campi Testo + Mappa di Sfondo nel Feed

## Due Problemi

### 1. Spacebar non funziona nei campi di testo
Il handler globale `keydown` in `BitplaceMap.tsx` (riga 624) intercetta il tasto Space con `e.preventDefault()` su tutta la finestra. Quando il form di creazione pin e aperto e l'utente scrive nel titolo/descrizione, lo spazio viene intercettato dalla mappa invece di essere inserito nel campo.

**Fix**: Aggiungere un check all'inizio dell'handler: se l'elemento attivo e un `<input>` o `<textarea>`, fare `return` senza intercettare il tasto.

```text
const handleKeyDown = (e: KeyboardEvent) => {
  // Don't intercept when typing in form fields
  const tag = (document.activeElement?.tagName || '').toLowerCase();
  if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
  // ... rest of handler
};
```

**File: `src/components/map/BitplaceMap.tsx`** - aggiungere guard all'inizio di `handleKeyDown` (riga ~606)

### 2. Mappa di sfondo non salvata per le card nel feed
Lo snapshot della mappa viene catturato al momento della creazione ma non viene salvato. Le card nel feed (PlaceThumbnail) mostrano solo pixel su sfondo nero/scuro.

**Soluzione**: Salvare lo snapshot come immagine in Supabase Storage durante la creazione del pin, e mostrarlo come sfondo nelle card del feed.

#### Passaggi:

**a) Creare bucket Storage "place-snapshots"**
- Migrazione DB per creare il bucket e le policy di accesso pubblico in lettura

**b) Aggiungere colonna `snapshot_url` alla tabella `places`**
- Migrazione DB per aggiungere la colonna `text nullable`

**c) Aggiornare `places-create` edge function**
- Ricevere il `mapSnapshot` (base64 data URL) nel body della request
- Decodificare il base64 in un buffer binario
- Upload su Storage nel bucket `place-snapshots` con path `{placeId}.jpg`
- Salvare l'URL pubblico nella colonna `snapshot_url`

**d) Aggiornare `places-feed` edge function**
- Includere `snapshot_url` nel SELECT dei places

**e) Aggiornare il tipo `Place` nel hook `usePlaces`**
- Aggiungere `snapshot_url?: string | null`

**f) Passare `mapSnapshot` a `createPlace` nel `PlacesModal`**
- Modificare la chiamata `createPlace` per includere il base64

**g) Aggiornare `PlaceThumbnail`**
- Accettare prop `snapshotUrl?: string`
- Se presente, caricare l'immagine come sfondo prima di disegnare i pixel sopra

**h) Aggiornare `PlaceCard`**
- Passare `place.snapshot_url` come prop a `PlaceThumbnail`

---

## File Modificati

| File | Modifica |
|------|----------|
| `src/components/map/BitplaceMap.tsx` | Guard per input/textarea nel keydown handler |
| `supabase/functions/places-create/index.ts` | Ricevere e salvare mapSnapshot in Storage |
| `supabase/functions/places-feed/index.ts` | Includere snapshot_url nella query |
| `src/hooks/usePlaces.ts` | Aggiungere snapshot_url al tipo Place, passare mapSnapshot a createPlace |
| `src/components/modals/PlacesModal.tsx` | Passare mapSnapshot a createPlace |
| `src/components/places/PlaceThumbnail.tsx` | Mostrare snapshotUrl come sfondo |
| `src/components/places/PlaceCard.tsx` | Passare snapshot_url a PlaceThumbnail |
| Migrazione DB | Creare bucket + colonna snapshot_url |

## Dettagli Tecnici

### Guard per Spacebar
Aggiunto come prima riga sia nel `handleKeyDown` che nel `handleKeyUp` del blocco globale (riga ~606):
```text
const tag = (document.activeElement?.tagName || '').toLowerCase();
if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
```

### Storage Upload in places-create
```text
// Decode base64 data URL
const base64 = mapSnapshot.replace(/^data:image\/\w+;base64,/, '');
const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));

// Upload to storage
await adminClient.storage
  .from('place-snapshots')
  .upload(`${place.id}.jpg`, bytes, {
    contentType: 'image/jpeg',
    upsert: true,
  });

// Get public URL
const { data: urlData } = adminClient.storage
  .from('place-snapshots')
  .getPublicUrl(`${place.id}.jpg`);

// Update place with snapshot_url
await adminClient
  .from('places')
  .update({ snapshot_url: urlData.publicUrl })
  .eq('id', place.id);
```

### PlaceThumbnail con sfondo mappa
```text
// Se snapshotUrl e presente, carica come sfondo
if (snapshotUrl) {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    ctx.drawImage(img, 0, 0, cw, ch);
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.fillRect(0, 0, cw, ch);
    drawPixels(); // disegna i pixel sopra la mappa
  };
  img.src = snapshotUrl;
} else {
  ctx.fillStyle = 'hsl(var(--muted))';
  ctx.fillRect(0, 0, cw, ch);
  drawPixels();
}
```

### Migrazione DB
```text
-- Add snapshot_url column
ALTER TABLE public.places ADD COLUMN IF NOT EXISTS snapshot_url text;

-- Create storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('place-snapshots', 'place-snapshots', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access
CREATE POLICY "Public read place-snapshots"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'place-snapshots');

-- Allow authenticated insert
CREATE POLICY "Auth insert place-snapshots"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'place-snapshots');
```

