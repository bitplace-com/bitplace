
# Map zoom out e mobile edge-to-edge

## Problemi
1. Lo zoom out massimo della mappa e' troppo limitato (minZoom: 2) -- su Wplace si puo' zoomare molto di piu' e si vedono le "lande bianche" (Antartide, ecc.)
2. Al massimo zoom out la mappa deve scorrere solo orizzontalmente (sinistra-destra), non su-giu
3. Su mobile c'e' un bordo in alto -- la mappa deve arrivare fino al bordo superiore del telefono

## Piano

### 1. Ridurre minZoom e vincolare lo scroll verticale (BitplaceMap.tsx)
- Cambiare `minZoom` da `2` a `0.8` (o `1`) per permettere uno zoom out molto piu' ampio dove si vede il mondo intero con spazio bianco attorno
- Mantenere `renderWorldCopies: true` per lo scroll orizzontale infinito
- Usare `maxBounds` piu' stretto verticalmente: `[[-Infinity, -85], [Infinity, 85]]` e' gia' impostato, ma a zoom molto bassi MapLibre potrebbe comunque permettere scroll verticale. Per limitare lo scroll verticale al massimo zoom out, aggiungere un listener su `move` che ricentra la mappa verticalmente se l'utente tenta di spostarla troppo su/giu. In alternativa, usare la proprieta' `maxBounds` con latitudini piu' strette (es. -82 a 82) per evitare panning verticale eccessivo

### 2. Sfondo mappa fuori dai tile (BitplaceMap.tsx / CSS)
- A zoom molto bassi, le aree fuori dal mondo mostrano lo sfondo del canvas. Aggiungere uno stile CSS al container della mappa per impostare un colore di sfondo coerente (bianco in light mode, scuro in dark mode) invece del colore di background della pagina

### 3. Mobile edge-to-edge (index.html)
- Aggiungere `viewport-fit=cover` al meta tag viewport in `index.html`:
  `<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />`
- Questo permette al contenuto di estendersi sotto la status bar su iOS, eliminando il bordo in alto
- I safe-area inset gia' definiti in `HudOverlay.tsx` proteggono i pulsanti dal notch/dynamic island

### 4. Aggiornare Z_SHOW_PAINTS e soglie correlate
- Il sistema gia' gestisce la soglia zoom per mostrare i pixel (Z_SHOW_PAINTS = 13). Non serve cambiare questa logica -- i pixel semplicemente non saranno visibili a zoom molto bassi, il che e' corretto

## File da modificare
- `index.html` -- meta viewport
- `src/components/map/BitplaceMap.tsx` -- minZoom + sfondo canvas + vincolo scroll verticale

## Note tecniche
- MapLibre supporta `minZoom: 0`, ma a zoom 0 il mondo e' molto piccolo. Zoom 0.8-1 mostra il mondo intero con margini
- `renderWorldCopies: true` gia' gestisce lo scroll orizzontale infinito
- Il vincolo verticale viene gestito da `maxBounds` che blocca il panning oltre i limiti di latitudine
