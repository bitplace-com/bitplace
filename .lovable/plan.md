
# Sostituire icona Logout con quella di Hackernoon

## Problema
L'icona `PixelLogout` attuale e' stata disegnata a mano e non e' coerente con le altre icone della libreria Hackernoon Pixel Icon usate nel progetto.

## Soluzione
Sostituire il contenuto SVG di `src/components/icons/custom/PixelLogout.tsx` con i path estratti da `node_modules/@hackernoon/pixel-icon-library/icons/SVG/solid/logout-solid.svg`.

## Dettaglio tecnico

**File: `src/components/icons/custom/PixelLogout.tsx`**

Sostituire i due `<polygon>` attuali con i path dell'SVG ufficiale:
- Un `<polygon>` per la freccia (points dal file originale)
- Un `<rect>` per la barra verticale sinistra

Il wrapper `PixelSVG` gia' imposta `viewBox="0 0 24 24"`, `fill="currentColor"` e `shapeRendering: crispEdges`, quindi basta copiare i children.

## File coinvolto
- `src/components/icons/custom/PixelLogout.tsx` -- aggiornare i children SVG
