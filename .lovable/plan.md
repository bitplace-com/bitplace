

## Aumentare dimensione testo footer legale nella StatusStrip

Il testo "© 2026 Bitplace · Privacy · T&C" attualmente usa `text-[10px] text-muted-foreground` che risulta troppo piccolo e sottile. Lo portiamo allo stesso stile dei numeri del wallet: `text-xs font-medium`.

### Modifiche

**File: `src/components/map/StatusStrip.tsx`**

Due punti da aggiornare:

1. **Stato disconnesso (riga 57)**: cambiare da `text-[10px] text-muted-foreground` a `text-xs font-medium text-muted-foreground`

2. **Stato connesso (riga 83)**: cambiare da `text-[10px] text-muted-foreground` a `text-xs font-medium text-muted-foreground`

Questo allinea il footer legale allo stile `text-xs font-medium` usato per i valori numerici nella barra (come il balance del wallet).

