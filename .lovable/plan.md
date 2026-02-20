

## Fix: Template auto-center/scale, drag offset, e performance quantizzazione

### Problemi identificati

**1. Template appare fuori schermo e con dimensioni originali**
`addTemplate` usa posizione `(0, 0)` e scala `100%` di default. Nessun calcolo viene fatto rispetto alla viewport corrente.

**2. Move aggancia l'immagine all'angolo in alto a sinistra**
In `handleMapMouseDown` (linea 1120-1124), quando inizia il drag in move mode, il codice salva la posizione del cursore ma non calcola l'offset rispetto alla posizione attuale del template. In `handleMapMouseMove` (linea 1055-1058), la posizione del template viene impostata direttamente alle coordinate del cursore, facendo saltare l'angolo in alto a sinistra del template al punto cliccato.

**3. Lag/crash nel passaggio Image <-> Pixel Guide**
`quantizeImage` in `paletteQuantizer.ts` gira **sincrono** sul main thread. Per un'immagine 1000x1000 al 100% di scala, processa 1M pixel ciascuno confrontato con ~100+ colori della palette = ~100M operazioni di distanza. Questo blocca il browser. Immagini grandi causano crash.

**4. Scale non risponde subito**
Ogni cambio di scala ri-esegue la quantizzazione sincrona (stesso problema del punto 3). In modalita Image, la scala funziona ma il rendering potrebbe avere un delay perche il `useMemo` delle `quantizedPixels` ha `template.scale` come dipendenza.

---

### Soluzione

#### File 1: `src/components/map/BitplaceMap.tsx`

**A) Auto-center e auto-scale al caricamento**

Creare una funzione `handleAddTemplate(file: File)` che:

1. Legge le dimensioni dell'immagine dal file (usando `Image()` temporaneo)
2. Calcola il centro della viewport in coordinate grid: `mapRef.current.getCenter()` -> `lngLatToGridInt()`
3. Calcola quante celle grid sono visibili: `containerWidth / getCellSize(zoom)` e `containerHeight / getCellSize(zoom)`
4. Calcola la scala ideale perche l'immagine occupi ~60% della viewport: `Math.min((vpGridW * 0.6 / imgW) * 100, (vpGridH * 0.6 / imgH) * 100)`, clamped tra 1 e 400
5. Calcola la posizione top-left centrata: `centerX - (imgW * scale/100) / 2`, `centerY - (imgH * scale/100) / 2`
6. Chiama `addTemplate(file, { x, y })` e poi `updateSettings(id, { scale })`

Passare `handleAddTemplate` a `TemplatesPanel` al posto di `addTemplate`.

**B) Drag con offset (move mode)**

Aggiungere un ref `templateDragOffsetRef = useRef<{ dx: number; dy: number } | null>(null)`.

In `handleMapMouseDown` (linea 1120-1124), quando inizia il drag del template:
```
const pixel = lngLatToGridInt(e.lngLat.lng, e.lngLat.lat);
const template = templates.find(t => t.id === activeTemplateId);
if (template) {
  templateDragOffsetRef.current = {
    dx: pixel.x - template.positionX,
    dy: pixel.y - template.positionY,
  };
}
```

In `handleMapMouseMove` (linea 1055-1058), applicare l'offset:
```
const pixel = lngLatToGridInt(e.lngLat.lng, e.lngLat.lat);
const offset = templateDragOffsetRef.current || { dx: 0, dy: 0 };
updatePosition(activeTemplateId, {
  x: pixel.x - offset.dx,
  y: pixel.y - offset.dy,
});
```

In `handleMapMouseUp` (linea 1195-1198), resettare l'offset:
```
templateDragOffsetRef.current = null;
```

#### File 2: `src/lib/paletteQuantizer.ts`

**Quantizzazione asincrona a batch**

Convertire `quantizeImage` in `quantizeImageAsync` che processa l'immagine in batch da ~50.000 pixel, cedendo al main thread tra un batch e l'altro con `await new Promise(r => setTimeout(r, 0))`. Questo impedisce il freeze del browser.

Struttura:
```
export async function quantizeImageAsync(
  image: HTMLImageElement,
  scale: number,
  options?: QuantizeOptions,
  onProgress?: (percent: number) => void
): Promise<QuantizedPixel[]> {
  // ... setup canvas, read imageData (sincrono, veloce)
  
  const BATCH_SIZE = 50000;
  const totalPixels = guideW * guideH;
  
  for (let offset = 0; offset < totalPixels; offset += BATCH_SIZE) {
    const end = Math.min(offset + BATCH_SIZE, totalPixels);
    // Process pixels offset..end
    for (let idx = offset; idx < end; idx++) { ... }
    
    // Yield to main thread
    await new Promise(r => setTimeout(r, 0));
    onProgress?.(Math.round(end / totalPixels * 100));
  }
  
  return pixels;
}
```

Mantenere anche `quantizeImage` sincrono come fallback per immagini piccole.

Aggiungere anche un limite massimo di risoluzione per il guide: se `guideW * guideH > 250000` (500x500), ridurre proporzionalmente per evitare carichi eccessivi.

#### File 3: `src/components/map/TemplateOverlay.tsx`

**Usare quantizzazione asincrona**

Sostituire il `useMemo` sincrono per `quantizedPixels` con un `useEffect` asincrono + `useState`:

```
const [quantizedPixels, setQuantizedPixels] = useState<QuantizedPixel[]>([]);
const [isQuantizing, setIsQuantizing] = useState(false);

useEffect(() => {
  if (!imageLoaded || !imageRef.current || template.mode !== 'pixelGuide') {
    setQuantizedPixels([]);
    return;
  }
  
  let cancelled = false;
  setIsQuantizing(true);
  
  quantizeImageAsync(imageRef.current, template.scale)
    .then(pixels => {
      if (!cancelled) {
        setQuantizedPixels(pixels);
        setIsQuantizing(false);
      }
    });
  
  return () => { cancelled = true; };
}, [imageLoaded, template.mode, template.scale]);
```

Questo permette di:
- Non bloccare il main thread durante la quantizzazione
- Cancellare la quantizzazione precedente se scala/modalita cambiano prima che finisca
- Mostrare uno stato di caricamento (opzionale)

---

### Riepilogo modifiche

| File | Modifica |
|------|----------|
| `BitplaceMap.tsx` | `handleAddTemplate` con auto-center/scale + drag offset ref per move mode |
| `paletteQuantizer.ts` | `quantizeImageAsync` con batching e cap risoluzione |
| `TemplateOverlay.tsx` | Sostituire `useMemo` sincrono con `useEffect` async per quantizzazione |

### Cosa non cambia
- `useTemplates.ts` e `templatesStore.ts` restano invariati
- `TemplatesPanel.tsx` e `TemplateDetailView.tsx` restano invariati
- La logica di rendering (canvas draw) resta invariata
- Lo slider Scale continua a funzionare, ma ora la quantizzazione non blocca piu la pagina

