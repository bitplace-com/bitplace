

# Selezione Area Rettangolare + Correzioni UI ActionTray e InspectSelectionPanel

## Problema Attuale
1. **Spacebar selection (drag mode + eraser)**: Seleziona solo i pixel su cui passa il cursore, uno per uno. L'utente vuole una selezione rettangolare (definire due angoli, riempire l'area).
2. **ActionTray in modalita esplora**: Mostra le sotto-icone (1px, 4px, gomma) anche quando si e in modalita drag/esplora. Devono essere nascoste e i colori oscurati.
3. **InspectSelectionPanel**: Usa icone Lucide (Shield, Swords, User, Coins) invece delle icone pixel-art del progetto. Le diciture devono essere aggiornate.

---

## 1. Selezione Rettangolare con Spacebar

Attualmente il SPACE key usa `useBrushSelection` (aggiunge pixel uno a uno al passaggio del mouse). Va sostituito con una logica rettangolare:

- **SPACE down**: Registra la posizione di partenza (ancora del rettangolo)
- **Mouse move con SPACE tenuto**: Calcola il rettangolo tra il punto di partenza e la posizione attuale del cursore
- **SPACE up**: Genera tutti i pixel nell'area rettangolare e li usa come selezione

Questo si applica a:
- **Modalita drag (inspect)**: SPACE + drag definisce un rettangolo, al rilascio tutti i pixel nell'area vengono selezionati per l'InspectSelectionPanel
- **Modalita eraser**: SPACE + drag definisce un rettangolo, al rilascio i pixel draft vengono rimossi e quelli committed vanno al flusso validate

### File: `src/components/map/BitplaceMap.tsx`

**SPACE keydown** (riga ~628-690):
- Invece di `startInspectBrushSelection` / `startBrushSelection`, salvare solo il punto di ancoraggio in un nuovo ref (`rectAnchorRef`)
- Disabilitare dragPan e impostare cursore crosshair

**Mouse move** (riga ~1017-1055):
- Quando SPACE e tenuto, invece di `addToInspectBrushSelection` / `addToBrushSelection`, aggiornare un state `rectEnd` con la posizione corrente del mouse
- Il CanvasOverlay disegna il rettangolo di anteprima tra `rectAnchor` e `rectEnd`

**SPACE keyup** (riga ~703-773):
- Calcolare tutti i pixel nel rettangolo (`rectAnchor` -> `rectEnd`)
- Per inspect mode: impostare `inspectSelection` con tutti i pixel nell'area
- Per eraser mode: separare draft pixels (rimuovere) e committed pixels (validate flow)
- Per action modes: impostare `pendingPixels`
- Applicare il limite `MAX_BRUSH_SELECTION` (10000 pixel)

### Nuovo state/ref necessari:
```typescript
const rectAnchorRef = useRef<{ x: number; y: number } | null>(null);
const [rectPreview, setRectPreview] = useState<{ start: { x: number; y: number }; end: { x: number; y: number } } | null>(null);
```

### Helper per generare pixel da rettangolo:
```typescript
const getPixelsInRect = (start, end) => {
  const minX = Math.min(start.x, end.x);
  const maxX = Math.max(start.x, end.x);
  const minY = Math.min(start.y, end.y);
  const maxY = Math.max(start.y, end.y);
  const pixels = [];
  for (let x = minX; x <= maxX; x++)
    for (let y = minY; y <= maxY; y++)
      pixels.push({ x, y });
  return pixels;
};
```

### CanvasOverlay
Aggiungere rendering del rettangolo di anteprima (bordo tratteggiato) quando `rectPreview` e attivo. Il CanvasOverlay gia riceve props simili per la selezione; passare `rectPreview` come prop aggiuntivo.

---

## 2. ActionTray: Nascondere Tool Icons in Modalita Esplora

### File: `src/components/map/ActionTray.tsx`

Nella sezione "Tool row" (riga ~330-404):
- Wrappare l'intera toolbar dei tool (1px, 4px, gomma) e la palette tabs in una condizione: mostrare solo quando `interactionMode === 'draw'`
- Quando `interactionMode === 'drag'`: nascondere la riga dei tool e oscurare la palette colori (aggiungere `opacity-40 pointer-events-none` al wrapper della palette)

Logica:
```typescript
const isDrawMode = interactionMode === 'draw';

// Tool row: visibile solo in draw mode
{canPaint && isDrawMode && (
  <div className="flex items-center justify-between mb-2">
    {/* tool buttons... */}
  </div>
)}

// Palette: oscurata in drag mode
<div className={cn(
  "transition-opacity",
  (!isDrawMode || isEraser) && "opacity-40 pointer-events-none"
)}>
```

---

## 3. InspectSelectionPanel: Aggiornare Icone e Diciture

### File: `src/components/map/inspector/InspectSelectionPanel.tsx`

Sostituire le icone Lucide con PixelIcon:
- `Shield` (lucide) -> `<PixelIcon name="shield" />` (DEF)
- `Swords` (lucide) -> `<PixelIcon name="swords" />` (ATK)
- `User` (lucide) -> `<PixelIcon name="user" />` (Owned)
- `Coins` (lucide) -> `<PEIcon />` (PE staked)
- `X` (lucide) -> `<PixelIcon name="close" />` (chiudi)
- `Loader2` (lucide) -> `<PixelIcon name="loader" />` (loading)

Aggiornare diciture:
- "My Contributions" -> "Your Contributions"
- "Withdraw DEF" -> "Withdraw DEF"  (invariato)
- "Owned by you" -> "Owned by you" (invariato)
- Aggiungere valore in $ (verde emerald) per PE staked: `$X.XX` calcolato come `PE * 0.001`

---

## File Coinvolti

| File | Modifica |
|------|----------|
| `src/components/map/BitplaceMap.tsx` | Selezione rettangolare con SPACE (inspect + eraser + action), nuovo state `rectPreview`, helper `getPixelsInRect` |
| `src/components/map/ActionTray.tsx` | Nascondere tool icons e oscurare palette in drag mode |
| `src/components/map/inspector/InspectSelectionPanel.tsx` | Icone PixelIcon, diciture aggiornate, valore in $ |
| `src/components/map/CanvasOverlay.tsx` | Rendering rettangolo di anteprima per SPACE selection |

