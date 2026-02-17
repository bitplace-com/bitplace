

## Piano di Implementazione

Ci sono due problemi distinti da risolvere:

### Problema 1: Pannello laterale ERASE confusionario

Il pannello destro (InspectorPanel) in modalità ERASE mostra il PixelTab con coordinate inutili, icone Lucide generiche (Flag) invece delle bandierine emoji, e troppi dettagli. Va semplificato per allinearlo allo stile pulito del PixelInfoPanel.

**Modifiche previste:**

- **PixelTab.tsx**: 
  - Rimuovere la riga "Coordinates" (non serve)
  - Sostituire l'icona Lucide `Flag` con la bandiera emoji del paese usando `getCountryByCode()` (stessa logica del PixelInfoPanel)
  - Importare `getCountryByCode` da `@/lib/countries`

### Problema 2: Spacebar per selezione area in ERASE non funziona

Il bug e' nel handler `keyUp` dello spacebar in BitplaceMap.tsx. Quando si rilascia SPACE in modalita' ERASER/draw:

1. Il rettangolo viene mostrato visivamente tramite `rectPreview` (funziona)
2. Ma al rilascio, il codice chiama `getBrushSelectedPixels()` che e' vuoto perche' i pixel dal rettangolo non vengono mai trasferiti nella brush selection
3. Risultato: nessun pixel viene selezionato

**Causa**: nel keyUp, per la modalita' HAND c'e' codice che costruisce manualmente l'array di pixel dal `rectPreview`, ma per la modalita' DRAW/ERASER manca questo passaggio. Il codice chiama `endBrushSelection()` e poi `getBrushSelectedPixels()` ma la brush selection non e' mai stata popolata dal rettangolo.

**Fix in BitplaceMap.tsx** (handler keyUp, sezione DRAW mode ERASER):
  - Prima di chiamare `endBrushSelection()`, costruire l'array di pixel dal `rectPreview` (come gia' fatto per HAND mode)
  - Usare i pixel dal rettangolo direttamente invece di `getBrushSelectedPixels()`
  - Pulire `rectAnchorRef` e `rectPreview` dopo l'uso

### Dettagli tecnici

**File da modificare:**

1. **src/components/map/inspector/PixelTab.tsx**
   - Rimuovere righe 103-107 (blocco Coordinates)
   - Importare `getCountryByCode` da `@/lib/countries`
   - Righe 139-144: sostituire `<Flag>` Lucide con `country.flag` emoji + `country.name`

2. **src/components/map/BitplaceMap.tsx**
   - Nel handler `handleKeyUp`, sezione che gestisce il rilascio SPACE in draw mode per ERASER (circa righe 728-773):
     - Aggiungere costruzione dell'array pixel dal `rectPreview` (come gia' fatto per HAND mode alle righe 700-712)
     - Usare quei pixel direttamente per le operazioni di ERASE (rimuovere dal draft e/o settare come pendingPixels)
     - Pulire `rectAnchorRef` e `rectPreview`
     - Ri-abilitare `dragPan` e resettare il cursore

