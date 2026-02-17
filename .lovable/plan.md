

## Fix: 5 correzioni UI

### 1. Allineamento "Owned by" nel PixelInfoPanel
Il testo "Owned by FabCap" nella header del pannello non e ben allineato col quadratino colore. Aggiungere `gap-2` e assicurarsi che il testo sia allineato al centro verticale con il dot colore. Il problema e che il `flex-1` con `truncate` potrebbe creare spazio extra a sinistra.

**File: `src/components/map/PixelInfoPanel.tsx`** (riga 175-178)
- Cambiare la struttura del testo "Owned by" per allinearsi meglio col color dot, rimuovendo lo span wrapper con `flex items-center gap-1` e usando direttamente `text-xs text-muted-foreground truncate flex-1`

### 2. Rimuovere tooltip dalle 4 azioni nel MapToolbar
Le azioni Paint, Defend, Attack, Reinforce hanno tooltip che appaiono al passaggio del mouse. Vanno rimossi.

**File: `src/components/map/MapToolbar.tsx`** (righe 67-83)
- Rimuovere il wrapper `Tooltip`, `TooltipTrigger`, `TooltipContent` da ogni ToggleGroupItem
- Rimuovere anche il `TooltipProvider` wrapper e l'import di Tooltip se non piu necessario

### 3. Centratura verticale "Connect your wallet to paint"
Il testo non e centrato verticalmente nella barra nera.

**File: `src/components/map/StatusStrip.tsx`** (righe 52-58)
- Il container usa `min-h-12 flex items-center justify-center` che dovrebbe funzionare. Il problema potrebbe essere il `safe-bottom-bar` che aggiunge padding bottom extra. Aggiungere `py-0` per forzare il centraggio verticale simmetrico e usare `h-12` fisso invece di `min-h-12`

### 4. Tool selezionato di default: 1x pixel brush
Lo state iniziale in `useMapState.ts` ha gia `paintTool: 'BRUSH'` e `brushSize: '1x'`. Il problema potrebbe essere nel `setSelectedColor` callback (riga 50-58): quando `color === null`, imposta `paintTool: 'ERASER'`. Se all'avvio il colore iniziale e `null`, si attiva la gomma. Ma il default e `'#ffffff'` quindi dovrebbe essere ok.

Devo verificare se c'e un altro punto che resetta il tool. Controllero se il componente ActionTray o MapPage sovrascrive il default.

**Azione**: Verificare che il default sia corretto e che nessun effetto collaterale lo sovrascriva. Se il problema persiste, aggiungere un guard esplicito.

### 5. Sfondo del bottone collapse del pannello colori
Il bottone usa `GlassIconButton` con variant `ghost`, ma la classe base include `backdrop-blur-[12px] backdrop-saturate-[140%]` che crea un effetto visivo anche senza background. Serve rimuovere il backdrop dal variant ghost o aggiungere una classe override.

**File: `src/components/map/ActionTray.tsx`** (righe 287-299)
- Aggiungere `className="rounded-md !backdrop-blur-none !backdrop-saturate-100"` al GlassIconButton per eliminare l'effetto glass in stato idle, mantenendo solo l'hover

---

### Dettaglio tecnico

**`src/components/map/MapToolbar.tsx`**:
- Righe 67-83: Sostituire il blocco `Tooltip > TooltipTrigger > ToggleGroupItem + TooltipContent` con solo `ToggleGroupItem`
- Rimuovere import e wrapper `TooltipProvider` (riga 50)
- Rimuovere import tooltip (riga 5)

**`src/components/map/StatusStrip.tsx`**:
- Riga 54: Cambiare `min-h-12` in `h-12` e aggiungere `py-0` per centratura simmetrica

**`src/components/map/PixelInfoPanel.tsx`**:
- Riga 175-178: Aggiungere `items-center` al flex container e rimuovere il wrapper span con flex ridondante

**`src/components/map/ActionTray.tsx`**:
- Riga 292: Aggiungere classi per neutralizzare il backdrop-blur sul bottone collapse in stato idle

### Rischio: Zero
Solo modifiche CSS e rimozione di elementi UI. Nessuna logica di gioco coinvolta.

