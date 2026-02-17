

## Fix: Proporzioni pannello colori su mobile

### Problemi identificati dallo screenshot
1. **Pannello troppo largo**: quando espanso, il container usa `width: 100%` con `max-w-[calc(100vw-1rem)]`, lasciando solo 0.5rem di margine per lato. I colori arrivano quasi ai bordi dello schermo
2. **Colori troppo grandi**: la griglia `grid-cols-[repeat(10,1fr)]` espande i quadrati colore per riempire tutta la larghezza, rendendoli sproporzionati
3. **Strumenti tagliati a sinistra**: il bottone "1x" (pixel singolo) nella tool row sembra tagliato sul bordo sinistro

### Soluzione

**File: `src/components/map/ActionTray.tsx`**

1. **Ridurre la larghezza massima mobile**: cambiare `max-w-[calc(100vw-1rem)]` in `max-w-[calc(100vw-2rem)]` per avere 1rem di margine per lato (16px per lato invece di 8px)

2. **Colori a dimensione fissa invece di fluida**: nella griglia Colors, i bottoni colore devono avere dimensione fissa (`w-7 h-7` su mobile, `w-[22px] h-[22px]` su desktop) con `shrink-0`, e la griglia deve usare `auto-fill` con dimensioni fisse invece di `1fr` che espande. Oppure piu semplicemente: mantenere `grid-cols-10` ma dare ai bottoni `w-full aspect-square` con un `max-w` ragionevole

3. **Approccio semplificato**: dato che il pannello ha padding `px-3` (12px per lato) e il container interno ha `px-1` (4px per lato), la larghezza utile e circa `viewport - 2rem - 32px`. Con 10 colonne e gap-0.5 (2px), ogni colore sara circa `(larghezza_utile - 18px_gap) / 10`. Su un iPhone 390px: `(390 - 32 - 32 - 18) / 10 = ~30px` per colore, che e ragionevole.

4. **Uniformare Gradients con Colors**: i bottoni gradient devono avere la stessa dimensione dei bottoni colors

### Dettaglio tecnico

- **Riga 175**: `max-w-[calc(100vw-1rem)]` diventa `max-w-[calc(100vw-2rem)]` per margini piu ampi
- **Riga 392**: la griglia Colors resta `grid-cols-[repeat(10,1fr)]` con `gap-0.5` - i colori si adatteranno automaticamente alla nuova larghezza ridotta
- **Righe 396-408**: i bottoni colore mantengono `w-full aspect-square` ma con `rounded-md` uniforme (non `rounded-lg` su mobile che spreca spazio)
- **Riga 390**: il container scroll usa `max-h-48` che va bene per lo scroll verticale

Il problema principale e la larghezza totale del pannello (`100vw - 1rem` e troppo), non la griglia in se.

### Rischio: Zero
Solo modifiche CSS di dimensionamento.

