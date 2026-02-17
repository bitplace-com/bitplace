
## Fix: Pannello colori mobile - meno colori per riga, proporzioni corrette

### Problema
Dallo screenshot si vede che la griglia colori con 10 colonne su mobile produce bottoni troppo grandi che escono dai bordi del pannello. Gli strumenti (1x, 2x2, gomma) e i tab (Colors, Gradients) sono anch'essi tagliati.

### Soluzione

**File: `src/components/map/ActionTray.tsx`**

1. **Ridurre colonne su mobile da 10 a 8**: cambiare la griglia da `grid-cols-[repeat(10,1fr)]` a `grid-cols-[repeat(8,1fr)] sm:grid-cols-[repeat(10,1fr)]` -- 8 colori per riga su mobile, 10 su desktop. Questo rimpicciolisce i bottoni e li mantiene dentro il pannello.

2. **Aumentare altezza massima scroll verticale**: cambiare `max-h-48` a `max-h-56` su mobile per dare piu spazio allo scroll verticale (dato che con 8 colonne ci sono piu righe).

3. **Rimpicciolire i bottoni colore su mobile**: cambiare `rounded-lg` a `rounded-md` uniformemente e ridurre il touch target.

4. **Uniformare i Gradients**: dare ai bottoni gradient dimensione `w-6 h-6` su mobile (invece di `w-7 h-7`) per allinearsi meglio col pannello ridotto.

5. **Aggiungere padding interno al container**: il `px-3` del container espanso diventa `px-2` su mobile per recuperare spazio laterale.

### Dettaglio tecnico

- **Riga 175**: il `max-w-[calc(100vw-2rem)]` resta invariato (gia corretto)
- **Riga 390**: `max-h-48` diventa `max-h-56` per piu scroll verticale
- **Riga 392**: `grid-cols-[repeat(10,1fr)]` diventa `grid-cols-[repeat(8,1fr)] sm:grid-cols-[repeat(10,1fr)]`
- **Riga 401**: `rounded-lg sm:rounded-md` diventa `rounded-md` uniforme
- **Riga 429**: gradient buttons da `w-7 h-7` a `w-6 h-6` su mobile (`w-6 h-6 sm:w-[22px] sm:h-[22px]`)
- **Riga ~320 (expanded content div)**: `px-3 pb-3` diventa `px-2 pb-2 sm:px-3 sm:pb-3`

### Rischio: Zero
Solo modifiche CSS di dimensionamento.
