

## VPE 72h timer renewal, tooltips VPE, e fix pannello utente

### 1. WhitePaperModal - Aggiungere spiegazione timer renewal VPE

Nella sezione "Getting started (free)" (riga 63-70), dopo il paragrafo che spiega che i VPE pixel scadono dopo 72h, aggiungere una frase che spiega il meccanismo di rinnovo:

**Da** (riga 65):
```
VPE pixels are temporary — they expire after 72 hours and anyone can paint over them for free. When that happens, your VPE is recycled and you can use it again.
```

**A**:
```
VPE pixels are temporary — they expire after 72 hours and anyone can paint over them for free. But you can keep them alive: just repaint your pixel anytime before it expires and the 72h timer resets. Come back regularly to maintain your artwork. When a VPE pixel expires or is painted over, your VPE is recycled and you can use it again.
```

### 2. UserMenuPanel - Aggiungere tooltip per VPE e fix sizing/scroll

**Tooltips VPE**: Nelle sezioni dove appare la riga "VPE pixels expire after 72h" (righe 169-171 e 218), wrappare con Tooltip o aggiungere testo piu chiaro. Aggiungere tooltip al titolo "VPE" header nelle sezioni Google-only (riga 158-159) e dual-account (riga 210-213) con spiegazione breve tipo: "Virtual Paint Energy — free energy for painting. VPE pixels expire after 72h but you can repaint them to reset the timer."

Aggiungere tooltips anche a:
- **Pixels Owned** (riga 247-254): tooltip "Total pixels you currently own on the map."
- **PE Available** stat (riga 302-311): tooltip "PE you can spend right now on paint, defend, attack, or reinforce."

**Fix dimensione pannello**: Il `PopoverContent` (riga 65-68) non ha limiti di altezza e su desktop puo uscire dallo schermo.

Modificare la classe del PopoverContent aggiungendo `max-h-[85vh] overflow-y-auto`:
```
className="w-80 max-h-[85vh] overflow-y-auto p-0 bg-popover/95 backdrop-blur-xl border-border rounded-2xl shadow-xl z-50"
```

Questo limita l'altezza massima all'85% del viewport e aggiunge scroll quando il contenuto non entra.

### 3. Riepilogo file

| File | Modifiche |
|------|-----------|
| `src/components/modals/WhitePaperModal.tsx` | Aggiungere frase timer renewal VPE nella sezione "Getting started" |
| `src/components/modals/UserMenuPanel.tsx` | Aggiungere `max-h-[85vh] overflow-y-auto` al PopoverContent; aggiungere tooltips a "VPE" header sections, "Pixels Owned", e "PE Available" |

