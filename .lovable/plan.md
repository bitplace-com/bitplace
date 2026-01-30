
# Rimozione Dev Diagnostics

## Obiettivo
Rimuovere completamente il bottone e pannello DevDiagnostics dalla mappa.

## File da Modificare

| File | Azione |
|------|--------|
| `src/components/map/BitplaceMap.tsx` | Rimuovere import e uso del componente |
| `src/components/map/DevDiagnostics.tsx` | Eliminare il file |

## Dettagli Modifiche

### 1. BitplaceMap.tsx

**Rimuovere import (linea 20):**
```typescript
import { DevDiagnostics } from './DevDiagnostics';
```

**Rimuovere uso del componente (linee 1531-1539):**
```typescript
{/* Dev Diagnostics Panel (toggle with bug icon) */}
<DevDiagnostics 
  map={mapRef.current}
  zoom={zoom}
  canPaint={canPaint}
  isSelecting={!!selection || brushSelection.pixels.size > 0}
  realtimeStatus={realtimeStatus}
  reconnectAttempts={reconnectAttempts}
/>
```

### 2. DevDiagnostics.tsx
Eliminare completamente il file `src/components/map/DevDiagnostics.tsx`

## Risultato
- Nessun bottone bug icon visibile sulla mappa
- Nessun pannello diagnostics accessibile
- Il PerfHud (visibile solo con `?debug=1`) rimane disponibile per debug performance
