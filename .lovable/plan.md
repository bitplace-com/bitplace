

## Fix icona Pixel Control Center + Miglioramento alert 72h

### 1. Fix icona Grid3x3

L'icona `grid3x3` usa un viewBox `0 0 24 24` ma le coordinate dei poligoni partono da 1 e arrivano a 23, il che lascia solo 1px di margine su ogni lato. A dimensioni piccole (`h-4 w-4` = 16px) i dettagli si perdono e l'icona appare sgranata/rotta.

Soluzione: riscrivere `PixelGrid3x3.tsx` con coordinate che occupano meglio il viewBox, usando rettangoli semplici al posto dei poligoni complessi. 9 celle quadrate (5x5px ciascuna) con 1px di gap, centrate nel viewBox 24x24.

File: `src/components/icons/custom/PixelGrid3x3.tsx`

### 2. Miglioramento alert scadenza 72h nel UserMenuPanel

Attualmente il messaggio e solo una `<p>` con testo amber. Va trasformato in un alert card elegante e chiudibile.

Modifiche in `src/components/modals/UserMenuPanel.tsx`:

- Aggiungere uno state `const [pixelAlertDismissed, setPixelAlertDismissed] = useState(false)` 
- Sostituire le due righe `<p className="text-[10px] text-amber-500">` (linee 179-181 e 235) con un componente alert card:
  - Background: `bg-amber-500/10 border border-amber-500/20 rounded-xl p-2.5`
  - Riga superiore: icona clock + titolo "Pixels expire after 72h" + bottone X per chiudere
  - Riga inferiore: testo esplicativo "Open the Pixel Control Center to renew all your painted pixels at once and reset the 72h timer before they disappear."
  - Condizione: `{!pixelAlertDismissed && (...)}`
- Il dismiss e locale alla sessione (useState), si resetta riaprendo il menu

### Dettaglio tecnico

**PixelGrid3x3.tsx** — Riscrittura con 9 `<rect>` semplici:
```
Griglia 3x3 con celle da 5px e gap da 2px
Offset: x=2, y=2
Celle: (2,2) (9,2) (16,2) / (2,9) (9,9) (16,9) / (2,16) (9,16) (16,16)
Ogni rect: width=5 height=5
```

**UserMenuPanel.tsx** — Nuovo alert card (2 occorrenze: linea ~179 per google-only e linea ~235 per both):
- State: `pixelAlertDismissed` (un singolo state per entrambe le occorrenze)
- Layout: flex row con icona + testo + X button
- Copy aggiornato con contesto su cosa fare nel Pixel Control Center

