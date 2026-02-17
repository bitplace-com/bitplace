

## Avatar in bianco e nero con forme di sfondo

### Cosa cambia
L'avatar senza foto di profilo passera da colori random a gradienti in scala di grigio, con una forma geometrica decorativa di sfondo per mantenere unicita visiva. La lettera iniziale del wallet resta al centro.

### Dettagli tecnici

**File: `src/lib/avatar.ts`**

1. **`generateAvatarGradient(seed)`** - Riscrittura completa:
   - Usa lo stesso hash del seed per generare valori di luminosita (lightness) invece di hue
   - Produce gradienti tra due tonalita di grigio (es. `hsl(0, 0%, 15%)` -> `hsl(0, 0%, 35%)`)
   - L'angolo del gradiente varia in base al seed (90, 135, 180, 225 gradi) per diversita
   - Range luminosita: dal 10% al 45% (abbastanza scuro da rendere leggibile il testo bianco)

2. **`generateAvatarPattern(seed)`** - Nuova funzione:
   - Restituisce un oggetto con tipo di forma (`circle`, `diamond`, `cross`, `dots`, `diagonal-lines`, `corner-squares`) e opacita
   - La forma viene scelta deterministicamente dal seed hash
   - Opacita bassa (0.08-0.15) per non sovrastare la lettera

**File: `src/components/ui/avatar-fallback-pattern.tsx`** - Nuovo componente:
   - Componente React che renderizza la forma SVG sopra il gradiente
   - Accetta seed come prop, genera gradiente + pattern
   - Mostra la lettera iniziale centrata sopra tutto

**File da aggiornare (uso del nuovo sistema):**
- `src/components/modals/UserMenuPanel.tsx`
- `src/components/modals/PlayerProfileModal.tsx`
- `src/components/modals/SettingsModal.tsx`
- `src/components/map/PixelInspectorCard.tsx`
- `src/components/map/PixelInfoPanel.tsx`
- `src/pages/ProfilePage.tsx`

In ogni file, il div con `style={{ background: avatarGradient }}` e la lettera viene sostituito dal nuovo componente `AvatarFallback` che gestisce tutto internamente (gradiente grigio + forma + lettera).

### Forme disponibili (6 varianti)
- **Circle**: cerchio semitrasparente decentrato
- **Diamond**: rombo ruotato nell'angolo
- **Cross**: croce sottile diagonale
- **Dots**: griglia di piccoli punti
- **Diagonal lines**: linee diagonali parallele
- **Corner squares**: quadratini negli angoli

### Rischio rottura: Zero
Modifica solo l'aspetto visivo degli avatar fallback. Nessuna logica di gioco coinvolta.

