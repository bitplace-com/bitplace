

## Fix: Default Hand tool, auto-switch su zoom out, mappa loop orizzontale, no rotazione

### 4 modifiche richieste

---

### 1. Default sulla Mano (Hand/Explore) a sessione nuova

**Stato attuale**: `useMapState` inizializza `interactionMode: 'drag'` (che e gia la mano). Pero `selectedColor` parte a `'#ffffff'` e `paintTool` a `'BRUSH'`, il che potrebbe far sembrare che si parta in modalita disegno in alcuni componenti.

**Soluzione**: Aggiungere persistenza dell'ultimo tool usato in `localStorage` (`bitplace-interaction-mode`). Al caricamento, se esiste un valore salvato lo ripristina, altrimenti parte da `'drag'` (mano). Ogni cambio di `interactionMode` viene salvato.

**File**: `src/components/map/hooks/useMapState.ts`
- Leggere `localStorage.getItem('bitplace-interaction-mode')` all'init
- Salvare in `setInteractionMode` callback

---

### 2. Auto-switch sulla Mano quando si fa zoom out oltre la soglia di disegno

**Stato attuale**: `canPaint` viene calcolato ma non causa nessun auto-switch. L'utente resta in modalita disegno anche quando i pixel sono troppo piccoli per interagire.

**Soluzione**: In `BitplaceMap.tsx`, aggiungere un `useEffect` che osserva `zoom` e `interactionMode`. Quando `canInteractAtZoom(zoom)` diventa `false` e l'utente e in `'draw'`, switcha automaticamente a `'drag'` (mano).

**File**: `src/components/map/BitplaceMap.tsx`
- Nuovo `useEffect` con dipendenze `[zoom, interactionMode, setInteractionMode]`
- Condizione: `if (interactionMode === 'draw' && !canInteractAtZoom(zoom)) setInteractionMode('drag')`

---

### 3. Mappa loop orizzontale infinito (come Wplace)

**Stato attuale**: `renderWorldCopies: false` impedisce il wrapping orizzontale. A zoom out massimo la mappa mostra un singolo mondo con bordi vuoti.

**Soluzione**: 
- Cambiare `renderWorldCopies: true` per abilitare il loop orizzontale infinito
- Aggiungere `maxBounds` per limitare lo scroll verticale: latitudine limitata a [-85, 85] (limiti WebMercator), longitudine illimitata
- Usare il metodo `map.setMaxBounds()` con solo limiti verticali, oppure gestire con un listener `moveend` che re-clamp la latitudine

**File**: `src/components/map/BitplaceMap.tsx`
- Nella creazione della mappa: `renderWorldCopies: true`
- Aggiungere `maxBounds: [[-Infinity, -85], [Infinity, 85]]` per limitare solo verticalmente

---

### 4. Disabilitare rotazione mappa (touch e desktop)

**Stato attuale**: `dragRotate: false` e `touchPitch: false` sono gia impostati. Ma la rotazione via touch (due dita) non e esplicitamente disabilitata perche `touchZoomRotate` include sia zoom che rotazione.

**Soluzione**: Dopo la creazione della mappa, disabilitare solo la componente di rotazione del touch:
```text
map.touchZoomRotate.disableRotation()
```
Questo mantiene il pinch-to-zoom attivo ma impedisce la rotazione con due dita. Aggiungere anche `pitchWithRotate: false` e `keyboard` per disabilitare Shift+frecce che ruotano.

**File**: `src/components/map/BitplaceMap.tsx`
- Dopo `new maplibregl.Map(...)`: `map.touchZoomRotate.disableRotation()`

---

### Riepilogo modifiche

| File | Modifica |
|------|----------|
| `useMapState.ts` | Persistenza `interactionMode` in localStorage, default `'drag'` |
| `BitplaceMap.tsx` | Auto-switch a mano su zoom out + `renderWorldCopies: true` + maxBounds verticale + `disableRotation()` |

