

## Fix: Rendere piu robusto il centraggio della mappa da URL

### Problema

Il centraggio della mappa sui parametri URL (`lat`, `lng`, `z`, `px`, `py`) potrebbe fallire a causa di una race condition: sia `MapPage` che `BitplaceMap` (tramite `useMapUrl`) usano `useSearchParams` di React Router, che condivide lo stato. Se qualsiasi componente modifica i search params prima che il `useEffect` di inizializzazione della mappa legga la posizione, i parametri originali potrebbero andare persi.

### Soluzione

Leggere la posizione iniziale direttamente da `window.location.search` invece di dipendere da `useSearchParams` di React Router. Questo garantisce che i parametri vengano catturati immediatamente al primo render, prima che qualsiasi effetto o re-render possa modificarli.

### Dettagli tecnici

**File: `src/components/map/BitplaceMap.tsx`**

Aggiungere un `useRef` che cattura la posizione iniziale da `window.location.search` al momento della creazione del componente (fuori da qualsiasi effect). Usare questo valore nel `useEffect` di inizializzazione della mappa invece di chiamare `getUrlPosition()`.

```typescript
// Parse URL position directly from window.location.search at mount time
// This avoids race conditions with React Router's useSearchParams
const initialUrlPos = useRef(() => {
  const params = new URLSearchParams(window.location.search);
  const lat = params.get('lat');
  const lng = params.get('lng');
  const z = params.get('z');
  const px = params.get('px');
  const py = params.get('py');
  
  if (lat && lng) {
    const parsedLat = parseFloat(lat);
    const parsedLng = parseFloat(lng);
    if (!isNaN(parsedLat) && !isNaN(parsedLng) && 
        Math.abs(parsedLat) <= 90 && Math.abs(parsedLng) <= 180) {
      const result = {
        lat: parsedLat,
        lng: parsedLng,
        zoom: z ? parseFloat(z) : 8,
        pixelX: undefined as number | undefined,
        pixelY: undefined as number | undefined,
      };
      if (px && py) {
        const parsedPx = parseInt(px, 10);
        const parsedPy = parseInt(py, 10);
        if (!isNaN(parsedPx) && !isNaN(parsedPy) && parsedPx >= 0 && parsedPy >= 0) {
          result.pixelX = parsedPx;
          result.pixelY = parsedPy;
        }
      }
      return result;
    }
  }
  return null;
})();
```

Poi nel `useEffect` di inizializzazione della mappa (riga ~498), sostituire `getUrlPosition()` con `initialUrlPos.current`:

```typescript
const urlPos = initialUrlPos.current;
```

Nessun altro file da modificare.
