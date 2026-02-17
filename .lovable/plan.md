
## Fix: Layout mobile per palette colori, menu e toolbar azioni

Ci sono 4 problemi da risolvere, tutti legati al layout mobile.

---

### 1. Palette Colors - distribuzione disallineata

**Problema**: La griglia `grid-cols-10` con `gap-1` non si adatta bene alla larghezza mobile. I colori hanno dimensioni variabili e non riempiono uniformemente lo spazio.

**Soluzione** in `src/components/map/ActionTray.tsx`:
- Cambiare la griglia Colors da `grid grid-cols-10 gap-1` a una griglia con colonne a larghezza fissa uniforme, usando `grid-cols-[repeat(10,1fr)]` con `gap-0.5` su mobile
- Rimuovere `overflow-x-hidden` e aggiungere `overflow-x-auto` al container della palette per permettere lo scorrimento laterale se i colori escono dallo schermo
- Mantenere `overflow-y-auto` per lo scorrimento verticale

### 2. Palette Gradients - pannello troppo largo

**Problema**: Il pannello Gradients usa `flex gap-1 flex-1` per i colori di ogni riga, che li espande fino ai bordi dello schermo. Le label ("Purple", "Blue") occupano spazio extra.

**Soluzione** in `src/components/map/ActionTray.tsx`:
- Rendere le righe gradient scrollabili orizzontalmente con `overflow-x-auto` e `flex-nowrap`
- Dare dimensioni fisse ai bottoni colore (uguali alla griglia Colors) invece di lasciarli espandere con `flex-1`
- Allineare le proporzioni del gradients con quelle del colors per coerenza visiva

### 3. Menu laterale (MapMenuDrawer) - vuoti sopra e sotto

**Problema**: Il `SheetContent` usa `inset-y-0 h-full` ma su browser in-app (Phantom, Safari) la viewport puo essere piu corta della finestra visibile. Quando la mappa scorre sotto, appaiono spazi vuoti sopra e sotto il menu.

**Soluzione** in `src/components/ui/sheet.tsx`:
- Per il side `left`, aggiungere `min-h-[100dvh]` e `h-[100dvh]` al posto di `h-full` per usare la viewport dinamica
- Aggiungere `top-0 bottom-0` espliciti per ancorare il menu ai bordi reali della finestra
- In alternativa, aggiungere `position: fixed` con `inset: 0` specificamente per mobile

### 4. MapToolbar - 4 azioni non scrollabili da mobile

**Problema**: Il `ToggleGroup` con le 4 modalita (Paint, Defend, Attack, Reinforce) usa `overflow-hidden` nel container e non permette lo scorrimento laterale su mobile. L'utente non riesce a vedere tutte le opzioni.

**Soluzione** in `src/components/map/MapToolbar.tsx`:
- Sostituire `overflow-hidden` con `overflow-x-auto` quando espanso su mobile
- Aggiungere `scrollbar-hide` (CSS utility) per nascondere la scrollbar visivamente
- Assicurarsi che `flex-nowrap` sia applicato al ToggleGroup per impedire il wrapping

---

### Dettagli tecnici

**File coinvolti: 3**

**`src/components/map/ActionTray.tsx`** (problemi 1 e 2):
- Linea 390: cambiare `overflow-y-auto overflow-x-hidden` in `overflow-auto` per abilitare scroll in entrambe le direzioni
- Linea 392: uniformare `gap-1` a `gap-0.5` su mobile per evitare spazi irregolari nella griglia
- Linea 401: rendere i bottoni colore con dimensione minima fissa (`min-w-[28px]`) per allineamento consistente
- Linee 414-441: nella sezione Gradients, dare ai bottoni colore una dimensione fissa uguale a Colors e rendere la riga `overflow-x-auto` con `flex-nowrap`
- Rimuovere `flex-1` dalla riga gradient colors per evitare l'espansione ai bordi

**`src/components/ui/sheet.tsx`** (problema 3):
- Linea 39: cambiare il variant `left` da `h-full` a `h-[100dvh]` e aggiungere `fixed inset-y-0` per garantire copertura completa su browser in-app
- Aggiungere `overscroll-contain` per impedire che lo scroll della mappa sotto influenzi il menu

**`src/components/map/MapToolbar.tsx`** (problema 4):
- Linea 60: cambiare `overflow-hidden` in `overflow-x-auto scrollbar-hide` per permettere lo scroll laterale delle 4 azioni su mobile
- Aggiungere CSS utility `scrollbar-hide` in `src/index.css` se non gia presente (o usare la classe Tailwind equivalente)

### Rischio rottura: Basso
Modifiche puramente CSS/layout. Nessuna logica di gioco o dati coinvolta.
