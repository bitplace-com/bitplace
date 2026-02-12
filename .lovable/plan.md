

# Fix: Spaziature, Allineamento DEF/ATK e Contrasti

## Problemi Identificati (dagli screenshot)

### 1. Badge Alleanza - Spaziatura insufficiente
Il badge `[BTP]` usa `px-1 py-0.5` che risulta troppo stretto. Va aumentato il padding interno a `px-2 py-0.5` per dare piu respiro al testo dentro il container.

### 2. DEF / ATK - Allineamento
Attualmente la riga DEF/ATK e allineata a sinistra (`flex items-center gap-4`). Va centrata usando `justify-center`.

### 3. Contrasti Day/Night
- **Badge Alleanza**: `bg-accent text-accent-foreground` non ha sufficiente contrasto in entrambi i temi. Cambiare a `bg-muted text-foreground/80` con un bordo sottile `border border-border/50` per garantire leggibilita in entrambe le modalita.
- **Valore USD ($)**: Secondo le convenzioni del progetto, i valori in dollari devono usare `text-emerald-500`. Attualmente il valore USD nelle stat card e nella sezione Economy usa `text-foreground` o `text-muted-foreground` - va corretto.
- **Stat cards** (`bg-muted/50`): In Day mode risultano troppo trasparenti. Aumentare a `bg-muted/70` per migliore contrasto.
- **Economy box** (`bg-muted/50`): Stesso problema, aumentare a `bg-muted/70`.

---

## Piano Modifiche

### File: `src/components/map/PixelInfoPanel.tsx`

| Riga | Elemento | Da | A |
|------|----------|----|----|
| 200 | Badge alleanza padding | `px-1 py-0.5` | `px-2 py-1` |
| 200 | Badge alleanza stile | `bg-accent text-accent-foreground` | `bg-muted text-foreground/80 border border-border/50` |
| 259-273 | Stat cards background | `bg-muted/50` | `bg-muted/70` |
| 271 | Value USD color | `text-foreground` | `text-emerald-500` |
| 277 | Economy box background | `bg-muted/50` | `bg-muted/70` |
| 285, 295 | USD sotto Owner/Total Stake | `text-muted-foreground` | `text-emerald-500` |
| 300 | DEF/ATK riga | `flex items-center gap-4` | `flex items-center justify-center gap-4` |

Tutte le modifiche sono concentrate in un solo file e riguardano esclusivamente classi CSS Tailwind.
