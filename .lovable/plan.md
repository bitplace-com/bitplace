

## Fix: 3 problemi UI/UX

### 1. Rimuovere sottotitolo "Pinned Locations"

**File: `src/components/modals/PlacesModal.tsx`**
- Rimuovere la prop `description="Discover and save interesting places"` dal componente `GlassSheet` (riga ~186)

---

### 2. Fix bug wallet gate dopo navigazione a location pinnata (mobile)

**Causa**: quando l'utente e in modalita "draw" (disegno) e naviga verso una location pinnata, la modalita `interactionMode` resta su `'draw'`. Ogni tap successivo sulla mappa attiva `handleTouchPaintStart` che chiama `requireWallet()`, aprendo il modal wallet.

**Soluzione**: nel listener `bitplace:navigate` dentro `BitplaceMap.tsx`, resettare `interactionMode` a `'drag'` dopo la navigazione. Cosi l'utente arriva in modalita esplorazione e puo toccare liberamente senza attivare il wallet gate.

**File: `src/components/map/BitplaceMap.tsx`** (righe 400-439)
- Aggiungere `setInteractionMode('drag')` nel handler `handleNavigate` dopo il `flyTo`
- Chiudere anche l'inspector aperto (`setInspectedPixel(null)`) per evitare sovrapposizioni

---

### 3. "Vai al disegno" funzionante da Leaderboard e Profilo

**Problema**: `PlayerProfileModal` accetta una prop `onJumpToPixel` per saltare al disegno, ma:
- `LeaderboardModal` (riga 349) non la passa
- `LeaderboardPage` (riga 87) non la passa
- Anche `OwnerArtworkModal` chiama `onJumpToPixel` ma senza chiudere i pannelli genitori

**Soluzione**: Invece di passare callback attraverso molti livelli di componenti, usare l'evento globale `bitplace:navigate` (gia ascoltato da `BitplaceMap`). Questo chiude automaticamente tutti i pannelli.

**File: `src/components/modals/PlayerProfileModal.tsx`**
- Modificare `handleJumpToPixel` (righe 173-178): invece di richiedere `onJumpToPixel` come prop, usare direttamente `bitplace:navigate` con le coordinate del pixel convertite in lat/lng
- Importare `gridIntToLngLat` da `@/lib/pixelGrid`
- Chiudere il PlayerProfileModal (`onOpenChange(false)`) 

**File: `src/components/map/OwnerArtworkModal.tsx`**
- Modificare `handleClusterClick` (righe 197-200): oltre a chiamare `onJumpToPixel`, chiudere il modale
- Opzione migliore: far si che `OwnerArtworkModal` stesso emetta `bitplace:navigate` direttamente, cosi non dipende dalla prop `onJumpToPixel` e chiude tutto

**File: `src/components/modals/LeaderboardModal.tsx`** e **`src/pages/LeaderboardPage.tsx`**
- Non serve piu passare `onJumpToPixel` dato che `PlayerProfileModal` gestisce autonomamente la navigazione

### Dettaglio tecnico

**`BitplaceMap.tsx`** - handler navigate:
```typescript
const handleNavigate = (e: Event) => {
  const detail = ...;
  // Reset to explore mode after navigation
  setInteractionMode('drag');
  // Close any open inspector
  setInspectedPixel(null);
  // ... existing flyTo logic
};
```

**`PlayerProfileModal.tsx`** - jump autonomo:
```typescript
import { gridIntToLngLat } from '@/lib/pixelGrid';

const handleJumpToPixel = (x: number, y: number) => {
  const { lng, lat } = gridIntToLngLat(x, y);
  window.dispatchEvent(new CustomEvent('bitplace:navigate', {
    detail: { lat, lng, zoom: 18, pixelX: x, pixelY: y }
  }));
  onOpenChange(false);
};
```

**`OwnerArtworkModal.tsx`** - jump autonomo:
```typescript
import { gridIntToLngLat } from '@/lib/pixelGrid';

const handleClusterClick = useCallback((cluster: Cluster) => {
  const { lng, lat } = gridIntToLngLat(cluster.centerX, cluster.centerY);
  window.dispatchEvent(new CustomEvent('bitplace:navigate', {
    detail: { lat, lng, zoom: 18, pixelX: cluster.centerX, pixelY: cluster.centerY }
  }));
  onOpenChange(false);
}, [onOpenChange]);
```

Questo approccio:
- Elimina la dipendenza da `onJumpToPixel` come prop
- Funziona da qualsiasi contesto (leaderboard, profilo, ricerca)
- Chiude automaticamente tutti i pannelli aperti (dato che i modali si chiudono con `onOpenChange(false)`)
- Resetta la modalita a esplorazione per evitare il wallet gate

### Rischio: Basso
Modifica a 5 file, ma tutte le modifiche usano pattern gia esistenti nel codebase (evento `bitplace:navigate`).

