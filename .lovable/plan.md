
## Fix: Effetto shine che segue la forma dell'icona Admin

### Problema attuale
L'effetto shine usa un pseudo-elemento CSS `::before` rettangolare sopra l'icona. Questo crea un quadrato luminoso che si muove sopra l'icona, invece di brillare seguendo la forma del badge.

### Soluzione
Sostituire l'approccio CSS con un **gradiente SVG animato** direttamente dentro l'icona. In questo modo la luce si muove solo lungo il path dell'icona, rispettandone la forma esatta.

### Dettagli tecnici

**File 1: `src/components/ui/admin-badge.tsx`**
- Rimuovere il wrapper `<span className="animate-shine">` attorno all'icona
- Passare una prop `shine` al componente PixelBadgeCheck per attivare l'animazione SVG interna

**File 2: `src/components/icons/custom/PixelBadgeCheck.tsx`**
- Aggiungere un `<defs>` con un `<linearGradient>` animato (oro base + riflesso bianco che scorre)
- Usare `<animate>` SVG nativo per muovere il gradiente lungo l'icona
- Il gradiente viene applicato come `fill` del path, quindi brilla solo la forma reale dell'icona

**File 3: `src/index.css`** (pulizia opzionale)
- La classe `.animate-shine` resta invariata perche usata anche dai badge Pro

### Come funziona

Il gradiente SVG ha 3 stop: colore oro, bianco luminoso, colore oro. L'elemento `<animate>` sposta i punti x1/x2 del gradiente da sinistra a destra in loop, creando un riflesso che scorre lungo la forma esatta del badge check. Nessun quadrato visibile perche il gradiente e applicato direttamente al fill del path SVG.

### File coinvolti: 2 (admin-badge.tsx, PixelBadgeCheck.tsx)
### Rischio rottura: Zero. Modifica solo la resa visiva del badge admin.
