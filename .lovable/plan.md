

# Sostituzione icone: BitplaceLogo nel tour + icona "startups" per azioni di navigazione

## Panoramica

Tre modifiche:
1. Sostituire l'icona del mondo (`PixelIcon name="globe"`) nel welcome dialog del tour con il logo SVG di Bitplace
2. Creare un nuovo componente `PixelStartups` dal SVG di HackerNoon (`hn-startups`) e registrarlo nel registry
3. Sostituire tutte le occorrenze di `PixelIcon name="navigation"` usate per azioni "Go" / "Jump" / "Navigate" con la nuova icona `startups`

---

## Dettaglio modifiche

### 1. Nuovo componente: `src/components/icons/custom/PixelStartups.tsx`
- Componente React che wrappa il path SVG estratto da `node_modules/@hackernoon/pixel-icon-library/icons/SVG/purcats/startups.svg`
- Usa il pattern `PixelSVG` base gia' esistente, con `fill="currentColor"` al posto di `fill="black"`

### 2. Registrazione in `src/components/icons/iconRegistry.ts`
- Import di `PixelStartups`
- Aggiunta della chiave `startups` nella mappa `icons` e nel tipo `IconName`

### 3. Modifiche al tour: `src/components/map/GuidedTour.tsx`
- Welcome dialog: sostituire `<PixelIcon name="globe" ...>` con `<BitplaceLogo className="w-6 h-6 mx-auto text-foreground" />`
- Bottone "Take a Tour": sostituire `<PixelIcon name="navigation" ...>` con `<PixelIcon name="startups" ...>`

### 4. Sostituzione icona "navigation" con "startups" nei punti "Go/Jump/Navigate"
- `src/components/places/PlaceCard.tsx` linea 206: `name="navigation"` diventa `name="startups"`
- `src/components/modals/SearchModal.tsx` linea 278 e 354: `name="navigation"` diventa `name="startups"`
- `src/components/map/TemplateDetailView.tsx` linea 111: `name="navigation"` diventa `name="startups"`

---

## File coinvolti

| File | Tipo modifica |
|------|--------------|
| `src/components/icons/custom/PixelStartups.tsx` | Nuovo |
| `src/components/icons/iconRegistry.ts` | Import + registrazione |
| `src/components/map/GuidedTour.tsx` | Logo + icona tour button |
| `src/components/places/PlaceCard.tsx` | Icona "Go" |
| `src/components/modals/SearchModal.tsx` | Icona "Jump" + pinned places |
| `src/components/map/TemplateDetailView.tsx` | Icona "Recenter" |

Nessun rischio: tutte le modifiche sono cosmetiche (sostituzione icone).

