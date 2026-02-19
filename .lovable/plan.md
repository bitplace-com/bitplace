

## Fix: Larghezza costante del pannello tra Colors e Gradients

### Problema
Il pannello di disegno (glass panel interno) non ha una larghezza fissa: si adatta al contenuto. La griglia Colors con 8-10 colonne forza una larghezza maggiore rispetto ai 7 bottoni delle Gradients, causando il restringimento visibile.

### Soluzione
Forzare una larghezza fissa sul glass panel interno quando il tray e espanso, cosi non dipende piu dal contenuto delle tab.

### Dettaglio tecnico

**File: `src/components/map/ActionTray.tsx`**

Alla riga ~207-212, il `div` glass panel interno (quello con `glass-hud-strong`) non ha vincoli di larghezza. Aggiungere `w-full` a questo container, in modo che occupi sempre tutta la larghezza disponibile del container padre (che ha gia `width: 100%` quando espanso e `max-w-[540px]`).

Cambiare:
```
className={cn(
  "pointer-events-auto overflow-hidden transition-all duration-200 rounded-2xl shadow-lg",
  "glass-hud-strong",
  isEyedropperActive && "ring-2 ring-foreground"
)}
```

In:
```
className={cn(
  "pointer-events-auto overflow-hidden transition-all duration-200 rounded-2xl shadow-lg",
  "glass-hud-strong",
  isExpanded && "w-full",
  isEyedropperActive && "ring-2 ring-foreground"
)}
```

Aggiungendo `w-full` condizionalmente quando il tray e espanso, il glass panel occupera sempre tutta la larghezza del container padre (max 540px su desktop, 100vw-2rem su mobile), indipendentemente da quale tab e attiva. Il pannello non cambiera piu dimensione tra Colors e Gradients.

