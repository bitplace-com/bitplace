
# Spostare il bottone Pin tra Notifiche e Occhio + indicatore "nuovo"

## Cosa cambia

### 1. Rimuovere il Pin da ActionTray
Il `GlassIconButton` con l'icona `locationPin` e lo state `placesOpen` / `PlacesModal` vengono rimossi da `ActionTray.tsx`. Il pannello torna ad avere solo Esplora, Disegna e la freccia collapse, senza gap a sinistra.

### 2. Aggiungere il Pin in ZoomControls (tra Occhio e Notifiche)
In `ZoomControls.tsx`, il bottone Pin viene inserito tra il bottone Art Opacity (occhio) e il bottone Notifications (campana). L'ordine dall'alto verso il basso diventa:
1. Occhio (Art Opacity)
2. Pin (Pinned Locations) -- NUOVO
3. Campana (Notifications)

Il componente importa `PlacesModal` e `usePinnedPlaces`, e gestisce lo state `placesOpen`.

### 3. Indicatore "nuovo pin" (dot senza numero)
- Viene tracciato in `localStorage` il conteggio di pin visti l'ultima volta (`bitplace-pins-seen-count`).
- Quando `pins.length` supera il conteggio salvato, appare un piccolo dot rosso (senza numero) sul bottone Pin, simile al badge delle notifiche ma senza testo.
- Quando l'utente apre la `PlacesModal`, il conteggio salvato viene aggiornato a `pins.length`, e il dot scompare.

### 4. Props cleanup
- `ActionTray` perde le props `currentLat` e `currentLng` (non servono piu per il Pin).
- `ZoomControls` riceve `currentLat`, `currentLng`, `currentZoom` da `BitplaceMap` per passarli a `PlacesModal`.

## File coinvolti
- `src/components/map/ActionTray.tsx` -- rimuovere Pin button, PlacesModal, state, import
- `src/components/map/ZoomControls.tsx` -- aggiungere Pin button con dot indicator, PlacesModal
- `src/components/map/BitplaceMap.tsx` -- passare coordinate a ZoomControls, rimuovere currentLat/Lng da ActionTray

## Dettaglio tecnico del dot indicator

```typescript
// In ZoomControls
const SEEN_KEY = 'bitplace-pins-seen-count';
const seenCount = Number(localStorage.getItem(SEEN_KEY) || '0');
const hasNewPins = pins.length > seenCount;

// Quando si apre PlacesModal:
const handleOpenPlaces = () => {
  setPlacesOpen(true);
  localStorage.setItem(SEEN_KEY, String(pins.length));
};
```

Il dot e' un semplice `<span>` rotondo di 8x8px con `bg-primary`, posizionato in alto a destra del bottone, identico al badge notifiche ma senza testo.
