

# Rimozione Materiali Speciali + Fix Spaziatura + Nuova Sezione Gradients

## Problema attuale

1. I materiali speciali (mat:fire, mat:gold, etc.) non vengono interpretati correttamente nel rendering
2. I quadratini dei colori sono appiccicati e tagliati sul bordo destro del pannello
3. Manca una sezione sfumature utile per dipingere con piu precisione cromatica

## Modifiche

### 1. Fix spaziatura colori (`src/components/map/ActionTray.tsx`)

Il problema e che il container ha `px-2` ma la griglia non ha margini interni sufficienti. Inoltre `gap-2` con `w-8` su 8 colonne puo causare overflow.

- Cambiare il sizing dei quadratini: da `w-8 h-8 sm:w-6 sm:h-6` a `w-7 h-7 sm:w-[22px] sm:h-[22px]` per dare piu respiro
- Assicurare che il container `max-h-48 overflow-y-auto` abbia padding interno adeguato (`px-1 py-1`)
- Usare `gap-1.5` su mobile e `gap-1.5` su desktop per evitare il taglio laterale

### 2. Rimuovere materiali speciali

- Rimuovere completamente il rendering della griglia dei materiali (sezione `materialsByCategory` nel tab "special", righe 444-474)
- Rimuovere gli import di `MATERIALS`, `getMaterialsByCategory`, `isMaterial`, `getMaterial` dall'ActionTray
- Rimuovere la costante `CATEGORY_LABELS`
- NON rimuovere il file `materialRegistry.ts` ne le referenze nel `CanvasOverlay` -- i materiali restano nel sistema per il rendering della mappa, solo non selezionabili dalla palette

### 3. Nuova sezione "Gradients" al posto di "Special"

Rinominare il tab "Special" in "Gradients". Il contenuto sara una serie di righe orizzontali, ciascuna con 7 sfumature di un colore (dal piu chiaro a sinistra al piu scuro a destra).

**Ordine righe (freddo in alto, caldo in basso):**

| Riga | Nome | 7 sfumature (chiaro -> scuro) |
|------|------|-------------------------------|
| 1 | Purple | #E8DAFB, #C4A8F0, #9B71DB, #7B4FC7, #5E35A8, #432580, #2D1760 |
| 2 | Blue | #BFDBFE, #7BB8F5, #4093E4, #2570C4, #1A56A0, #103D78, #0A2A55 |
| 3 | Cyan | #BFFAF5, #7AEEE8, #3DD8CE, #1AAFA6, #0E8A80, #076660, #034540 |
| 4 | Green | #BBFFB0, #7AE87A, #47CC47, #28A828, #1A8A1A, #0F6B0F, #084D08 |
| 5 | Yellow | #FFF9C4, #FFF176, #FFEB3B, #F9C E12, #E6B800, #C49A00, #8C6D00 |
| 6 | Orange | #FFE0B2, #FFB74D, #FF9800, #F57C00, #E65100, #BF360C, #8B2500 |
| 7 | Red | #FFCDD2, #EF9A9A, #EF5350, #E53935, #C62828, #961E1E, #601414 |
| 8 | Pink | #F8BBD0, #F06292, #EC407A, #D81B60, #AD1457, #880E4F, #5C0A35 |
| 9 | Brown | #D7CCC8, #BCAAA4, #A1887F, #8D6E63, #6D4C41, #4E342E, #3E2723 |
| 10 | Gray | #F5F5F5, #E0E0E0, #BDBDBD, #9E9E9E, #757575, #424242, #212121 |

Questi colori sono SOLO per la sezione Gradients dell'UI e NON vengono aggiunti alla palette base `basePaletteOrdered.ts`. Sono colori hex standard che funzionano perfettamente con il sistema di paint esistente.

**Layout:** Ogni riga mostra un'etichetta piccola a sinistra (es. "Purple") e 7 quadratini in linea orizzontale. Le righe sono impilate verticalmente con `gap-2`.

### 4. Nuovo file: `src/lib/palettes/gradientPalette.ts`

Conterranno la definizione delle righe gradient come array di oggetti `{ label: string, colors: string[] }`, cosi da tenere i dati separati dalla UI.

## Dettagli Tecnici

### Struttura dati gradient

```text
// src/lib/palettes/gradientPalette.ts
export interface GradientRow {
  label: string;
  colors: string[]; // 7 shades, light to dark
}

export const GRADIENT_ROWS: GradientRow[] = [
  { label: 'Purple', colors: ['#E8DAFB', '#C4A8F0', ...] },
  // ... 10 righe totali
];
```

### Rendering nel tab Gradients (ActionTray.tsx)

```text
{paletteTab === 'special' && (
  <div className="space-y-2 py-0.5">
    {GRADIENT_ROWS.map((row) => (
      <div key={row.label} className="flex items-center gap-2">
        <span className="text-[9px] w-10 text-muted-foreground shrink-0">
          {row.label}
        </span>
        <div className="flex gap-1">
          {row.colors.map((color, i) => (
            <button
              key={color}
              onClick={() => handleColorClick(color)}
              className="w-7 h-7 sm:w-5 sm:h-5 rounded-md ..."
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
      </div>
    ))}
  </div>
)}
```

### File modificati
- `src/lib/palettes/gradientPalette.ts` -- NUOVO: definizione righe gradient
- `src/components/map/ActionTray.tsx` -- fix spaziatura, rimuovi materiali, aggiungi gradients, rinomina tab

