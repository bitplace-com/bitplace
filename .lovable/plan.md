
# Feature: Templates - Overlay Guida per Disegno

## Obiettivo
Aggiungere la possibilità di caricare immagini come overlay visivo sulla mappa, per guidare l'utente nel ricalco pixel-per-pixel. L'overlay non interferisce con pan/zoom della mappa.

## Architettura

```text
+---------------------+
|   BitplaceMap.tsx   |
|   (orchestratore)   |
+----------+----------+
           |
    +------+------+
    |             |
+---v---+   +-----v-----+
| HUD   |   | Templates |
| Slot  |   | Overlay   |
| (btn) |   | (canvas)  |
+---+---+   +-----------+
    |
+---v-------------+
| TemplatesPanel  |
| (lista + ctrl)  |
+-----------------+
```

## File da Creare

| File | Descrizione |
|------|-------------|
| `src/components/map/TemplatesButton.tsx` | Bottone icona "image" per top-left |
| `src/components/map/TemplatesPanel.tsx` | Pannello laterale (desktop) / drawer (mobile) con lista templates |
| `src/components/map/TemplateOverlay.tsx` | Canvas overlay per renderizzare immagine sulla mappa |
| `src/hooks/useTemplates.ts` | Hook per gestione stato templates (add/remove/select/transform) |
| `src/components/icons/custom/PixelImage.tsx` | Icona pixel-art "immagine" |

## File da Modificare

| File | Modifica |
|------|----------|
| `src/components/map/BitplaceMap.tsx` | Aggiungere TemplatesButton in HudSlot top-left + TemplateOverlay |
| `src/components/icons/iconRegistry.ts` | Registrare nuova icona "image" |

## Dettagli Implementazione

### 1. Icona PixelImage.tsx
Nuova icona pixel-art che rappresenta un'immagine/picture (stile coerente con le altre icone).

### 2. Hook useTemplates.ts
Gestisce lo stato locale dei templates (senza persistenza DB per ora):

```typescript
interface Template {
  id: string;
  name: string;
  dataUrl: string;  // Base64 dell'immagine
  width: number;    // Dimensioni originali
  height: number;
  // Transform settings
  opacity: number;  // 0-100
  scale: number;    // 1-400 (percentuale)
  // Position (coordinate griglia mappa)
  positionX: number;
  positionY: number;
}

interface TemplatesState {
  templates: Template[];
  activeTemplateId: string | null;
}
```

Funzioni esposte:
- `addTemplate(file: File)` - carica immagine e crea template
- `removeTemplate(id)` - elimina template
- `selectTemplate(id)` - attiva template come overlay
- `updateTransform(id, { opacity?, scale? })` - modifica trasformazione
- `updatePosition(id, { x, y })` - modifica posizione

### 3. TemplatesButton.tsx
Bottone glassmorphism posizionato sotto QuickActions:
- Icona "image" 
- Toggle per aprire/chiudere TemplatesPanel
- Indicatore visivo se un template è attivo

### 4. TemplatesPanel.tsx
Pannello che si apre a sinistra (desktop) o come drawer (mobile):

**Header:**
- Titolo "Templates"
- Bottone "+ Add" che apre file picker (accept: png, jpg, webp)

**Lista (quando vuota):**
- Icona immagine stilizzata
- Testo: "Add an overlay image to use as a guide to draw."
- Nota: "You'll still have to place pixels manually!"

**Lista (con templates):**
- Thumbnail 48x48px
- Nome file (troncato se lungo)
- Dimensioni originali (es. "1024×1024")
- Bottone cestino per eliminare
- Click su item = seleziona come overlay attivo

**Controlli Transform (visibili quando template selezionato):**
- Slider Opacity (0-100%, default 70%)
- Slider Scale (1-400%, default 100%)

### 5. TemplateOverlay.tsx
Canvas sovrapposto alla mappa che renderizza il template attivo:
- Posizionato tra mappa e HUD (`z-index` appropriato)
- `pointer-events: none` per permettere interazione con mappa
- Sincronizzato con pan/zoom della mappa
- Applica opacity e scale dal template
- L'immagine segue le coordinate griglia (posizione iniziale = centro viewport)

### 6. Integrazione BitplaceMap.tsx

**HudSlot top-left:**
```tsx
<HudSlot position="top-left">
  <div className="flex flex-col gap-2">
    <MapMenuDrawer />
    <TemplatesButton 
      isOpen={templatesPanelOpen}
      onToggle={() => setTemplatesPanelOpen(!templatesPanelOpen)}
      hasActiveTemplate={!!activeTemplate}
    />
    <QuickActions />
  </div>
</HudSlot>
```

**Overlay (prima di HudOverlay):**
```tsx
{activeTemplate && (
  <TemplateOverlay
    map={mapRef.current}
    template={activeTemplate}
  />
)}
```

**Panel (accanto a CanvasOverlay):**
```tsx
<TemplatesPanel
  open={templatesPanelOpen}
  onOpenChange={setTemplatesPanelOpen}
  templates={templates}
  activeTemplateId={activeTemplateId}
  onAddTemplate={addTemplate}
  onRemoveTemplate={removeTemplate}
  onSelectTemplate={selectTemplate}
  onUpdateTransform={updateTransform}
/>
```

## UI/UX

### Desktop
- Pannello ancorato a sinistra, sotto il bottone
- Larghezza fissa ~320px
- Stile glassmorphism (GlassPanel variant="hud")
- Non modale (mappa resta interattiva)

### Mobile
- Drawer dal basso (usa GlassSheet/Drawer esistente)
- Altezza max 70vh
- Stesso contenuto del pannello desktop

### Stili
- Usa componenti esistenti: GlassPanel, GlassIconButton, Slider, Button
- Rispetta Day/Night theme
- Thumbnail con bordo arrotondato e background subtle

## Flusso Utente

1. Click su bottone Templates (icona immagine)
2. Si apre pannello Templates
3. Click "+ Add" → file picker
4. Selezione immagine → appare in lista
5. Click su template → diventa attivo, overlay visibile sulla mappa
6. Regola opacity/scale con slider
7. Disegna pixel ricalcando l'overlay
8. Click cestino → rimuove template e overlay

## Checklist Deliverables

- [ ] Icona PixelImage.tsx creata e registrata
- [ ] Hook useTemplates.ts con gestione stato
- [ ] TemplatesButton.tsx con toggle e indicatore attivo
- [ ] TemplatesPanel.tsx con lista + add/remove + slider opacity/scale
- [ ] TemplateOverlay.tsx con rendering sincronizzato mappa
- [ ] Integrazione in BitplaceMap.tsx
- [ ] Stile glassmorphism coerente Day/Night
- [ ] Mobile: drawer bottom sheet

## Note Tecniche

- Le immagini sono salvate come dataUrl (base64) in memoria
- Nessuna persistenza DB in questo MVP
- Position iniziale = centro viewport corrente al momento dell'add
- Scale applicata al centro dell'immagine
- L'overlay usa canvas separato per performance
