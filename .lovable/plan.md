

# Fix Default Color, Default Tool, Icon Shape e Spacebar Focus

## 4 Problemi da risolvere

### 1. Colore di default: bianco (`#ffffff`)

Attualmente `selectedColor` parte come `null` e `lastBrushColor` punta a `ALL_COLORS[2]` (un grigio-rosato `#b3b9d1`). Va cambiato in `useMapState.ts`:

- `selectedColor: '#ffffff'` (primo colore della palette, bianco)
- `lastBrushColor: '#ffffff'`

Questo garantisce che all'apertura il bianco sia gia selezionato e visibile nel tray.

### 2. Tool di default: Brush 1x (non Eraser)

Il paintTool e gia `'BRUSH'` nel codice, ma dato che `selectedColor` era `null`, la logica in `setSelectedColor` impostava `paintTool: 'ERASER'` quando nessun colore era scelto. Risolvendo il punto 1 (colore default bianco), il brush sara automaticamente attivo perche `selectedColor` non sara piu `null`.

### 3. Icona PixelSingle: forma non quadrata

L'attuale polygon ha coordinate x: 7-17 (10 unita) e y: 6-18 (12 unita), quindi e un rettangolo verticale. Va corretto per essere un quadrato centrato nel viewBox 24x24.

Nuove coordinate: un quadrato 10x10 centrato (x: 7-17, y: 7-17):

```text
points="17 7 17 17 16 17 16 18 8 18 8 17 7 17 7 7 8 7 8 6 16 6 16 7 17 7"
diventa
points="16 8 16 16 8 16 8 8"
con bordi pixel-art:
"17 8 17 16 16 16 16 17 8 17 8 16 7 16 7 8 8 8 8 7 16 7 16 8 17 8"
```

Questo crea un quadrato 10x10 (7-17 x 7-17) con bordi smussati pixel-art, identico in proporzione ai singoli quadratini dell'icona Grid2x2.

### 4. Spacebar attiva l'ultimo bottone cliccato

Questo e un comportamento standard del browser: dopo aver cliccato un bottone, questo mantiene il focus e la spacebar lo riattiva. La soluzione e aggiungere `tabIndex={-1}` ai bottoni interattivi del tray che non devono catturare il focus da tastiera, in particolare:

- Il bottone collapse/expand (chevron)
- I bottoni di interazione mode (drag/draw)
- I bottoni tool (brush 1x, 2x2, eraser)
- I bottoni palette tab (Colors/Gradients)

Alternativa piu pulita: usare `onMouseDown={(e) => e.preventDefault()}` sui bottoni per impedire che il click col mouse sposti il focus. Questo e piu preciso perche `tabIndex={-1}` impedirebbe anche la navigazione tab legittima.

Si usera `onMouseDown={e => e.preventDefault()}` su tutti i bottoni dell'ActionTray, cosi il focus non viene spostato dal click del mouse ma la navigazione tab rimane funzionante.

## File modificati

- `src/components/map/hooks/useMapState.ts` -- default `selectedColor: '#ffffff'`, `lastBrushColor: '#ffffff'`
- `src/components/icons/custom/PixelSingle.tsx` -- fix polygon per quadrato proporzionato
- `src/components/map/ActionTray.tsx` -- aggiungere `onMouseDown={e => e.preventDefault()}` ai bottoni interattivi

