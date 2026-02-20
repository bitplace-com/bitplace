
## Fix: Scale slider, PE balance, Syncing su pixel trial, e pixel reali mancanti

### 4 problemi trovati

---

### 1. Scale troppo aggressiva

**Causa**: Lo slider va da 1 a 400, dove 100% significa "1 pixel immagine = 1 cella grid". Ma una cella grid puo essere 16+ pixel CSS a zoom alto. Quando l'auto-load calcola una scala iniziale (es. 8% per un'immagine 500px), gia al 30% dello slider l'immagine e quasi 4 volte piu grande di come appariva al caricamento.

**Soluzione**: Salvare la scala iniziale calcolata (`initialScale`) nel template. Lo slider diventa relativo a questa scala: 100% = dimensione al caricamento, 50% = meta, 200% = doppia. Lo slider mostrera valori da 10% a 500%, ma internamente la scala effettiva sara `initialScale * sliderValue / 100`.

**File modificati**:
- `src/lib/templatesStore.ts`: Aggiungere `initialScale: number` a `TemplateSettings`  
- `src/hooks/useTemplates.ts`: Esporre `initialScale` nel tipo `Template`
- `src/components/map/TemplateDetailView.tsx`: Slider mostra/modifica la scala relativa (10-500%), conversione interna
- `src/components/map/BitplaceMap.tsx`: `handleAddTemplate` salva `initialScale` insieme a `scale`

---

### 2. Incongruenza PE tra ActionTray e Inspector/StatusStrip

**Causa**: La `ActionTray` riceve `availablePe={peBalance.free}` (linea 2142 di BitplaceMap). `usePeBalance` calcola `free = total - locked`, ma `total` e sempre 0 in trial mode (il valore viene dal DB, non da WalletContext). Quindi il tray mostra 0 PE disponibili. Invece lo `StatusStrip` e l'`ActionBox` usano `energy.peAvailable` dal `WalletContext` (1000 PE trial).

**Soluzione**: Passare `energy.peAvailable` alla `ActionTray` invece di `peBalance.free` quando `isTrialMode` e attivo.

**File modificato**:
- `src/components/map/BitplaceMap.tsx`: `availablePe={isTrialMode ? energy.peAvailable : peBalance.free}`

---

### 3. "Syncing..." perenne sui pixel trial in modalita Esplora

**Causa**: Quando clicchi un pixel trial, `usePixelDetails` interroga il DB reale. Il pixel non esiste nel DB. Poi controlla la tile cache, che contiene il pixel in una tile con `status: 'optimistic'` e `stale: true`. `isPixelSyncing()` restituisce `true`, e l'interfaccia mostra "Syncing..." per sempre, perche nessuna reconciliazione avviene (il pixel e solo locale).

**Soluzione**: Modificare `usePixelDetails` per riconoscere i pixel trial. Se il pixel non esiste nel DB ma e presente nella tile cache E il trial mode e attivo, mostrare i dati del pixel (colore, coordinate) senza lo stato "syncing", con owner = "You (Trial)".

**File modificato**:
- `src/hooks/usePixelDetails.ts`: Accettare un parametro `isTrialMode`, e se attivo + pixel non nel DB ma in cache locale, restituire dati parziali con `isSyncing: false`

---

### 4. Pixel reali (disegni di altri utenti) non caricati in trial mode

**Causa**: Al mount in trial mode, `addPixels` viene chiamato con i pixel da localStorage (linee 226-236 di BitplaceMap). Questo chiama `updatePixelInCache` che crea tile entries con `status: 'optimistic'`. Poi quando `updateViewport` viene chiamato per caricare i pixel reali, `getMissingTiles` (linea 169 di useTileCache) salta le tile che esistono gia in cache (anche se optimistiche). Risultato: le tile contenenti pixel trial non vengono mai scaricate dal server, e i pixel reali in quelle tile spariscono.

**Soluzione**: Modificare `getMissingTiles` in `useTileCache` per considerare "mancanti" anche le tile con `status: 'optimistic'` (non solo quelle totalmente assenti). Cosi verranno scaricate dal server e i dati reali verranno uniti con quelli trial.

**File modificato**:
- `src/hooks/useTileCache.ts`: `getMissingTiles` include tile con `status === 'optimistic'`

---

### Riepilogo modifiche

| File | Modifica |
|------|----------|
| `templatesStore.ts` | Aggiungere `initialScale` a `TemplateSettings` |
| `useTemplates.ts` | Esporre `initialScale` nel tipo `Template` |
| `TemplateDetailView.tsx` | Slider relativo a `initialScale` (10%-500%), conversione bidirezionale |
| `BitplaceMap.tsx` | Salvare `initialScale` al caricamento + fix `availablePe` per trial mode |
| `usePixelDetails.ts` | Gestire pixel trial senza "Syncing" |
| `useTileCache.ts` | `getMissingTiles` include tile optimistiche |

### Cosa NON cambia
- La logica di rendering in `TemplateOverlay` resta identica (riceve sempre `template.scale` interno)
- Le edge functions e il database non vengono toccati
- La quantizzazione asincrona e il debounce restano invariati
- Il flusso per utenti autenticati (non trial) resta identico
