

## Fix: Template Move su Mobile - Causa Reale

### Problema Identificato

Il div di interazione touch (`interactionLayerRef`, riga 2053) ha **due problemi** che impediscono il funzionamento su mobile:

1. **Il div non viene renderizzato in Move mode**: La condizione di rendering e `mapReady && canPaint`, ma in Move mode potremmo non avere `canPaint` true (dipende dallo zoom). Anche se `canPaint` e true, il div non considera `isMoveMode`.

2. **pointerEvents e 'none' in Move mode**: Anche quando il div esiste, lo style `pointerEvents` e impostato su `'auto'` solo quando `interactionMode === 'draw' && isMobile`. In Move mode l'utente potrebbe essere in `interactionMode === 'drag'`, quindi `pointerEvents` diventa `'none'` e i tocchi passano attraverso il div senza essere intercettati dall'hook.

### Soluzione

Modificare **solo** il rendering del div di interazione (righe 2053-2066):

**Condizione di rendering** (riga 2053):
- Da: `mapReady && canPaint`
- A: `mapReady && (canPaint || isMoveMode)`

**pointerEvents** (riga 2065):
- Da: `interactionMode === 'draw' && isMobile ? 'auto' : 'none'`
- A: `(interactionMode === 'draw' || isMoveMode) && isMobile ? 'auto' : 'none'`

**touch-action CSS** (righe 2059-2061):
- Da: `interactionMode === 'draw' ? "touch-action-none" : "touch-action-pan-zoom"`
- A: `(interactionMode === 'draw' || isMoveMode) ? "touch-action-none" : "touch-action-pan-zoom"`

Queste 3 modifiche nella stessa riga di codice garantiscono che:
- Il div esista anche quando siamo in Move mode
- I tocchi vengano catturati dal div (non passino alla mappa)
- Il browser non intercetti i gesti touch per pan/zoom nativo

**File**: `src/components/map/BitplaceMap.tsx` (righe 2053-2066)

