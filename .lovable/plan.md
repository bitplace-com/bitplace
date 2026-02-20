

## Fix: Template Move Mode su Mobile

### Problema

Il template move funziona solo con il mouse (desktop) perche usa gli eventi MapLibre `mousedown`/`mousemove`/`mouseup`, che non si attivano con il tocco su mobile. Su mobile, gli eventi touch passano attraverso `usePointerInteraction`, che:

1. Non gestisce affatto la modalita Move dei template
2. Quando `isHandMode` e attivo (drag mode), lascia passare tutti gli eventi touch alla mappa senza intercettarli
3. L'hook e abilitato solo quando `canPaint` e true, ma in Move mode potrebbe non servire

### Soluzione

Modificare 2 punti in `src/components/map/BitplaceMap.tsx`:

#### 1. Aggiornare `enabled` e `isHandMode` di usePointerInteraction

Attualmente:
```js
enabled: mapReady && canPaint,
isHandMode: interactionMode === 'drag',
```

Nuovo:
```js
enabled: mapReady && (canPaint || isMoveMode),
isHandMode: interactionMode === 'drag' && !isMoveMode,
```

Questo fa si che:
- L'hook catturi i touch events anche quando siamo in Move mode
- In Move mode, `isHandMode` e `false` anche se siamo in drag, cosi i touch vengono intercettati invece di passare alla mappa

#### 2. Aggiungere logica Move nelle callbacks touch

Nei tre callback (`onPointerStart`, `onPointerMove`, `onPointerEnd`), aggiungere come PRIMO check la gestione del template move:

- **onPointerStart**: se `isMoveMode && activeTemplateId`, calcola l'offset tra il punto toccato e la posizione del template, salva in `templateDragOffsetRef`, setta `isDraggingRef.current = true` (come fa gia il mousedown desktop)
- **onPointerMove**: se `isMoveMode && activeTemplateId && isDraggingRef.current`, aggiorna la posizione del template con l'offset (come fa gia il mousemove desktop)
- **onPointerEnd**: se `isMoveMode && isDraggingRef.current`, resetta `isDraggingRef`, `templateDragOffsetRef` (come fa gia il mouseup desktop)

Nessun altro file da modificare: la logica Move e gia presente per mouse, basta replicarla nei callback touch.

