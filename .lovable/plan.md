

# Zoom out massimo della mappa come Wplace

## Problema
Lo zoom out attuale (`minZoom: 1`) non e' abbastanza basso. Su Wplace il mondo intero e' visibile sullo schermo con le aree polari bianche, e la mappa scorre solo orizzontalmente. Il nostro `minZoom: 1` mostra gia' molto ma non raggiunge il limite massimo di MapLibre.

## Modifiche (`src/components/map/BitplaceMap.tsx`)

### 1. Ridurre minZoom a 0
MapLibre supporta `minZoom: 0` -- a questo livello il mondo e' completamente visibile e non c'e' spazio per scrollare verticalmente. Cambio:
- `minZoom: 1` → `minZoom: 0`

### 2. Restringere maxBounds verticalmente
Con zoom 0 il mondo intero e' gia' contenuto nello schermo. Ridurre i limiti verticali per bloccare completamente il panning su/giu:
- `maxBounds: [[-Infinity, -82], [Infinity, 82]]` → `maxBounds: [[-Infinity, -78], [Infinity, 78]]`

Con latitudini piu' strette e minZoom 0, MapLibre non permette panning verticale perche' l'intero range e' gia' visibile. Lo scroll orizzontale infinito resta attivo grazie a `renderWorldCopies: true`.

## File da modificare
- `src/components/map/BitplaceMap.tsx` -- due valori: minZoom e maxBounds
