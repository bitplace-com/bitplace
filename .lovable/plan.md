

## Fix Mobile Proportions: Pixel Info Panel and Search Panel

### Problemi identificati

**Pixel Info Panel (in Drawer su mobile)**:
- Il `GlassPanel` con `w-80 max-w-[calc(100vw-1.5rem)]` crea un contenitore con bordi e sfondo *dentro* il Drawer, causando un effetto doppio-contenitore con bordi ridondanti e spazio sprecato ai lati.
- Il pixel non posseduto ha padding verticale eccessivo (`py-8`) che rende la scheda sproporzionata.
- Il contenitore interno non si espande a tutta la larghezza del Drawer.

**Search Modal**:
- Usa `GlassSheet` che su mobile rende come Drawer -- funziona ma lo spacing interno potrebbe essere piu compatto.

---

### Modifiche

#### 1. `src/components/map/PixelInspectorDrawer.tsx`
- Passare una prop `inDrawer` al `PixelInfoPanel` quando renderizzato dentro il Drawer mobile, cosi il pannello sa di non applicare il proprio GlassPanel wrapper.

#### 2. `src/components/map/PixelInfoPanel.tsx`
- Aggiungere prop opzionale `inDrawer?: boolean`.
- Quando `inDrawer` e true: rimuovere il wrapper `GlassPanel` (niente bordi, sfondo, border-radius, larghezza fissa) e renderizzare il contenuto direttamente con un semplice `div`. Il Drawer gia fornisce il contenitore visivo.
- Quando `inDrawer` e false (desktop): mantenere il `GlassPanel` attuale.
- Ridurre `py-8` a `py-4` nello stato "Available to paint" per mobile, e ridurre la dimensione dell'icona dashed box.

#### 3. `src/components/modals/SearchModal.tsx`
- Ridurre padding e spacing interni per mobile: `space-y-2` invece di `space-y-3`, e ridurre il padding dell'empty state (`py-3` invece di `py-4`).

---

### Dettagli tecnici

**PixelInfoPanel.tsx** -- cambio wrapper condizionale:

```tsx
// Props
interface PixelInfoPanelProps {
  // ... existing props
  inDrawer?: boolean;
}

// Nel render, sostituire:
// <GlassPanel variant="hud-strong" className="w-80 max-w-[calc(100vw-1.5rem)] max-h-[70vh] overflow-hidden flex flex-col" padding="none">
// con:
const Wrapper = inDrawer ? 'div' : GlassPanel;
const wrapperProps = inDrawer
  ? { className: "flex flex-col overflow-hidden" }
  : { variant: "hud-strong" as const, className: "w-80 max-w-[calc(100vw-1.5rem)] max-h-[70vh] overflow-hidden flex flex-col", padding: "none" as const };
```

**PixelInspectorDrawer.tsx** -- passare `inDrawer`:

```tsx
// Mobile branch:
<PixelInfoPanel
  // ... existing props
  inDrawer
/>
```

**Unclaimed pixel state** -- ridurre padding:

```tsx
// Da: py-8
// A: py-4
<div className="flex flex-col items-center py-4 gap-3">
  <div className="w-12 h-12 rounded-xl ...">
```

---

### Riepilogo

| File | Modifica |
|------|----------|
| `src/components/map/PixelInfoPanel.tsx` | Prop `inDrawer`, wrapper condizionale, padding ridotto |
| `src/components/map/PixelInspectorDrawer.tsx` | Passare `inDrawer` nella branch mobile |
| `src/components/modals/SearchModal.tsx` | Spacing compatto per mobile |

### Rischio: Basso
Modifiche solo CSS/layout. Nessuna logica di business toccata.
