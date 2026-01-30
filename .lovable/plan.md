
# Fix: Pannello Disegno Rimane Sopra StatusStrip Multi-linea

## Problema Identificato
Dallo screenshot si vede che su mobile il pannello ActionTray (con "No color" e i controlli) si sovrappone alla StatusStrip quando questa mostra contenuti su più righe:
- Draft counter (240/300)
- Wallet balance (0.1200 SOL)
- PE Total (13,983) + used/avail

## Analisi Tecnica
- **StatusStrip**: ha `min-h-12` (48px) ma usa `flex-wrap` su mobile, quindi può crescere fino a ~100-110px quando i contenuti vanno a capo
- **ActionTray**: attualmente usa `bottom-[calc(5.5rem+env(safe-area-inset-bottom,0px))]` = 88px
- **Gap risultante**: 88px - 100px = **overlap di 12-22px**

## Soluzione

### File da Modificare

| File | Modifica |
|------|----------|
| `src/components/map/ActionTray.tsx` | Aumentare offset bottom mobile da `5.5rem` a `7rem` |
| `src/components/map/MobileActionDock.tsx` | Aumentare offset bottom da `5.5rem` a `7rem` |

### 1. ActionTray.tsx (linea 157)

**Da:**
```typescript
bottom-[calc(5.5rem+env(safe-area-inset-bottom,0px))] sm:bottom-[calc(4rem+env(safe-area-inset-bottom,0px))]
```

**A:**
```typescript
bottom-[calc(7rem+env(safe-area-inset-bottom,0px))] sm:bottom-[calc(4rem+env(safe-area-inset-bottom,0px))]
```

### 2. MobileActionDock.tsx (linea 227)

**Da:**
```typescript
bottom: 'calc(5.5rem + env(safe-area-inset-bottom, 0px))'
```

**A:**
```typescript
bottom: 'calc(7rem + env(safe-area-inset-bottom, 0px))'
```

## Calcolo Offset

| Elemento | Altezza Max |
|----------|-------------|
| StatusStrip (1 riga) | ~48px |
| StatusStrip (2 righe wrap) | ~90px |
| StatusStrip (3 righe worst case) | ~110px |
| **Offset richiesto** | **7rem = 112px** |
| **Gap visivo risultante** | ~2-20px (sempre positivo) |

## Risultato Atteso

1. Il pannello ActionTray rimane sempre staccato dalla StatusStrip
2. Anche quando la StatusStrip mostra draft counter + wallet + PE + rebalance status su più righe
3. Il desktop non cambia (mantiene 4rem = 64px)

## Test di Verifica

1. Da mobile, inizia a disegnare → il pannello deve rimanere staccato dalla barra anche con draft counter visibile
2. Quando la barra mostra wallet + PE + draft counter su più righe → il pannello rimane sopra
3. Su desktop il comportamento non cambia
