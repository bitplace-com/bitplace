
# Fix: Pannello Disegno Sopra la Barra Inferiore

## Problema
Il pannello ActionTray (color picker) e MobileActionDock si sovrappongono alla StatusStrip in basso, specialmente su mobile quando la barra cambia altezza per mostrare più informazioni (draft count, cooldown, ecc.).

## Causa
- **ActionTray**: usa `bottom-[calc(4rem+env(safe-area-inset-bottom,0px))]` fisso (64px)
- **MobileActionDock**: usa `bottom: 'calc(3.5rem + env(safe-area-inset-bottom, 0px))'` fisso (56px)
- **StatusStrip**: ha `min-h-12` (48px) ma può crescere fino a ~80-100px quando il contenuto va a capo su mobile

## Soluzione

### File da Modificare

| File | Modifica |
|------|----------|
| `src/components/map/ActionTray.tsx` | Aumentare offset bottom e aggiungere margin |
| `src/components/map/MobileActionDock.tsx` | Aumentare offset bottom e aggiungere margin |

### 1. ActionTray.tsx (linea 157)

**Da:**
```typescript
className="fixed left-1/2 -translate-x-1/2 z-20 pointer-events-none bottom-[calc(4rem+env(safe-area-inset-bottom,0px))] sm:bottom-[calc(3.5rem+env(safe-area-inset-bottom,0px))] ..."
```

**A:**
```typescript
className="fixed left-1/2 -translate-x-1/2 z-20 pointer-events-none bottom-[calc(5.5rem+env(safe-area-inset-bottom,0px))] sm:bottom-[calc(4rem+env(safe-area-inset-bottom,0px))] ..."
```

Aumenta l'offset:
- Mobile: da `4rem` (64px) a `5.5rem` (88px) - spazio extra per StatusStrip multi-linea
- Desktop: da `3.5rem` (56px) a `4rem` (64px) - piccolo buffer extra

### 2. MobileActionDock.tsx (linea 226-228)

**Da:**
```typescript
style={{ 
  bottom: 'calc(3.5rem + env(safe-area-inset-bottom, 0px))'
}}
```

**A:**
```typescript
style={{ 
  bottom: 'calc(5.5rem + env(safe-area-inset-bottom, 0px))'
}}
```

Aumenta l'offset da `3.5rem` (56px) a `5.5rem` (88px) per garantire spazio sufficiente su mobile.

## Risultato Atteso

| Elemento | Prima | Dopo |
|----------|-------|------|
| ActionTray (mobile) | 64px dal basso | 88px dal basso |
| ActionTray (desktop) | 56px dal basso | 64px dal basso |
| MobileActionDock | 56px dal basso | 88px dal basso |
| Gap visivo | 0-8px (overlap) | 24-40px (sempre staccato) |

## Comportamento

1. Il pannello colori rimane sempre leggermente staccato dalla barra inferiore
2. Quando la StatusStrip cresce (draft count, cooldown, ecc.), i pannelli rimangono sopra
3. Il gap visivo è consistente sia su mobile che desktop
4. Safe area insets per iOS sono preservati

## Test di Verifica

1. Inizia a disegnare pixel → il pannello colori deve rimanere staccato dalla barra
2. Quando appare il draft counter nella barra → il pannello rimane sopra
3. Su mobile quando la barra va a capo → il pannello rimane sempre staccato
4. Verifica su diversi dispositivi/risoluzioni
