

# Fix Spaziatura Colors + Analisi Ordinamento Palette

## Problema

La griglia Colors usa `grid grid-cols-8 gap-1.5` con quadratini `w-7` (28px) a dimensione fissa. Questo causa overflow sul lato destro perche: 8 colonne x 28px + 7 gap x 6px = 266px, ma il container con `px-3` + `px-1` interno ha meno spazio disponibile. In Gradients invece si usa `flex gap-1` che si adatta naturalmente.

## Soluzione Spaziatura

Cambiare la griglia Colors da `grid` fisso a `flex flex-wrap gap-1` (stesso `gap-1` dei Gradients), mantenendo la distribuzione libera a flusso (senza righe forzate). I quadratini mantengono le stesse dimensioni `w-7 h-7 sm:w-[22px] sm:h-[22px]` ma con gap uniforme `gap-1` invece di `gap-1.5`.

**`src/components/map/ActionTray.tsx` (riga 407)**
```text
// DA:
<div className="grid grid-cols-8 sm:grid-cols-12 gap-1.5 w-full">

// A:
<div className="flex flex-wrap gap-1">
```

Questo:
- Allinea la spaziatura tra Colors e Gradients (entrambi `gap-1`)
- Elimina il clipping a destra perche flex-wrap rispetta i bordi del container
- Mantiene la distribuzione a flusso continuo senza righe forzate

## Analisi Ordinamento Attuale della Palette Colors

La palette attuale (`basePaletteOrdered.ts`) contiene **63 colori** organizzati in cluster per tonalita, ciascuno dal chiaro al scuro:

| Cluster | Colori | Note |
|---------|--------|------|
| Reds | 6 | #ffc5a5 -> #600018 |
| Pinks/Magentas | 6 | #f38da9 -> #780c99 |
| Oranges | 5 | #f8b277 -> #dba463 |
| Browns/Sands | 10 | Cluster molto grande, colori terrosi misti |
| Yellows | 6 | #fffabc -> #9c8431 |
| Greens | 6 | #87ff5e -> #4a6b3a |
| Teals/Cyans | 5 | #bbfaf2 -> #0c816e |
| Blues | 5 | #7dc7ff -> #28509e |
| Purples | 5 | #b5aef1 -> #4a4284 |
| Grays | 9 | #ffffff -> #000000 |

**Problemi dell'ordinamento attuale:**
- L'ordine parte dai caldi (rossi) e va verso i freddi (blu/viola), ma il grigio e in fondo -- funziona ma e l'opposto di quanto fatto nei Gradients (freddo -> caldo)
- Il cluster Browns ha 10 colori, sproporzionato rispetto agli altri (5-6)
- Alcuni colori nei Browns sono ambigui (es. #d18078 e piu rosato che marrone)

**Proposta di miglioramento:** Invertire l'ordine per allinearlo ai Gradients (freddo in alto, caldo in basso): Grays, Purples, Blues, Teals, Greens, Yellows, Oranges, Browns (ridotto), Reds, Pinks. Questo rende coerente l'esperienza tra i due tab.

### File modificati
- `src/components/map/ActionTray.tsx` -- cambiare grid a flex wrap + gap-1
- `src/lib/palettes/basePaletteOrdered.ts` -- riordinare i cluster (freddo -> caldo)
