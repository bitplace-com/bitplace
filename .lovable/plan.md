
## Fix: Larghezza costante del pannello tra Colors e Gradients

### Problema
La tab Colors usa una griglia che riempie tutta la larghezza disponibile, mentre la tab Gradients usa bottoni a dimensione fissa (`w-6` / `w-[22px]`) che non occupano tutto lo spazio, causando il restringimento del pannello.

### Soluzione
In `src/components/map/ActionTray.tsx`:

1. Aggiungere `min-w-0` e `w-full` al container della palette per forzare una larghezza costante
2. Nella sezione Gradients, cambiare i bottoni colore da dimensione fissa (`w-6 h-6` / `w-[22px] sm:h-[22px]`) a `flex-1 aspect-square` cosi si espandono per riempire lo spazio disponibile, come fa la griglia Colors
3. Rimuovere `shrink-0` dai bottoni gradient dato che ora devono essere flessibili
4. Cambiare il container dei bottoni gradient da `flex-nowrap` a layout che permetta l'espansione uniforme

### Dettaglio tecnico

**File: `src/components/map/ActionTray.tsx`**

- Riga ~435: cambiare il container dei colori gradient da `flex gap-0.5 sm:gap-1 overflow-x-auto flex-nowrap` a `flex gap-0.5 sm:gap-1 flex-1`
- Riga ~446: cambiare le classi dei bottoni colore da `w-6 h-6 sm:w-[22px] sm:h-[22px] shrink-0` a `flex-1 aspect-square min-w-0` per farli espandere uniformemente
- Il label a sinistra (w-10) resta invariato

Questo garantisce che entrambe le tab occupino la stessa larghezza e il pannello non cambi dimensione durante lo switch.
