
# Fix: Posizione Banner Pin, Altezza Preview, Doppia Conferma Eliminazione

## 1. Spostare "Click and drag to select" sotto il pannello comandi

Attualmente il banner e posizionato con `top-4` (`absolute inset-x-0 top-4`) che lo mette sopra i bottoni del menu in alto a sinistra.

**Fix**: Cambiare da `top-4` a `top-20` (80px) per posizionarlo sotto il pannello dei 4 comandi, mantenendo il centramento orizzontale.

**File**: `src/components/map/BitplaceMap.tsx` - riga 1691
- Cambiare `className="absolute inset-x-0 top-4 z-50 ..."` in `className="absolute inset-x-0 top-20 z-50 ..."`

## 2. Aumentare altezza preview artwork nel form di creazione

La preview attualmente usa `h-64` (256px) nel componente `ArtworkPreview` dentro `CreatePlaceForm.tsx`.

**Fix**: Aumentare a `h-80` (320px) per dare piu spazio alla preview.

**File**: `src/components/places/CreatePlaceForm.tsx` - riga 96
- Cambiare `className="w-full h-64 relative ..."` in `className="w-full h-80 relative ..."`

## 3. Doppia conferma per eliminazione pin

Attualmente il click sul cestino chiama direttamente `onDelete(place.id)` senza conferma.

**Fix**: Aggiungere un `AlertDialog` di conferma nel `PlaceCard`. Al click sul cestino si apre il dialog con messaggio "Sei sicuro di voler eliminare questo pin?" e due bottoni: "Annulla" e "Elimina".

**File**: `src/components/places/PlaceCard.tsx`
- Importare `AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger` da `@/components/ui/alert-dialog`
- Aggiungere stato `deleteConfirmOpen`
- Wrappare il bottone cestino in un `AlertDialog` con trigger e contenuto di conferma
- Chiamare `onDelete` solo dopo la conferma

---

## Riepilogo File

| File | Modifica |
|------|----------|
| `src/components/map/BitplaceMap.tsx` | Spostare banner da `top-4` a `top-20` |
| `src/components/places/CreatePlaceForm.tsx` | Preview da `h-64` a `h-80` |
| `src/components/places/PlaceCard.tsx` | Aggiungere AlertDialog di conferma per eliminazione |
